# Spec: Melhorias de Usabilidade Geral
**Data:** 2026-07-03  
**Escopo:** Logo da empresa, Dashboard expandido, Formulários ágeis, Fluxo de Caixa visual  
**Abordagem:** Incremental — 4 blocos independentes entregáveis separadamente

---

## Bloco 1 — Logo da Empresa

### 1.1 Upload em Configurações
- Nova aba "Identidade Visual" em `ConfiguracoesPage` (4ª aba após Alíquotas)
- Campo de upload: PNG/SVG/JPG, máx 2MB
- Preview ao vivo da imagem após seleção (antes de salvar)
- Upload para Supabase Storage: bucket `logos`, path `{user_id}/logo.{ext}`
- URL pública salva em `perfis.logo_url` (campo já existe no tipo `Perfil`)
- Botão "Remover logo" se já existir uma imagem

### 1.2 Sidebar
- Bloco atual: ícone `Building2` + texto "ObraGest"
- Se `perfil.logo_url` existir → renderizar `<img>` com `height: 36px`, `object-contain`, `max-width: 140px`
- Se não existir → fallback atual (ícone + texto) sem alteração
- Buscar `logo_url` via hook `useAuth` que já carrega `perfil`

### 1.3 PDFs
- Arquivos afetados: `src/lib/pdf/boletim.ts`, `src/lib/pdf/rpa.ts`, `src/lib/pdf/recibo-avulso.ts`
- Em todos: buscar `perfil.logo_url` no momento da geração
- Se existir: renderizar no cabeçalho (canto superior esquerdo), máx 120×40px
- Se não existir: usar razão social como texto no cabeçalho (comportamento atual)
- A imagem precisa ser convertida para base64 antes de passar ao gerador de PDF (fetch + FileReader)

---

## Bloco 2 — Dashboard Expandido

### 2.1 Cards de saldo (melhoria)
- Adicionar linha secundária nos cards `SaldoCard` existentes
- Mostrar entradas e saídas **do mês atual** separadas: "↑ R$ X entradas · ↓ R$ Y saídas — [mês]"
- Filtro: `fluxo_caixa` com `status = 'realizado'` e `data_competencia` no mês/ano atual
- Não alterar o valor principal (saldo acumulado total)

### 2.2 Novo bloco: Gastos do mês
- Posição: entre os cards de saldo e as obras em andamento
- 3 cards em grid: **Materiais**, **Mão de Obra**, **Outros**
- Valor = soma de saídas realizadas no mês atual por origem (`material`, `mao_de_obra`, `manual`)
- Barra de progresso comparando com mês anterior (valor mês atual / valor mês anterior × 100)
- Se mês anterior = 0, não exibir barra
- Dados: query em `fluxo_caixa` agrupada por `origem`

### 2.3 Novo bloco: Próximos vencimentos
- Posição: após obras em andamento, antes de medições pendentes
- Lista compacta, máx 5 itens
- Fonte: `fluxo_caixa` com `status = 'previsto'` e `data_prevista` entre hoje e hoje+15 dias
- Ordenado por `data_prevista ASC`
- Cada linha: descrição, nome da obra (se vinculada), valor, badge de dias restantes
  - Badge verde: > 7 dias
  - Badge amarelo: 3–7 dias
  - Badge vermelho: < 3 dias
- Clique: navega para `/fluxo/pj` ou `/fluxo/pf` conforme `escopo`

### 2.4 ObraKpiCard — informações adicionais
- **Dias restantes no prazo:** calculado como `data_assinatura + prazo_dias - hoje`
  - Badge verde: > 30 dias restantes
  - Badge amarelo: 10–30 dias
  - Badge vermelho: < 10 dias ou prazo vencido
  - Se `prazo_dias` ou `data_assinatura` nulos: não exibir
- **Gasto total vs contratado:** nova linha "Gasto: R$ X / R$ Y contratado"
  - Gasto = soma de saídas realizadas vinculadas à obra (`obra_id`)
  - Exibir como texto simples, sem barra (já existe barra de % executado)

---

## Bloco 3 — Formulários Mais Ágeis

### 3.1 Materiais — quick-add inline
- Adicionar linha de entrada rápida no **topo** da tabela de materiais em `ObraDetailPage` (aba Materiais)
- Campos obrigatórios visíveis: Fornecedor, Item, Valor total (R$), Data
- Campos opcionais colapsados em "▼ mais detalhes": Categoria, Quantidade, Unidade, Forma de pagamento, Observação
- Defaults: `categoria = 'outros'`, `forma_pagamento = 'avista'`, data = hoje
- Submissão inline (Enter ou botão "+") sem abrir dialog
- Manter o dialog completo existente para edição de registros já criados

### 3.2 Mão de Obra NF — dialog simplificado
- Reorganizar o dialog de NF em `ObraDetailPage`
- Campos visíveis por padrão: Prestador, CPF/CNPJ, Número da NF, Valor pago, Data
- Observação: opcional, colapsada
- Botão "Digitalizar NF com IA" em destaque no topo do dialog (já existe funcionalidade via Gemini)
- Vinculação de arquivo PDF da NF: opcional, linha discreta abaixo dos campos

### 3.3 Avulso — cálculo visual em tempo real
- `AvulsoFormPage`: adicionar painel de resumo fixo à direita (layout 2 colunas em tela maior)
- Painel mostra: `valor_diaria × nro_dias = total` com tipografia grande e destaque
- Campo "Função" com datalist de sugestões: pedreiro, servente, eletricista, encanador, pintor, carpinteiro
- Não remover nenhum campo existente

### 3.4 RPA — breakdown estilo contracheque
- `RpaFormPage`: substituir exibição atual das retenções por tabela de 2 colunas
- Colunas: "Desconto" (INSS, ISS, IRRF) | "Valor"
- Linha de total: "Valor líquido a pagar" em destaque (maior, negrito)
- Linha subtotal "Valor bruto" no topo da tabela
- Atualização em tempo real ao alterar o valor bruto

---

## Bloco 4 — Fluxo de Caixa Visual

### 4.1 Abas PJ/PF unificadas
- `FluxoCaixaPJPage` e `FluxoCaixaPFPage` passam a ter abas no topo: "PJ" | "PF"
- Trocar aba mantém os filtros de período ativos
- Entradas do sidebar continuam funcionando (navegar para `/fluxo/pj` ativa aba PJ)
- Remover os dois itens separados da sidebar; manter apenas um item "Fluxo de Caixa" → `/fluxo/pj`

### 4.2 Filtro de período
- Seletor de mês/ano no topo da página (padrão: mês atual)
- Botões ← → para navegar entre meses
- Filtro aplicado sobre `data_competencia` (ou `data_prevista` para previstos)
- Estado do filtro em query param da URL: `/fluxo/pj?mes=2026-07`

### 4.3 Cards de resumo do período
- 4 cards no topo (após o filtro de período):
  1. Entradas realizadas no período
  2. Saídas realizadas no período
  3. Saldo do período (entradas - saídas realizadas)
  4. Previsão: entradas previstas - saídas previstas (card em estilo "outline" diferenciado)

### 4.4 Separação visual previsto × realizado
- Tabela dividida em 2 seções com cabeçalho separador:
  - **"Realizados"** — fundo normal, linhas de entrada em verde claro, saída em vermelho claro
  - **"Previstos"** — fundo `surface-2` (levemente diferente), badge "previsto" em cada linha
- Manter ordenação por data dentro de cada seção

### 4.5 Confirmar realização inline
- Cada linha de lançamento previsto terá botão "✓" na coluna de ações
- Clique abre popover com:
  - Campo data realizada (padrão: hoje)
  - Botão "Confirmar recebimento/pagamento"
- Ao confirmar: `UPDATE fluxo_caixa SET status='realizado', data_competencia=data_informada`
- Sem navegação para outra página

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/ConfiguracoesPage.tsx` | Nova aba Identidade Visual + upload |
| `src/components/layout/Sidebar.tsx` | Logo condicional |
| `src/lib/pdf/boletim.ts` | Logo no cabeçalho |
| `src/lib/pdf/rpa.ts` | Logo no cabeçalho |
| `src/lib/pdf/recibo-avulso.ts` | Logo no cabeçalho |
| `src/pages/DashboardPage.tsx` | Novos blocos e melhorias nos cards |
| `src/pages/ObraDetailPage.tsx` | Quick-add materiais, dialog NF simplificado |
| `src/pages/AvulsoFormPage.tsx` | Painel de resumo + sugestões de função |
| `src/pages/RpaFormPage.tsx` | Tabela de retenções estilo contracheque |
| `src/pages/FluxoCaixaPJPage.tsx` | Abas, filtro período, cards resumo, inline confirm |
| `src/pages/FluxoCaixaPFPage.tsx` | Idem (ou unificar em componente compartilhado) |
| `src/components/layout/Sidebar.tsx` | Remover item "Fluxo PF" separado |
| `src/App.tsx` | Ajuste de rotas se necessário |

## Restrições respeitadas
- Nenhum dado PJ/PF misturado — filtros de escopo mantidos em todas as queries
- Todo lançamento novo nasce como `previsto` — inline confirm só atualiza existentes
- RLS: toda nova query inclui filtro por `user_id`
- Valores monetários: operações em centavos, exibição via `ValorMonetario`
