# Funcionalidades possíveis

> Gerado a partir do brainstorm com base em `VISAO.md` e `JORNADAS.md`.  
> Todas as funcionalidades abaixo foram aprovadas pelo dono do produto.  
> Salvar em: `docs/FUNCIONALIDADES.md`

---

### Cadastro de Obras

- **Criação rápida de obra**: cadastrar só o essencial (nome, órgão, valor, prazo) e completar depois — sem travar o cadastro em campos obrigatórios demais.
- **Status visual da obra**: indicador colorido por obra (em andamento / paralisada / concluída) visível na listagem principal.
- **Histórico de alterações do contrato**: registrar aditivos (prazo, valor) com data e motivo, mantendo o histórico do contrato original.
- **Alerta de prazo**: notificação quando a data de término da obra estiver se aproximando (ex: 30 dias antes).
- **Galeria de documentos por obra**: anexar múltiplos arquivos (contrato, ART, alvarás, fotos de canteiro) com visualização direta na tela da obra.
- **Duplicar obra**: reaproveitar a estrutura de uma obra já cadastrada (itens da planilha, configurações de retenção) para uma nova licitação semelhante.

---

### Planilha de Serviços da Licitação

- **Cadastro linha a linha**: adicionar cada item do edital com código, descrição, unidade, quantidade e valor unitário, com valor total calculado automaticamente.
- **Colar do Excel**: colar um bloco de células direto na tela (sem precisar importar arquivo) para agilizar o cadastro da planilha do edital.
- **Importação CSV**: carregar um arquivo `.csv` com todos os itens de uma vez, com mapeamento de colunas.
- **Alerta de divergência**: o sistema avisa quando a soma dos itens da planilha não bate com o valor total do contrato cadastrado.
- **Agrupamento por etapa/fase**: organizar os itens da planilha em grupos (ex: fundação, estrutura, acabamento) para facilitar a visualização e os relatórios.
- **Reajuste de preços**: aplicar um percentual de reajuste contratual sobre os valores unitários da planilha, registrando o histórico do reajuste.
- **Visualização de saldo por item**: coluna mostrando, para cada item, o que já foi medido, o que falta e o percentual executado — atualizada a cada medição.

---

### Medições e Faturamento

- **Abertura de medição por período**: criar uma medição mensal (ou por período customizado) com todos os itens da planilha carregados automaticamente com saldo disponível.
- **Preenchimento rápido do executado**: digitar apenas as quantidades do período — o sistema calcula valor bruto, retenções e líquido sem nenhuma conta manual.
- **Boletim de medição em PDF**: gerar documento formatado pronto para assinar e entregar ao contratante, com cabeçalho da obra, itens, retenções e valor líquido.
- **Registro de recebimento com um clique**: marcar o pagamento da medição como recebido, fechando o ciclo previsto x realizado.
- **Histórico de medições por obra**: tela com todas as medições da obra, mostrando valor previsto, valor recebido, diferença e status (aguardando / recebido / parcial).
- **Medição parcial por item**: possibilidade de registrar execução parcial de um item (ex: 40% de um serviço concluído no período) sem bloquear o restante para medições futuras.
- **Alerta de medição em aberto**: notificação quando existe uma medição criada mas sem boletim gerado ou pagamento registrado após X dias.
- **Comparativo físico x financeiro**: gráfico mostrando % executado fisicamente versus % faturado — detecta quando a obra está adiantada ou atrasada em relação ao faturamento.

---

### Mão de Obra (NF, RPA e Avulsos)

- **Lançamento de prestador com NF**: registrar pagamento de PJ/MEI vinculando diretamente a uma nota fiscal já cadastrada no sistema.
- **Geração de RPA automático**: informar CPF e valor bruto do autônomo e o sistema calcula INSS, ISS e IRRF automaticamente, gerando o recibo em PDF pronto para assinar.
- **Lançamento de avulso/diarista sem nota**: registrar por nome ou CPF, função, valor da diária e número de dias — com recibo simples em PDF para arquivo interno.
- **Histórico por prestador**: ver tudo que cada pessoa ou empresa recebeu — em quais obras, em qual modalidade, em quais períodos.
- **Folha do mês por obra**: relatório consolidado com todos os pagamentos de mão de obra da obra no mês (NF + RPA + avulsos), com totais por modalidade.
- **Flag "enviar ao contador"**: marcar individualmente quais lançamentos entram no pacote mensal — avulsos ficam desmarcados por padrão.
- **Alerta de RPA pendente**: notificação quando um RPA foi gerado mas o pagamento ainda não foi registrado.
- **Busca de prestador por CPF/CNPJ**: ao lançar um novo pagamento, o sistema sugere os dados de quem já foi cadastrado anteriormente, evitando redigitar.

---

### Materiais e Almoxarifado

- **Lançamento de compra de material**: registrar fornecedor, item, quantidade, valor, data, forma de pagamento e obra de destino em um único formulário.
- **Saldo de almoxarifado por obra**: visualizar o estoque atual de cada material em cada obra, atualizado automaticamente a cada entrada de compra.
- **Transferência de material entre obras**: mover quantidade de um item do estoque de uma obra para outra, com registro da movimentação.
- **Categorias de material**: classificar compras por categoria (cimento, aço, elétrica, hidráulica, EPI…) para relatórios de custo por tipo.
- **Alerta de estoque baixo**: notificação quando o saldo de um material em uma obra cair abaixo de um mínimo definido pelo dono.
- **Vinculação de compra à NF**: associar um lançamento de compra à nota fiscal correspondente já cadastrada no sistema.
- **Relatório de consumo por obra**: quanto cada obra gastou em materiais por categoria e por período, com comparativo entre obras.
- **Histórico por fornecedor**: ver todas as compras feitas de um mesmo fornecedor, com totais por período.

---

### Notas Fiscais

- **Upload por PDF ou foto**: enviar a NF arrastando o arquivo ou tirando foto pelo celular — sem precisar digitar nada antes da IA processar.
- **Extração automática por IA**: o sistema lê CNPJ, razão social, número, data, valor, itens e impostos da NF sem digitação manual.
- **Sugestão automática de obra**: após a leitura, o sistema sugere a qual obra a NF pertence com base no fornecedor e na categoria.
- **Tela de revisão antes de salvar**: o dono confere os dados extraídos e corrige eventuais erros antes de confirmar — nada entra no sistema sem aprovação.
- **Vinculação automática ao fluxo de caixa**: após confirmação, a NF vira saída no fluxo da obra e entrada de material no almoxarifado (se for NF de produto).
- **Busca avançada de NFs**: filtrar por CNPJ, razão social, valor, obra, período ou status (classificada / pendente).
- **Alerta de NF não classificada**: notificação quando existe uma NF carregada mas ainda não associada a uma obra.
- **Arquivo permanente de NFs**: todas as notas ficam armazenadas no sistema com visualização direta, sem precisar abrir pasta de arquivos.

---

### Equipamentos e Ferramental

- **Cadastro de equipamento próprio**: registrar máquinas e ferramentas da empresa (nome, modelo, número de série, valor de aquisição).
- **Cadastro de equipamento locado**: registrar equipamentos alugados de terceiros com fornecedor, valor da diária/mês e período de locação.
- **Alocação a uma obra**: associar um equipamento (próprio ou locado) a uma obra específica com data de entrada e saída do canteiro.
- **Lançamento de custo de manutenção**: registrar gastos de manutenção de equipamento próprio vinculando ao fluxo de caixa da obra onde estava alocado.
- **Histórico de uso por equipamento**: ver em quais obras cada equipamento foi utilizado, por quanto tempo e qual foi o custo total alocado.
- **Relatório de custo de equipamentos por obra**: quanto cada obra gastou com locação e manutenção de equipamentos no período.
- **Alerta de equipamento locado vencendo**: notificação quando o contrato de locação de um equipamento está próximo do vencimento.

---

### Fluxo de Caixa

- **Fluxo por obra**: ver entradas (medições recebidas) e saídas (materiais, mão de obra, equipamentos, impostos) de cada obra, com margem real calculada.
- **Fluxo geral PJ**: visão consolidada de todas as obras mais despesas administrativas da empresa.
- **Fluxo PF do dono**: controle separado de pró-labore, retiradas e contas pessoais — sem misturar com o dinheiro da empresa.
- **Lançamento manual avulso**: adicionar qualquer entrada ou saída que não venha de outro módulo (ex: despesa administrativa, receita extraordinária).
- **Controle de contas bancárias**: cadastrar mais de uma conta (PJ e PF) e associar cada lançamento à conta correta, com saldo por conta.
- **Status previsto x realizado**: cada lançamento nasce como "previsto" e vira "realizado" quando o dinheiro de fato entra ou sai — sem perder a projeção.
- **Projeção de 30/60/90 dias**: gráfico mostrando o saldo futuro esperado com base nos lançamentos previstos, para antecipar apertos de caixa.
- **DRE simplificado por obra**: relatório de receita, custos e margem de cada obra em um período, sem precisar de contador para montar.
- **Filtros e exportação**: filtrar o fluxo por obra, período, categoria ou conta e exportar em CSV/Excel para análise externa.

---

### Dashboard e Alertas

- **Cards por obra no dashboard**: ver de relance o valor contratado, % executado fisicamente, total faturado, total recebido e margem de cada obra ativa.
- **Saldos PJ e PF separados**: dois painéis distintos no topo do dashboard — saldo da empresa e saldo pessoal do dono — sem misturar.
- **Gráfico de fluxo futuro**: visualização dos próximos 30/60/90 dias com entradas e saídas previstas empilhadas no mesmo gráfico.
- **Central de alertas**: lista unificada de todos os avisos ativos (NF pendente, medição em aberto, RPA não pago, equipamento vencendo, prazo de obra se aproximando).
- **Indicador de retenção a liberar**: aviso quando uma retenção contratual (ex: caução de 5%) está próxima da data de liberação prevista no contrato.
- **Resumo do mês em andamento**: painel mostrando quanto já entrou, quanto já saiu e qual a projeção de fechamento do mês corrente.
- **Acesso rápido às ações mais usadas**: atalhos no dashboard para as ações mais frequentes — nova medição, lançar pagamento, fazer upload de NF.
- **Modo celular otimizado**: dashboard compacto e navegação simplificada para uso no canteiro pelo celular, sem perder funcionalidade essencial.

---

### Pacote do Contador

- **Seleção de lançamentos por checkbox**: marcar individualmente quais NFs, RPAs, boletins e recibos entram no pacote — com seleção em massa por tipo ou obra.
- **Tela de fechamento mensal**: visão dedicada listando tudo que está marcado para o contador naquele mês, antes de gerar o pacote.
- **Geração de ZIP automático**: exportar em um clique um arquivo compactado com todos os PDFs (NFs, RPAs, boletins, recibos avulsos) do período.
- **CSV/Excel de lançamentos**: planilha categorizada com todos os lançamentos do mês — data, valor, tipo, obra, fornecedor/prestador — pronta para o contador importar.
- **PDF resumo mensal por obra**: documento consolidado por obra com totais de receita, custo de material, mão de obra e margem do mês.
- **Histórico de exportações**: registro de todos os pacotes já gerados com data, conteúdo e possibilidade de baixar novamente qualquer mês anterior.
- **Separação PJ x PF no pacote**: opção de gerar pacotes distintos para os lançamentos da empresa e os do dono pessoa física.
- **Anotação para o contador**: campo de texto livre para incluir observações no pacote do mês (ex: "RPA do João não entra — acerto informal").

---

### Configurações e Dados da Empresa

- **Cadastro de dados PJ**: razão social, CNPJ, endereço, regime tributário, responsável técnico — usados no cabeçalho dos documentos gerados.
- **Cadastro de dados PF do dono**: nome, CPF, endereço — separado do PJ para relatórios e fluxo pessoal.
- **Configuração de alíquotas padrão**: definir percentuais padrão de ISS, INSS, IRRF e caução que aparecem pré-preenchidos no cadastro de cada nova obra.
- **Cadastro de contas bancárias**: registrar contas PJ e PF com banco, agência e número — associadas aos lançamentos do fluxo de caixa.
- **Cadastro de categorias personalizadas**: criar e editar categorias de material, despesa e receita além das que vêm por padrão no sistema.
- **Backup manual dos dados**: exportar todos os dados do sistema em JSON ou CSV a qualquer momento, sem depender de suporte.
- **Logo da empresa**: fazer upload do logotipo para aparecer nos PDFs gerados (boletins, RPAs, recibos).
