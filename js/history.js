/**
 * history.js — Histórico dos últimos 5 setups calculados
 */
'use strict';

const History = {
  MAX: 5,

  _load() {
    try { return JSON.parse(localStorage.getItem(CFG.HISTORY_KEY) || '[]'); }
    catch { return []; }
  },

  _save(h) { localStorage.setItem(CFG.HISTORY_KEY, JSON.stringify(h)); },

  push(r) {
    const h = this._load();
    h.unshift({
      ts:        Date.now(),
      fichaNome: r.f.nome,
      nFusos:    r.nFusos,
      mTotal:    r.mTotal,
      espula:    r.f.espula,
      fichaId:   r.f.id
    });
    this._save(h.slice(0, this.MAX));
    this.render();
  },

  render() {
    const h     = this._load();
    const panel = document.getElementById('hist-panel');
    const list  = document.getElementById('hist-list');
    if (!panel || !list) return;

    if (!h.length) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';

    list.innerHTML = h.map(item => {
      const d   = new Date(item.ts);
      const fmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="hist-item" onclick="App.reuseHistory('${item.fichaId}',${item.nFusos},${item.mTotal})">
        <div class="hist-item-info">
          <div class="hist-item-main">${UI.esc(item.fichaNome)} · ${item.nFusos} fusos · ${UI.fmtM(item.mTotal)} m</div>
          <div class="hist-item-meta">${fmt} · ${UI.esc(item.espula)}</div>
        </div>
        <span class="hist-item-arrow">↩</span>
      </div>`;
    }).join('');
  }
};
