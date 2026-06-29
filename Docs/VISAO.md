# Visão do Produto

## Visão

- **Problema**: Donos de construtoras que operam via licitação pública gerenciam obras
  inteiramente em planilhas soltas e cadernos. Cada medição vira uma conta manual —
  pegar a planilha do edital, somar o executado, aplicar as retenções (caução, ISS,
  INSS, IRRF), gerar um boletim apresentável ao contratante e ainda controlar se o
  pagamento entrou. Fora isso, gastos com diaristas e autônomos sem nota ficam no
  "informalzão" — sem recibo, sem registro, sem como separar PJ de PF na hora de
  fechar o mês com o contador.

- **Quem usa**: O próprio dono da construtora — pessoa física que também é o gestor
  operacional. Ele toca 2 a 5 obras simultâneas, paga fornecedores, autônomos e
  diaristas, faz as medições para faturar e ainda precisa mandar um pacote organizado
  ao contador todo mês. Não tem equipe administrativa; faz tudo no celular e no
  notebook.

- **Em uma frase**: É um app que ajuda o dono de construtora a controlar obras de
  licitação pública — do contrato à medição, dos gastos com diaristas ao pacote do
  contador — sem depender de planilhas.

- **Sinais de sucesso** (3 meses após o lançamento):
  1. O dono consegue gerar o boletim de medição de uma obra em menos de 10 minutos,
     partindo da planilha da licitação já cadastrada.
  2. O fechamento mensal para o contador é feito na própria tela do sistema em menos
     de 30 minutos, com ZIP/CSV gerado automaticamente — sem montar pasta manualmente.

- **Stack**: React + TypeScript + Tailwind CSS + shadcn/ui + Supabase  
  *(nota: o plano original usa TanStack Start + Lovable Cloud — ajuste conforme
  o ambiente de build escolhido; a estrutura de módulos não muda)*

---

## Escopo do produto (módulos planejados)

| # | Módulo | Fase |
|---|--------|------|
| 1 | Auth — login único do dono | 1 |
| 2 | Cadastro de obras (contrato, retenções, documentos) | 1 |
| 3 | Planilha de serviços da licitação (base das medições) | 1 |
| 4 | Materiais (compras, almoxarifado por obra) | 1 |
| 5 | Mão de obra — 3 modalidades: NF, RPA, avulso sem nota | 1 |
| 6 | Fluxo de caixa — PJ geral / por obra / PF do dono | 1 |
| 7 | Notas fiscais com leitura por IA (Gemini multimodal) | 2 |
| 8 | Almoxarifado + ferramental / equipamentos | 2 |
| 9 | Medições vinculadas à planilha + boletim PDF | 3 |
| 10 | Alertas e dashboard do dono | 3 |
| 11 | Pacote do contador (ZIP / CSV / PDF mensal) | 4 |

---

## Restrições e decisões de produto

- **Perfil único**: sem multiusuário, sem papéis. O sistema pertence ao dono logado.
- **Contador não acessa o sistema**: recebe pacote exportado, não login.
- **Dados PJ e PF separados** em telas e relatórios, mesmo login.
- **Avulsos sem nota são cidadãos de primeira classe**: lançamento próprio, recibo
  simples em PDF, flag para decidir se entra no pacote do contador.
- **Medição depende da planilha da licitação**: sem planilha cadastrada, não abre
  medição. Isso é uma regra de negócio central.
- **RLS por auth.uid()**: todos os dados isolados por usuário no banco.

---

## Fora do escopo (v1)

- Multiempresa / múltiplos donos no mesmo tenant
- Portal do subcontratado ou fornecedor
- Integração bancária automática (OFX / Open Finance)
- Emissão de NF-e diretamente pelo sistema
- App mobile nativo (PWA resolve na v1)
