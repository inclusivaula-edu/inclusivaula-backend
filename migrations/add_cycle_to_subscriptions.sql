-- Adiciona coluna cycle na tabela subscriptions para suportar mensal/semestral/anual
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cycle TEXT DEFAULT 'mensal'
    CHECK (cycle IN ('mensal', 'semestral', 'anual'));
