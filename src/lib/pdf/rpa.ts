import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import type { Obra, MaoDeObra, Perfil } from '@/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function fmt(centavos: number | null): string {
  return brl.format((centavos ?? 0) / 100)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export function gerarRpaPDF(obra: Obra, mdo: MaoDeObra, perfil: Perfil | null): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const marginL = 14
  const marginR = 14
  let y = 14

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  const empresa = perfil?.razao_social ?? 'ObraGest'
  doc.text(empresa, marginL, y)

  if (perfil?.cnpj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    y += 5
    doc.text(`CNPJ: ${perfil.cnpj}`, marginL, y)
  }

  // Separador
  y += 6
  doc.setDrawColor(180, 180, 180)
  doc.line(marginL, y, W - marginR, y)
  y += 7

  // ── Título ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RECIBO DE PAGAMENTO DE AUTÔNOMO', W / 2, y, { align: 'center' })
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Data de pagamento: ${fmtDate(mdo.data_pagamento)}`, W / 2, y, { align: 'center' })
  y += 10

  // ── Dados do Prestador ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DADOS DO PRESTADOR DE SERVIÇO', marginL, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const prestadorRows: [string, string][] = [
    ['Nome:', mdo.nome],
    ['CPF:', mdo.cpf_cnpj ?? '—'],
    ['Função:', mdo.funcao ?? '—'],
  ]

  for (const [label, value] of prestadorRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, marginL, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginL + 30, y)
    y += 5
  }

  y += 3

  // ── Dados da Contratante ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DADOS DA CONTRATANTE', marginL, y)
  y += 5

  const contratanteRows: [string, string][] = [
    ['Empresa:', empresa],
    ['Obra:', obra.nome],
    ['Órgão:', obra.orgao_contratante],
  ]
  if (perfil?.cnpj) contratanteRows.push(['CNPJ:', perfil.cnpj])

  for (const [label, value] of contratanteRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, marginL, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginL + 30, y)
    y += 5
  }

  y += 3

  // Separador
  doc.setDrawColor(220, 220, 220)
  doc.line(marginL, y, W - marginR, y)
  y += 7

  // ── Resumo Financeiro ─────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DISCRIMINAÇÃO DOS VALORES', marginL, y)
  y += 5

  const colX = marginL
  const valX = W - marginR

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  doc.text('Valor Bruto:', colX, y)
  doc.text(fmt(mdo.valor_bruto), valX, y, { align: 'right' })
  y += 6

  const aliquotaInss = obra.aliquota_inss
  const aliquotaIss = obra.aliquota_iss
  const aliquotaIrrf = obra.aliquota_irrf

  if (aliquotaInss > 0) {
    doc.text(`(-) INSS (${aliquotaInss}%):`, colX, y)
    doc.text(fmt(mdo.retencao_inss), valX, y, { align: 'right' })
    y += 5
  }

  if (aliquotaIss > 0) {
    doc.text(`(-) ISS (${aliquotaIss}%):`, colX, y)
    doc.text(fmt(mdo.retencao_iss), valX, y, { align: 'right' })
    y += 5
  }

  if (aliquotaIrrf > 0) {
    doc.text(`(-) IRRF (${aliquotaIrrf}%):`, colX, y)
    doc.text(fmt(mdo.retencao_irrf), valX, y, { align: 'right' })
    y += 5
  }

  // Linha separadora
  doc.setDrawColor(180, 180, 180)
  doc.line(colX, y, valX, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('VALOR LÍQUIDO (A RECEBER):', colX, y)
  doc.text(fmt(mdo.valor_pago), valX, y, { align: 'right' })
  y += 12

  // ── Observação ────────────────────────────────────────────────────────────────
  if (mdo.observacao) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Observação: ${mdo.observacao}`, colX, y)
    y += 8
  }

  // ── Assinatura ────────────────────────────────────────────────────────────────
  y = Math.max(y, 220)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const sigY = y + 20
  doc.line(marginL, sigY, marginL + 70, sigY)
  doc.line(W / 2 + 5, sigY, W / 2 + 75, sigY)

  doc.text('Assinatura do Prestador', marginL, sigY + 5)
  doc.text('Assinatura do Contratante', W / 2 + 5, sigY + 5)

  doc.text(mdo.nome, marginL, sigY + 10)
  doc.text(empresa, W / 2 + 5, sigY + 10)

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  const hoje = format(new Date(), 'dd/MM/yyyy')
  doc.text(`Documento gerado em ${hoje}`, marginL, 287)

  doc.save(`rpa-${mdo.nome.replace(/ /g, '-')}.pdf`)
}
