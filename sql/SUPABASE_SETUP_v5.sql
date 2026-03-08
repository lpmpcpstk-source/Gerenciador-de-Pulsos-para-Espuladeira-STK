-- ================================================================
--  SUPABASE_SETUP_v5.sql
--  Gerenciador de Pulso — Espuladeira v4.0
--  Stickfran Indústria e Comércio de Componentes
--
--  ▶ COMO USAR:
--  1. Acesse o painel do Supabase → SQL Editor → New query
--  2. Cole TODO o conteúdo deste arquivo
--  3. Clique em Run (▶)
--  4. Deve aparecer "Success. No rows returned."
--
--  Se já executou versões anteriores, o script limpa tudo
--  antes de recriar (DROP IF EXISTS em cada etapa).
-- ================================================================


-- ================================================================
-- 0. LIMPEZA COMPLETA (seguro para re-executar)
-- ================================================================
DROP TABLE IF EXISTS setups_log       CASCADE;
DROP TABLE IF EXISTS fichas_tecnicas  CASCADE;
DROP TABLE IF EXISTS usuarios         CASCADE;
DROP TABLE IF EXISTS perfis           CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;


-- ================================================================
-- 1. EXTENSÃO UUID
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- 2. FUNÇÃO: updated_at automático
-- ================================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- 3. TABELA: usuarios
--    Login local sincronizado entre dispositivos.
--    ⚠ Em produção migrar para Supabase Auth.
-- ================================================================
CREATE TABLE usuarios (
  id         TEXT        PRIMARY KEY,
  login      TEXT        NOT NULL UNIQUE,
  hash       TEXT        NOT NULL,
  nome       TEXT        NOT NULL,
  perfil     TEXT        NOT NULL DEFAULT 'Operador'
               CHECK (perfil IN ('PCP', 'Operador', 'Admin')),
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_login  ON usuarios (login);
CREATE INDEX idx_usuarios_ativo  ON usuarios (ativo);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS: anon key tem acesso total (controle via frontend)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_anon_all" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);


-- ================================================================
-- 4. TABELA: fichas_tecnicas
-- ================================================================
CREATE TABLE fichas_tecnicas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  material   TEXT        NOT NULL DEFAULT 'Poliéster',
  fios       INTEGER     NOT NULL DEFAULT 3  CHECK (fios BETWEEN 1 AND 20),
  d0         NUMERIC(6,2) NOT NULL           CHECK (d0 > 0),
  diam       NUMERIC(6,2) NOT NULL           CHECK (diam > 0),
  comp       NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (comp >= 0),
  pmax       INTEGER     NOT NULL            CHECK (pmax BETWEEN 1 AND 999),
  mmax       NUMERIC(10,2) NOT NULL          CHECK (mmax >= 1),
  espula     TEXT        NOT NULL DEFAULT 'Branca'
               CHECK (espula IN ('Branca', 'Vermelha', 'Verde', 'Outra')),
  obs        TEXT        NOT NULL DEFAULT '',
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT diam_gt_d0      CHECK (diam > d0),
  CONSTRAINT nome_ativo_unico UNIQUE (nome, ativo)
);

CREATE INDEX idx_fichas_ativo   ON fichas_tecnicas (ativo);
CREATE INDEX idx_fichas_nome    ON fichas_tecnicas (nome);
CREATE INDEX idx_fichas_espula  ON fichas_tecnicas (espula);
CREATE INDEX idx_fichas_created ON fichas_tecnicas (created_at DESC);

CREATE TRIGGER trg_fichas_updated_at
  BEFORE UPDATE ON fichas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS: anon key tem acesso total (controle via frontend)
ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fichas_anon_all" ON fichas_tecnicas FOR ALL TO anon USING (true) WITH CHECK (true);


-- ================================================================
-- 5. TABELA: setups_log (rastreabilidade)
-- ================================================================
CREATE TABLE setups_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id       UUID        REFERENCES fichas_tecnicas(id) ON DELETE SET NULL,
  ficha_nome     TEXT        NOT NULL,
  n_fusos        INTEGER     NOT NULL CHECK (n_fusos >= 1),
  m_total        NUMERIC(10,2) NOT NULL CHECK (m_total > 0),
  pulsos_lote1   INTEGER     NOT NULL,
  espulas_lote1  INTEGER     NOT NULL DEFAULT 0,
  pulsos_lote2   INTEGER,
  espulas_lote2  INTEGER,
  m_sobra        NUMERIC(10,2),
  rounding_err   NUMERIC(10,6),
  operador_nome  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_setups_ficha   ON setups_log (ficha_id);
CREATE INDEX idx_setups_created ON setups_log (created_at DESC);

-- RLS: anon key tem acesso total
ALTER TABLE setups_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setups_anon_all" ON setups_log FOR ALL TO anon USING (true) WITH CHECK (true);


-- ================================================================
-- 6. VIEW: fichas_ativas (conveniência)
-- ================================================================
CREATE OR REPLACE VIEW fichas_ativas AS
  SELECT
    id, nome, material, fios, d0, diam, comp, pmax, mmax, espula, obs,
    created_by, created_at, updated_at,
    ROUND((d0   / 100.0 * PI())::NUMERIC, 6) AS c0_m,
    ROUND((diam / 100.0 * PI())::NUMERIC, 6) AS cmax_m,
    ROUND((mmax / pmax)::NUMERIC,          4) AS m_por_pulso
  FROM fichas_tecnicas
  WHERE ativo = TRUE
  ORDER BY nome;


-- ================================================================
-- 7. SEED: Usuários iniciais
-- ================================================================
INSERT INTO usuarios (id, login, hash, nome, perfil, ativo) VALUES
  ('u_leonardo', 'leonardo', 'pcp2026', 'Leonardo', 'Admin',    TRUE),
  ('u_operador', 'operador', 'op1234',  'Operador', 'Operador', TRUE)
ON CONFLICT (login) DO NOTHING;


-- ================================================================
-- 8. SEED: Fichas técnicas base
-- ================================================================
INSERT INTO fichas_tecnicas
  (nome, material, fios, d0, diam, comp, pmax, mmax, espula, obs)
VALUES
  (
    'POL-3F-720M-BRANCA', 'Poliéster', 3, 6.0, 13.0, 14.0, 60, 720, 'Branca',
    'Ficha base confirmada por pesagem (massa fio 96,7g) e medição. 12,00 m/pulso. K=40,21 v/p.'
  ),
  (
    'POL-3F-663M-VERMELHA', 'Poliéster', 3, 6.0, 12.5, 11.0, 58, 663, 'Vermelha',
    'Metragem estimada por método de massa (89,1g ÷ 0,13431 g/m ≈ 663m). Confirmar medindo na máquina.'
  )
ON CONFLICT (nome, ativo) DO NOTHING;


-- ================================================================
-- FIM DO SCRIPT
-- Verifique: SELECT * FROM usuarios; SELECT * FROM fichas_tecnicas;
-- ================================================================
