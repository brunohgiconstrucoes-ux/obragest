---
name: nova-medicao
description: Execute o fluxo completo de nova medição — verificação de planilha, cálculo de retenções e geração de lançamento previsto. Use sempre que for criar ou modificar o fluxo de medição.
---

## Fluxo de Nova Medição (7 etapas obrigatórias)

### Etapa 1 — Verificar planilha
- Checar se `planilha_servicos` tem itens para a obra
- Se não tiver: **bloquear** com CTA para cadastrar planilha (regra #1 do CLAUDE.md)
- Query obrigatória: `.eq('obra_id', obraId).eq('dono_uid', user.id)`

### Etapa 2 — Carregar saldo disponível
- Para cada item: `saldo = quantidade_contratada - quantidade_medida_acumulada`
- Exibir apenas itens com saldo > 0
- Nunca permitir entrada maior que o saldo disponível

### Etapa 3 — Preencher `medicao_itens`
- Formulário por item: `quantidade_periodo` (máximo = saldo disponível)
- Validação em tempo real via Zod

### Etapa 4 — Calcular valores em tempo real
```
valor_bruto    = Σ (quantidade_periodo × valor_unitario)
retencoes      = valor_bruto × (caucao_pct + iss_pct + inss_pct + irrf_pct) / 100
valor_liquido  = valor_bruto - retencoes
```
- Alíquotas vêm da obra → fallback para `configuracoes` do dono
- Exibir breakdown de retenções por linha

### Etapa 5 — Criar registro em `medicoes`
- `status = 'rascunho'` inicialmente
- Campos obrigatórios: `obra_id`, `periodo_inicio`, `periodo_fim`, `valor_bruto`, `valor_retencoes`, `valor_liquido`

### Etapa 6 — Atualizar acumulado na planilha
- Para cada item medido: `UPDATE planilha_servicos SET quantidade_medida_acumulada = quantidade_medida_acumulada + quantidade_periodo`
- Fazer em transação junto com criação de `medicao_itens`

### Etapa 7 — Criar lançamento previsto
```
lancamentos:
  tipo     = 'entrada'
  status   = 'previsto'      ← NUNCA 'realizado' direto (regra #4)
  escopo   = 'pj'
  origem   = 'medicao'
  origem_id = medicao.id
  valor    = valor_liquido (em centavos)
  enviar_contador = true
```

### Etapa 8 — Gerar PDF do boletim
- Usar `src/lib/pdf/boletim.ts`
- Salvar URL em `medicoes.boletim_pdf_url`

## Regras invioláveis
- Todo lançamento nasce como `previsto` — nunca `realizado` direto
- Toda query deve incluir `.eq('dono_uid', user.id)`
- Valores em centavos no banco, converter na exibição
- PJ e PF nunca se misturam — escopo sempre `'pj'` para medições
