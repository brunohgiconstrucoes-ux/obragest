import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import type { Obra, MaoDeObra, Perfil } from '@/types'
import { fetchLogoBase64 } from './logoHelper'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function fmt(centavos: number | null): string {
  return brl.format((centavos ?? 0) / 100)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export async function gerarReciboAvulsoPDF(obra: Obra, mdo: MaoDeObra, perfil: Perfil | null): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const marginL = 14
  const marginR = 14
  let y = 14

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  const empresa = perfil?.razao_social ?? 'ObraGest'

  if (perfil?.logo_url) {
    const base64 = await fetchLogoBase64(perfil.logo_url)
    if (base64) {
      doc.addImage(base64, 'PNG', marginL, y, 40, 13)
      y += 16
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(empresa, marginL, y)
    y += 5
  }

  if (perfil?.cnpj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`CNPJ: ${perfil.cnpj}`, marginL, y)
    y += 4
  }

  // Separador
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.line(marginL, y, W - marginR, y)
  y += 7

  // ── Título ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RECIBO DE PAGAMENTO', W / 2, y, { align: 'center' })
  y += 10

  // ── Dados do Prestador ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DADOS DO PRESTADOR', marginL, y)
  y += 5

  const prestadorRows: [string, string][] = [
    ['Nome:', mdo.nome],
    ['Função:', mdo.funcao ?? '—'],
  ]
  if (mdo.cpf_cnpj) prestadorRows.push(['CPF:', mdo.cpf_cnpj])

  for (const [label, value] of prestadorRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, marginL, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginL + 28, y)
    y += 5
  }

  y += 3

  // ── Dados da Obra ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('REFERENTE À OBRA', marginL, y)
  y += 5

  const obraRows: [string, string][] = [
    ['Obra:', obra.nome],
    ['Órgão:', obra.orgao_contratante],
  ]

  for (const [label, value] of obraRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, marginL, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginL + 28, y)
    y += 5
  }

  y += 3

  // ── Período ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PERÍODO DE SERVIÇO', marginL, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.text(
    `${fmtDate(mdo.periodo_inicio)} a ${fmtDate(mdo.periodo_fim)}`,
    marginL,
    y
  )
  y += 8

  // Separador
  doc.setDrawColor(220, 220, 220)
  doc.line(marginL, y, W - marginR, y)
  y += 7

  // ── Cálculo ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DISCRIMINAÇÃO DO PAGAMENTO', marginL, y)
  y += 5

  const colX = marginL
  const valX = W - marginR

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const diasLabel = mdo.quantidade_dias != null ? `${mdo.quantidade_dias} dia(s)` : '—'
  doc.text(`Valor da diária (${diasLabel}):`, colX, y)
  doc.text(fmt(mdo.valor_diaria), valX, y, { align: 'right' })
  y += 6

  doc.text(`Número de dias:`, colX, y)
  doc.text(String(mdo.quantidade_dias ?? '—'), valX, y, { align: 'right' })
  y += 6

  // Linha separadora
  doc.setDrawColor(180, 180, 180)
  doc.line(colX, y, valX, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL A RECEBER:', colX, y)
  doc.text(fmt(mdo.valor_pago), valX, y, { align: 'right' })
  y += 12

  // ── Observação ────────────────────────────────────────────────────────────────
  if (mdo.observacao) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Observação: ${mdo.observacao}`, colX, y)
    y += 8
  }

  // ── Declaração ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Declaro ter recebido a importância de ${fmt(mdo.valor_pago)} referente aos serviços prestados.`,
    colX,
    y,
    { maxWidth: W - marginL - marginR }
  )
  y += 10

  // ── Assinatura ────────────────────────────────────────────────────────────────
  y = Math.max(y, 220)
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

  doc.save(`recibo-${mdo.nome.replace(/ /g, '-')}.pdf`)
}
