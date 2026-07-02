-- Seed completo: popula fluxo de caixa histórico (6 meses) + medições + MO + PF
-- Executa após seed_almoxarifado.sql e seed_equipamentos.sql

DO $$
DECLARE
  uid   uuid := (SELECT id FROM auth.users WHERE email = 'brunohgiconstrucoes@gmail.com' LIMIT 1);
  obra1 uuid;
  obra2 uuid;

  -- IDs de lançamentos de medição
  med1a uuid := gen_random_uuid();
  med1b uuid := gen_random_uuid();
  med1c uuid := gen_random_uuid();
  med1d uuid := gen_random_uuid();
  med2a uuid := gen_random_uuid();
  med2b uuid := gen_random_uuid();

BEGIN

  SELECT id INTO obra1 FROM obras WHERE user_id = uid ORDER BY created_at LIMIT 1;
  SELECT id INTO obra2 FROM obras WHERE user_id = uid ORDER BY created_at OFFSET 1 LIMIT 1;
  IF obra2 IS NULL THEN obra2 := obra1; END IF;

  -- ── Medições (receitas PJ) — obra 1 ─────────────────────────────────────────
  -- Mês -5: medição recebida
  INSERT INTO medicoes (id, user_id, obra_id, numero, periodo_inicio, periodo_fim,
    valor_bruto, valor_retencoes, valor_liquido, status, data_prevista_recebimento, data_recebimento)
  VALUES
    (med1a, uid, obra1, 1,
     CURRENT_DATE - 155, CURRENT_DATE - 126,
     4800000, 720000, 4080000,
     'recebido', CURRENT_DATE - 125, CURRENT_DATE - 123),
    (med1b, uid, obra1, 2,
     CURRENT_DATE - 125, CURRENT_DATE - 96,
     5200000, 780000, 4420000,
     'recebido', CURRENT_DATE - 95, CURRENT_DATE - 92),
    (med1c, uid, obra1, 3,
     CURRENT_DATE - 95, CURRENT_DATE - 66,
     4600000, 690000, 3910000,
     'recebido', CURRENT_DATE - 65, CURRENT_DATE - 63),
    (med1d, uid, obra1, 4,
     CURRENT_DATE - 65, CURRENT_DATE - 36,
     5500000, 825000, 4675000,
     'aguardando', CURRENT_DATE - 5, NULL);

  -- ── Medições — obra 2 ────────────────────────────────────────────────────────
  IF obra2 <> obra1 THEN
    INSERT INTO medicoes (id, user_id, obra_id, numero, periodo_inicio, periodo_fim,
      valor_bruto, valor_retencoes, valor_liquido, status, data_prevista_recebimento, data_recebimento)
    VALUES
      (med2a, uid, obra2, 1,
       CURRENT_DATE - 120, CURRENT_DATE - 91,
       3200000, 480000, 2720000,
       'recebido', CURRENT_DATE - 90, CURRENT_DATE - 88),
      (med2b, uid, obra2, 2,
       CURRENT_DATE - 90, CURRENT_DATE - 61,
       3800000, 570000, 3230000,
       'recebido', CURRENT_DATE - 60, CURRENT_DATE - 58);
  END IF;

  -- ── Fluxo de caixa PJ — Entradas (medições recebidas) ────────────────────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, origem_id, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    (uid, obra1, 'pj_obra', 'entrada', 'medicao', med1a,
     'Medição #1 — ' || (SELECT nome FROM obras WHERE id = obra1),
     'medicao', 4080000, CURRENT_DATE - 123, 'realizado', CURRENT_DATE - 123, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao', med1b,
     'Medição #2 — ' || (SELECT nome FROM obras WHERE id = obra1),
     'medicao', 4420000, CURRENT_DATE - 92, 'realizado', CURRENT_DATE - 92, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao', med1c,
     'Medição #3 — ' || (SELECT nome FROM obras WHERE id = obra1),
     'medicao', 3910000, CURRENT_DATE - 63, 'realizado', CURRENT_DATE - 63, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao', med1d,
     'Medição #4 — ' || (SELECT nome FROM obras WHERE id = obra1),
     'medicao', 4675000, CURRENT_DATE - 5, 'previsto', NULL, true);

  IF obra2 <> obra1 THEN
    INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, origem_id, descricao,
      categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
    VALUES
      (uid, obra2, 'pj_obra', 'entrada', 'medicao', med2a,
       'Medição #1 — ' || (SELECT nome FROM obras WHERE id = obra2),
       'medicao', 2720000, CURRENT_DATE - 88, 'realizado', CURRENT_DATE - 88, true),
      (uid, obra2, 'pj_obra', 'entrada', 'medicao', med2b,
       'Medição #2 — ' || (SELECT nome FROM obras WHERE id = obra2),
       'medicao', 3230000, CURRENT_DATE - 58, 'realizado', CURRENT_DATE - 58, true);
  END IF;

  -- ── Fluxo de caixa PJ — Saídas distribuídas (materiais, MO, admin) ───────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    -- Mês -5
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Materiais iniciais — cimento e areia',
     'cimento', 1200000, CURRENT_DATE - 155, 'realizado', CURRENT_DATE - 155, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'RPA — Carlos Pereira (carpinteiro)',
     'mao_de_obra', 480000, CURRENT_DATE - 148, 'realizado', CURRENT_DATE - 148, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'Avulso — diaristas fundação (5 dias)',
     'mao_de_obra', 180000, CURRENT_DATE - 145, 'realizado', CURRENT_DATE - 145, false),

    -- Mês -4
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Vergalhão CA-50 — Aço Minas NF 4521',
     'aco', 540000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'NF — Elétrica Boa Vista (instalações)',
     'mao_de_obra', 350000, CURRENT_DATE - 115, 'realizado', CURRENT_DATE - 115, true),
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Tijolo cerâmico — Cerâmica Vale Verde',
     'outros', 375000, CURRENT_DATE - 110, 'realizado', CURRENT_DATE - 110, true),

    -- Mês -3
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Areia e brita reposição',
     'outros', 380000, CURRENT_DATE - 90, 'realizado', CURRENT_DATE - 90, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'RPA — João Mendes (pedreiro)',
     'mao_de_obra', 520000, CURRENT_DATE - 85, 'realizado', CURRENT_DATE - 85, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'Avulso — diaristas alvenaria (8 dias)',
     'mao_de_obra', 288000, CURRENT_DATE - 82, 'realizado', CURRENT_DATE - 82, false),
    (uid, NULL, 'pj_admin', 'saida', 'manual', 'Contador — honorários mensais',
     'administrativo', 120000, CURRENT_DATE - 80, 'realizado', CURRENT_DATE - 80, true),

    -- Mês -2
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Tinta acrílica + massa corrida',
     'outros', 255000, CURRENT_DATE - 60, 'realizado', CURRENT_DATE - 60, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'NF — Hidráulica Central (instalações)',
     'mao_de_obra', 420000, CURRENT_DATE - 55, 'realizado', CURRENT_DATE - 55, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual', 'Seguro obras — parcela semestral',
     'administrativo', 180000, CURRENT_DATE - 50, 'realizado', CURRENT_DATE - 50, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual', 'Contador — honorários mensais',
     'administrativo', 120000, CURRENT_DATE - 50, 'realizado', CURRENT_DATE - 50, true),

    -- Mês -1
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Cimento reposição — Construfácil',
     'cimento', 330000, CURRENT_DATE - 30, 'realizado', CURRENT_DATE - 30, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'RPA — Paulo Ribeiro (pintor)',
     'mao_de_obra', 380000, CURRENT_DATE - 25, 'realizado', CURRENT_DATE - 25, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual', 'Contador — honorários mensais',
     'administrativo', 120000, CURRENT_DATE - 20, 'realizado', CURRENT_DATE - 20, true),

    -- Mês atual
    (uid, obra1, 'pj_obra', 'saida', 'material', 'Revestimento cerâmico — banheiros',
     'outros', 680000, CURRENT_DATE - 10, 'realizado', CURRENT_DATE - 10, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra', 'Avulso — diaristas acabamento',
     'mao_de_obra', 210000, CURRENT_DATE - 5, 'realizado', CURRENT_DATE - 5, false);

  -- ── Fluxo PF do dono ─────────────────────────────────────────────────────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    -- Pro-labore mensal (6 meses)
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — mai/25',
     'pro_labore', 500000, CURRENT_DATE - 150, 'realizado', CURRENT_DATE - 150, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — jun/25',
     'pro_labore', 500000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — jul/25',
     'pro_labore', 500000, CURRENT_DATE - 90, 'realizado', CURRENT_DATE - 90, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — ago/25',
     'pro_labore', 500000, CURRENT_DATE - 60, 'realizado', CURRENT_DATE - 60, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — set/25',
     'pro_labore', 500000, CURRENT_DATE - 30, 'realizado', CURRENT_DATE - 30, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — out/25',
     'pro_labore', 500000, CURRENT_DATE - 2, 'realizado', CURRENT_DATE - 2, false),
    -- Despesas pessoais
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 150, 'realizado', CURRENT_DATE - 150, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 90, 'realizado', CURRENT_DATE - 90, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 60, 'realizado', CURRENT_DATE - 60, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 30, 'realizado', CURRENT_DATE - 30, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência',
     'moradia', 180000, CURRENT_DATE - 2, 'realizado', CURRENT_DATE - 2, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde família',
     'saude', 95000, CURRENT_DATE - 148, 'realizado', CURRENT_DATE - 148, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde família',
     'saude', 95000, CURRENT_DATE - 118, 'realizado', CURRENT_DATE - 118, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde família',
     'saude', 95000, CURRENT_DATE - 88, 'realizado', CURRENT_DATE - 88, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde família',
     'saude', 95000, CURRENT_DATE - 58, 'realizado', CURRENT_DATE - 58, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde família',
     'saude', 95000, CURRENT_DATE - 28, 'realizado', CURRENT_DATE - 28, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e manutenção veículo',
     'transporte', 42000, CURRENT_DATE - 140, 'realizado', CURRENT_DATE - 140, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e manutenção veículo',
     'transporte', 38000, CURRENT_DATE - 110, 'realizado', CURRENT_DATE - 110, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e manutenção veículo',
     'transporte', 45000, CURRENT_DATE - 80, 'realizado', CURRENT_DATE - 80, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e manutenção veículo',
     'transporte', 40000, CURRENT_DATE - 50, 'realizado', CURRENT_DATE - 50, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e manutenção veículo',
     'transporte', 43000, CURRENT_DATE - 20, 'realizado', CURRENT_DATE - 20, false);

  -- ── Mão de obra registrada ────────────────────────────────────────────────────
  INSERT INTO mao_de_obra (user_id, obra_id, modalidade, nome, cpf_cnpj, funcao,
    valor_bruto, retencao_inss, retencao_iss, retencao_irrf, valor_diaria,
    quantidade_dias, valor_pago, data_pagamento, status, incluir_contador)
  VALUES
    (uid, obra1, 'rpa', 'Carlos Pereira', '045.123.678-90', 'Carpinteiro',
     520000, 57200, 0, 0, NULL, NULL, 462800, CURRENT_DATE - 148, 'realizado', true),
    (uid, obra1, 'rpa', 'João Mendes', '098.765.432-10', 'Pedreiro',
     580000, 63800, 0, 0, NULL, NULL, 516200, CURRENT_DATE - 85, 'realizado', true),
    (uid, obra1, 'rpa', 'Paulo Ribeiro', '112.334.556-78', 'Pintor',
     420000, 46200, 0, 0, NULL, NULL, 373800, CURRENT_DATE - 25, 'realizado', true),
    (uid, obra1, 'avulso', 'Equipe diaristas fundação', NULL, 'Servente',
     NULL, NULL, NULL, NULL, 36000, 5, 180000, CURRENT_DATE - 145, 'realizado', false),
    (uid, obra1, 'avulso', 'Equipe diaristas alvenaria', NULL, 'Servente',
     NULL, NULL, NULL, NULL, 36000, 8, 288000, CURRENT_DATE - 82, 'realizado', false),
    (uid, obra1, 'nf', 'Elétrica Boa Vista LTDA', '12.345.678/0001-90', NULL,
     NULL, NULL, NULL, NULL, NULL, NULL, 350000, CURRENT_DATE - 115, 'realizado', true),
    (uid, obra1, 'nf', 'Hidráulica Central LTDA', '98.765.432/0001-10', NULL,
     NULL, NULL, NULL, NULL, NULL, NULL, 420000, CURRENT_DATE - 55, 'realizado', true);

  -- ── Materiais registrados ─────────────────────────────────────────────────────
  INSERT INTO materiais (user_id, obra_id, fornecedor, item, categoria,
    quantidade, unidade, valor_total, data_compra, forma_pagamento, incluir_contador)
  VALUES
    (uid, obra1, 'Depósito Constrular', 'Cimento CP-II (200 sacos)', 'cimento',
     200, 'saco', 640000, CURRENT_DATE - 155, 'boleto', true),
    (uid, obra1, 'Aço Minas', 'Vergalhão CA-50 10mm (300 barras)', 'aco',
     300, 'barra', 540000, CURRENT_DATE - 120, 'boleto', true),
    (uid, obra1, 'Cerâmica Vale Verde', 'Tijolo cerâmico 9x19x29 (3000 un)', 'outros',
     3000, 'un', 360000, CURRENT_DATE - 110, 'avista', true),
    (uid, obra1, 'Construfácil', 'Cimento CP-II reposição (100 sacos)', 'cimento',
     100, 'saco', 330000, CURRENT_DATE - 30, 'avista', true),
    (uid, obra1, 'Depósito Constrular', 'Areia e brita reposição', 'outros',
     NULL, NULL, 380000, CURRENT_DATE - 90, 'boleto', true),
    (uid, obra1, 'Tintas Brasil', 'Tinta acrílica + massa corrida', 'outros',
     NULL, NULL, 255000, CURRENT_DATE - 60, 'avista', true),
    (uid, obra1, 'Cerâmica Moderna', 'Revestimento cerâmico banheiros', 'outros',
     NULL, NULL, 680000, CURRENT_DATE - 10, 'cartao', true);

  RAISE NOTICE 'Seed completo concluído para user_id: %', uid;
  RAISE NOTICE 'Obra 1: % | Obra 2: %', obra1, obra2;

END $$;
