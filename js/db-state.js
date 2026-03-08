/**
 * db-state.js — Camada de abstração DB_STATE + DbFichas
 * v4.0: Corrigido tratamento de erros HTTP (RLS, 4xx) — não trata como "offline"
 */
'use strict';

const DB_STATE = {
  status: 'checking', error: null, syncing: false,
  QUEUE_KEY: 'gpe_sync_queue_v3',
  _listeners: [],
  on(fn)  { this._listeners.push(fn); },
  off(fn) { this._listeners = this._listeners.filter(l => l !== fn); },
  _emit() { this._listeners.forEach(fn => fn(this.status, this.error)); },
  set(s, err = null) { this.status = s; this.error = err; this._emit(); }
};

const DbFichas = {
  init() {
    window.addEventListener('online',  () => this._onReconnect());
    window.addEventListener('offline', () => DB_STATE.set('offline'));
  },

  async load() {
    const local = Storage.load();
    this._syncFromServer().catch(() => {});
    return local;
  },

  async _syncFromServer() {
    DB_STATE.set('checking');
    if (!SUPABASE_URL || SUPABASE_URL === 'COLE_SUA_URL_AQUI') {
      DB_STATE.set('offline'); return null;
    }
    const online = await DB.ping();
    if (!online) { DB_STATE.set('offline'); return null; }
    try {
      const rows   = await DB.fetchAll();
      const fichas = rows.map(r => DB.fromRow(r));
      Storage.save(fichas);
      DB_STATE.set('online');
      await this._flushQueue();
      return fichas;
    } catch (err) {
      DB_STATE.set('error', err.message);
      return null;
    }
  },

  async upsert(ficha) {
    const isEdit = !!ficha.id &&
                   !String(ficha.id).startsWith('local_') &&
                   !String(ficha.id).startsWith('seed-');
    const row = DB.toRow(ficha);

    // Sem conexão: salvar offline imediatamente
    if (!navigator.onLine) return this._saveOffline('upsert', ficha);

    try {
      let saved;
      if (isEdit) saved = await DB.update(ficha.id, row);
      else        saved = await DB.insert(row);
      const result = DB.fromRow(saved);
      if (isEdit) Storage.updateOne(result);
      else        Storage.appendOne(result);
      DB_STATE.set('online');
      return { ok: true, ficha: result, offline: false };
    } catch (err) {
      const msg = err.message || '';
      // Erro de rede/timeout → salvar offline
      if (!navigator.onLine || msg.includes('Failed to fetch') || msg.includes('timeout')) {
        return this._saveOffline('upsert', ficha);
      }
      // Erros semânticos do servidor (RLS, constraint, etc.) → retornar erro legível
      let legivel = msg;
      if (msg.toLowerCase().includes('row-level security') || msg.includes('42501')) {
        legivel = 'Permissão negada pelo banco de dados. Execute o SQL de configuração (SUPABASE_SETUP_v4.sql) no painel do Supabase.';
      } else if (msg.toLowerCase().includes('unique') || msg.includes('23505')) {
        legivel = 'Já existe uma ficha com este nome no banco de dados.';
      } else if (msg.toLowerCase().includes('check') || msg.includes('23514')) {
        legivel = 'Dados inválidos: verifique se o diâmetro cheio é maior que o vazio.';
      }
      DB_STATE.set('error', legivel);
      return { ok: false, msg: legivel };
    }
  },

  async delete(id) {
    if (!navigator.onLine) {
      Storage.removeOne(id);
      this._enqueue('delete', { id });
      DB_STATE.set('offline');
      return { ok: true, offline: true };
    }
    try {
      await DB.delete(id);
      Storage.removeOne(id);
      DB_STATE.set('online');
      return { ok: true };
    } catch (err) {
      return { ok: false, msg: err.message };
    }
  },

  _saveOffline(op, ficha) {
    let saved = { ...ficha };
    if (!saved.id) saved.id = Storage.uid();
    Storage.updateOne(saved);
    this._enqueue(op, saved);
    DB_STATE.set('offline');
    return { ok: true, ficha: saved, offline: true };
  },

  _enqueue(op, data) {
    const q = this._loadQueue();
    q.push({ op, data, ts: Date.now() });
    this._saveQueue(q);
  },

  async _flushQueue() {
    const q = this._loadQueue();
    if (!q.length) return;
    DB_STATE.syncing = true;
    const remaining = [];
    for (const item of q) {
      try {
        if (item.op === 'upsert') {
          const isLocal = String(item.data.id).startsWith('local_');
          if (isLocal) {
            const row  = await DB.insert(DB.toRow(item.data));
            const real = DB.fromRow(row);
            Storage.replaceLocalId(item.data.id, real.id);
          } else {
            await DB.update(item.data.id, DB.toRow(item.data));
          }
        } else if (item.op === 'delete') {
          if (!String(item.data.id).startsWith('local_') &&
              !String(item.data.id).startsWith('seed-'))
            await DB.delete(item.data.id);
        }
      } catch { remaining.push(item); }
    }
    this._saveQueue(remaining);
    DB_STATE.syncing = false;
  },

  _loadQueue() {
    try { return JSON.parse(localStorage.getItem(DB_STATE.QUEUE_KEY) || '[]'); } catch { return []; }
  },
  _saveQueue(q) { localStorage.setItem(DB_STATE.QUEUE_KEY, JSON.stringify(q)); },

  async _onReconnect() {
    const fichas = await this._syncFromServer();
    if (!fichas) return;
    Fichas.data = fichas;
    Fichas.renderTable('fichas-table');
    FichaSelect.update(Fichas.data);
    UI.setBadge('badge-fichas', Fichas.data.length);
    UI.toast('🔄 Fichas sincronizadas com o servidor', 'ok', 2500);
  }
};
