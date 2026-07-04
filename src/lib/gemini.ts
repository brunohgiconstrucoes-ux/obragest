import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string

export type NfExtraida = {
  nome: string | null           // razão social do emitente (Prestador do Serviço)
  cpf_cnpj: string | null       // CNPJ/CPF do emitente, só números
  numero_nf: string | null      // número da NFS-e / NF
  valor_pago_reais: number | null  // valor líquido (após retenções), em reais
  data_pagamento: string | null    // data de emissão, YYYY-MM-DD
}

export async function extrairDadosNf(file: File): Promise<NfExtraida> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const bytes = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

  const prompt = `Você está analisando uma Nota Fiscal de Serviço Eletrônica (NFS-e / DANFSe) brasileira.
Extraia os campos abaixo e retorne SOMENTE um JSON puro, sem markdown, sem blocos de código, sem texto adicional.

Regras de extração:
- "nome": Razão social do EMITENTE (seção "Prestador do Serviço" ou "EMITENTE DA NFS-e"). NÃO usar o tomador.
- "cpf_cnpj": CNPJ ou CPF do EMITENTE, somente dígitos (sem pontos, barras ou traços).
- "numero_nf": Número da NFS-e ou número da nota. Procure por "Número da NFS-e", "Número NF", "N° NF" etc.
- "valor_pago_reais": Use o "Valor Líquido da NFS-e" (após descontar retenções de ISS, INSS, IR). Se não existir campo líquido, use o "Valor Total" ou "Valor do Serviço". Retorne número decimal (ex: 7192.24).
- "data_pagamento": Data de EMISSÃO da nota, formato YYYY-MM-DD. Procure "Data e Hora da emissão" ou "Data de Emissão".

JSON esperado:
{
  "nome": "...",
  "cpf_cnpj": "...",
  "numero_nf": "...",
  "valor_pago_reais": 0.00,
  "data_pagamento": "YYYY-MM-DD"
}

Se algum campo não for encontrado, use null.`

  const result = await model.generateContent([
    { inlineData: { mimeType: file.type as any, data: base64 } },
    prompt,
  ])

  const text = result.response.text().trim()
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  return JSON.parse(clean) as NfExtraida
}
