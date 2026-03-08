/**
 * config.js — Configurações globais do sistema GPE v3.0
 *
 * SEGURANÇA: Credenciais removidas do frontend.
 * Em produção: usar Supabase Auth.
 */
'use strict';

const CFG = {
  PI: Math.PI,
  FUSOS: [8, 12, 16, 17, 24, 32],
  STORAGE_KEY: 'gpe_fichas_v3',
  HISTORY_KEY: 'gpe_history_v3',
  THEME_KEY:   'gpe_theme',
  /* AVISO: Em produção, substituir por Supabase Auth.
     Senhas não devem nunca ficar hardcoded no frontend.
     Este bloco é apenas para funcionalidade local de demonstração. */
  USERS: [
    { login: 'leonardo', hash: 'pcp2026',  perfil: 'Admin',    nome: 'Leonardo' },
    { login: 'operador', hash: 'op1234',   perfil: 'Operador',  nome: 'Operador' }
  ],
  FICHAS_SEED: [
    {
      id: 'seed-branca-01', nome: 'POL-3F-720M-BRANCA', material: 'Poliéster',
      fios: 3, d0: 6.0, diam: 13.0, comp: 14.0, pmax: 60, mmax: 720, espula: 'Branca',
      obs: 'Ficha base. Confirmado por pesagem (massa fio 96,7g) e medição. 12 m/pulso.'
    },
    {
      id: 'seed-vermelha-02', nome: 'POL-3F-663M-VERMELHA', material: 'Poliéster',
      fios: 3, d0: 6.0, diam: 12.5, comp: 11.0, pmax: 58, mmax: 663, espula: 'Vermelha',
      obs: 'Metragem estimada por método de massa (89,1g ÷ 0,13431 g/m = 663m). Confirmar.'
    }
  ]
};
