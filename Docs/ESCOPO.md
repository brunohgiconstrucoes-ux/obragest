# Escopo do MVP

> Gerado a partir de `VISAO.md`, `JORNADAS.md` e `FUNCIONALIDADES.md`.  
> Aprovado pelo dono do produto.  
> Salvar em: `docs/ESCOPO.md`

---

## Contexto

**Produto**: Sistema de gestão para dono de construtora que opera via licitação pública.  
**Usuário único**: O próprio dono — gestor operacional, sem equipe administrativa, usa celular e notebook.  
**Em uma frase**: App que controla obras de licitação pública — do contrato à medição, dos gastos com diaristas ao pacote do contador — sem depender de planilhas.

**Sinais de sucesso do MVP:**
1. Gerar boletim de medição de uma obra em menos de 10 minutos, partindo da planilha da licitação já cadastrada.
2. Fechar o mês para o contador em menos de 30 minutos, com ZIP/CSV gerado automaticamente — sem montar pasta na mão.

---

## Agora (primeira versão)

### Auth e Perfil
- **Login com e-mail + senha**: sem isso não existe app.
- **Dados PJ** (razão social, CNPJ, logo): aparece no cabeçalho dos PDFs gerados (boletins, RPAs, recibos).
- **Dados PF do dono** (nome, CPF): separação PJ/PF é regra central do produto.
- **Alíquotas padrão** (ISS, INSS, IRRF, caução %): pré-preenchem o cadastro de cada nova obra — sem isso o dono digita as mesmas alíquotas toda vez.

### Cadastro de Obras
- **Criação de obra com dados do contrato** (número da licitação, órgão, objeto, valor total, prazo, ART): módulo base — todos os outros módulos dependem da obra.
- **Status da obra** (em andamento / paralisada / concluída): necessário para filtrar obras ativas na listagem.
- **Retenções e impostos por obra** (caução %, ISS, INSS, IRRF): base do cálculo automático da medição — sem isso o boletim não sai correto.

### Planilha de Serviços da Licitação
- **Cadastro linha a linha** (código, descrição, unidade, quantidade contratada, valor unitário, valor total calculado): regra central — sem planilha cadastrada não abre medição.
- **Colar do Excel** (paste direto na tela): o dono já tem a planilha do edital; exigir digitação linha a linha inviabiliza o cadastro.
- **Alerta de divergência** (soma dos itens ≠ valor do contrato): evita medição gerada com base de dados incorreta.
- **Saldo por item** (medido acumulado / restante / % executado): indispensável para o dono saber o que ainda pode ser medido antes de abrir cada medição.

### Medições e Faturamento
- **Abertura de medição por período** (mensal ou customizado), com todos os itens da planilha carregados automaticamente com saldo disponível: função central do produto.
- **Preenchimento de quantidades executadas por item no período**: função central do produto.
- **Cálculo automático** (valor bruto, retenções, líquido a receber): elimina o maior problema manual do dono.
- **Geração de boletim de medição em PDF** (cabeçalho da obra, itens, retenções, valor líquido): sinal de sucesso #1 da visão.
- **Registro de recebimento com um clique**: fecha o ciclo previsto x realizado sem lançamento manual.
- **Histórico de medições por obra** (valor previsto, recebido, diferença, status): sem isso o dono não sabe o que está em aberto.

### Mão de Obra
- **Lançamento de prestador com NF** (PJ/MEI vinculado a nota fiscal): custo de mão de obra com documento é obrigatório no fluxo.
- **Geração de RPA automático** (CPF + valor bruto → cálculo de INSS 11%, ISS, IRRF → PDF assinável): autônomo sem RPA é passivo trabalhista — não pode ficar para depois.
- **Lançamento de avulso/diarista sem nota** (nome ou CPF, função, valor da diária × dias → recibo simples em PDF): problema explícito da visão — o "informalzão" precisa de registro interno.
- **Flag "enviar ao contador"** por lançamento (avulsos desmarcados por padrão): mecanismo que separa o que vai no pacote do que fica fora — base do fechamento mensal.

### Materiais
- **Lançamento de compra de material** (fornecedor, item, quantidade, valor, forma de pagamento, obra): maior saída de caixa de uma obra — precisa estar no fluxo.
- **Categorias de material** (cimento, aço, elétrica, hidráulica, EPI…): sem categorias o relatório de custo por tipo não funciona.

### Fluxo de Caixa
- **Fluxo por obra** (entradas de medições x saídas de materiais, mão de obra e impostos, com margem real calculada): o dono precisa saber se cada obra está no azul.
- **Fluxo geral PJ** (todas as obras + despesas administrativas consolidadas): visão da empresa.
- **Fluxo PF do dono** (pró-labore, retiradas, contas pessoais — isolado do PJ): separação PJ/PF é decisão central de produto.
- **Status previsto x realizado** por lançamento: base do fluxo — sem isso não há projeção nem controle de inadimplência.

### Dashboard
- **Cards por obra** (valor contratado, % executado fisicamente, total faturado, total recebido, margem): panorama de relance sem precisar entrar em cada tela.
- **Saldos PJ e PF separados** no topo do dashboard: decisão central de produto — nunca misturar os dois.

### Pacote do Contador
- **Tela de fechamento mensal**: lista tudo marcado com a flag "enviar ao contador" naquele mês, antes de gerar o pacote.
- **Geração de ZIP automático** com todos os PDFs do período (NFs, RPAs, boletins, recibos avulsos): sinal de sucesso #2 da visão.
- **CSV/Excel de lançamentos categorizados** (data, valor, tipo, obra, fornecedor/prestador): formato que o contador consegue importar no sistema dele.
- **Histórico de exportações** (data, conteúdo, re-download): sem isso o dono não sabe o que já mandou em cada mês.

---

## Depois (próximas versões)

- **Recuperação de senha**: pode ser resolvido via e-mail manual no MVP.
- **Upload de logo para PDFs**: o boletim funciona sem logo na v1.
- **Criação rápida de obra** (só o essencial, completar depois): simplificação de UX — o cadastro completo já resolve.
- **Histórico de aditivos contratuais** (prazo, valor, data, motivo): importante, mas o dono consegue controlar fora no MVP.
- **Alerta de prazo da obra** (30 dias antes): útil, não bloqueia nenhum fluxo crítico.
- **Galeria de documentos por obra** (contrato, ART, alvarás, fotos): necessário, não é core do MVP.
- **Duplicar obra** (reaproveitar planilha + configurações): conveniência — não bloqueia cadastro.
- **Importação CSV da planilha**: o "colar do Excel" resolve o MVP; CSV é refinamento.
- **Agrupamento por etapa/fase na planilha** (fundação, estrutura, acabamento): útil para obras grandes, não bloqueia medição.
- **Reajuste de preços com histórico**: evento eventual — não ocorre em toda medição.
- **Medição parcial por item** (controle formal de % por item): o preenchimento livre já permite parcial — o controle formal fica depois.
- **Alerta de medição em aberto**: útil, mas o dono vê no histórico.
- **Comparativo físico x financeiro** (% executado vs % faturado): análise gerencial — vem depois do básico funcionar.
- **Histórico por prestador** (obras, modalidades, períodos): o lançamento já cria o dado; o relatório vem depois.
- **Folha do mês por obra** (NF + RPA + avulsos consolidados): o pacote do contador substitui no MVP.
- **Alerta de RPA pendente de pagamento**: o dono vê no histórico; alerta ativo vem depois.
- **Busca de prestador por CPF/CNPJ com autopreenchimento**: melhoria de UX — não bloqueia o lançamento.
- **Saldo de almoxarifado por obra**: importante, não é core da fase 1.
- **Transferência de material entre obras**: operação eventual.
- **Alerta de estoque baixo**: depende do almoxarifado estar maduro.
- **Vinculação de compra à NF**: a NF com IA (fase 2) fará isso automaticamente.
- **Relatório de consumo de material por categoria e por obra**: o fluxo por obra já dá a informação bruta.
- **Histórico por fornecedor**: relatório de apoio — vem depois.
- **Notas fiscais com IA** (upload, extração, sugestão de obra, revisão, arquivo): fase 2 inteira — o dono lança manualmente no MVP.
- **Equipamentos e ferramental** (cadastro, alocação, manutenção, histórico): fase 2 — não bloqueia medição nem fechamento.
- **Lançamento manual avulso no fluxo** (despesas administrativas, receitas extraordinárias): parcialmente coberto pelos outros módulos no MVP.
- **Controle de contas bancárias com saldo por conta**: o fluxo funciona sem essa camada na v1.
- **Projeção de 30/60/90 dias** (gráfico de saldo futuro): análise gerencial — vem depois.
- **DRE simplificado por obra**: o fluxo por obra já dá o dado bruto.
- **Filtros e exportação CSV do fluxo de caixa**: refinamento de UX.
- **Gráfico de fluxo futuro no dashboard**: depende da projeção de 30/60/90 dias.
- **Central de alertas unificada**: bom, não bloqueia nenhum fluxo no MVP.
- **Indicador de retenção contratual a liberar**: o dono vê no cadastro da obra.
- **Resumo do mês em andamento no dashboard**: o dashboard de cards já dá isso parcialmente.
- **Atalhos para ações frequentes no dashboard**: melhoria de UX.
- **PDF resumo mensal por obra**: o CSV + boletins cobrem o essencial no MVP.
- **Separação PJ x PF no pacote do contador**: refinamento do pacote.
- **Anotação livre para o contador no pacote**: nice-to-have.

---

## Nunca

- **Multiempresa / múltiplos donos no mesmo tenant**: fora do escopo explicitamente definido na visão.
- **Portal do subcontratado ou fornecedor**: outro produto — o sistema pertence ao dono logado.
- **Integração bancária automática** (OFX / Open Finance): fora do escopo v1 — definido na visão.
- **Emissão de NF-e pelo sistema**: fora do escopo v1 — definido na visão.
- **App mobile nativo**: PWA resolve na v1 — definido na visão.
- **Acesso do contador ao sistema**: decisão central de produto — ele recebe pacote exportado, não login.
- **Backup manual em JSON**: saída técnica — o Supabase tem backup nativo; não é funcionalidade de produto.

---

## Regras de negócio centrais (não negociáveis no MVP)

1. **Sem planilha cadastrada, não abre medição.** A planilha de serviços é a base de todo o faturamento.
2. **Dados PJ e PF nunca se misturam** — telas, relatórios e fluxos separados, mesmo login.
3. **Avulsos sem nota são lançamentos de primeira classe** — têm recibo próprio em PDF e flag de envio ao contador.
4. **Todo lançamento nasce como "previsto"** e vira "realizado" somente quando o dinheiro entra ou sai.
5. **RLS por auth.uid()** — todos os dados pertencem ao dono logado; nenhum dado vaza entre usuários.
