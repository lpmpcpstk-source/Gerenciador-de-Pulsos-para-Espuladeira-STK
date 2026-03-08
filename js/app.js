/**
 * app.js — Orquestrador principal do sistema GPE v3.0
 */
'use strict';

const App = {

  editId: null,
  _fichasFilter: '',

  async init() {
    Theme.init();
    DbFichas.init();

    DB_STATE.on((status, err) => {
      UI.dbStatus.set(status, err);
      if (status !== 'online') return;
      const fresh = Storage.load();
      const sameIds = fresh.length === Fichas.data.length &&
                      fresh.every((f, i) => f.id === Fichas.data[i]?.id);
      if (!sameIds) {
        Fichas.data = fresh;
        Fichas.renderTable('fichas-table', this._fichasFilter);
        FichaSelect.update(Fichas.data);
        UI.setBadge('badge-fichas', Fichas.data.length);
      }
    });

    await Fichas.load();

    UI.fusos.build('fusos-grid');
    FichaSelect.init('ficha-sel-wrap');
    FichaSelect.update(Fichas.data);
    FichaSelect.onChange = () => this._updatePreview();
    Fichas.renderTable('fichas-table');
    UI.setBadge('badge-fichas', Fichas.data.length);
    History.render();
    await Users.init();
    Users.renderTabela();
    UI.setBadge('badge-users', Users.getAtivos().length);
    this._bindEvents();
    this._bindFormPreview();

    UI.switchTab('consulta');
  },

  _bindEvents() {
    // Login
    document.getElementById('btn-login').addEventListener('click', () => this.doLogin());
    document.getElementById('inp-pass').addEventListener('keydown', e => { if (e.key === 'Enter') this.doLogin(); });
    document.getElementById('inp-user').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('inp-pass').focus(); });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => this.doLogout());

    // Tabs
    document.querySelectorAll('.nav-tab').forEach(btn =>
      btn.addEventListener('click', () => {
        UI.switchTab(btn.dataset.tab);
        if (btn.dataset.tab === 'fichas' && Auth.isAdmin()) {
          Backup.atualizarContagem();
        }
        if (btn.dataset.tab === 'usuarios') {
          Users.renderTabela();
          UI.setBadge('badge-users', Users.getAtivos().length);
        }
      })
    );

    // Consulta
    document.getElementById('btn-calcular').addEventListener('click', () => this.doCalc());
    document.getElementById('btn-resetar').addEventListener('click',  () => UI.resetConsulta());
    document.getElementById('inp-metros').addEventListener('input',   () => this._updatePreview());
    document.getElementById('inp-metros').addEventListener('keydown', e => { if (e.key === 'Enter') this.doCalc(); });

    // Fichas — Enter em qualquer campo do formulário (exceto obs)
    document.getElementById('btn-salvar').addEventListener('click', () => this.saveFicha());
    document.getElementById('btn-cancelar').addEventListener('click', () => this.cancelEdit());
    ['f-nome','f-material','f-fios','f-d0','f-dmax','f-pmax','f-mmax','f-espula','f-comp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.saveFicha(); } });
    });

    // Busca de fichas
    document.getElementById('fichas-search').addEventListener('input', e => {
      this._fichasFilter = e.target.value;
      Fichas.renderTable('fichas-table', this._fichasFilter);
    });

    // Remover toast ao clicar
    document.getElementById('toasts').addEventListener('click', e => {
      if (e.target.classList.contains('toast')) e.target.remove();
    });

    // Tema
    document.getElementById('btn-theme').addEventListener('click', () => Theme.toggle());
  },

  _bindFormPreview() {
    ['f-d0','f-dmax','f-pmax','f-mmax'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => Fichas._updateFichaPreview());
    });
  },

  /** Preview em tempo real na aba Consulta */
  _updatePreview() {
    const fichaId = FichaSelect.getValue();
    const mTotal  = parseFloat(document.getElementById('inp-metros').value);
    const nFusos  = UI.fusos.selected;
    const strip   = document.getElementById('preview-strip');
    if (!strip) return;

    if (fichaId && mTotal > 0 && nFusos) {
      const f = Fichas.find(fichaId);
      if (f) {
        const cheias = Math.floor(mTotal / f.mmax);
        const sobra  = mTotal % f.mmax;
        const tc = cheias * nFusos;
        const tp = sobra > 0 ? nFusos : 0;
        const pp = sobra > 0 ? Calc.calcPulsos(sobra, f) : 0;
        const totalEsp = tc + tp;
        let txt = `${totalEsp} espulas · ${tc} cheias (${f.pmax}p)`;
        if (tp > 0) txt += ` + ${tp} parciais (${pp}p · ${UI.fmt(sobra, 1)}m)`;
        txt += ` · ${nFusos} fusos`;
        strip.textContent = txt;
        strip.className   = 'preview-strip active';
        return;
      }
    }
    strip.className   = 'preview-strip';
    strip.textContent = 'Informe os parâmetros acima para ver o resumo';
  },

  doLogin() {
    const u    = document.getElementById('inp-user').value;
    const p    = document.getElementById('inp-pass').value;
    const user = Auth.login(u, p);
    const errEl = document.getElementById('login-err');
    if (!user) {
      errEl.classList.remove('hidden');
      setTimeout(() => errEl.classList.add('hidden'), 3500);
      return;
    }
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('app').classList.add('on');
    Auth.applyUI();
    const an = document.getElementById('backup-admin-nome');
    if (an) an.textContent = 'Admin: ' + (Auth.current?.nome || '');
    UI.switchTab('consulta');
    UI.toast(`Bem-vindo, ${user.nome}! [${user.perfil}] — Sistema v4.0`, 'ok', 4000);
  },

  doLogout() {
    Auth.logout();
    document.getElementById('app').classList.remove('on');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('inp-user').value = '';
    document.getElementById('inp-pass').value = '';
    UI.resetConsulta();
  },

  doCalc() {
    const fichaId = FichaSelect.getValue();
    const mTotal  = parseFloat(document.getElementById('inp-metros').value);
    const nFusos  = UI.fusos.selected;
    const { ok, erros, f } = Calc.validate(mTotal, nFusos, fichaId, Fichas.data);
    if (!ok) { UI.toast(erros[0], 'err'); return; }
    const r = Calc.setup(mTotal, nFusos, f);
    Report.render(r);
    History.push(r);
    UI.toast('✓ Setup calculado com sucesso!', 'ok');
    setTimeout(() => {
      const rpt = document.getElementById('rpt');
      if (rpt) rpt.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  },

  async saveFicha() {
    const btn = document.getElementById('btn-salvar');
    btn.disabled = true; btn.textContent = '⏳ Salvando…';
    const res = await Fichas.upsert(this.editId);
    btn.disabled = false; btn.textContent = '💾 Salvar Ficha';
    if (!res.ok) { UI.toast(res.msg, 'err'); return; }
    const msg = this.editId
      ? (res.offline ? '⚠ Ficha atualizada (offline — sync pendente)' : '✓ Ficha atualizada!')
      : (res.offline ? '⚠ Ficha salva (offline — sync pendente)'      : '✓ Ficha salva!');
    UI.toast(msg, res.offline ? 'warn' : 'ok');
    this.cancelEdit();
    Fichas.renderTable('fichas-table', this._fichasFilter);
    FichaSelect.update(Fichas.data);
    UI.setBadge('badge-fichas', Fichas.data.length);
  },

  editFicha(id) {
    const f = Fichas.find(id);
    if (!f) { UI.toast('Ficha não encontrada.', 'err'); return; }
    this.editId = id;
    Fichas.fillForm(f);
    document.getElementById('form-title').textContent = 'Editar Ficha';
    document.getElementById('btn-cancelar').classList.remove('hidden');
    UI.switchTab('fichas');
    setTimeout(() => {
      document.getElementById('fichas-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  },

  async deleteFicha(id) {
    const f = Fichas.find(id);
    if (!f) return;
    if (!confirm(`Excluir a ficha "${f.nome}"?`)) return;
    const ok = await Fichas.delete(id);
    if (!ok) { UI.toast('Erro ao excluir ficha.', 'err'); return; }
    Fichas.renderTable('fichas-table', this._fichasFilter);
    FichaSelect.update(Fichas.data);
    UI.setBadge('badge-fichas', Fichas.data.length);
    UI.toast('Ficha excluída.', 'inf');
  },

  cancelEdit() {
    this.editId = null;
    Fichas.clearForm();
    document.getElementById('form-title').textContent = 'Nova Ficha Técnica';
    document.getElementById('btn-cancelar').classList.add('hidden');
  },

  /** Reutilizar setup do histórico */
  reuseHistory(fichaId, nFusos, mTotal) {
    UI.switchTab('consulta');
    FichaSelect.select(fichaId);
    const pill = document.querySelector(`.fpill[data-fusos="${nFusos}"]`);
    if (pill) {
      document.querySelectorAll('.fpill').forEach(p => p.classList.remove('on'));
      pill.classList.add('on');
      UI.fusos.selected = nFusos;
    }
    document.getElementById('inp-metros').value = mTotal;
    this._updatePreview();
    setTimeout(() => document.getElementById('btn-calcular').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
    UI.toast('Parâmetros anteriores carregados — clique em Calcular', 'inf');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
