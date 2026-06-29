# Lista de Telas

> Gerado a partir de `ESCOPO.md` e `JORNADAS.md`.  
> Aprovado pelo dono do produto.  
> Salvar em: `docs/TELAS.md`

---

## Contexto

App construído com **React + TypeScript + Tailwind CSS + shadcn/ui**.  
Perfil único (dono logado). Sem multiusuário. Dados PJ e PF separados em telas e relatórios.

---

## Telas

| # | Nome | Rota | Para que serve |
|---|------|------|----------------|
| 1 | `LoginPage` | `/login` | Autenticação via Supabase Auth (e-mail + senha) |
| 2 | `DashboardPage` | `/` | Visão geral: saldos PJ/PF, cards por obra, alertas ativos |
| 3 | `ObrasPage` | `/obras` | Listagem de todas as obras com status visual (em andamento / paralisada / concluída) |
| 4 | `ObraDetailPage` | `/obras/:id` | Hub da obra com abas: Contrato, Planilha, Medições, Materiais, Mão de Obra, Fluxo |
| 5 | `ObraFormPage` | `/obras/nova` e `/obras/:id/editar` | Formulário de criação e edição da obra (dados do contrato, retenções, impostos) |
| 6 | `PlanilhaServicosPage` | `/obras/:id/planilha` | Cadastro e visualização da planilha de serviços da licitação — itens, saldos, % executado |
| 7 | `MedicoesPage` | `/obras/:id/medicoes` | Histórico de medições da obra (previsto x recebido x status) |
| 8 | `MedicaoFormPage` | `/obras/:id/medicoes/nova` | Abertura de nova medição: quantidades executadas por item, cálculo de retenções, geração de boletim |
| 9 | `MedicaoDetailPage` | `/obras/:id/medicoes/:mid` | Detalhe de uma medição: itens, valores, status de recebimento, link para PDF do boletim |
| 10 | `MateriaisPage` | `/obras/:id/materiais` | Lançamento e listagem de compras de material da obra, com categorias e saldo de almoxarifado |
| 11 | `MaoDeObraPage` | `/obras/:id/mao-de-obra` | Lançamentos de mão de obra da obra: NF, RPA e avulsos — lista + novo lançamento |
| 12 | `RpaFormPage` | `/obras/:id/mao-de-obra/rpa/novo` | Formulário de RPA: CPF, valor bruto, cálculo automático de retenções, geração de PDF |
| 13 | `AvulsoFormPage` | `/obras/:id/mao-de-obra/avulso/novo` | Formulário de avulso/diarista sem nota: nome, função, diária × dias, recibo simples em PDF |
| 14 | `FluxoCaixaObraPage` | `/obras/:id/fluxo` | Fluxo de caixa da obra: entradas (medições) x saídas (materiais, MO, equipamentos), margem real |
| 15 | `FluxoCaixaPJPage` | `/fluxo/pj` | Fluxo geral da empresa: todas as obras + despesas administrativas consolidadas |
| 16 | `FluxoCaixaPFPage` | `/fluxo/pf` | Fluxo pessoal do dono: pró-labore, retiradas, contas pessoais — isolado do PJ |
| 17 | `ContadorPage` | `/contador` | Fechamento mensal: lista lançamentos marcados, gera ZIP/CSV/PDF, histórico de exportações |
| 18 | `ConfiguracoesPage` | `/configuracoes` | Dados PJ, dados PF do dono, alíquotas padrão (ISS, INSS, IRRF, caução) |

---

## Decisões de design registradas

- **`ObraDetailPage` com abas** em vez de rotas separadas por sub-seção da obra. Mantém o contexto da obra visível enquanto o dono navega entre Planilha, Medições e Materiais. Pode virar rotas separadas em versões futuras se o volume de informação crescer.

- **`RpaFormPage` e `AvulsoFormPage` como páginas próprias**, não modais. Motivo: geram PDF e têm cálculos em tempo real — modal ficaria apertado especialmente no celular.

- **Notas Fiscais sem tela própria no MVP** — ficam para a Fase 2 (upload com IA). No MVP o dono vincula NF manualmente ao lançar mão de obra ou material.

- **Equipamentos e Ferramental sem tela no MVP** — Fase 2, conforme escopo aprovado.

---

## Fora do MVP (telas futuras)

| Tela futura | Fase | Motivo do adiamento |
|-------------|------|---------------------|
| `NotasFiscaisPage` | 2 | Depende da integração com IA (Gemini multimodal) |
| `EquipamentosPage` | 2 | Não bloqueia medição nem fechamento mensal |
| `AlertasPage` | 3 | Central de alertas unificada — dashboard cobre no MVP |
| `RelatorioFolhaPage` | Depois | Pacote do contador substitui no MVP |
