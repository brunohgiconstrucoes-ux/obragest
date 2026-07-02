-- Migration 0004: Equipamentos e alocações
-- Rodar no SQL Editor do Supabase APÓS a migration 0003

-- ── Catálogo de equipamentos ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('proprio', 'alugado', 'terceiro')),
  numero_serie text,
  valor_aquisicao bigint NOT NULL DEFAULT 0,
  custo_diaria bigint NOT NULL DEFAULT 0,
  proxima_manutencao date,
  status text NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('disponivel', 'alocado', 'manutencao')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipamentos: dono acessa seus dados"
  ON equipamentos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Histórico de alocações ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alocacoes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  equipamento_id uuid REFERENCES equipamentos(id) ON DELETE CASCADE NOT NULL,
  obra_id uuid REFERENCES obras(id) ON DELETE CASCADE NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,
  custo_diaria_override bigint,
  observacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alocacoes_equipamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alocacoes_equipamento: dono acessa seus dados"
  ON alocacoes_equipamento FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_aloc_equip_user ON alocacoes_equipamento(user_id);
CREATE INDEX IF NOT EXISTS idx_aloc_equip_obra ON alocacoes_equipamento(obra_id);
CREATE INDEX IF NOT EXISTS idx_aloc_equip_equip ON alocacoes_equipamento(equipamento_id);
