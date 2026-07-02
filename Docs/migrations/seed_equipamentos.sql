-- Seed: Equipamentos
-- Cria 8 equipamentos + alocações nas obras existentes

DO $$
DECLARE
  uid uuid := (SELECT id FROM auth.users WHERE email = 'brunohgiconstrucoes@gmail.com' LIMIT 1);

  -- IDs dos equipamentos
  id_betoneira    uuid := gen_random_uuid();
  id_andaime      uuid := gen_random_uuid();
  id_martelo      uuid := gen_random_uuid();
  id_escavadeira  uuid := gen_random_uuid();
  id_compactador  uuid := gen_random_uuid();
  id_furadeira    uuid := gen_random_uuid();
  id_geradores    uuid := gen_random_uuid();
  id_vibrador     uuid := gen_random_uuid();

  -- Obras existentes
  obra1 uuid;
  obra2 uuid;

BEGIN

  -- Busca as obras existentes (em_andamento) do usuário
  SELECT id INTO obra1 FROM obras WHERE user_id = uid AND status = 'em_andamento' ORDER BY created_at LIMIT 1;
  SELECT id INTO obra2 FROM obras WHERE user_id = uid AND status = 'em_andamento' ORDER BY created_at OFFSET 1 LIMIT 1;

  -- Fallback: se só tiver 1 obra, usa a mesma para obra2
  IF obra2 IS NULL THEN
    obra2 := obra1;
  END IF;

  -- ── Cadastro de equipamentos ─────────────────────────────────────────────────

  INSERT INTO equipamentos (id, user_id, nome, tipo, numero_serie, valor_aquisicao, custo_diaria, proxima_manutencao, status) VALUES
    (id_betoneira,   uid, 'Betoneira 400L',              'proprio',  'BET-2021-001', 1200000,  8000,  CURRENT_DATE + 45,  'alocado'),
    (id_andaime,     uid, 'Andaime tubular (jogo)',       'proprio',  'AND-2020-003', 800000,   5000,  CURRENT_DATE + 90,  'alocado'),
    (id_martelo,     uid, 'Martelete demolidor 1500W',   'proprio',  'MAR-2022-007', 180000,   2500,  CURRENT_DATE - 5,   'disponivel'),
    (id_escavadeira, uid, 'Mini-escavadeira 2,5t',       'alugado',  NULL,           0,        80000, NULL,               'alocado'),
    (id_compactador, uid, 'Compactador de solo manual',  'proprio',  'COM-2023-002', 350000,   3000,  CURRENT_DATE + 120, 'disponivel'),
    (id_furadeira,   uid, 'Furadeira de impacto 800W',   'proprio',  'FUR-2019-014', 45000,    1000,  CURRENT_DATE + 60,  'disponivel'),
    (id_geradores,   uid, 'Gerador a diesel 8kVA',       'alugado',  NULL,           0,        25000, NULL,               'alocado'),
    (id_vibrador,    uid, 'Vibrador de concreto elétrico','proprio', 'VIB-2022-003', 120000,   2000,  CURRENT_DATE + 30,  'alocado');

  -- ── Alocações ativas ─────────────────────────────────────────────────────────

  IF obra1 IS NOT NULL THEN
    INSERT INTO alocacoes_equipamento (user_id, equipamento_id, obra_id, data_inicio, data_fim, custo_diaria_override, observacao) VALUES
      (uid, id_betoneira,   obra1, CURRENT_DATE - 60, NULL, NULL,  'Concretagem da fundação'),
      (uid, id_andaime,     obra1, CURRENT_DATE - 45, NULL, NULL,  'Fachada e reboco externo'),
      (uid, id_escavadeira, obra1, CURRENT_DATE - 15, NULL, 90000, 'Aluguel mensal — Locadora VK');
  END IF;

  IF obra2 IS NOT NULL AND obra2 <> obra1 THEN
    INSERT INTO alocacoes_equipamento (user_id, equipamento_id, obra_id, data_inicio, data_fim, custo_diaria_override, observacao) VALUES
      (uid, id_geradores, obra2, CURRENT_DATE - 30, NULL, 28000, 'Gerador — Locações Alpha'),
      (uid, id_vibrador,  obra2, CURRENT_DATE - 20, NULL, NULL,  'Concretagem de pilares');
  ELSE
    -- Se só tem 1 obra, aloca gerador e vibrador nela mesma
    INSERT INTO alocacoes_equipamento (user_id, equipamento_id, obra_id, data_inicio, data_fim, custo_diaria_override, observacao) VALUES
      (uid, id_geradores, obra1, CURRENT_DATE - 30, NULL, 28000, 'Gerador — Locações Alpha'),
      (uid, id_vibrador,  obra1, CURRENT_DATE - 20, NULL, NULL,  'Concretagem de pilares');
  END IF;

  -- ── Alocações históricas (já encerradas) ─────────────────────────────────────

  IF obra1 IS NOT NULL THEN
    INSERT INTO alocacoes_equipamento (user_id, equipamento_id, obra_id, data_inicio, data_fim, custo_diaria_override, observacao) VALUES
      (uid, id_martelo,    obra1, CURRENT_DATE - 90, CURRENT_DATE - 50, NULL, 'Demolição de alvenaria — encerrado'),
      (uid, id_compactador,obra1, CURRENT_DATE - 85, CURRENT_DATE - 55, NULL, 'Compactação do terreno — encerrado'),
      (uid, id_furadeira,  obra1, CURRENT_DATE - 80, CURRENT_DATE - 40, NULL, 'Instalações elétricas — encerrado');
  END IF;

  RAISE NOTICE 'Seed equipamentos concluído para user_id: %', uid;
  RAISE NOTICE 'Obra 1: % | Obra 2: %', obra1, obra2;

END $$;
