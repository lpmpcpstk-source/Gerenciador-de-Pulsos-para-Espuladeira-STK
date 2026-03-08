/**
 * users.js — Gerenciamento de Usuários v4.0
 * Persistência: Supabase (tabela `usuarios`) + fallback localStorage.
 * Novidades v4: exclusão permanente, avatar inicial, status em tempo real.
 */
'use strict';

const Users = {
  LOCAL_KEY: 'gpe_users_v3',
  data: [],

  _url(qs = '') { return `${SUPABASE_URL}/rest/v1/usuarios${qs}`; },
  _h(extra = {}) {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...extra
    };
  },

  _saveLocal(list) {
    try { localStorage.setItem(this.LOCAL_KEY, JSON.stringify(list)); } catch {}
  },
  _loadLocal() {
    try {
      const raw = localStorage.getItem(this.LOCAL_KEY);
      if (raw) { const l = JSON.parse(raw); if (Array.isArray(l) && l.length) return l; }
    } catch {}
    return CFG.USERS.map(u => ({
      id: 'u_' + u.login, login: u.login, hash: u.hash,
      nome: u.nome, perfil: u.perfil, ativo: true,
      criado_em: new Date().toISOString()
    }));
  },

  async load() {
    try {
      const r = await fetch(this._url('?select=*&order=nome.asc'),
        { headers: this._h(), signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list = await r.json();
      if (Array.isArray(list) && list.length) {
        this.data = list;
        this._saveLocal(list);
        this._syncCFG(list);
        return list;
      }
      await this._seed();
      return this.data;
    } catch {
      const local = this._loadLocal();
      this.data = local;
      this._syncCFG(local);
      return local;
    }
  },

  async _seed() {
    const seed = CFG.USERS.map(u => ({
      id: 'u_' + u.login, login: u.login, hash: u.hash,
      nome: u.nome, perfil: u.perfil, ativo: true
    }));
    for (const u of seed) {
      try {
        await fetch(this._url(), {
          method: 'POST',
          headers: this._h({ 'Prefer': 'return=minimal' }),
          body: JSON.stringify(u),
          signal: AbortSignal.timeout(6000)
        });
      } catch {}
    }
    this.data = seed;
    this._saveLocal(seed);
    this._syncCFG(seed);
  },

  getAll()    { return this.data; },
  getAtivos() { return this.data.filter(u => u.ativo !== false); },

  async create(dados) {
    const login = dados.login.trim().toLowerCase();
    if (!login || login.length < 3)             return { ok: false, msg: 'Login deve ter ao menos 3 caracteres.' };
    if (!/^[a-z0-9._-]+$/.test(login))         return { ok: false, msg: 'Login: use apenas letras, números, . _ -' };
    if (this.data.some(u => u.login === login)) return { ok: false, msg: 'Já existe um usuário com este login.' };
    if (!dados.hash || dados.hash.length < 4)   return { ok: false, msg: 'Senha deve ter ao menos 4 caracteres.' };
    if (!dados.nome || dados.nome.trim().length < 2) return { ok: false, msg: 'Nome deve ter ao menos 2 caracteres.' };
    if (!['Admin','PCP','Operador'].includes(dados.perfil)) return { ok: false, msg: 'Perfil inválido.' };

    const novo = {
      id: 'u_' + Date.now().toString(36),
      login, hash: dados.hash, nome: dados.nome.trim(),
      perfil: dados.perfil, ativo: true, criado_em: new Date().toISOString()
    };
    try {
      const r = await fetch(this._url(), {
        method: 'POST',
        headers: this._h({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(novo), signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        if (e.code === '23505') return { ok: false, msg: 'Login já existe no banco de dados.' };
        throw new Error(e.message || `HTTP ${r.status}`);
      }
      const saved = await r.json();
      const user  = Array.isArray(saved) ? saved[0] : saved;
      this.data.push(user);
      this._saveLocal(this.data);
      this._syncCFG(this.data);
      return { ok: true, user };
    } catch {
      this.data.push({ ...novo, _offline: true });
      this._saveLocal(this.data);
      this._syncCFG(this.data);
      return { ok: true, user: novo, offline: true };
    }
  },

  async update(id, dados) {
    const idx = this.data.findIndex(u => u.id === id);
    if (idx < 0) return { ok: false, msg: 'Usuário não encontrado.' };
    const u = { ...this.data[idx] };
    if (dados.login && dados.login.trim() !== u.login) {
      const nl = dados.login.trim().toLowerCase();
      if (this.data.some((x, i) => i !== idx && x.login === nl))
        return { ok: false, msg: 'Login já utilizado por outro usuário.' };
      u.login = nl;
    }
    if (dados.nome   && dados.nome.trim().length >= 2)                u.nome   = dados.nome.trim();
    if (dados.perfil && ['Admin','PCP','Operador'].includes(dados.perfil)) u.perfil = dados.perfil;
    if (dados.hash   && dados.hash.length >= 4)                       u.hash   = dados.hash;
    if (dados.ativo  !== undefined)                                    u.ativo  = Boolean(dados.ativo);

    try {
      const r = await fetch(this._url(`?id=eq.${encodeURIComponent(id)}`), {
        method: 'PATCH',
        headers: this._h({ 'Prefer': 'return=representation' }),
        body: JSON.stringify({ login: u.login, nome: u.nome, perfil: u.perfil, hash: u.hash, ativo: u.ativo }),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `HTTP ${r.status}`); }
      const saved = await r.json();
      const user  = Array.isArray(saved) ? saved[0] : (saved || u);
      this.data[idx] = user;
      this._saveLocal(this.data);
      this._syncCFG(this.data);
      return { ok: true, user };
    } catch {
      this.data[idx] = u;
      this._saveLocal(this.data);
      this._syncCFG(this.data);
      return { ok: true, user: u, offline: true };
    }
  },

  /** Exclusão permanente (DELETE físico) */
  async excluir(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return { ok: false, msg: 'Usuário não encontrado.' };
    if (Auth.current?.login === u.login)
      return { ok: false, msg: 'Você não pode excluir seu próprio usuário.' };

    try {
      const r = await fetch(this._url(`?id=eq.${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: this._h({ 'Prefer': 'return=minimal' }),
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok && r.status !== 204) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${r.status}`);
      }
    } catch (err) {
      // Apenas log — remover localmente mesmo assim (pode estar offline)
      console.warn('Users.excluir:', err.message);
    }
    this.data = this.data.filter(x => x.id !== id);
    this._saveLocal(this.data);
    this._syncCFG(this.data);
    return { ok: true };
  },

  async desativar(id) {
    const u = this.data.find(x => x.id === id);
    if (Auth.current?.login === u?.login)
      return { ok: false, msg: 'Você não pode desativar seu próprio usuário.' };
    return this.update(id, { ativo: false });
  },

  async reativar(id) { return this.update(id, { ativo: true }); },

  _syncCFG(list) {
    CFG.USERS = list.filter(u => u.ativo !== false)
      .map(u => ({ login: u.login, hash: u.hash, perfil: u.perfil, nome: u.nome, id: u.id }));
  },

  // ── RENDERIZAÇÃO ──────────────────────────────────────────────
  _editId: null,
  _filtro: '',

  async init() {
    await this.load();
    this._bindEvents();
  },

  _bindEvents() {
    const s = document.getElementById('btn-user-salvar');
    const c = document.getElementById('btn-user-cancelar');
    const q = document.getElementById('users-search');
    if (s) s.addEventListener('click',  () => this.salvar());
    if (c) c.addEventListener('click',  () => this.cancelarEdicao());
    if (q) q.addEventListener('input',  e => { this._filtro = e.target.value; this.renderTabela(); });
    ['u-nome','u-login','u-senha','u-perfil'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); this.salvar(); }
      });
    });
  },

  /** Gera avatar com iniciais coloridas por perfil */
  _avatar(nome, perfil) {
    const ini = nome.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const bg  = perfil === 'Admin' ? '#e8192c' : perfil === 'PCP' ? '#00d4aa' : '#00aaff';
    const fg  = '#fff';
    return `<span style="display:inline-flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:50%;background:${bg};color:${fg};
      font-family:var(--f-cond);font-size:11px;font-weight:900;letter-spacing:0;
      flex-shrink:0">${UI.esc(ini)}</span>`;
  },

  renderTabela() {
    const wrap = document.getElementById('users-table');
    if (!wrap) return;
    const q  = this._filtro.toLowerCase().trim();
    const fl = q ? this.data.filter(u =>
      u.nome.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) ||
      u.perfil.toLowerCase().includes(q)
    ) : this.data;

    const cnt = document.getElementById('users-count');
    if (cnt) cnt.textContent = q ? `${fl.length} / ${this.data.length}` : `${this.data.length}`;

    if (!fl.length) {
      wrap.innerHTML = `<div class="empty"><div class="empty-icon">👤</div>
        <div class="empty-txt">Nenhum usuário encontrado</div></div>`;
      return;
    }

    const me = Auth.current?.login;

    const rows = fl.map(u => {
      const tc   = u.perfil === 'Admin' ? 'tag-admin' : u.perfil === 'PCP' ? 'tag-pcp' : 'tag-op';
      const off  = u._offline ? `<span class="tag tag-offline" title="Aguardando sync">⏳</span>` : '';
      const inativo = u.ativo === false;
      const std  = inativo
        ? `<span class="tag tag-offline">Inativo</span>`
        : `<span class="tag tag-ativo">Ativo</span>`;
      const ehEu = u.login === me;
      const dt   = u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—';
      const av   = this._avatar(u.nome, u.perfil);

      return `<tr${inativo ? ' class="row-inativo"' : ''}>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            ${av}
            <div>
              <div class="td-nome">${UI.esc(u.nome)}${ehEu ? `<span class="tag tag-eu">você</span>` : ''}${off}</div>
              <div style="font-family:var(--f-mono);font-size:10px;color:var(--t-lo)">${UI.esc(u.login)}</div>
            </div>
          </div>
        </td>
        <td><span class="tag ${tc}">${u.perfil}</span></td>
        <td>${std}</td>
        <td style="font-family:var(--f-mono);font-size:10px;color:var(--t-lo)">${dt}</td>
        <td>
          <div class="td-act">
            <button class="btn-edit" onclick="Users.abrirEdicao('${UI.esc(u.id)}')">✏ Editar</button>
            ${!inativo
              ? `<button class="btn-del" onclick="Users.confirmarDesativar('${UI.esc(u.id)}')"
                  ${ehEu ? 'disabled title="Não pode desativar seu próprio usuário"' : ''}>⏸ Suspender</button>`
              : `<button class="btn-edit" onclick="Users.confirmarReativar('${UI.esc(u.id)}')">▶ Reativar</button>`
            }
            <button class="btn-del btn-del-hard" onclick="Users.confirmarExcluir('${UI.esc(u.id)}')"
              ${ehEu ? 'disabled title="Não pode excluir seu próprio usuário"' : ''}
              title="Excluir permanentemente">🗑 Excluir</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `<div class="tbl-wrap"><table class="tbl">
      <thead><tr>
        <th>Usuário</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  },

  abrirEdicao(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return;
    this._editId = id;
    document.getElementById('u-nome').value   = u.nome;
    document.getElementById('u-login').value  = u.login;
    document.getElementById('u-senha').value  = '';
    document.getElementById('u-perfil').value = u.perfil;
    document.getElementById('user-form-title').textContent = '✏ Editar Usuário';
    document.getElementById('u-senha-hint').textContent    = 'Deixe em branco para manter a senha atual';
    document.getElementById('btn-user-cancelar').classList.remove('hidden');
    document.getElementById('fichas-form-card-users')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    UI.clearFieldStates(['fi-u-nome','fi-u-login','fi-u-senha','fi-u-perfil']);
  },

  cancelarEdicao() {
    this._editId = null;
    ['u-nome','u-login','u-senha'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('u-perfil').value             = 'Operador';
    document.getElementById('user-form-title').textContent = '➕ Novo Usuário';
    document.getElementById('u-senha-hint').textContent    = '';
    document.getElementById('btn-user-cancelar').classList.add('hidden');
    UI.clearFieldStates(['fi-u-nome','fi-u-login','fi-u-senha','fi-u-perfil']);
  },

  _validarForm() {
    UI.clearFieldStates(['fi-u-nome','fi-u-login','fi-u-senha','fi-u-perfil']);
    let ok = true;
    const nome   = document.getElementById('u-nome').value.trim();
    const login  = document.getElementById('u-login').value.trim().toLowerCase();
    const senha  = document.getElementById('u-senha').value;
    const perfil = document.getElementById('u-perfil').value;
    if (nome.length < 2)                    { UI.fieldErr('fi-u-nome','err-u-nome','Nome deve ter ao menos 2 caracteres'); ok = false; } else UI.fieldOk('fi-u-nome');
    if (login.length < 3)                   { UI.fieldErr('fi-u-login','err-u-login','Login deve ter ao menos 3 caracteres'); ok = false; }
    else if (!/^[a-z0-9._-]+$/.test(login)) { UI.fieldErr('fi-u-login','err-u-login','Use apenas letras, números, . _ -'); ok = false; }
    else UI.fieldOk('fi-u-login');
    if (!this._editId && senha.length < 4)  { UI.fieldErr('fi-u-senha','err-u-senha','Senha deve ter ao menos 4 caracteres'); ok = false; }
    else if (senha && senha.length < 4)     { UI.fieldErr('fi-u-senha','err-u-senha','Senha deve ter ao menos 4 caracteres'); ok = false; }
    else if (senha || !this._editId) UI.fieldOk('fi-u-senha');
    if (!['Admin','PCP','Operador'].includes(perfil)) { UI.fieldErr('fi-u-perfil','err-u-perfil','Selecione um perfil'); ok = false; } else UI.fieldOk('fi-u-perfil');
    return ok;
  },

  async salvar() {
    if (!this._validarForm()) return;
    const btn = document.getElementById('btn-user-salvar');
    btn.disabled = true; btn.textContent = '⏳ Salvando…';
    const dados = {
      nome:   document.getElementById('u-nome').value.trim(),
      login:  document.getElementById('u-login').value.trim().toLowerCase(),
      hash:   document.getElementById('u-senha').value,
      perfil: document.getElementById('u-perfil').value
    };
    let res;
    if (this._editId) { if (!dados.hash) delete dados.hash; res = await this.update(this._editId, dados); }
    else res = await this.create(dados);
    btn.disabled = false; btn.textContent = '💾 Salvar Usuário';
    if (!res.ok) { UI.toast(res.msg, 'err'); return; }
    const acao = this._editId ? 'atualizado' : 'criado';
    UI.toast(`✓ Usuário "${res.user.nome}" ${acao}!${res.offline ? ' (sync pendente)' : ''}`,
             res.offline ? 'warn' : 'ok');
    this.cancelarEdicao();
    this.renderTabela();
    UI.setBadge('badge-users', this.getAtivos().length);
  },

  async confirmarDesativar(id) {
    const u = this.data.find(x => x.id === id);
    if (!u || !confirm(`Suspender "${u.nome}" (${u.login})?\nEle não poderá mais fazer login até ser reativado.`)) return;
    const res = await this.desativar(id);
    if (!res.ok) { UI.toast(res.msg, 'err'); return; }
    UI.toast(`Usuário "${u.nome}" suspenso.`, 'inf');
    this.renderTabela();
    UI.setBadge('badge-users', this.getAtivos().length);
  },

  async confirmarReativar(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return;
    const res = await this.reativar(id);
    if (!res.ok) { UI.toast(res.msg, 'err'); return; }
    UI.toast(`Usuário "${u.nome}" reativado.`, 'ok');
    this.renderTabela();
    UI.setBadge('badge-users', this.getAtivos().length);
  },

  async confirmarExcluir(id) {
    const u = this.data.find(x => x.id === id);
    if (!u) return;
    const msg = `⚠ EXCLUSÃO PERMANENTE\n\nDeseja excluir definitivamente o usuário:\n"${u.nome}" (${u.login})?\n\nEsta ação não pode ser desfeita.`;
    if (!confirm(msg)) return;
    const res = await this.excluir(id);
    if (!res.ok) { UI.toast(res.msg, 'err'); return; }
    UI.toast(`Usuário "${u.nome}" excluído permanentemente.`, 'inf');
    this.renderTabela();
    UI.setBadge('badge-users', this.getAtivos().length);
  }
};
