/**
 * calc.js — Motor Matemático puro (sem efeitos colaterais)
 *
 * Modelo: Crescimento Radial Linear (Espiral de Arquimedes)
 * Inversão: Equação Quadrática via Fórmula de Bhaskara
 */
'use strict';

const Calc = {

  base(f) {
    const C0   = (f.d0   / 100) * CFG.PI;
    const Cmax = (f.diam / 100) * CFG.PI;
    const Cmed = (C0 + Cmax) / 2;
    const dC   = Cmax - C0;
    const Vmax = f.mmax / Cmed;
    const K    = Vmax / f.pmax;
    return { C0, Cmax, Cmed, dC, Vmax, K };
  },

  metragem(x, f) {
    const { C0, dC, K } = this.base(f);
    return C0 * K * x + (dC * K / (2 * f.pmax)) * x * x;
  },

  calcPulsos(mDes, f) {
    if (mDes <= 0)      return 0;
    if (mDes >= f.mmax) return f.pmax;
    const { C0, dC, K } = this.base(f);
    const a = (dC * K) / (2 * f.pmax);
    const b = C0 * K;
    const c = -mDes;
    const D = b * b - 4 * a * c;
    if (D < 0) return f.pmax;
    const x = (-b + Math.sqrt(D)) / (2 * a);
    return Math.min(Math.ceil(x), f.pmax);
  },

  setup(mTotal, nFusos, f) {
    const base     = this.base(f);
    const cheiasPF = Math.floor(mTotal / f.mmax);
    const sobra    = mTotal % f.mmax;
    const tc = cheiasPF * nFusos;
    const tp = sobra > 0 ? nFusos : 0;
    const pc = f.pmax;
    const pp = sobra > 0 ? this.calcPulsos(sobra, f) : 0;

    let a_ = 0, b_ = 0, c_ = 0, D_ = 0, x_ = 0, xCeil = 0, roundingErr = 0;
    if (sobra > 0) {
      const { C0, dC, K } = base;
      a_ = (dC * K) / (2 * f.pmax);
      b_ = C0 * K;
      c_ = -sobra;
      D_ = b_ * b_ - 4 * a_ * c_;
      x_ = (-b_ + Math.sqrt(D_)) / (2 * a_);
      xCeil      = Math.ceil(x_);
      roundingErr = this.metragem(xCeil, f) - sobra;
    }

    return {
      tc, tp, pc, pp, cheiasPF, sobra,
      ...base,
      a_, b_, c_, D_, x_, xCeil, roundingErr,
      mTotal, nFusos, f
    };
  },

  validate(mTotal, nFusos, fichaId, fichas) {
    const erros = [];
    if (!nFusos)            erros.push('Selecione o número de fusos.');
    if (!fichaId)           erros.push('Selecione uma ficha técnica.');
    if (!mTotal || mTotal <= 0) erros.push('Informe a metragem total do pedido.');
    const f = fichas.find(x => x.id === fichaId);
    if (fichaId && !f)      erros.push('Ficha técnica não encontrada.');
    return { ok: erros.length === 0, erros, f };
  }
};
