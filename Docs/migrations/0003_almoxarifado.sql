-- Migration 0003: Almoxarifado (estoque central + por obra)
-- Rodar no SQL Editor do Supabase

-- ── Catálogo de itens ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  unidade text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN (
    'cimento', 'aco', 'madeira', 'eletrica', 'hidraulica', 'epi', 'outros'
  )),
  estoque_minimo numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE estoque_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_itens: dono acessa seus dados"
  ON estoque_itens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Movimentações (toda entrada, saída, transferência e ajuste) ───────────────

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  item_id uuid REFERENCES estoque_itens(id) ON DELETE CASCADE NOT NULL,
  obra_id uuid REFERENCES obras(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'entrada',
    'saida',
    'transferencia_entrada',
    'transferencia_saida',
    'ajuste'
  )),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  custo_unitario bigint NOT NULL DEFAULT 0,
  data date NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentacoes_estoque: dono acessa seus dados"
  ON movimentacoes_estoque FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mov_estoque_user_item ON movimentacoes_estoque(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_obra ON movimentacoes_estoque(obra_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_data ON movimentacoes_estoque(data);

-- ── View: saldo por item (central quando obra_id IS NULL, por obra quando não) ─

CREATE OR REPLACE VIEW vw_saldo_estoque AS
SELECT
  i.id AS item_id,
  i.user_id,
  i.nome,
  i.unidade,
  i.categoria,
  i.estoque_minimo,
  m.obra_id,
  COALESCE(SUM(
    CASE
      WHEN m.tipo IN ('entrada', 'transferencia_entrada', 'ajuste') THEN m.quantidade
      WHEN m.tipo IN ('saida', 'transferencia_saida') THEN -m.quantidade
      ELSE 0
    END
  ), 0) AS saldo
FROM estoque_itens i
LEFT JOIN movimentacoes_estoque m
  ON m.item_id = i.id AND m.user_id = i.user_id
GROUP BY i.id, i.user_id, i.nome, i.unidade, i.categoria, i.estoque_minimo, m.obra_id;
