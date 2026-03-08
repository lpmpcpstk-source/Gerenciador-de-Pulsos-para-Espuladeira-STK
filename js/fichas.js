/**
 * fichas.js — CRUD de fichas técnicas com validação inline
 */
'use strict';

const Fichas = {
  data: [],

  async load() {
    this.data = await DbFichas.load();
    return this.data;
  },

  async upsert(editId = null) {
    const f   = this._readForm();
    const err = this._validate(f, editId);
    if (err) return { ok: false, msg: err };
    const payload = editId ? { id: editId, ...f } : f;
    const res = await DbFichas.upsert(payload);
    if (!res.ok) return res;
    if (editId) {
      const idx = this.data.findIndex(x => x.id === editId);
      if (idx >= 0) this.data[idx] = { ...this.data[idx], ...res.ficha };
    } else {
      this.data.push(res.ficha);
    }
    return { ok: true, offline: res.offline || false };
  },

  async delete(id) {
    const res = await DbFichas.delete(id);
    if (!res.ok) return false;
    this.data = this.data.filter(f => f.id !== id);
    return true;
  },

  find(id) { return this.data.find(f => f.id === id) || null; },

  _readForm() {
    return {
      nome:     document.getElementById('f-nome').value.trim(),
      material: document.getElementById('f-material').value,
      fios:     +document.getElementById('f-fios').value,
      d0:       +document.getElementById('f-d0').value,
      diam:     +document.getElementById('f-dmax').value,
      comp:     +document.getElementById('f-comp').value || 0,
      pmax:     +document.getElementById('f-pmax').value,
      mmax:     +document.getElementById('f-mmax').value,
      espula:   document.getElementById('f-espula').value,
      obs:      document.getElementById('f-obs').value.trim()
    };
  },

  _validate(f, editId) {
    UI.clearFieldStates();
    const errs = [];
    if (!f.nome)              { UI.setFieldState('fi-nome', 'err', 'Nome obrigatório');     errs.push('Informe o nome/código da ficha.'); }
    else                        UI.setFieldState('fi-nome', 'ok');
    if (!f.fios || f.fios < 1) { UI.setFieldState('fi-fios', 'err', 'Mínimo: 1 fio');       errs.push('Informe a quantidade de fios.'); }
    else                        UI.setFieldState('fi-fios', 'ok');
    if (!f.d0 || f.d0 <= 0)    { UI.setFieldState('fi-d0',   'err', 'Valor inválido');       errs.push('Diâmetro vazio inválido.'); }
    else                        UI.setFieldState('fi-d0', 'ok');
    if (!f.diam || f.diam <= f.d0) { UI.setFieldState('fi-dmax', 'err', `Deve ser > ${f.d0} cm`); errs.push('Diâmetro cheio deve ser maior que o vazio.'); }
    else if (f.diam > 0)        UI.setFieldState('fi-dmax', 'ok');
    if (!f.pmax || f.pmax < 1) { UI.setFieldState('fi-pmax', 'err', 'Mínimo: 1 pulso');    errs.push('Informe os pulsos máximos.'); }
    else                        UI.setFieldState('fi-pmax', 'ok');
    if (!f.mmax || f.mmax < 1) { UI.setFieldState('fi-mmax', 'err', 'Mínimo: 1m');         errs.push('Informe a metragem máxima.'); }
    else                        UI.setFieldState('fi-mmax', 'ok');
    if (!errs.length) {
      const dup = this.data.find(x => x.nome.toLowerCase() === f.nome.toLowerCase() && x.id !== editId);
      if (dup) { UI.setFieldState('fi-nome', 'err', 'Já existe'); errs.push(`Já existe uma ficha com o nome "${f.nome}".`); }
    }
    return errs.length ? errs[0] : null;
  },

  fillForm(f) {
    document.getElementById('f-nome').value     = f.nome;
    document.getElementById('f-material').value = f.material;
    document.getElementById('f-fios').value     = f.fios;
    document.getElementById('f-d0').value       = f.d0;
    document.getElementById('f-dmax').value     = f.diam;
    document.getElementById('f-comp').value     = f.comp || '';
    document.getElementById('f-pmax').value     = f.pmax;
    document.getElementById('f-mmax').value     = f.mmax;
    document.getElementById('f-espula').value   = f.espula;
    document.getElementById('f-obs').value      = f.obs || '';
    Fichas._updateFichaPreview();
  },

  clearForm() {
    document.getElementById('f-nome').value     = '';
    document.getElementById('f-material').value = 'Poliéster';
    document.getElementById('f-fios').value     = '';
    document.getElementById('f-d0').value       = '6';
    document.getElementById('f-dmax').value     = '';
    document.getElementById('f-comp').value     = '';
    document.getElementById('f-pmax').value     = '';
    document.getElementById('f-mmax').value     = '';
    document.getElementById('f-espula').value   = 'Branca';
    document.getElementById('f-obs').value      = '';
    document.getElementById('ficha-preview').style.display = 'none';
    UI.clearFieldStates();
  },

  /** Pré-visualização dos parâmetros calculados ao preencher o formulário */
  _updateFichaPreview() {
    const d0   = +document.getElementById('f-d0').value;
    const diam = +document.getElementById('f-dmax').value;
    const pmax = +document.getElementById('f-pmax').value;
    const mmax = +document.getElementById('f-mmax').value;
    const prev = document.getElementById('ficha-preview');
    const txt  = document.getElementById('ficha-preview-txt');
    if (d0 > 0 && diam > d0 && pmax > 0 && mmax > 0) {
      const C0   = (d0   / 100) * Math.PI;
      const Cmax = (diam / 100) * Math.PI;
      const Cmed = (C0 + Cmax) / 2;
      const dC   = Cmax - C0;
      const Vmax = mmax / Cmed;
      const K    = Vmax / pmax;
      const mpp  = mmax / pmax;
      txt.innerHTML =
        `C₀ = ${(C0 * 100).toFixed(2)} cm &nbsp;|&nbsp; ` +
        `C_max = ${(Cmax * 100).toFixed(2)} cm &nbsp;|&nbsp; ` +
        `ΔC = ${(dC * 100).toFixed(2)} cm &nbsp;|&nbsp; ` +
        `K = ${K.toFixed(2)} v/p &nbsp;|&nbsp; ` +
        `<strong>${mpp.toFixed(2)} m/pulso</strong>`;
      prev.style.display = 'block';
    } else {
      prev.style.display = 'none';
    }
  },

  /** Renderiza a tabela de fichas com filtro de busca */
  renderTable(containerId, filter = '') {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    const q        = filter.toLowerCase().trim();
    const filtered = q
      ? this.data.filter(f =>
          f.nome.toLowerCase().includes(q)     ||
          f.material.toLowerCase().includes(q) ||
          f.espula.toLowerCase().includes(q)   ||
          String(f.mmax).includes(q)           ||
          String(f.pmax).includes(q))
      : this.data;

    const countEl = document.getElementById('fichas-count');
    if (countEl) countEl.textContent = filter
      ? `${filtered.length} / ${this.data.length}`
      : `${this.data.length}`;

    if (!filtered.length) {
      wrap.innerHTML = `<div class="empty">
        <div class="empty-icon">📋</div>
        <div class="empty-txt">${filter ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha cadastrada'}</div>
      </div>`;
      return;
    }

    const rows = filtered.map(f => {
      const tagCls  = f.espula === 'Vermelha' ? 'tag-vermelha' : 'tag-branca';
      const offline = String(f.id).startsWith('local_')
        ? `<span class="tag tag-offline" title="Criada offline — sync pendente" style="margin-left:4px">⏳ offline</span>` : '';
      return `<tr>
        <td class="td-nome">${UI.esc(f.nome)}${offline}</td>
        <td><span class="tag ${tagCls}">${UI.esc(f.espula)}</span></td>
        <td class="td-val">${f.diam} cm</td>
        <td class="td-val">${f.pmax} p</td>
        <td class="td-val">${f.mmax} m</td>
        <td><div class="td-act">
          <button class="btn-edit" onclick="App.editFicha('${f.id}')">✏ Editar</button>
          <button class="btn-del"  onclick="App.deleteFicha('${f.id}')">✕ Excluir</button>
        </div></td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `<div class="tbl-wrap"><table class="tbl">
      <thead><tr>
        <th>Nome / Código</th><th>Espula</th>
        <th>Ø Cheio</th><th>Pulsos</th><th>Metragem</th><th>Ações</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }
};
