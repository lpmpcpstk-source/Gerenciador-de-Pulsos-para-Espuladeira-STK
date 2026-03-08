/**
 * db.js — Cliente REST Supabase (sem SDK) para GPE v3.0
 *
 * ⚠ Configure as credenciais abaixo com os dados do seu projeto Supabase.
 */
'use strict';

const SUPABASE_URL      = 'https://unuscbbibbwkpnghfahi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NVRoTRkMpNeSPdYyT5Mfnw_b65qIKks';

const DB = {
  TABLE: 'fichas_tecnicas',

  _url(qs = '') { return `${SUPABASE_URL}/rest/v1/${this.TABLE}${qs}`; },

  _h(extra = {}) {
    return {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...extra
    };
  },

  async fetchAll() {
    const r = await fetch(
      this._url('?select=*&ativo=eq.true&order=nome.asc'),
      { headers: this._h(), signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async insert(payload) {
    const r = await fetch(this._url(), {
      method: 'POST',
      headers: this._h({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `HTTP ${r.status}`); }
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  },

  async update(id, payload) {
    const r = await fetch(this._url(`?id=eq.${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: this._h({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || `HTTP ${r.status}`); }
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  },

  async delete(id) {
    const r = await fetch(this._url(`?id=eq.${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: this._h({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ ativo: false }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  },

  async ping() {
    try {
      const r = await fetch(
        this._url('?select=id&limit=1'),
        { headers: this._h(), signal: AbortSignal.timeout(4000) }
      );
      return r.ok;
    } catch { return false; }
  },

  fromRow(row) {
    return {
      id:       String(row.id),
      nome:     row.nome     || '',
      material: row.material || 'Poliéster',
      fios:     Number(row.fios)  || 1,
      d0:       Number(row.d0)    || 0,
      diam:     Number(row.diam)  || 0,
      comp:     Number(row.comp)  || 0,
      pmax:     Number(row.pmax)  || 0,
      mmax:     Number(row.mmax)  || 0,
      espula:   row.espula  || 'Branca',
      obs:      row.obs     || '',
      ativo:    row.ativo !== false
    };
  },

  toRow(f) {
    return {
      nome:     String(f.nome     || ''),
      material: String(f.material || 'Poliéster'),
      fios:     Number(f.fios)    || 1,
      d0:       Number(f.d0)      || 0,
      diam:     Number(f.diam)    || 0,
      comp:     Number(f.comp)    || 0,
      pmax:     Number(f.pmax)    || 0,
      mmax:     Number(f.mmax)    || 0,
      espula:   String(f.espula   || 'Branca'),
      obs:      String(f.obs      || ''),
      ativo:    f.ativo !== false
    };
  }
};
