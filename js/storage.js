/**
 * storage.js — Persistência local (localStorage) do sistema GPE v3.0
 */
'use strict';

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(CFG.STORAGE_KEY);
      if (!raw) return this._seed();
      const p = JSON.parse(raw);
      return Array.isArray(p) && p.length ? p : this._seed();
    } catch { return this._seed(); }
  },
  save(fichas) {
    try { localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(fichas)); return true; }
    catch { return false; }
  },
  appendOne(f)  { const a = this.load(); a.push(f); this.save(a); },
  updateOne(f)  {
    const a = this.load(), i = a.findIndex(x => x.id === f.id);
    if (i >= 0) a[i] = { ...a[i], ...f }; else a.push(f);
    this.save(a);
  },
  removeOne(id) { this.save(this.load().filter(f => f.id !== id)); },
  replaceLocalId(lid, rid) {
    const a = this.load(), i = a.findIndex(f => f.id === lid);
    if (i >= 0) { a[i].id = rid; this.save(a); }
  },
  _seed() { const d = CFG.FICHAS_SEED.map(f => ({ ...f })); this.save(d); return d; },
  uid()   { return 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
};
