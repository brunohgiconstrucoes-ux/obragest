-- Seed completo v2: fluxo de caixa histórico (6 meses) + MO + materiais + PF
-- Não insere medições (evita conflito de numeração)

DO $$
DECLARE
  uid   uuid := (SELECT id FROM auth.users WHERE email = 'brunohgiconstrucoes@gmail.com' LIMIT 1);
  obra1 uuid;
  obra2 uuid;

BEGIN

  SELECT id INTO obra1 FROM obras WHERE user_id = uid ORDER BY created_at LIMIT 1;
  SELECT id INTO obra2 FROM obras WHERE user_id = uid ORDER BY created_at OFFSET 1 LIMIT 1;
  IF obra2 IS NULL THEN obra2 := obra1; END IF;

  -- ── Fluxo PJ — Entradas (receitas de medições simuladas) ─────────────────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    (uid, obra1, 'pj_obra', 'entrada', 'medicao',
     'Medição #1 recebida', 'medicao',
     4080000, CURRENT_DATE - 123, 'realizado', CURRENT_DATE - 123, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao',
     'Medição #2 recebida', 'medicao',
     4420000, CURRENT_DATE - 92, 'realizado', CURRENT_DATE - 92, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao',
     'Medição #3 recebida', 'medicao',
     3910000, CURRENT_DATE - 63, 'realizado', CURRENT_DATE - 63, true),
    (uid, obra1, 'pj_obra', 'entrada', 'medicao',
     'Medição #4 aguardando', 'medicao',
     4675000, CURRENT_DATE - 5, 'previsto', NULL, true);

  IF obra2 <> obra1 THEN
    INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
      categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
    VALUES
      (uid, obra2, 'pj_obra', 'entrada', 'medicao',
       'Medição #1 recebida', 'medicao',
       2720000, CURRENT_DATE - 88, 'realizado', CURRENT_DATE - 88, true),
      (uid, obra2, 'pj_obra', 'entrada', 'medicao',
       'Medição #2 recebida', 'medicao',
       3230000, CURRENT_DATE - 58, 'realizado', CURRENT_DATE - 58, true);
  END IF;

  -- ── Fluxo PJ — Saídas distribuídas nos últimos 6 meses ───────────────────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    -- Mês -5
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Cimento e areia — compra inicial', 'cimento',
     1200000, CURRENT_DATE - 155, 'realizado', CURRENT_DATE - 155, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'RPA — Carlos Pereira (carpinteiro)', 'mao_de_obra',
     462800, CURRENT_DATE - 148, 'realizado', CURRENT_DATE - 148, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'Avulso — diaristas fundação (5 dias)', 'mao_de_obra',
     180000, CURRENT_DATE - 145, 'realizado', CURRENT_DATE - 145, false),

    -- Mês -4
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Vergalhão CA-50 — Aço Minas NF 4521', 'aco',
     540000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'NF — Elétrica Boa Vista', 'mao_de_obra',
     350000, CURRENT_DATE - 115, 'realizado', CURRENT_DATE - 115, true),
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Tijolo cerâmico — Cerâmica Vale Verde', 'outros',
     375000, CURRENT_DATE - 110, 'realizado', CURRENT_DATE - 110, true),

    -- Mês -3
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Areia e brita — reposição', 'outros',
     380000, CURRENT_DATE - 90, 'realizado', CURRENT_DATE - 90, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'RPA — João Mendes (pedreiro)', 'mao_de_obra',
     516200, CURRENT_DATE - 85, 'realizado', CURRENT_DATE - 85, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'Avulso — diaristas alvenaria (8 dias)', 'mao_de_obra',
     288000, CURRENT_DATE - 82, 'realizado', CURRENT_DATE - 82, false),
    (uid, NULL, 'pj_admin', 'saida', 'manual',
     'Contador — honorários jul/25', 'administrativo',
     120000, CURRENT_DATE - 80, 'realizado', CURRENT_DATE - 80, true),

    -- Mês -2
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Tinta acrílica + massa corrida', 'outros',
     255000, CURRENT_DATE - 60, 'realizado', CURRENT_DATE - 60, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'NF — Hidráulica Central', 'mao_de_obra',
     420000, CURRENT_DATE - 55, 'realizado', CURRENT_DATE - 55, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual',
     'Seguro obras — parcela semestral', 'administrativo',
     180000, CURRENT_DATE - 50, 'realizado', CURRENT_DATE - 50, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual',
     'Contador — honorários ago/25', 'administrativo',
     120000, CURRENT_DATE - 50, 'realizado', CURRENT_DATE - 50, true),

    -- Mês -1
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Cimento reposição — Construfácil', 'cimento',
     330000, CURRENT_DATE - 30, 'realizado', CURRENT_DATE - 30, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'RPA — Paulo Ribeiro (pintor)', 'mao_de_obra',
     373800, CURRENT_DATE - 25, 'realizado', CURRENT_DATE - 25, true),
    (uid, NULL, 'pj_admin', 'saida', 'manual',
     'Contador — honorários set/25', 'administrativo',
     120000, CURRENT_DATE - 20, 'realizado', CURRENT_DATE - 20, true),

    -- Mês atual
    (uid, obra1, 'pj_obra', 'saida', 'material',
     'Revestimento cerâmico — banheiros', 'outros',
     680000, CURRENT_DATE - 10, 'realizado', CURRENT_DATE - 10, true),
    (uid, obra1, 'pj_obra', 'saida', 'mao_de_obra',
     'Avulso — diaristas acabamento', 'mao_de_obra',
     210000, CURRENT_DATE - 5, 'realizado', CURRENT_DATE - 5, false);

  -- ── Fluxo PF do dono ─────────────────────────────────────────────────────────
  INSERT INTO fluxo_caixa (user_id, obra_id, escopo, tipo, origem, descricao,
    categoria, valor, data_lancamento, status, data_realizacao, incluir_contador)
  VALUES
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — fev/25', 'pro_labore', 500000, CURRENT_DATE - 150, 'realizado', CURRENT_DATE - 150, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — mar/25', 'pro_labore', 500000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — abr/25', 'pro_labore', 500000, CURRENT_DATE - 90,  'realizado', CURRENT_DATE - 90,  false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — mai/25', 'pro_labore', 500000, CURRENT_DATE - 60,  'realizado', CURRENT_DATE - 60,  false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — jun/25', 'pro_labore', 500000, CURRENT_DATE - 30,  'realizado', CURRENT_DATE - 30,  false),
    (uid, NULL, 'pf', 'entrada', 'manual', 'Pró-labore — jul/25', 'pro_labore', 500000, CURRENT_DATE - 2,   'realizado', CURRENT_DATE - 2,   false),

    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 150, 'realizado', CURRENT_DATE - 150, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 120, 'realizado', CURRENT_DATE - 120, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 90,  'realizado', CURRENT_DATE - 90,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 60,  'realizado', CURRENT_DATE - 60,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 30,  'realizado', CURRENT_DATE - 30,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Aluguel residência', 'moradia', 180000, CURRENT_DATE - 2,   'realizado', CURRENT_DATE - 2,   false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde', 'saude', 95000, CURRENT_DATE - 148, 'realizado', CURRENT_DATE - 148, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde', 'saude', 95000, CURRENT_DATE - 118, 'realizado', CURRENT_DATE - 118, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde', 'saude', 95000, CURRENT_DATE - 88,  'realizado', CURRENT_DATE - 88,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde', 'saude', 95000, CURRENT_DATE - 58,  'realizado', CURRENT_DATE - 58,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Plano de saúde', 'saude', 95000, CURRENT_DATE - 28,  'realizado', CURRENT_DATE - 28,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e veículo', 'transporte', 42000, CURRENT_DATE - 140, 'realizado', CURRENT_DATE - 140, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e veículo', 'transporte', 38000, CURRENT_DATE - 110, 'realizado', CURRENT_DATE - 110, false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e veículo', 'transporte', 45000, CURRENT_DATE - 80,  'realizado', CURRENT_DATE - 80,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e veículo', 'transporte', 40000, CURRENT_DATE - 50,  'realizado', CURRENT_DATE - 50,  false),
    (uid, NULL, 'pf', 'saida', 'manual', 'Combustível e veículo', 'transporte', 43000, CURRENT_DATE - 20,  'realizado', CURRENT_DATE - 20,  false);

  -- ── Mão de obra ───────────────────────────────────────────────────────────────
  INSERT INTO mao_de_obra (user_id, obra_id, modalidade, nome, cpf_cnpj, funcao,
    valor_bruto, retencao_inss, retencao_iss, retencao_irrf,
    valor_diaria, quantidade_dias, valor_pago, data_pagamento, status, incluir_contador)
  VALUES
    (uid, obra1, 'rpa', 'Carlos Pereira', '04512367890', 'Carpinteiro',
     520000, 57200, 0, 0, NULL, NULL, 462800, CURRENT_DATE - 148, 'realizado', true),
    (uid, obra1, 'rpa', 'João Mendes', '09876543210', 'Pedreiro',
     580000, 63800, 0, 0, NULL, NULL, 516200, CURRENT_DATE - 85, 'realizado', true),
    (uid, obra1, 'rpa', 'Paulo Ribeiro', '11233455678', 'Pintor',
     420000, 46200, 0, 0, NULL, NULL, 373800, CURRENT_DATE - 25, 'realizado', true),
    (uid, obra1, 'avulso', 'Equipe diaristas fundação', NULL, 'Servente',
     NULL, NULL, NULL, NULL, 36000, 5, 180000, CURRENT_DATE - 145, 'realizado', false),
    (uid, obra1, 'avulso', 'Equipe diaristas alvenaria', NULL, 'Servente',
     NULL, NULL, NULL, NULL, 36000, 8, 288000, CURRENT_DATE - 82, 'realizado', false),
    (uid, obra1, 'nf', 'Elétrica Boa Vista LTDA', '12345678000190', NULL,
     NULL, NULL, NULL, NULL, NULL, NULL, 350000, CURRENT_DATE - 115, 'realizado', true),
    (uid, obra1, 'nf', 'Hidráulica Central LTDA', '98765432000110', NULL,
     NULL, NULL, NULL, NULL, NULL, NULL, 420000, CURRENT_DATE - 55, 'realizado', true);

  -- ── Materiais ─────────────────────────────────────────────────────────────────
  INSERT INTO materiais (user_id, obra_id, fornecedor, item, categoria,
    quantidade, unidade, valor_total, data_compra, forma_pagamento, incluir_contador)
  VALUES
    (uid, obra1, 'Depósito Constrular', 'Cimento CP-II (200 sacos)', 'cimento',
     200, 'saco', 640000, CURRENT_DATE - 155, 'boleto', true),
    (uid, obra1, 'Aço Minas', 'Vergalhão CA-50 10mm (300 barras)', 'aco',
     300, 'barra', 540000, CURRENT_DATE - 120, 'boleto', true),
    (uid, obra1, 'Cerâmica Vale Verde', 'Tijolo cerâmico (3000 un)', 'outros',
     3000, 'un', 360000, CURRENT_DATE - 110, 'avista', true),
    (uid, obra1, 'Construfácil', 'Cimento reposição (100 sacos)', 'cimento',
     100, 'saco', 330000, CURRENT_DATE - 30, 'avista', true),
    (uid, obra1, 'Depósito Constrular', 'Areia e brita reposição', 'outros',
     NULL, NULL, 380000, CURRENT_DATE - 90, 'boleto', true),
    (uid, obra1, 'Tintas Brasil', 'Tinta acrílica + massa corrida', 'outros',
     NULL, NULL, 255000, CURRENT_DATE - 60, 'avista', true),
    (uid, obra1, 'Cerâmica Moderna', 'Revestimento cerâmico banheiros', 'outros',
     NULL, NULL, 680000, CURRENT_DATE - 10, 'cartao', true);

  RAISE NOTICE 'Seed completo v2 concluído — user: %, obra1: %, obra2: %', uid, obra1, obra2;

END $$;
