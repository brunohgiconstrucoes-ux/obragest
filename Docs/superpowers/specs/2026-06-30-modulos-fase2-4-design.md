# Design — Módulos Fase 2–4 + Simulação de Dados

**Data:** 2026-06-30  
**Produto:** ObraGest MVP  
**Escopo:** Módulos 9–13 + seed de cenário completo  
**Abordagem:** Módulo-por-módulo com seed embutido (Opção B aprovada)

---

## Ordem de implementação

| # | Módulo | Fase |
|---|--------|------|
| 1 | Almoxarifado (central + obras) | 2 |
| 2 | Equipamentos (alocação + custo) | 2 |
| 3 | Central de Alertas | 3 |
| 4 | DRE + Projeção 30/60/90 | 4 |
| 5 | NF com IA (Gemini) | 2 |
| 6 | Simulação de dados completa | — |

Cada módulo entrega código + seed SQL antes do próximo começar.

---

## Módulo 1 — Almoxarifado

### Modelo de dados

```sql
-- Catálogo de itens
CREATE TABLE estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  unidade text NOT NULL,         -- kg, saco, m², un, litro
  categoria text NOT NULL,       -- cimento, aco, madeira, eletrica, hidraulica, epi, outros
  estoque_minimo numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Toda entrada, saída, transferência e ajuste
CREATE TABLE movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  item_id uuid REFERENCES estoque_itens NOT NULL,
  obra_id uuid REFERENCES obras,      -- NULL = estoque central
  tipo text NOT NULL CHECK (tipo IN (
    'entrada',
    'saida',
    'transferencia_entrada',
    'transferencia_saida',
    'ajuste'
  )),
  quantidade numeric NOT NULL,
  custo_unitario bigint DEFAULT 0,    -- centavos
  data date NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- View: saldo por item (central e por obra)
CREATE VIEW vw_saldo_estoque AS
SELECT
  i.id AS item_id,
  i.user_id,
  i.nome,
  i.unidade,
  i.categoria,
  i.estoque_minimo,
  m.obra_id,
  SUM(CASE
    WHEN m.tipo IN ('entrada', 'transferencia_entrada', 'ajuste') THEN m.quantidade
    WHEN m.tipo IN ('saida', 'transferencia_saida') THEN -m.quantidade
    ELSE 0
  END) AS saldo
FROM estoque_itens i
LEFT JOIN movimentacoes_estoque m ON m.item_id = i.id AND m.user_id = i.user_id
GROUP BY i.id, i.user_id, i.nome, i.unidade, i.categoria, i.estoque_minimo, m.obra_id;
```

### RLS
Todas as tabelas com `.eq('user_id', user.id)`. View herda RLS das tabelas base.

### Telas e rotas

| Tela | Rota | Componente |
|------|------|------------|
| Almoxarifado Central | `/almoxarifado` | `AlmoxarifadoPage` |
| Aba estoque da obra | aba "Estoque" em `/obras/:id` | tab em `ObraDetailPage` |

**`AlmoxarifadoPage`:**
- Tabela de itens com saldo central, unidade, categoria
- Badge vermelho em itens abaixo do mínimo
- Botões: "Entrada de material", "Transferir para obra", "Novo item"
- Dialogs inline para cada ação (sem páginas separadas)

**Aba Estoque (ObraDetailPage):**
- Saldo de cada item alocado para a obra
- Botão "Registrar consumo" (saída)
- Histórico de transferências recebidas

### Seed incluído
10 itens de catálogo + entradas dos últimos 6 meses + transferências para 3 obras.

---

## Módulo 2 — Equipamentos

### Modelo de dados

```sql
CREATE TABLE equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('proprio', 'alugado', 'terceiro')),
  numero_serie text,
  valor_aquisicao bigint DEFAULT 0,    -- centavos
  custo_diaria bigint DEFAULT 0,       -- centavos
  proxima_manutencao date,
  status text NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('disponivel', 'alocado', 'manutencao')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE alocacoes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  equipamento_id uuid REFERENCES equipamentos NOT NULL,
  obra_id uuid REFERENCES obras NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,                        -- NULL = ainda alocado
  custo_diaria_override bigint,         -- sobrescreve equipamentos.custo_diaria
  observacao text,
  created_at timestamptz DEFAULT now()
);
```

### Custo por obra
`dias_alocado × custo_diaria` calculado no frontend. Lançamentos no `fluxo_caixa` criados na alocação (escopo `pj_obra`, origem `manual`, categoria `equipamento`).

### Telas e rotas

| Tela | Rota | Componente |
|------|------|------------|
| Equipamentos | `/equipamentos` | `EquipamentosPage` |
| Aba equipamentos da obra | aba "Equipamentos" em `/obras/:id` | tab em `ObraDetailPage` |

**`EquipamentosPage`:**
- Cards por equipamento: nome, tipo, status, custo mensal acumulado, próxima manutenção
- Botões: "Novo equipamento", "Alocar para obra", "Registrar manutenção"
- Status colorido: verde (disponível), amarelo (alocado), vermelho (manutenção)

**Aba Equipamentos (ObraDetailPage):**
- Lista de equipamentos alocados, data de início, dias, custo acumulado
- Botão "Devolver" para encerrar alocação

### Seed incluído
8 equipamentos com histórico de alocação nas 3 obras. 2 com manutenção vencida.

---

## Módulo 3 — Central de Alertas

### Filosofia
Sem tabela. Alertas calculados em tempo real via queries. A página `/alertas` e o badge da sidebar fazem a mesma query — badge usa `select count`.

### Tipos de alerta

| Tipo | Fonte | Condição | Severidade |
|------|-------|----------|------------|
| Prazo crítico | `obras` | `prazo_termino` ≤ 30 dias | crítico |
| Prazo atenção | `obras` | `prazo_termino` ≤ 60 dias | atenção |
| Orçamento estourado | `fluxo_caixa` + `obras` | gastos > valor_total | crítico |
| Orçamento próximo | `fluxo_caixa` + `obras` | gastos > 80% valor_total | atenção |
| Estoque mínimo | `vw_saldo_estoque` | saldo_central ≤ estoque_minimo | atenção |
| Medição atrasada | `medicoes` | última medição > 45 dias em obra ativa | atenção |
| Manutenção vencida | `equipamentos` | `proxima_manutencao` < hoje | crítico |

### Telas e componentes

| Elemento | Componente |
|----------|------------|
| `/alertas` | `AlertasPage` — lista filtrável por tipo e severidade |
| Sidebar badge | count de alertas críticos ao lado do item "Alertas" |
| Dashboard card | `AlertasCard` — 3 alertas mais urgentes com link direto |

Cada alerta tem: ícone de severidade, descrição, obra relacionada (quando aplicável), link direto para a tela relevante.

---

## Módulo 4 — DRE + Projeção

### Filosofia
100% calculado a partir de `fluxo_caixa`. Sem nova tabela. Agrupa por `categoria` e `tipo`.

### Estrutura da tela `/dre`

**Cards superiores**
```
Receita Bruta | Total Custos | Resultado | Margem %
```

**DRE por categoria**
```
(+) RECEITAS
    Medições                    R$ valor
    Outros recebimentos         R$ valor
(-) CUSTOS DIRETOS
    Materiais                   R$ valor
    Mão de Obra                 R$ valor
    Equipamentos                R$ valor
(-) CUSTOS ADMINISTRATIVOS
    Despesas administrativas    R$ valor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTADO DO PERÍODO            R$ valor
```

**Gráfico de evolução** (recharts `BarChart`)
Últimos 6 meses: barras agrupadas Receita / Custo / Resultado.

**Projeção 30/60/90 dias**
- Receita esperada: soma de `medicoes.valor_liquido` com status `aguardando` dentro do período
- Custos comprometidos: soma de `fluxo_caixa` com `status = 'previsto'` dentro do período
- Saldo projetado: receita esperada − custos comprometidos

### Filtros
- Período: mês/ano ou intervalo customizado
- Escopo: consolidado PJ / por obra específica

### Dependência
`recharts` — adicionar ao `package.json`.

---

## Módulo 5 — NF com IA (Gemini)

### Fluxo
1. Botão "📷 Ler por foto" no dialog de NF existente em `ObraDetailPage`
2. Input `type="file" accept="image/*" capture="environment"` (câmera no mobile)
3. Imagem convertida para base64
4. POST para Gemini via `@google/generative-ai`
5. Resposta JSON pré-preenche campos: fornecedor, cpf_cnpj, numero_nf, valor_pago_reais, data_pagamento
6. Usuário revisa e confirma

### Prompt Gemini
```
Você é um extrator de dados de notas fiscais brasileiras.
Analise a imagem e retorne APENAS um JSON válido com:
{
  "fornecedor": "razão social ou nome",
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "numero_nf": "número ou null",
  "valor_total": 0.00,
  "data_emissao": "YYYY-MM-DD ou null"
}
Não inclua texto fora do JSON.
```

### Configuração
- Variável: `VITE_GEMINI_API_KEY` no `.env` local e no painel da Vercel
- Modelo: `gemini-1.5-flash` (rápido e barato para extração de texto)
- Fallback: se key ausente ou erro, exibe mensagem e permite preenchimento manual

### Pacote
`@google/generative-ai` — adicionar ao `package.json`.

---

## Módulo 6 — Simulação de Dados

### Cenário

**3 obras:**
| Obra | Estágio | Valor | Status |
|------|---------|-------|--------|
| Construção da Praça "A" em Santa Branca | Em andamento (já existe) | R$ 159.200 | Completar dados |
| Reforma da UBS Central | Avançada (70%) | R$ 287.500 | Criar |
| Ampliação da Escola Municipal | Iniciando (15%) | R$ 412.000 | Criar |

**Por obra:**
- Planilha completa de serviços (5–8 itens)
- 3–6 medições históricas com datas reais
- 5–10 lançamentos de materiais
- 3–5 registros de mão de obra (mix NF/RPA/avulso)
- Fluxo de caixa realizado dos últimos 6 meses

**Almoxarifado:**
- 10 itens no catálogo central
- Entradas dos últimos 6 meses
- Transferências para cada obra
- 2 itens abaixo do mínimo (para disparar alertas)

**Equipamentos:**
- 8 equipamentos cadastrados
- Histórico de alocações nas 3 obras
- 2 com manutenção vencida

### Entrega
Script SQL único: `docs/migrations/9999_seed_cenario_completo.sql`  
Instruções: rodar no SQL Editor do Supabase após autenticar como o usuário dono.

---

## Novas rotas no App

```tsx
<Route path="/almoxarifado" element={<AlmoxarifadoPage />} />
<Route path="/equipamentos" element={<EquipamentosPage />} />
<Route path="/alertas" element={<AlertasPage />} />
<Route path="/dre" element={<DrePage />} />
```

Itens novos na sidebar:
- Almoxarifado (ícone: Package)
- Equipamentos (ícone: Wrench)
- Alertas (ícone: Bell + badge)
- DRE (ícone: BarChart2)

ObraDetailPage ganha 2 novas abas: **Estoque** e **Equipamentos** (total: 8 abas).

---

## Dependências novas

```json
"recharts": "^2.x",
"@google/generative-ai": "^0.x"
```

---

## Migrations necessárias

| Arquivo | Conteúdo |
|---------|----------|
| `0003_almoxarifado.sql` | estoque_itens, movimentacoes_estoque, vw_saldo_estoque, RLS |
| `0004_equipamentos.sql` | equipamentos, alocacoes_equipamento, RLS |
| `9999_seed_cenario_completo.sql` | dados simulados completos |
