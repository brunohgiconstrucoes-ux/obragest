# Bloco 2 — Operacional: Medições, Mão de Obra, Materiais, Fluxo, Dashboard, Contador

> Plano de implementação para o Claude Code com Subagent-Driven Development.
> Branch: master (continua do Bloco 1, HEAD 35d29f8)
> Data: 2026-06-29

---

## Contexto do Projeto

App de gestão para dono de construtora (licitação pública). Bloco 1 entregou:
scaffold, tipos, auth, layout, login, configurações, obras CRUD e planilha de serviços.

Bloco 2 entrega o núcleo operacional: o caminho crítico (medições → boletim PDF), mão
de obra com geração de RPA/recibo, materiais, fluxo de caixa, dashboard com KPIs e
pacote do contador.

---

## Stack e Convenções (herdadas do Bloco 1 — nunca violar)

```
Frontend:  React 18 + TypeScript 5 + Vite 6
UI:        Tailwind CSS 3 + shadcn/ui
Backend:   Supabase JS v2 (createClient<Database>())
PDF:       jspdf + jspdf-autotable (já instalados)
Forms:     React Hook Form + Zod
Datas:     date-fns
```

### Regras de código obrigatórias

1. **CSS tokens**: `border`, `muted`, `primary` do Tailwind estão shadados pelo
   shadcn. **Sempre** usar `var(--color-*)` inline:
   `border-[var(--color-border)]`, `text-[var(--color-muted)]`,
   `bg-[var(--color-surface)]`, `bg-[var(--color-bg)]`, `text-[var(--color-text)]`,
   `text-[var(--color-danger)]`, etc.

2. **Supabase client**: sempre `import { supabase } from '@/lib/supabase'` com
   tipagem `createClient<Database>()`.

3. **Filtro de dono**: toda query em tabelas do usuário deve incluir
   `.eq('user_id', user!.id)`. A coluna chama-se `user_id` (não `dono_uid`).

4. **Monetário**: valores no banco são **bigint centavos** (após migration
   0002). Usar componente `ValorMonetario` (já em `src/components/`) para
   exibição e conversão `×100 / ÷100` no boundary de formulário.
   Nunca armazenar reais.

5. **Enums estritos**: nunca strings livres — ver lista abaixo.

6. **Status**: todo lançamento nasce como `previsto`. Vira `realizado` só
   quando dinheiro sai/entra.

7. **PJ ≠ PF**: nunca misturar dados de escopo `pj_obra`/`pj_admin` com `pf`.

8. **useAuth()**: hook de `src/hooks/useAuth.ts` para obter user/perfil.

9. **Sem YAGNI**: não construir além do especificado na tarefa.

---

## Schema relevante (tabelas do Bloco 2)

### medicoes
```
id, obra_id, user_id
numero (integer, sequencial por obra)
periodo_inicio (date), periodo_fim (date)
valor_bruto, retencao_caucao, retencao_iss, retencao_inss, retencao_irrf, valor_liquido  — bigint centavos
status: 'aguardando' | 'recebido' | 'parcial'
data_prevista_recebimento (date), data_recebimento (date)
valor_recebido (bigint centavos)
boletim_pdf_url (text)
incluir_contador (bool, default true)
```

### medicao_itens
```
id, medicao_id, planilha_item_id, user_id
codigo, descricao, unidade  (snapshot da planilha no momento da medição)
valor_unitario (bigint centavos, snapshot)
quantidade_executada (numeric 14,3)
valor_total (bigint, generated: round(quantidade_executada * valor_unitario))
```

### mao_de_obra
```
id, obra_id, user_id
modalidade: 'nf' | 'rpa' | 'avulso'
nome, cpf_cnpj
numero_nf (só modalidade='nf')
funcao (rpa)
valor_bruto, retencao_inss, retencao_iss, retencao_irrf (bigint centavos, rpa)
valor_diaria (bigint centavos), quantidade_dias (int), periodo_inicio, periodo_fim (avulso)
valor_pago (bigint centavos, todas)
data_pagamento (date)
status: 'previsto' | 'realizado'
pdf_url (text)
incluir_contador (bool; avulso nasce false, nf e rpa nascem true)
observacao (text)
```

### materiais
```
id, obra_id, user_id
fornecedor, item (text)
categoria: 'cimento' | 'aco' | 'eletrica' | 'hidraulica' | 'epi' | 'ferramentas' | 'madeira' | 'outros'
quantidade (numeric 14,3), unidade (text)
valor_total (bigint centavos)
data_compra (date)
forma_pagamento: 'avista' | 'boleto' | 'cartao' | 'cheque' | 'prazo'
incluir_contador (bool, default true)
observacao (text)
```

### fluxo_caixa
```
id, user_id
escopo: 'pj_obra' | 'pj_admin' | 'pf'
obra_id (uuid, null para pj_admin e pf)
tipo: 'entrada' | 'saida'
origem: 'medicao' | 'material' | 'mao_de_obra' | 'manual'
origem_id (uuid — FK para o registro de origem)
descricao (text)
categoria (text)
valor (bigint centavos)
data_lancamento (date)
status: 'previsto' | 'realizado'
data_realizacao (date)
incluir_contador (bool, default true)
observacao (text)
```

### exportacoes_contador
```
id, user_id
mes_referencia (1–12), ano_referencia (int)
total_documentos (int), total_valor (bigint centavos)
zip_url, csv_url, pdf_resumo_url (text)
gerado_em (timestamptz)
```

### Views disponíveis
- `vw_planilha_saldo` — itens com quantidade_medida, quantidade_restante, valor_medido, percentual_executado
- `vw_obra_kpis` — por obra: valor_contratado, percentual_executado, total_faturado, total_recebido, total_saidas, margem_real

---

## Global Constraints (para reviewers e implementers)

- CSS: nunca `text-muted`, `border`, `bg-surface` diretamente — sempre `var(--color-*)` inline
- Monetary: bigint centavos no DB; ValorMonetario para display; `Math.round(val * 100)` ao salvar
- Owner filter: `.eq('user_id', user!.id)` em TODA query de tabelas do usuário
- Enums: usar exatamente os valores listados acima — nunca strings livres
- Status nasce `previsto`, vira `realizado` por ação explícita
- `incluir_contador`: avulso nasce `false`, todos os outros nascem `true`
- PDF: usar jspdf (já instalado, `import jsPDF from 'jspdf'`). Para tabelas, `import autoTable from 'jspdf-autotable'`
- Fluxo de caixa: toda criação de medição/material/mao_de_obra DEVE criar uma entrada correspondente em `fluxo_caixa` na mesma operação (insert atômico ou sequencial — mas ambos em um try/catch coeso)
- Não criar telas de NFs, Equipamentos ou Almoxarifado — Fase 2

---

## Tarefas

### Task 1 — ObraDetailPage com abas

**Arquivo**: `src/pages/ObraDetailPage.tsx` (substituir o stub atual)

**O que construir**: Página hub da obra com 6 abas usando o componente `Tabs`
do shadcn/ui (já instalado via `@radix-ui/react-tabs`). A aba ativa é
controlada por query param `?tab=contrato` (default) para permitir deep-link
e preservar a aba ao voltar.

**Abas e conteúdo**:
1. **Contrato** — exibe os dados da obra em modo leitura (todos os campos do
   ObraFormPage). Botão "Editar" linka para `/obras/:id/editar`.
   Campos: nome, número licitação, órgão contratante, objeto, valor total
   (ValorMonetario), data assinatura, prazo término, art_rrt, status (StatusBadge),
   alíquotas (caução, ISS, INSS, IRRF).
2. **Planilha** — exibe os itens de `planilha_itens` em tabela read-only
   (código, descrição, unidade, qtd contratada, valor unitário, valor total, qtd medida, saldo, % exec).
   Usa `vw_planilha_saldo`. Botão "Editar planilha" linka para `/obras/:id/planilha`.
3. **Medições** — lista de medições da obra (número, período, valor bruto, valor
   líquido, status badge, data prevista recebimento). Botão "Nova medição" → `/obras/:id/medicoes/nova`.
   Linha clicável → `/obras/:id/medicoes/:id`.
4. **Materiais** — lista de compras de material (fornecedor, item, categoria, valor, data).
   Botão "Lançar material" abre um Dialog (modal) com formulário de novo material — NÃO
   navega para outra rota.
5. **Mão de Obra** — lista de lançamentos (nome, modalidade badge, valor pago, data).
   Botões: "NF" → Dialog modal, "RPA" → `/obras/:id/mao-de-obra/rpa/novo`,
   "Avulso" → `/obras/:id/mao-de-obra/avulso/novo`.
6. **Fluxo** — tabela de lançamentos do fluxo_caixa com `obra_id = id`, ordenados
   por `data_lancamento` desc. Colunas: data, descrição, origem, tipo (badge), valor, status (badge).
   Link "Ver fluxo completo" → `/obras/:id/fluxo`.

**Material Dialog (aba Materiais)**: formulário dentro de `<Dialog>` do shadcn.
Campos: fornecedor (text), item (text), categoria (Select — enum acima),
quantidade (number), unidade (text), valor_total (ValorMonetario em centavos),
data_compra (date, default hoje), forma_pagamento (Select — enum acima),
observacao (textarea). Ao salvar: insert em `materiais` + insert em `fluxo_caixa`
(tipo='saida', escopo='pj_obra', origem='material', status='previsto').

**NF Dialog (aba Mão de Obra)**: formulário dentro de `<Dialog>`.
Campos: nome/razão social (text), cpf_cnpj (text), numero_nf (text),
valor_pago (ValorMonetario centavos), data_pagamento (date, default hoje),
observacao (textarea). Ao salvar: insert em `mao_de_obra` (modalidade='nf',
incluir_contador=true) + insert em `fluxo_caixa` (tipo='saida', escopo='pj_obra',
origem='mao_de_obra', status='previsto').

**Validação Zod**: todos os dialogs usam RHF + Zod.

**Busca**: sem busca por ora nas listas dentro das abas (MVP).

---

### Task 2 — MedicaoFormPage (caminho crítico)

**Arquivo**: `src/pages/MedicaoFormPage.tsx` (substituir o stub)

**Rota**: `/obras/:id/medicoes/nova`

**O que construir**: Formulário para abertura de nova medição. Este é o caminho
crítico do produto — "gerar boletim em menos de 10 minutos".

**Fluxo completo**:

1. **Guard**: verificar se a obra tem itens em `planilha_itens`. Se não houver,
   mostrar alert de bloqueio com CTA "Cadastrar planilha" → `/obras/:id/planilha`.

2. **Cabeçalho**: mostrar nome da obra, número sequencial da próxima medição
   (MAX(numero) + 1 das medições existentes, ou 1 se nenhuma).

3. **Período**: dois date inputs (`periodo_inicio`, `periodo_fim`).

4. **Tabela de itens**: carregar todos os itens de `vw_planilha_saldo` com
   `quantidade_restante > 0` (saldo disponível). Para cada item, mostrar:
   - código, descrição, unidade
   - qtd contratada, qtd medida acumulada, qtd restante (saldo)
   - input numérico `quantidade_periodo` (0 a saldo disponível)
   - valor unitário (ValorMonetario)
   - valor do período (calculado: quantidade_periodo × valor_unitario — atualizado
     em tempo real)

5. **Resumo financeiro** (atualizado em tempo real):
   ```
   valor_bruto = Σ (quantidade_periodo × valor_unitario)
   retencao_caucao = valor_bruto × obra.aliquota_caucao / 100
   retencao_iss    = valor_bruto × obra.aliquota_iss / 100
   retencao_inss   = valor_bruto × obra.aliquota_inss / 100
   retencao_irrf   = valor_bruto × obra.aliquota_irrf / 100
   total_retencoes = soma das retenções
   valor_liquido   = valor_bruto - total_retencoes
   ```
   Todos exibidos com `ValorMonetario`.

6. **Campo**: `data_prevista_recebimento` (date, opcional).

7. **Botão "Confirmar medição"**: ao clicar:
   a. Inserir em `medicoes` (com todos os valores calculados)
   b. Inserir em `medicao_itens` para cada item com quantidade_periodo > 0
      (snapshot: codigo, descricao, unidade, valor_unitario do item da planilha)
   c. Inserir em `fluxo_caixa` (tipo='entrada', escopo='pj_obra',
      origem='medicao', origem_id=medicao.id, valor=valor_liquido,
      data_lancamento=data_prevista_recebimento ?? hoje, status='previsto',
      descricao=`Medição #${numero} — ${obra.nome}`)
   d. Navegar para `/obras/:id/medicoes/:mid` (detalhe da medição criada)

**Importante**: não atualizar `quantidade_medida_acumulada` na `planilha_itens`
diretamente — a view `vw_planilha_saldo` já calcula isso via JOIN com `medicao_itens`.

**Validação Zod**: periodo_inicio <= periodo_fim, ao menos um item com
quantidade_periodo > 0.

**UX**: botão "Cancelar" volta para `/obras/:id?tab=medicoes`.

---

### Task 3 — MedicaoDetailPage + boletim PDF

**Arquivos**:
- `src/pages/MedicaoDetailPage.tsx` (substituir stub)
- `src/lib/pdf/boletim.ts` (novo — geração do boletim)

**Rota**: `/obras/:id/medicoes/:mid`

**O que construir**:

**MedicaoDetailPage**:
- Cabeçalho: nome da obra, "Medição #N — período"
- Status badge (aguardando / recebido / parcial)
- Resumo financeiro (valor bruto, cada retenção discriminada, valor líquido)
- Tabela de itens (medicao_itens: código, descrição, unidade, qtd executada, valor unitário, valor total)
- Bloco de recebimento:
  - Se status='aguardando': botão "Marcar como recebido" (abre mini-form:
    data_recebimento date, valor_recebido ValorMonetario, opção 'parcial' ou 'total').
    Ao confirmar: update `medicoes.status` + `data_recebimento` + `valor_recebido`,
    e update `fluxo_caixa` onde `origem='medicao' AND origem_id=medicao.id`
    para `status='realizado'`, `data_realizacao=data_recebimento`.
  - Se status='recebido'/'parcial': exibir data e valor recebido.
- Botão "Gerar boletim PDF": chama `gerarBoletimPDF(obra, medicao, medicaoItens, perfil)`,
  faz download automático.
- Link "← Voltar" para `/obras/:id?tab=medicoes`.

**src/lib/pdf/boletim.ts**:
```typescript
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Obra, Medicao, MedicaoItem, Perfil } from '@/types'

export function gerarBoletimPDF(
  obra: Obra,
  medicao: Medicao,
  itens: MedicaoItem[],
  perfil: Perfil | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  // cabeçalho: razão social / CNPJ do perfil (se disponível)
  // título: BOLETIM DE MEDIÇÃO Nº {medicao.numero}
  // dados da obra: nome, órgão, contrato
  // período: data_inicio a data_fim
  // tabela de itens via autoTable: código | descrição | unidade | qtd | val.unit | val.total
  // bloco de retenções: caução, ISS, INSS, IRRF (discriminados)
  // valor bruto, total retenções, valor líquido (destacado)
  // rodapé: "Documento gerado em {today}"
  // doc.save(`boletim-medicao-${medicao.numero}.pdf`)
}
```
Implementar com formatação profissional: fontes helvetica, alinhamentos
corretos, separadores entre seções, valores em BRL (Intl.NumberFormat).
**Todos os valores recebidos como bigint centavos — dividir por 100 para exibir.**

---

### Task 4 — RpaFormPage + AvulsoFormPage + recibos PDF

**Arquivos**:
- `src/pages/RpaFormPage.tsx` (substituir stub)
- `src/pages/AvulsoFormPage.tsx` (substituir stub)
- `src/lib/pdf/rpa.ts` (novo)
- `src/lib/pdf/recibo-avulso.ts` (novo)

**Rota RPA**: `/obras/:id/mao-de-obra/rpa/novo`

**RpaFormPage** — formulário completo (página inteira, não modal):
- Campos: nome (text), cpf (text, formato 000.000.000-00),
  funcao (text), valor_bruto (ValorMonetario centavos),
  data_pagamento (date, default hoje), observacao (textarea)
- Cálculo automático em tempo real (alíquotas da obra):
  ```
  retencao_inss = valor_bruto × obra.aliquota_inss / 100
  retencao_iss  = valor_bruto × obra.aliquota_iss  / 100
  retencao_irrf = valor_bruto × obra.aliquota_irrf / 100
  valor_pago    = valor_bruto - retencao_inss - retencao_iss - retencao_irrf
  ```
  Exibir cálculo ao lado do formulário como resumo antes de salvar.
- Zod: cpf formato válido (11 dígitos), valor_bruto > 0
- Ao confirmar:
  1. Insert em `mao_de_obra` (modalidade='rpa', incluir_contador=true, status='previsto')
  2. Insert em `fluxo_caixa` (tipo='saida', escopo='pj_obra', origem='mao_de_obra',
     valor=valor_pago, data_lancamento=data_pagamento, status='previsto')
  3. Gerar PDF do RPA e fazer download automático
  4. Navegar para `/obras/:id?tab=mao-de-obra`

**src/lib/pdf/rpa.ts**:
```typescript
export function gerarRpaPDF(obra: Obra, mdo: MaoDeObra, perfil: Perfil | null): void
```
Conteúdo: cabeçalho com razão social/CNPJ, título "RECIBO DE PAGAMENTO DE
AUTÔNOMO", dados do prestador (nome, CPF, função), dados da contratante (obra,
órgão), valor bruto, retenções discriminadas (INSS 11%, ISS, IRRF), valor líquido,
campo de assinatura. Todos os valores: bigint centavos ÷ 100.

**Rota Avulso**: `/obras/:id/mao-de-obra/avulso/novo`

**AvulsoFormPage** — formulário completo (página inteira):
- Campos: nome (text), cpf (text, opcional), funcao (text),
  valor_diaria (ValorMonetario centavos), quantidade_dias (int, min 1),
  periodo_inicio (date), periodo_fim (date), observacao (textarea)
- Cálculo em tempo real: `valor_pago = valor_diaria × quantidade_dias`
- Sem retenções (avulso não tem desconto)
- Ao confirmar:
  1. Insert em `mao_de_obra` (modalidade='avulso', incluir_contador=false, status='previsto')
  2. Insert em `fluxo_caixa` (tipo='saida', escopo='pj_obra', origem='mao_de_obra',
     valor=valor_pago, data_lancamento=periodo_fim, status='previsto',
     incluir_contador=false)
  3. Gerar PDF do recibo e fazer download automático
  4. Navegar para `/obras/:id?tab=mao-de-obra`

**src/lib/pdf/recibo-avulso.ts**:
```typescript
export function gerarReciboAvulsoPDF(obra: Obra, mdo: MaoDeObra, perfil: Perfil | null): void
```
Conteúdo: título "RECIBO DE PAGAMENTO", dados do prestador, função, período,
valor da diária × número de dias = total, campo de assinatura. Sem retenções.

---

### Task 5 — FluxoCaixaObraPage + FluxoCaixaPJPage + FluxoCaixaPFPage

**Arquivos**:
- `src/pages/FluxoCaixaObraPage.tsx` (substituir stub)
- `src/pages/FluxoCaixaPJPage.tsx` (substituir stub)
- `src/pages/FluxoCaixaPFPage.tsx` (substituir stub)

**FluxoCaixaObraPage** — `/obras/:id/fluxo`:
- Cabeçalho com nome da obra
- Filtro de período (mês/ano — date inputs)
- Tabela de lançamentos filtrados por `obra_id = id` AND `escopo = 'pj_obra'`
  Colunas: data, descrição, origem (badge), tipo (entrada=verde / saida=vermelho),
  valor (ValorMonetario), status (previsto=cinza / realizado=verde)
- Botão "Marcar como realizado" inline para lançamentos `status='previsto'`
  (update `status='realizado'`, `data_realizacao=hoje`)
- Sumário no rodapé: total entradas realizadas, total saídas realizadas, margem real
- Link "Novo lançamento manual" → abre Dialog com campos: tipo, descrição, categoria,
  valor (ValorMonetario centavos), data, observacao.
  Insert em `fluxo_caixa` (escopo='pj_obra', obra_id=id, origem='manual')

**FluxoCaixaPJPage** — `/fluxo/pj`:
- Sem filtro por obra — consolida TODOS os lançamentos `escopo IN ('pj_obra', 'pj_admin')`
- Filtro de período (mês/ano)
- Tabela igual à obra mas com coluna "Obra" (nome da obra ou "Adm" para pj_admin)
- Sumário: total entradas, total saídas, saldo líquido
- Botão "Novo lançamento administrativo" → Dialog com escopo='pj_admin', obra_id=null

**FluxoCaixaPFPage** — `/fluxo/pf`:
- Consolida lançamentos `escopo = 'pf'`
- Filtro de período (mês/ano)
- Tabela: data, descrição, tipo (badge), valor, status
- Sumário: entradas, saídas, saldo PF
- Botão "Novo lançamento PF" → Dialog com escopo='pf', obra_id=null

**Validação dos dialogs**: RHF + Zod, valor > 0, data obrigatória.

---

### Task 6 — DashboardPage

**Arquivo**: `src/pages/DashboardPage.tsx` (substituir stub)

**O que construir**:

**Topo** — dois cards lado a lado (ou empilhados no mobile):
- **Saldo PJ**: soma de `valor` WHERE `escopo IN ('pj_obra','pj_admin')
  AND status='realizado' AND tipo='entrada'` MENOS `valor` WHERE mesmo escopo
  AND `status='realizado' AND tipo='saida'`. Exibir em ValorMonetario, badge
  verde se positivo / vermelho se negativo.
- **Saldo PF**: mesmo cálculo para `escopo='pf'`.

**Seção "Obras"** — grid de cards (1 col mobile, 2 col tablet, 3 col desktop).
Para cada obra em `obras WHERE status='em_andamento'`, usar `vw_obra_kpis`:
- Nome da obra + StatusBadge
- Valor contratado (ValorMonetario)
- % executado (barra de progresso `<Progress>` do shadcn)
- Total faturado / Total recebido (ValorMonetario)
- Margem real (ValorMonetario, verde se positivo / vermelho se negativo)
- Link "Ver obra →" para `/obras/:id`

Se não houver obras ativas, mostrar estado vazio com CTA "Cadastrar obra".

**Medições pendentes** — lista compacta de até 5 medições com
`status='aguardando'` ordenadas por `data_prevista_recebimento` asc.
Colunas: obra (nome), medição #, valor líquido, data prevista.
Cada linha clicável → `/obras/:id/medicoes/:mid`.

Sem alertas complexos (Fase 3).

---

### Task 7 — ContadorPage

**Arquivo**: `src/pages/ContadorPage.tsx` (substituir stub)

**O que construir**:

**Seletor de mês/ano** (dois selects ou date-month input).

**Lista de lançamentos marcados** (carregada ao trocar mês):
Todos os registros com `incluir_contador=true` no período selecionado, vindos de:
- `medicoes` → período dentro do mês (periodo_inicio ou data_recebimento no mês)
- `mao_de_obra` → `data_pagamento` no mês
- `materiais` → `data_compra` no mês

Exibir em tabela com checkbox por linha (pré-marcados, desmarcáveis):
tipo, descrição/nome, obra, valor, data.

**Botões de ação**:
- **"Exportar CSV"**: gerar e fazer download de um CSV com os lançamentos
  marcados (colunas: tipo, descricao, obra, valor_em_reais, data, origem).
  Usar `URL.createObjectURL(new Blob([csvContent], {type: 'text/csv'}))`.
  **NÃO** gerar ZIP — complexidade desnecessária no MVP; o ZIP pode vir depois.

- **"Salvar histórico"**: insert em `exportacoes_contador` com
  mes_referencia, ano_referencia, total_documentos (count), total_valor (soma bigint centavos).

**Histórico de exportações** — tabela abaixo mostrando todas as exportações já
salvas para o usuário (mês, total docs, total valor, data geração).
Sem re-download de ZIP (não foi gerado).

---

## Ledger

Arquivo de progresso: `.superpowers/sdd/progress-bloco2.md`

---

## Notas de implementação

- **jsPDF**: `import jsPDF from 'jspdf'`. Para autotable: `import autoTable from 'jspdf-autotable'` e chamar `autoTable(doc, { head: [...], body: [...] })`.
- **Tabs shadcn**: `import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'`. Já instalado.
- **Dialog shadcn**: `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'`. Já instalado.
- **Progress shadcn**: `import { Progress } from '@/components/ui/progress'`. Já instalado.
- **ValorMonetario**: componente em `src/components/ValorMonetario.tsx`. Aceita `value` em centavos bigint, exibe em BRL.
- **StatusBadge**: componente em `src/components/StatusBadge.tsx`. Aceita `status: ObraStatus`.
- **useAuth()**: `import { useAuth } from '@/hooks/useAuth'` → `{ user, perfil }`.
- **date-fns**: `import { format, parseISO } from 'date-fns'`. Datas: armazenar como `date` string `YYYY-MM-DD` no Supabase. Exibir: `format(parseISO(date), 'dd/MM/yyyy')`.
- **Navegação**: `import { useNavigate, useParams, Link } from 'react-router-dom'`.
- **Centavos para PDF**: todos os valores chegam como bigint centavos. Para o PDF, sempre dividir por 100 e formatar com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(val/100)`.
