# Jornadas do Usuário

> Gerado com base em `VISAO.md` e `Sistema_de_Gestão.txt`.  
> Usuário único: o dono da construtora (pessoa física, gestor operacional).  
> Salvar em: `docs/JORNADAS.md`

---

## Jornadas

### Dono da Construtora

#### Obras e Contratos

- Como dono, quero cadastrar uma obra com os dados do contrato de licitação para ter todas as informações do vínculo contratual em um lugar só.
- Como dono, quero anexar documentos da obra (contrato, ART, alvarás, fotos) para não depender de pasta física ou e-mail avulso.
- Como dono, quero cadastrar a planilha de serviços do edital (itens, unidades, quantidades, valores unitários) para ter a base que alimenta todas as medições da obra.
- Como dono, quero visualizar o percentual físico executado por obra para saber onde estou em relação ao contrato sem precisar calcular na mão.

#### Medições e Faturamento

- Como dono, quero abrir uma medição mensal a partir da planilha da licitação e informar o que foi executado no período para que o sistema calcule automaticamente o valor bruto, as retenções e o líquido a receber.
- Como dono, quero gerar o boletim de medição em PDF pronto para envio ao contratante para não precisar montar esse documento em outro programa.
- Como dono, quero registrar o recebimento do pagamento da medição com um clique para fechar o ciclo previsto x realizado sem lançamento manual.
- Como dono, quero ver o histórico de medições de cada obra (previsto, recebido, pendente) para acompanhar o fluxo de faturamento sem precisar de planilha.

#### Gastos da Obra

- Como dono, quero lançar compras de materiais com fornecedor, valor, forma de pagamento e obra para saber quanto cada obra está consumindo.
- Como dono, quero registrar pagamento de prestador com nota fiscal (PJ/MEI) vinculando à NF para manter o custo de mão de obra com documento.
- Como dono, quero lançar pagamento de autônomo com RPA (CPF, valor bruto) e que o sistema calcule as retenções (INSS, ISS, IRRF) automaticamente para gerar o recibo correto sem fazer a conta na mão.
- Como dono, quero lançar pagamento de diarista ou avulso sem nota (nome/CPF, função, diária × dias) e gerar um recibo simples em PDF para ter registro interno mesmo sem documento fiscal.
- Como dono, quero lançar custos de equipamentos próprios e locados alocados à obra para saber o custo real de cada canteiro.

#### Notas Fiscais

- Como dono, quero fazer upload de uma NF (PDF ou foto) e ter os dados extraídos automaticamente pela IA para não precisar digitar CNPJ, valor e itens manualmente.
- Como dono, quero revisar e confirmar os dados extraídos antes de salvar para garantir que nenhuma NF entre com erro no sistema.
- Como dono, quero pesquisar NFs por CNPJ, valor, obra ou período para achar qualquer nota rapidamente sem abrir pasta de arquivo.

#### Fluxo de Caixa

- Como dono, quero ver o fluxo de caixa da obra (entradas de medições x saídas de materiais, mão de obra e equipamentos) para saber a margem real de cada obra.
- Como dono, quero ver o fluxo de caixa geral PJ (todas as obras + despesas administrativas) para ter visão consolidada da empresa.
- Como dono, quero manter um fluxo de caixa PF separado (pró-labore, retiradas, contas pessoais) para não misturar dinheiro da empresa com o pessoal.
- Como dono, quero ver uma projeção de fluxo dos próximos 30/60/90 dias para antecipar apertos de caixa antes que virem problema.

#### Dashboard e Alertas

- Como dono, quero ver no dashboard os saldos PJ e PF e um card por obra (contratado, executado, faturado, recebido, margem) para ter o panorama geral sem entrar em cada tela.
- Como dono, quero receber alertas de NF não classificada, medição em aberto, conta vencendo e retenção contratual a liberar para não deixar nada cair no esquecimento.

#### Pacote do Contador

- Como dono, quero marcar quais lançamentos entram no pacote do contador (NFs, RPAs, boletins, recibos) para ter controle sobre o que vai para a contabilidade.
- Como dono, quero gerar o fechamento mensal em ZIP/CSV/PDF com um clique para mandar para o contador em menos de 30 minutos sem montar pasta na mão.
- Como dono, quero ter histórico de todas as exportações geradas (data, conteúdo) para saber o que já foi enviado em cada mês.

---

## Confirmação

Revise se faltou alguma ação que você precisa fazer no app.  
Quando confirmar, este documento está pronto para uso na próxima etapa.
