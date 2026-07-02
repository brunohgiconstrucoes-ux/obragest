-- Seed: Almoxarifado
-- ATENÇÃO: Substitua o valor de USER_ID pelo seu ID real antes de rodar.
-- Para encontrar seu ID: SELECT id FROM auth.users WHERE email = 'brunohgiconstrucoes@gmail.com';

DO $$
DECLARE
  uid uuid := (SELECT id FROM auth.users WHERE email = 'brunohgiconstrucoes@gmail.com' LIMIT 1);

  -- IDs dos itens
  id_cimento      uuid := gen_random_uuid();
  id_areia        uuid := gen_random_uuid();
  id_brita        uuid := gen_random_uuid();
  id_vergalhao    uuid := gen_random_uuid();
  id_tijolo       uuid := gen_random_uuid();
  id_tinta        uuid := gen_random_uuid();
  id_pvc          uuid := gen_random_uuid();
  id_fio          uuid := gen_random_uuid();
  id_capacete     uuid := gen_random_uuid();
  id_madeira      uuid := gen_random_uuid();

  -- ID da obra existente (Praça A)
  obra_praca uuid;

BEGIN

  -- Busca a obra existente
  SELECT id INTO obra_praca FROM obras WHERE user_id = uid ORDER BY created_at LIMIT 1;

  -- ── Catálogo de itens ────────────────────────────────────────────────────────

  INSERT INTO estoque_itens (id, user_id, nome, unidade, categoria, estoque_minimo) VALUES
    (id_cimento,   uid, 'Cimento CP-II',         'saco',  'cimento',   50),
    (id_areia,     uid, 'Areia média',            'm³',    'outros',    10),
    (id_brita,     uid, 'Brita nº 1',             'm³',    'outros',    8),
    (id_vergalhao, uid, 'Vergalhão CA-50 10mm',   'barra', 'aco',       100),
    (id_tijolo,    uid, 'Tijolo cerâmico 9x19x29','un',    'outros',    500),
    (id_tinta,     uid, 'Tinta acrílica branca',  'lata',  'outros',    10),
    (id_pvc,       uid, 'Tubo PVC 100mm',         'barra', 'hidraulica',20),
    (id_fio,       uid, 'Fio 2,5mm²',             'rolo',  'eletrica',  5),
    (id_capacete,  uid, 'Capacete de segurança',  'un',    'epi',       5),
    (id_madeira,   uid, 'Tábua de pinus 25mm',    'pç',    'madeira',   30);

  -- ── Entradas no estoque central (últimos 6 meses) ────────────────────────────

  INSERT INTO movimentacoes_estoque (user_id, item_id, obra_id, tipo, quantidade, custo_unitario, data, observacao) VALUES
    -- Cimento (várias entradas)
    (uid, id_cimento,   NULL, 'entrada', 200, 3200, CURRENT_DATE - 170, 'Compra inicial — Depósito Constrular'),
    (uid, id_cimento,   NULL, 'entrada', 150, 3250, CURRENT_DATE - 90,  'Reposição — Depósito Constrular'),
    (uid, id_cimento,   NULL, 'entrada', 100, 3300, CURRENT_DATE - 30,  'Reposição — Construfácil'),

    -- Areia
    (uid, id_areia,     NULL, 'entrada', 30, 18000, CURRENT_DATE - 160, 'Pedido inicial — Areial São João'),
    (uid, id_areia,     NULL, 'entrada', 20, 19000, CURRENT_DATE - 60,  'Reposição'),

    -- Brita
    (uid, id_brita,     NULL, 'entrada', 25, 22000, CURRENT_DATE - 155, 'Pedido inicial'),
    (uid, id_brita,     NULL, 'entrada', 15, 22500, CURRENT_DATE - 55,  'Reposição'),

    -- Vergalhão
    (uid, id_vergalhao, NULL, 'entrada', 300, 1800, CURRENT_DATE - 150, 'Aço Minas — NF 4521'),
    (uid, id_vergalhao, NULL, 'entrada', 200, 1850, CURRENT_DATE - 50,  'Aço Minas — NF 4892'),

    -- Tijolo
    (uid, id_tijolo,    NULL, 'entrada', 3000, 120, CURRENT_DATE - 145, 'Cerâmica Vale Verde'),
    (uid, id_tijolo,    NULL, 'entrada', 2000, 125, CURRENT_DATE - 45,  'Cerâmica Vale Verde'),

    -- Tinta
    (uid, id_tinta,     NULL, 'entrada', 30, 8500, CURRENT_DATE - 90, 'Tintas Brasil'),

    -- PVC
    (uid, id_pvc,       NULL, 'entrada', 60, 4200, CURRENT_DATE - 120, 'Hidráulica Central'),

    -- Fio elétrico
    (uid, id_fio,       NULL, 'entrada', 20, 18000, CURRENT_DATE - 110, 'Elétrica Boa Vista'),

    -- Capacetes
    (uid, id_capacete,  NULL, 'entrada', 15, 3500, CURRENT_DATE - 170, 'EPI Total'),

    -- Madeira
    (uid, id_madeira,   NULL, 'entrada', 80, 2800, CURRENT_DATE - 130, 'Madeireira Paraná');

  -- ── Transferências para a obra existente ─────────────────────────────────────

  IF obra_praca IS NOT NULL THEN
    INSERT INTO movimentacoes_estoque (user_id, item_id, obra_id, tipo, quantidade, custo_unitario, data, observacao) VALUES
      -- Saída central
      (uid, id_cimento,   NULL,       'transferencia_saida',    120, 0, CURRENT_DATE - 140, 'Para Praça A'),
      (uid, id_areia,     NULL,       'transferencia_saida',    18,  0, CURRENT_DATE - 138, 'Para Praça A'),
      (uid, id_brita,     NULL,       'transferencia_saida',    12,  0, CURRENT_DATE - 138, 'Para Praça A'),
      (uid, id_vergalhao, NULL,       'transferencia_saida',    150, 0, CURRENT_DATE - 135, 'Para Praça A'),
      (uid, id_tijolo,    NULL,       'transferencia_saida',    1500,0, CURRENT_DATE - 130, 'Para Praça A'),
      (uid, id_capacete,  NULL,       'transferencia_saida',    8,   0, CURRENT_DATE - 170, 'Para Praça A'),
      (uid, id_madeira,   NULL,       'transferencia_saida',    40,  0, CURRENT_DATE - 125, 'Para Praça A'),
      -- Entrada na obra
      (uid, id_cimento,   obra_praca, 'transferencia_entrada',  120, 0, CURRENT_DATE - 140, 'Da central'),
      (uid, id_areia,     obra_praca, 'transferencia_entrada',  18,  0, CURRENT_DATE - 138, 'Da central'),
      (uid, id_brita,     obra_praca, 'transferencia_entrada',  12,  0, CURRENT_DATE - 138, 'Da central'),
      (uid, id_vergalhao, obra_praca, 'transferencia_entrada',  150, 0, CURRENT_DATE - 135, 'Da central'),
      (uid, id_tijolo,    obra_praca, 'transferencia_entrada',  1500,0, CURRENT_DATE - 130, 'Da central'),
      (uid, id_capacete,  obra_praca, 'transferencia_entrada',  8,   0, CURRENT_DATE - 170, 'Da central'),
      (uid, id_madeira,   obra_praca, 'transferencia_entrada',  40,  0, CURRENT_DATE - 125, 'Da central');

    -- Saídas (consumo) na obra
    INSERT INTO movimentacoes_estoque (user_id, item_id, obra_id, tipo, quantidade, custo_unitario, data, observacao) VALUES
      (uid, id_cimento,   obra_praca, 'saida', 80,  0, CURRENT_DATE - 100, 'Consumo concretagem'),
      (uid, id_areia,     obra_praca, 'saida', 10,  0, CURRENT_DATE - 98,  'Consumo argamassa'),
      (uid, id_brita,     obra_praca, 'saida', 8,   0, CURRENT_DATE - 95,  'Consumo concreto'),
      (uid, id_vergalhao, obra_praca, 'saida', 90,  0, CURRENT_DATE - 90,  'Estrutura'),
      (uid, id_tijolo,    obra_praca, 'saida', 800, 0, CURRENT_DATE - 85,  'Alvenaria'),
      (uid, id_madeira,   obra_praca, 'saida', 20,  0, CURRENT_DATE - 80,  'Fôrmas');
  END IF;

  RAISE NOTICE 'Seed almoxarifado concluído para user_id: %', uid;
  RAISE NOTICE 'Obra encontrada: %', obra_praca;

END $$;
