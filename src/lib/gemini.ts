import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string

export type NfExtraida = {
  nome: string | null
  cpf_cnpj: string | null
  numero_nf: string | null
  valor_pago_reais: number | null
  data_pagamento: string | null  // YYYY-MM-DD
}

export async function extrairDadosNf(file: File): Promise<NfExtraida> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Converte arquivo para base64
  const bytes = await file.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

  const prompt = `Analise esta nota fiscal e extraia os seguintes dados em JSON puro (sem markdown, sem blocos de código):
{
  "nome": "razão social ou nome do emitente",
  "cpf_cnpj": "CPF ou CNPJ do emitente sem formatação (só números)",
  "numero_nf": "número da nota fiscal",
  "valor_pago_reais": número em reais com decimais (ex: 1500.00),
  "data_pagamento": "data de emissão no formato YYYY-MM-DD"
}

Se algum campo não for encontrado, use null. Retorne APENAS o JSON, nenhum texto adicional.`

  const result = await model.generateContent([
    { inlineData: { mimeType: file.type as any, data: base64 } },
    prompt,
  ])

  const text = result.response.text().trim()

  // Remove possíveis blocos markdown mesmo assim
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  return JSON.parse(clean) as NfExtraida
}
