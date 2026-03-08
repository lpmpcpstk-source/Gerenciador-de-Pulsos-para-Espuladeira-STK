/**
 * theme.js — Alternância dark/light
 */
'use strict';

const Theme = {
  current: 'dark',

  init() {
    this.current = document.documentElement.getAttribute('data-theme') || 'dark';
    this._applyBtn();
  },

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.current);
    localStorage.setItem(CFG.THEME_KEY, this.current);
    this._applyBtn();
  },

  _applyBtn() {
    const lbl = document.getElementById('theme-lbl');
    if (lbl) lbl.textContent = this.current === 'dark' ? 'Claro' : 'Escuro';
    const btn = document.getElementById('btn-theme');
    if (btn) btn.setAttribute('aria-label',
      this.current === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
  }
};
