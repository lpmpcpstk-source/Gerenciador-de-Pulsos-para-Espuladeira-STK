/**
 * ficha-select.js — Dropdown customizado com busca instantânea
 */
'use strict';

const FichaSelect = {
  _selectedId: null, _query: '', _focusedIndex: -1,
  _fichas: [], _isOpen: false,
  _wrap: null, _trigger: null, _value: null, _dropdown: null, _search: null, _list: null,
  onChange: null,

  init(wrapperId) {
    this._wrap = document.getElementById(wrapperId);
    if (!this._wrap) return;
    this._wrap.innerHTML = this._buildHTML();
    this._trigger  = this._wrap.querySelector('.fsel-trigger');
    this._value    = this._wrap.querySelector('.fsel-value');
    this._dropdown = this._wrap.querySelector('.fsel-dropdown');
    this._search   = this._wrap.querySelector('.fsel-search');
    this._list     = this._wrap.querySelector('.fsel-list');
    this._bindEvents();
  },

  update(fichas, preserveSelection = true) {
    const prevId = this._selectedId;
    this._fichas = fichas || [];
    if (preserveSelection && prevId && !this._fichas.find(f => f.id === prevId))
      this._selectedId = null;
    this._renderList(this._query);
    this._renderTrigger();
  },

  getValue() { return this._selectedId; },

  /** API pública para seleção programática (usado por reuseHistory) */
  select(id) { this._select(id); },

  reset() {
    this._selectedId = null; this._query = '';
    if (this._search) this._search.value = '';
    this._renderTrigger();
    this._renderList('');
  },

  _buildHTML() {
    return `
      <button type="button" class="fsel-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="fsel-value placeholder">— selecione a ficha —</span>
        <span class="fsel-arrow"><svg viewBox="0 0 12 8"><path d="M1 1l5 5 5-5"/></svg></span>
      </button>
      <div class="fsel-dropdown" role="listbox" aria-label="Selecione uma ficha técnica">
        <div class="fsel-search-wrap">
          <span class="fsel-search-icon"><svg viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="5"/><path d="M10 10l4 4"/></svg></span>
          <input class="fsel-search" type="text" placeholder="Buscar nome, código ou tipo…" autocomplete="off" spellcheck="false">
        </div>
        <div class="fsel-list" role="presentation"></div>
      </div>`;
  },

  _renderList(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = q
      ? this._fichas.filter(f =>
          f.nome.toLowerCase().includes(q)     ||
          f.material.toLowerCase().includes(q) ||
          f.espula.toLowerCase().includes(q)   ||
          String(f.mmax).includes(q)           ||
          String(f.pmax).includes(q))
      : this._fichas;

    if (!filtered.length) {
      this._list.innerHTML = `<div class="fsel-empty">${q
        ? `Nenhuma ficha para "<em>${this._esc(q)}</em>"`
        : 'Nenhuma ficha cadastrada'}</div>`;
      this._focusedIndex = -1;
      return;
    }

    this._list.innerHTML = filtered.map((f, i) => {
      const isSel  = f.id === this._selectedId;
      const tagCls = f.espula === 'Vermelha' ? 'vermelha' : f.espula === 'Branca' ? 'branca' : 'outro';
      return `<div class="fsel-option${isSel ? ' selected' : ''}" role="option" aria-selected="${isSel}" data-id="${this._esc(f.id)}" data-idx="${i}">
        <span class="fsel-check"><svg viewBox="0 0 12 10"><path d="M1 5l4 4 6-8"/></svg></span>
        <div class="fsel-opt-info">
          <div class="fsel-opt-name">${this._highlight(f.nome, q)}</div>
          <div class="fsel-opt-meta">${this._highlight(`${f.espula} · ${f.mmax}m · ${f.pmax}p`, q)}</div>
        </div>
        <span class="fsel-opt-tag ${tagCls}">${this._esc(f.espula)}</span>
      </div>`;
    }).join('');

    this._list.querySelectorAll('.fsel-option').forEach(el => {
      el.addEventListener('click',      () => this._select(el.dataset.id));
      el.addEventListener('mouseenter', () => this._setFocused(+el.dataset.idx));
    });
    this._focusedIndex = -1;
  },

  _select(id) {
    this._selectedId = id || null;
    this._renderTrigger();
    this._renderList(this._query);
    this._close();
    if (typeof this.onChange === 'function') this.onChange(this._selectedId);
  },

  _renderTrigger() {
    if (!this._value) return;
    const f = this._fichas.find(x => x.id === this._selectedId);
    if (f) {
      this._value.classList.remove('placeholder');
      this._value.textContent = `${f.nome}  (${f.espula} · ${f.mmax}m · ${f.pmax}p)`;
    } else {
      this._value.classList.add('placeholder');
      this._value.textContent = '— selecione a ficha —';
    }
  },

  _open() {
    this._isOpen = true;
    this._dropdown.classList.add('open');
    this._trigger.classList.add('open');
    this._trigger.setAttribute('aria-expanded', 'true');
    this._query = ''; this._search.value = ''; this._renderList('');
    setTimeout(() => this._search.focus(), 30);
    setTimeout(() => { const s = this._list.querySelector('.selected'); if (s) s.scrollIntoView({ block: 'nearest' }); }, 20);
  },

  _close() {
    this._isOpen = false;
    this._dropdown.classList.remove('open');
    this._trigger.classList.remove('open');
    this._trigger.setAttribute('aria-expanded', 'false');
    this._trigger.focus();
  },

  _setFocused(idx) {
    const items = this._list.querySelectorAll('.fsel-option');
    items.forEach(el => el.classList.remove('focused'));
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add('focused');
      items[idx].scrollIntoView({ block: 'nearest' });
      this._focusedIndex = idx;
    }
  },

  _moveFocus(d) {
    const items = this._list.querySelectorAll('.fsel-option');
    const n = items.length;
    if (!n) return;
    this._setFocused((this._focusedIndex + d + n) % n);
  },

  _bindEvents() {
    this._trigger.addEventListener('click', e => {
      e.stopPropagation();
      this._dropdown.classList.contains('open') ? this._close() : this._open();
    });
    this._search.addEventListener('input', () => {
      this._query = this._search.value;
      this._renderList(this._query);
    });
    this._search.addEventListener('keydown', e => {
      if      (e.key === 'ArrowDown')                { e.preventDefault(); this._moveFocus(1); }
      else if (e.key === 'ArrowUp')                  { e.preventDefault(); this._moveFocus(-1); }
      else if (e.key === 'Enter')                    { e.preventDefault(); const f = this._list.querySelector('.fsel-option.focused'); if (f) this._select(f.dataset.id); }
      else if (e.key === 'Escape' || e.key === 'Tab') this._close();
    });
    this._trigger.addEventListener('keydown', e => {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); this._open(); }
      else if (e.key === 'Escape') this._close();
    });
    document.addEventListener('click', e => {
      if (!this._wrap.contains(e.target) && this._dropdown.classList.contains('open')) this._close();
    });
    this._dropdown.addEventListener('click', e => e.stopPropagation());
  },

  _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
  _highlight(text, query) {
    if (!query) return this._esc(text);
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this._esc(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
  }
};
