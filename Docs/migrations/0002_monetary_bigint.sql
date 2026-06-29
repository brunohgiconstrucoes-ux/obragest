-- ============================================================
-- Migration 0002 — Converter colunas monetárias de numeric(14,2)
--                  para bigint (centavos inteiros)
-- Sistema de Gestão de Construtora (Licitação Pública)
--
-- ATENÇÃO: execute no SQL Editor do Supabase.
-- As colunas GENERATED ALWAYS AS precisam ser dropadas e recriadas
-- porque o PostgreSQL não permite ALTER TYPE em colunas geradas.
-- ============================================================

-- ============================================================
-- 1. obras.valor_total
-- ============================================================
ALTER TABLE obras
  ALTER COLUMN valor_total TYPE bigint
  USING round(valor_total * 100)::bigint;

-- ============================================================
-- 2. planilha_itens — valor_unitario e valor_total (gerada)
-- valor_total é GENERATED ALWAYS AS (quantidade_contratada * valor_unitario)
-- Para alterar o tipo precisamos dropar e recriar a coluna gerada.
-- ============================================================
ALTER TABLE planilha_itens
  ALTER COLUMN valor_unitario TYPE bigint
  USING round(valor_unitario * 100)::bigint;

-- Dropar coluna gerada antes de alterar o tipo
ALTER TABLE planilha_itens
  DROP COLUMN valor_total;

-- Recriar como bigint (produto quantidade × valor_unitario em centavos)
-- quantidade_contratada é numeric(14,3) — o produto já fica em centavos.
ALTER TABLE planilha_itens
  ADD COLUMN valor_total bigint
    GENERATED ALWAYS AS (round(quantidade_contratada * valor_unitario)::bigint) STORED;

-- ============================================================
-- 3. medicoes — todas as colunas monetárias
-- ============================================================
ALTER TABLE medicoes
  ALTER COLUMN valor_bruto        TYPE bigint USING round(valor_bruto        * 100)::bigint,
  ALTER COLUMN retencao_caucao    TYPE bigint USING round(retencao_caucao    * 100)::bigint,
  ALTER COLUMN retencao_iss       TYPE bigint USING round(retencao_iss       * 100)::bigint,
  ALTER COLUMN retencao_inss      TYPE bigint USING round(retencao_inss      * 100)::bigint,
  ALTER COLUMN retencao_irrf      TYPE bigint USING round(retencao_irrf      * 100)::bigint,
  ALTER COLUMN valor_liquido      TYPE bigint USING round(valor_liquido      * 100)::bigint,
  ALTER COLUMN valor_recebido     TYPE bigint USING round(valor_recebido     * 100)::bigint;

-- ============================================================
-- 4. medicao_itens — valor_unitario e valor_total (gerada)
-- ============================================================
ALTER TABLE medicao_itens
  ALTER COLUMN valor_unitario TYPE bigint
  USING round(valor_unitario * 100)::bigint;

-- Dropar coluna gerada
ALTER TABLE medicao_itens
  DROP COLUMN valor_total;

-- Recriar como bigint
ALTER TABLE medicao_itens
  ADD COLUMN valor_total bigint
    GENERATED ALWAYS AS (round(quantidade_executada * valor_unitario)::bigint) STORED;

-- ============================================================
-- 5. mao_de_obra — todas as colunas monetárias
-- ============================================================
ALTER TABLE mao_de_obra
  ALTER COLUMN valor_bruto    TYPE bigint USING round(valor_bruto    * 100)::bigint,
  ALTER COLUMN retencao_inss  TYPE bigint USING round(retencao_inss  * 100)::bigint,
  ALTER COLUMN retencao_iss   TYPE bigint USING round(retencao_iss   * 100)::bigint,
  ALTER COLUMN retencao_irrf  TYPE bigint USING round(retencao_irrf  * 100)::bigint,
  ALTER COLUMN valor_diaria   TYPE bigint USING round(valor_diaria   * 100)::bigint,
  ALTER COLUMN valor_pago     TYPE bigint USING round(valor_pago     * 100)::bigint;

-- ============================================================
-- 6. materiais.valor_total
-- ============================================================
ALTER TABLE materiais
  ALTER COLUMN valor_total TYPE bigint
  USING round(valor_total * 100)::bigint;

-- ============================================================
-- 7. fluxo_caixa.valor
-- ============================================================
ALTER TABLE fluxo_caixa
  ALTER COLUMN valor TYPE bigint
  USING round(valor * 100)::bigint;

-- ============================================================
-- 8. exportacoes_contador.total_valor
-- ============================================================
ALTER TABLE exportacoes_contador
  ALTER COLUMN total_valor TYPE bigint
  USING round(total_valor * 100)::bigint;

-- ============================================================
-- As views vw_planilha_saldo e vw_obra_kpis referenciam colunas
-- das tabelas acima. Como são CREATE OR REPLACE VIEW, o PostgreSQL
-- as atualiza automaticamente quando o schema das tabelas muda.
-- Não é necessário recriá-las manualmente.
-- ============================================================
