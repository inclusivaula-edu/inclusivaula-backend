-- Migration: adiciona campos de perfil pedagógico ao cadastro de alunos
-- Camada 1: observable_behavior e what_helps (campos âncora da geração de aulas)
-- Camada 2: disability_type passa a ser nullable (não obrigatório)

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS observable_behavior TEXT,
  ADD COLUMN IF NOT EXISTS what_helps TEXT;

-- disability_type já é TEXT sem NOT NULL constraint na maioria dos setups,
-- mas garante que seja nullable caso tenha constraint:
ALTER TABLE students ALTER COLUMN disability_type DROP NOT NULL;

COMMENT ON COLUMN students.observable_behavior IS 'O que esse aluno faz diferente da turma — comportamento observável pelo professor';
COMMENT ON COLUMN students.what_helps IS 'O que funciona com esse aluno — estratégias já validadas em sala';
