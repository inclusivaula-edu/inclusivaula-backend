-- ============================================================
-- Migration: Billing (Asaas) — InclusivAula
-- Rodar no SQL Editor do Supabase (painel > SQL Editor)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / DO NOTHING)
-- ============================================================

-- 1. Adiciona colunas de billing na tabela subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS school_id         UUID REFERENCES schools(id),
  ADD COLUMN IF NOT EXISTS asaas_customer_id  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- 2. Constraint única por escola (permite upsert por school_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_school_id_unique'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_school_id_unique UNIQUE (school_id);
  END IF;
END $$;

-- 3. Índice para lookup rápido no webhook
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_sub
  ON subscriptions (asaas_subscription_id)
  WHERE asaas_subscription_id IS NOT NULL;

-- 4. Função RPC para incrementar uso (idempotente — recria se não existir)
CREATE OR REPLACE FUNCTION incrementar_uso(
  p_user_id  UUID,
  p_mes      TEXT,
  p_campo    TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_campo NOT IN ('aulas_geradas', 'relatorios_gerados') THEN
    RAISE EXCEPTION 'Campo inválido: %', p_campo;
  END IF;

  UPDATE usage_tracking
  SET aulas_geradas      = CASE WHEN p_campo = 'aulas_geradas'      THEN aulas_geradas + 1      ELSE aulas_geradas      END,
      relatorios_gerados = CASE WHEN p_campo = 'relatorios_gerados' THEN relatorios_gerados + 1 ELSE relatorios_gerados END
  WHERE user_id = p_user_id
    AND mes = p_mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS — Row Level Security (opcional mas recomendado)
-- ATENÇÃO: Testar no sandbox antes de habilitar em produção.
-- O backend usa service_role (bypassa RLS) — isso protege
-- apenas acessos diretos via anon key (ex: frontend).
-- ============================================================

-- Descomente e execute APÓS validar no sandbox:

-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "students_by_school" ON students
--   FOR ALL USING (
--     school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
--   );

-- ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "lessons_own" ON lessons
--   FOR ALL USING (user_id = auth.uid());

-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "profiles_own" ON profiles
--   FOR ALL USING (id = auth.uid());
