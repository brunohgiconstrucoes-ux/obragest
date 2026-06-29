# CLAUDE.md — Sistema de Gestão para Construtora de Licitação Pública

> Arquivo de contexto para o Claude Code Desktop.
> Leia este arquivo antes de qualquer tarefa de código, arquitetura ou decisão de produto.

---

## O que é este produto

App de gestão para **dono único de construtora** que opera via licitação pública.
Ele toca 2 a 5 obras simultâneas, paga fornecedores, autônomos e diaristas,
faz medições mensais para faturar e manda um pacote organizado ao contador todo mês.
Não tem equipe administrativa. Usa celular e notebook.

**Em uma frase:** App que controla obras de licitação pública — do contrato à medição,
dos gastos com diaristas ao pacote do contador — sem depender de planilhas.

**Sinais de sucesso (validam o MVP):**
1. Gerar boletim de medição em menos de 10 minutos, partindo da planilha já cadastrada.
2. Fechar o mês para o contador em menos de 30 minutos, com ZIP/CSV automático.

---

## Stack

```
Frontend:   React + TypeScript + Tailwind CSS + shadcn/ui
Backend:    Supabase (Postgres + Auth + Storage + Edge Functions)
IA (fase 2): Gemini multimodal via API gateway (leitura de NF)
PDF:        Geração client-side ou edge function (boletins, RPAs, recibos)
Auth:       Supabase Auth — e-mail + senha, perfil único, sem multiusuário
Segurança:  RLS por auth.uid() em todas as tabelas — dados isolados por dono
```

---

## Regras de negócio — NUNCA violar

1. **Sem planilha cadastrada → não abre medição.** A planilha de serviços é a base de todo o faturamento. Bloqueio hard no backend.
2. **PJ e PF nunca se misturam.** Telas, relatórios e fluxos de caixa separados. Mesmo login, dados segregados.
3. **Avulsos sem nota são cidadãos de primeira classe.** Têm formulário próprio, recibo em PDF e flag `enviar_contador` (padrão: false).
4. **Todo lançamento nasce como `previsto`.** Vira `realizado` somente quando o dinheiro entra/sai — nunca inverter essa lógica.
5. **RLS por `auth.uid()` em todas as tabelas.** Nenhum dado vaza entre usuários. Verificar em todo novo endpoint/query.
6. **Contador não acessa o sistema.** Ele recebe pacote exportado (ZIP/CSV/PDF). Nunca criar rota ou acesso para terceiros.

---

## Módulos e fases

| # | Módulo | Fase | Status |
|---|--------|------|--------|
| 1 | Auth — login único | 1 — MVP | |
| 2 | Cadastro de obras (contrato, retenções) | 1 — MVP | |
| 3 | Planilha de serviços da licitação | 1 — MVP | |
| 4 | Materiais (compras + categorias) | 1 — MVP | |
| 5 | Mão de obra — 3 modalidades: NF, RPA, avulso | 1 — MVP | |
| 6 | Fluxo de caixa — PJ geral / por obra / PF do dono | 1 — MVP | |
| 7 | Dashboard — cards por obra + saldos PJ/PF | 1 — MVP | |
| 8 | Pacote do contador (ZIP / CSV / histórico) | 1 — MVP | |
| 9 | Notas fiscais com IA (Gemini multimodal) | 2 | |
| 10 | Almoxarifado + equipamentos / ferramental | 2 | |
| 11 | Medições avançadas + alertas | 3 | |
| 12 | Central de alertas unificada | 3 | |
| 13 | DRE simplificado + projeção 30/60/90 dias | 4 | |

---

## Telas do MVP (18 telas)

| # | Nome | Rota |
|---|------|------|
| 1 | `LoginPage` | `/login` |
| 2 | `DashboardPage` | `/` |
| 3 | `ObrasPage` | `/obras` |
| 4 | `ObraDetailPage` | `/obras/:id` |
| 5 | `ObraFormPage` | `/obras/nova` · `/obras/:id/editar` |
| 6 | `PlanilhaServicosPage` | `/obras/:id/planilha` |
| 7 | `MedicoesPage` | `/obras/:id/medicoes` |
| 8 | `MedicaoFormPage` | `/obras/:id/medicoes/nova` |
| 9 | `MedicaoDetailPage` | `/obras/:id/medicoes/:mid` |
| 10 | `MateriaisPage` | `/obras/:id/materiais` |
| 11 | `MaoDeObraPage` | `/obras/:id/mao-de-obra` |
| 12 | `RpaFormPage` | `/obras/:id/mao-de-obra/rpa/novo` |
| 13 | `AvulsoFormPage` | `/obras/:id/mao-de-obra/avulso/novo` |
| 14 | `FluxoCaixaObraPage` | `/obras/:id/fluxo` |
| 15 | `FluxoCaixaPJPage` | `/fluxo/pj` |
| 16 | `FluxoCaixaPFPage` | `/fluxo/pf` |
| 17 | `ContadorPage` | `/contador` |
| 18 | `ConfiguracoesPage` | `/configuracoes` |

**Decisões de design:**
- `ObraDetailPage` usa **abas** (Contrato, Planilha, Medições, Materiais, MO, Fluxo) — não rotas separadas.
- `RpaFormPage` e `AvulsoFormPage` são **páginas completas**, não modais (geram PDF + cálculos em tempo real).
- NFs e Equipamentos: **sem tela no MVP** — Fase 2.

---

## Modelo de dados (entidades principais)

```
obras
  id, dono_uid, numero_licitacao, orgao, objeto, valor_total
  data_assinatura, prazo_dias, art_rrt, status
  retencao_caucao_pct, iss_pct, inss_pct, irrf_pct

planilha_servicos (itens da licitação)
  id, obra_id, codigo, descricao, unidade
  quantidade_contratada, valor_unitario, valor_total
  quantidade_medida_acumulada   ← atualizada a cada medição

medicoes
  id, obra_id, periodo_inicio, periodo_fim, status (rascunho/emitido/recebido)
  valor_bruto, valor_retencoes, valor_liquido
  data_prevista_pagamento, data_recebimento, boletim_pdf_url

medicao_itens
  id, medicao_id, planilha_item_id
  quantidade_periodo, valor_periodo

lancamentos (motor do fluxo de caixa)
  id, dono_uid, obra_id (nullable), tipo (entrada/saida)
  categoria, origem (medicao/material/mao_obra/manual)
  origem_id, valor, data_prevista, data_realizada
  status (previsto/realizado), escopo (pj/pf)
  enviar_contador (bool)

mao_obra
  id, obra_id, modalidade (nf/rpa/avulso)
  prestador_nome, prestador_cpf_cnpj, funcao
  valor_bruto, inss_retido, iss_retido, irrf_retido, valor_liquido
  recibo_pdf_url, enviar_contador (bool)

materiais
  id, obra_id, fornecedor, item, categoria
  quantidade, valor_unit, valor_total
  forma_pagamento, data_compra

configuracoes (row única por auth.uid())
  dono_uid, razao_social, cnpj, logo_url
  nome_pf, cpf_pf
  iss_padrao_pct, inss_padrao_pct, irrf_padrao_pct, caucao_padrao_pct
```

---

## Fluxo central: Medição (caminho crítico do produto)

```
1. Dono abre /obras/:id/medicoes/nova
2. Sistema verifica: planilha_servicos tem itens? → se não, bloqueia com CTA para cadastrar
3. Carrega itens com saldo disponível (quantidade_contratada - quantidade_medida_acumulada)
4. Dono preenche quantidade executada por item no período
5. Sistema calcula em tempo real:
   valor_bruto = Σ (qtd_periodo × valor_unitario)
   retencoes   = valor_bruto × (caucao + iss + inss + irrf) / 100
   valor_liquido = valor_bruto - retencoes
6. Dono confirma → sistema:
   a. Cria registro em medicoes
   b. Cria registros em medicao_itens
   c. Atualiza quantidade_medida_acumulada em planilha_servicos
   d. Cria lançamento status=previsto em lancamentos (escopo=pj)
   e. Gera PDF do boletim de medição
7. Quando pagamento entra: um clique → status=realizado + data_realizada
```

---

## Fluxo: Mão de obra — 3 modalidades

```
NF (PJ/MEI)
  → formulário: prestador, valor, NF vinculada
  → lançamento saída PJ, enviar_contador=true por padrão

RPA (autônomo)
  → formulário: CPF, valor_bruto
  → cálculo automático: INSS 11%, ISS, IRRF (alíquotas do contrato/config)
  → gera recibo RPA em PDF
  → lançamento saída PJ, enviar_contador=true por padrão

Avulso/diarista sem nota
  → formulário: nome ou CPF, função, valor_diaria, nro_dias
  → valor_total = valor_diaria × nro_dias (sem retenções)
  → gera recibo simples em PDF
  → lançamento saída PJ, enviar_contador=FALSE por padrão
```

---

## Fluxo: Pacote do Contador

```
1. Dono acessa /contador → seleciona mês
2. Sistema lista todos lancamentos com enviar_contador=true naquele período
3. Dono revisa checkboxes individualmente (pode marcar/desmarcar)
4. Gera:
   - ZIP com PDFs (boletins, RPAs, recibos)
   - CSV/Excel com lançamentos categorizados
5. Exportação salva com timestamp no histórico (re-download disponível)
```

---

## Convenções de código

- **Componentes**: PascalCase. Arquivos: `ComponentName.tsx`.
- **Hooks customizados**: prefixo `use`. Ex: `useObra`, `useMedicao`.
- **Queries Supabase**: sempre com `.eq('dono_uid', user.id)` — nunca omitir o filtro por usuário.
- **Formulários**: React Hook Form + Zod para validação.
- **Datas**: `date-fns` para formatação. Armazenar UTC no banco.
- **Valores monetários**: armazenar em centavos (integer) no banco. Exibir com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **PDF**: gerar via biblioteca client-side (ex: `@react-pdf/renderer`) ou edge function — nunca expor lógica de geração no frontend sem validação.
- **Status de lançamento**: enum `previsto | realizado` — nunca string livre.
- **Escopo de lançamento**: enum `pj | pf` — obrigatório em todo lançamento.

---

## O que NÃO construir (fora de escopo — não implementar mesmo se solicitado)

- Multiusuário / múltiplos donos no mesmo tenant
- Login ou acesso do contador ao sistema
- Portal de fornecedor ou subcontratado
- Integração bancária automática (OFX / Open Finance)
- Emissão de NF-e
- App mobile nativo (PWA resolve)
- Backup manual em JSON (Supabase tem backup nativo)

---

## Arquivos de referência do projeto

| Arquivo | Conteúdo |
|---------|----------|
| `docs/VISAO.md` | Visão do produto, sinais de sucesso, restrições |
| `docs/JORNADAS.md` | Jornadas completas do usuário (stories) |
| `docs/FUNCIONALIDADES.md` | Todas as funcionalidades levantadas (MVP + futuras) |
| `docs/ESCOPO.md` | O que entra no MVP, o que vai depois, o que nunca entra |
| `docs/TELAS.md` | Lista de telas, rotas e decisões de design |

---

## Perguntas frequentes para o Claude Code

**"Posso criar uma tela de login para o contador?"**
→ Não. O contador não acessa o sistema. Veja regra #6.

**"O lançamento deve entrar direto como realizado?"**
→ Nunca. Todo lançamento nasce como `previsto`. Veja regra #4.

**"Posso abrir medição mesmo sem itens na planilha?"**
→ Não. Bloqueio hard. Veja regra #1.

**"Valor monetário como float ou integer?"**
→ Integer (centavos) no banco. Converter na exibição.

**"Dados PJ e PF podem aparecer no mesmo relatório?"**
→ Nunca. Sempre filtrar por escopo (`pj` ou `pf`).
