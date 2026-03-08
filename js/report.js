/**
 * report.js — Renderização do relatório de setup com erro de arredondamento
 */
'use strict';

const Report = {

  render(r) {
    this._kpis(r);
    this._alert(r);
    this._lotes(r);
    this._fotek(r);
    this._details(r);
    this._rounding(r);
    document.getElementById('rpt').classList.add('on');
    document.getElementById('rpt-empty').style.display = 'none';
  },

  _kpis(r) {
    document.getElementById('rpt-kpis').innerHTML = `
      <div class="kpi">
        <div class="kpi-val">${r.tc + r.tp}</div>
        <div class="kpi-lbl">Total de Espulas</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">${r.nFusos}</div>
        <div class="kpi-lbl">Fusos</div>
      </div>
      <div class="kpi">
        <div class="kpi-val">${UI.fmtM(r.mTotal)}</div>
        <div class="kpi-lbl">Metros do Pedido</div>
      </div>`;
  },

  _alert(r) {
    let txt = `<strong>📋 Instruções para o Operador:</strong><br>`;
    if (r.tc > 0 && r.tp > 0) {
      txt += `<strong>Lote 1:</strong> Programar <strong>${r.pc} pulsos</strong> e produzir <strong>${r.tc} espulas cheias</strong>. `
           + `Após concluir, <strong>Lote 2:</strong> Reprogramar para <strong>${r.pp} pulsos</strong> e produzir `
           + `<strong>${r.tp} espulas parciais</strong> (${UI.fmtM(r.sobra)} m cada). `
           + `Total: <strong>${r.tc + r.tp} espulas</strong> em ${r.nFusos} fusos.`;
    } else {
      txt += `Programar <strong>${r.pc} pulsos</strong> e produzir <strong>${r.tc} espulas cheias</strong>. `
           + `Divisão exata — nenhuma espula parcial necessária.`;
    }
    document.getElementById('rpt-alert').innerHTML = txt;
  },

  _lotes(r) {
    let html = '';
    if (r.tc > 0) {
      html += `<div class="lote lote-1">
        <div class="lote-head">
          <div class="lote-title">LOTE 1 — ESPULAS CHEIAS</div>
          <div class="lote-badge">${r.pc} pulsos</div>
        </div>
        <div class="lote-steps">
          <div class="lote-step"><div class="step-n">1</div><div>Programar <strong>${r.pc} pulsos</strong> no <strong>Contador de Camada de Fio</strong> do painel.</div></div>
          <div class="lote-step"><div class="step-n">2</div><div>Programar <strong>${r.tc} bobinas</strong> no <strong>Contador de Bobinas</strong>.</div></div>
          <div class="lote-step"><div class="step-n">3</div><div>Iniciar. A máquina para automaticamente ao concluir <strong>${r.tc} espulas cheias</strong>.</div></div>
        </div>
      </div>`;
    }
    if (r.tp > 0) {
      html += `<div class="lote lote-2">
        <div class="lote-head">
          <div class="lote-title">LOTE 2 — ESPULAS PARCIAIS</div>
          <div class="lote-badge">${r.pp} pulsos</div>
        </div>
        <div class="lote-steps">
          <div class="lote-step"><div class="step-n">1</div><div>Reprogramar <strong>${r.pp} pulsos</strong> no <strong>Contador de Camada de Fio</strong>.</div></div>
          <div class="lote-step"><div class="step-n">2</div><div>Programar <strong>${r.tp} bobinas</strong> no <strong>Contador de Bobinas</strong>.</div></div>
          <div class="lote-step"><div class="step-n">3</div><div>Produzir <strong>${r.tp} espulas parciais</strong> com <strong>${UI.fmtM(r.sobra)} m</strong> cada.</div></div>
        </div>
      </div>`;
    }
    document.getElementById('rpt-lotes').innerHTML = html;
  },

  _fotek(r) {
    UI.fotek.set(r.pc, r.tc + r.tp);
    const l1 = document.getElementById('fotek-btn-l1');
    const l2 = document.getElementById('fotek-btn-l2');
    if (!l1 || !l2) return;
    l1.classList.add('on-l1'); l2.classList.remove('on-l2');
    l1.style.display = r.tc > 0 ? '' : 'none';
    l2.style.display = r.tp > 0 ? '' : 'none';
    l1.onclick = () => { UI.fotek.set(r.pc, r.tc); l1.classList.add('on-l1');  l2.classList.remove('on-l2'); };
    l2.onclick = () => { UI.fotek.set(r.pp, r.tp); l2.classList.add('on-l2');  l1.classList.remove('on-l1'); };
  },

  _details(r) {
    const f = r.f;
    let html = `
      <div class="cb-row"><span class="cb-k cb-ttl">VARIÁVEIS DA FICHA</span></div>
      <div class="cb-row"><span class="cb-k">Ficha</span><span class="cb-v">${UI.esc(f.nome)}</span></div>
      <div class="cb-row"><span class="cb-k">D₀ (vazio)</span><span class="cb-v">${f.d0} cm</span></div>
      <div class="cb-row"><span class="cb-k">D_max (cheio)</span><span class="cb-v">${f.diam} cm</span></div>
      <div class="cb-row"><span class="cb-k">C₀</span><span class="cb-v">${UI.fmt4(r.C0 * 100)} cm</span></div>
      <div class="cb-row"><span class="cb-k">C_max</span><span class="cb-v">${UI.fmt4(r.Cmax * 100)} cm</span></div>
      <div class="cb-row"><span class="cb-k">C_med</span><span class="cb-v">${UI.fmt4(r.Cmed * 100)} cm</span></div>
      <div class="cb-row"><span class="cb-k">ΔC</span><span class="cb-v">${UI.fmt4(r.dC * 100)} cm</span></div>
      <div class="cb-row"><span class="cb-k">V_max</span><span class="cb-v">${UI.fmt4(r.Vmax)} voltas</span></div>
      <div class="cb-row"><span class="cb-k">K (sensor)</span><span class="cb-v">${UI.fmt4(r.K)} v/p</span></div>
      <div class="cb-sep"></div>
      <div class="cb-row"><span class="cb-k cb-ttl">DIVISÃO DO PEDIDO</span></div>
      <div class="cb-row"><span class="cb-k">Metragem total</span><span class="cb-v">${UI.fmtM(r.mTotal)} m</span></div>
      <div class="cb-row"><span class="cb-k">Fusos</span><span class="cb-v">${r.nFusos}</span></div>
      <div class="cb-row"><span class="cb-k">Cheias por fuso</span><span class="cb-v">${r.cheiasPF}</span></div>
      <div class="cb-row"><span class="cb-k">Sobra por fuso</span><span class="cb-v">${UI.fmtM(r.sobra)} m</span></div>
      <div class="cb-row"><span class="cb-k">Total cheias</span><span class="cb-v">${r.tc}</span></div>
      <div class="cb-row"><span class="cb-k">Total parciais</span><span class="cb-v">${r.tp}</span></div>`;

    if (r.tp > 0) {
      html += `
        <div class="cb-sep"></div>
        <div class="cb-row"><span class="cb-k cb-ttl">BHASKARA — LOTE 2</span></div>
        <div class="cb-row"><span class="cb-k">m desejada</span><span class="cb-v">${UI.fmtM(r.sobra)} m</span></div>
        <div class="cb-row"><span class="cb-k">a</span><span class="cb-v">${UI.fmt6(r.a_)}</span></div>
        <div class="cb-row"><span class="cb-k">b</span><span class="cb-v">${UI.fmt6(r.b_)}</span></div>
        <div class="cb-row"><span class="cb-k">c</span><span class="cb-v">${UI.fmt6(r.c_)}</span></div>
        <div class="cb-row"><span class="cb-k">Δ (discriminante)</span><span class="cb-v">${UI.fmt6(r.D_)}</span></div>
        <div class="cb-row"><span class="cb-k">x (raiz exata)</span><span class="cb-v">${UI.fmt4(r.x_)} pulsos</span></div>
        <div class="cb-row"><span class="cb-k">P_lote2 = ⌈x⌉</span><span class="cb-v">${r.pp} pulsos</span></div>`;
    }
    document.getElementById('rpt-details').innerHTML = html;
  },

  /** Erro de arredondamento — novo v3.0 */
  _rounding(r) {
    const wrap = document.getElementById('rounding-info');
    const val  = document.getElementById('rounding-val');
    if (!wrap || !val) return;
    if (r.tp > 0) {
      const err = Math.max(0, r.roundingErr);
      val.textContent = err < 0.01 ? 'divisão exata (0,00 m)' : `+${UI.fmt(err, 2)} m`;
      wrap.classList.remove('hidden');
    } else {
      wrap.classList.add('hidden');
    }
  }
};
