-- ============================================================
-- Migration 0002 — Converter colunas monetárias de numeric(14,2)
--                  para bigint (centavos inteiros)
-- Sistema de Gestão de Construtora (Licitação Pública)
--
-- ATENÇÃO: execute no SQL Editor do Supabase.
-- As views devem ser dropadas antes dos ALTERs porque o PostgreSQL
-- não permite alterar o tipo de colunas referenciadas por views.
-- ============================================================

-- ============================================================
-- PASSO 1: Dropar views que dependem das colunas a alterar
-- ============================================================
DROP VIEW IF EXISTS vw_obra_kpis;
DROP VIEW IF EXISTS vw_planilha_saldo;

-- ============================================================
-- PASSO 2: Alterar colunas monetárias para bigint (centavos)
-- ============================================================

-- obras.valor_total
ALTER TABLE obras
  ALTER COLUMN valor_total TYPE bigint
  USING round(valor_total * 100)::bigint;

-- planilha_itens: valor_unitario + valor_total (coluna gerada)
ALTER TABLE planilha_itens
  ALTER COLUMN valor_unitario TYPE bigint
  USING round(valor_unitario * 100)::bigint;

ALTER TABLE planilha_itens
  DROP COLUMN valor_total;

ALTER TABLE planilha_itens
  ADD COLUMN valor_total bigint
    GENERATED ALWAYS AS (round(quantidade_contratada * valor_unitario)::bigint) STORED;

-- medicoes
ALTER TABLE medicoes
  ALTER COLUMN valor_bruto        TYPE bigint USING round(valor_bruto        * 100)::bigint,
  ALTER COLUMN retencao_caucao    TYPE bigint USING round(retencao_caucao    * 100)::bigint,
  ALTER COLUMN retencao_iss       TYPE bigint USING round(retencao_iss       * 100)::bigint,
  ALTER COLUMN retencao_inss      TYPE bigint USING round(retencao_inss      * 100)::bigint,
  ALTER COLUMN retencao_irrf      TYPE bigint USING round(retencao_irrf      * 100)::bigint,
  ALTER COLUMN valor_liquido      TYPE bigint USING round(valor_liquido      * 100)::bigint,
  ALTER COLUMN valor_recebido     TYPE bigint USING round(valor_recebido     * 100)::bigint;

-- medicao_itens: valor_unitario + valor_total (coluna gerada)
ALTER TABLE medicao_itens
  ALTER COLUMN valor_unitario TYPE bigint
  USING round(valor_unitario * 100)::bigint;

ALTER TABLE medicao_itens
  DROP COLUMN valor_total;

ALTER TABLE medicao_itens
  ADD COLUMN valor_total bigint
    GENERATED ALWAYS AS (round(quantidade_executada * valor_unitario)::bigint) STORED;

-- mao_de_obra
ALTER TABLE mao_de_obra
  ALTER COLUMN valor_bruto    TYPE bigint USING round(valor_bruto    * 100)::bigint,
  ALTER COLUMN retencao_inss  TYPE bigint USING round(retencao_inss  * 100)::bigint,
  ALTER COLUMN retencao_iss   TYPE bigint USING round(retencao_iss   * 100)::bigint,
  ALTER COLUMN retencao_irrf  TYPE bigint USING round(retencao_irrf  * 100)::bigint,
  ALTER COLUMN valor_diaria   TYPE bigint USING round(valor_diaria   * 100)::bigint,
  ALTER COLUMN valor_pago     TYPE bigint USING round(valor_pago     * 100)::bigint;

-- materiais
ALTER TABLE materiais
  ALTER COLUMN valor_total TYPE bigint
  USING round(valor_total * 100)::bigint;

-- fluxo_caixa
ALTER TABLE fluxo_caixa
  ALTER COLUMN valor TYPE bigint
  USING round(valor * 100)::bigint;

-- exportacoes_contador
ALTER TABLE exportacoes_contador
  ALTER COLUMN total_valor TYPE bigint
  USING round(total_valor * 100)::bigint;

-- ============================================================
-- PASSO 3: Recriar as views com definições idênticas ao SCHEMA.sql
-- ============================================================

CREATE OR REPLACE VIEW vw_planilha_saldo AS
SELECT
  pi.id                                         AS planilha_item_id,
  pi.obra_id,
  pi.user_id,
  pi.codigo,
  pi.descricao,
  pi.unidade,
  pi.quantidade_contratada,
  pi.valor_unitario,
  pi.valor_total                                AS valor_contratado,
  COALESCE(SUM(mi.quantidade_executada), 0)     AS quantidade_medida,
  pi.quantidade_contratada
    - COALESCE(SUM(mi.quantidade_executada), 0) AS quantidade_restante,
  COALESCE(SUM(mi.valor_total), 0)              AS valor_medido,
  CASE
    WHEN pi.quantidade_contratada > 0
    THEN ROUND(
      COALESCE(SUM(mi.quantidade_executada), 0)
      / pi.quantidade_contratada * 100, 2)
    ELSE 0
  END                                           AS percentual_executado
FROM planilha_itens pi
LEFT JOIN medicao_itens mi ON mi.planilha_item_id = pi.id
GROUP BY pi.id;

CREATE OR REPLACE VIEW vw_obra_kpis AS
SELECT
  o.id                                          AS obra_id,
  o.user_id,
  o.valor_total                                 AS valor_contratado,
  CASE
    WHEN o.valor_total > 0
    THEN ROUND(
      COALESCE(SUM(ps.valor_medido), 0)
      / o.valor_total * 100, 2)
    ELSE 0
  END                                           AS percentual_executado,
  COALESCE(SUM(m.valor_liquido)
    FILTER (WHERE m.status IN ('aguardando','recebido','parcial')), 0)
                                                AS total_faturado,
  COALESCE(SUM(m.valor_recebido)
    FILTER (WHERE m.status IN ('recebido','parcial')), 0)
                                                AS total_recebido,
  COALESCE(SUM(fc.valor)
    FILTER (WHERE fc.tipo = 'saida' AND fc.status = 'realizado'), 0)
                                                AS total_saidas,
  COALESCE(SUM(m.valor_recebido)
    FILTER (WHERE m.status IN ('recebido','parcial')), 0)
  - COALESCE(SUM(fc.valor)
    FILTER (WHERE fc.tipo = 'saida' AND fc.status = 'realizado'), 0)
                                                AS margem_real
FROM obras o
LEFT JOIN vw_planilha_saldo ps ON ps.obra_id = o.id
LEFT JOIN medicoes m           ON m.obra_id = o.id
LEFT JOIN fluxo_caixa fc       ON fc.obra_id = o.id
GROUP BY o.id;
