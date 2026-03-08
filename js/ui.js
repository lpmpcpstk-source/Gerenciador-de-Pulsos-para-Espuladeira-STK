/**
 * ui.js — Utilitários de interface
 */
'use strict';

const UI = {

  esc(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  fmt(n,d=2) { return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d }); },
  fmt4(n) { return Number(n).toFixed(4); },
  fmt6(n) { return Number(n).toFixed(6); },
  fmtM(n) { return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); },
  pad(n,w=4) { return String(Math.round(n)).padStart(w, '0'); },

  toast(msg, type = 'ok', duration = 3200) {
    const c  = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className  = `toast ${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all .3s ease';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  fotek: {
    set(pulsos, bobinas) {
      const c = document.getElementById('fotek-camada');
      const b = document.getElementById('fotek-bobinas');
      c.textContent = UI.pad(pulsos);
      b.textContent = UI.pad(bobinas);
      c.classList.add('lit');
      b.classList.add('lit');
    },
    reset() {
      const c = document.getElementById('fotek-camada');
      const b = document.getElementById('fotek-bobinas');
      c.textContent = '----'; b.textContent = '----';
      c.classList.remove('lit'); b.classList.remove('lit');
    }
  },

  fusos: {
    selected: null,
    build(containerId) {
      const g = document.getElementById(containerId);
      if (!g) return;
      g.innerHTML = '';
      CFG.FUSOS.forEach(n => {
        const btn = document.createElement('button');
        btn.type     = 'button';
        btn.className = 'fpill';
        btn.dataset.fusos = n;
        btn.innerHTML = `${n}<sub>fusos</sub>`;
        btn.addEventListener('click', () => this._select(btn, n));
        g.appendChild(btn);
      });
    },
    _select(btn, n) {
      document.querySelectorAll('.fpill').forEach(p => p.classList.remove('on'));
      btn.classList.add('on');
      this.selected = n;
      App._updatePreview();
    },
    reset() {
      document.querySelectorAll('.fpill').forEach(p => p.classList.remove('on'));
      this.selected = null;
    }
  },

  setBadge(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.style.background = n === 0 ? 'var(--red)' : '';
  },

  switchTab(tabId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('on'));
    const panel = document.getElementById('panel-' + tabId);
    const tab   = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (panel) panel.classList.add('on');
    if (tab)   tab.classList.add('on');
  },

  resetConsulta() {
    this.fusos.reset();
    this.fotek.reset();
    FichaSelect.reset();
    document.getElementById('inp-metros').value = '';
    const rpt   = document.getElementById('rpt');
    const empty = document.getElementById('rpt-empty');
    if (rpt)   rpt.classList.remove('on');
    if (empty) empty.style.display = '';
    const ps = document.getElementById('preview-strip');
    if (ps) { ps.className = 'preview-strip'; ps.textContent = 'Informe os parâmetros acima para ver o resumo'; }
  },

  dbStatus: {
    set(status, errMsg) {
      const wrap = document.getElementById('db-indicator');
      const dot  = document.getElementById('db-dot');
      const lbl  = document.getElementById('db-lbl');
      if (!wrap) return;
      const MAP = {
        online:   { mod: 'online',   dot: '●', txt: 'BD Online'    },
        offline:  { mod: 'offline',  dot: '○', txt: 'Offline'      },
        checking: { mod: 'checking', dot: '◌', txt: 'Conectando…'  },
        error:    { mod: 'error',    dot: '⚠', txt: 'Erro BD'      }
      };
      const s = MAP[status] || MAP.error;
      wrap.className = wrap.className.replace(/\bdbi-\w+/g, '');
      wrap.classList.add('dbi-' + s.mod);
      if (dot) dot.textContent = s.dot;
      if (lbl) lbl.textContent = s.txt;
      wrap.title = errMsg ? `Banco de dados — Erro: ${errMsg}` : `Banco de dados — ${s.txt}`;
    }
  },

  setFieldState(fiId, state, msg = '') {
    const fi = document.getElementById(fiId);
    if (!fi) return;
    fi.classList.remove('has-err', 'has-ok');
    if (state === 'err') {
      fi.classList.add('has-err');
      const e = fi.querySelector('.field-err');
      if (e) e.textContent = msg;
    } else if (state === 'ok') {
      fi.classList.add('has-ok');
    }
  },

  fieldErr(fiId, errId, msg) {
    this.setFieldState(fiId, 'err', msg);
    const e = document.getElementById(errId);
    if (e) e.textContent = msg;
  },

  fieldOk(fiId) { this.setFieldState(fiId, 'ok'); },

  clearFieldStates(ids) {
    const els = ids
      ? ids.map(id => document.getElementById(id)).filter(Boolean)
      : Array.from(document.querySelectorAll('.fi.has-err,.fi.has-ok'));
    els.forEach(el => {
      el.classList.remove('has-err', 'has-ok');
      const e = el.querySelector('.field-err');
      if (e) e.textContent = '';
    });
  }
};
