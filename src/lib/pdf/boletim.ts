import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import type { Obra, Medicao, MedicaoItem, Perfil } from '@/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function fmt(centavos: number): string {
  return brl.format(centavos / 100)
}

function fmtDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export function gerarBoletimPDF(
  obra: Obra,
  medicao: Medicao,
  itens: MedicaoItem[],
  perfil: Perfil | null
): void {
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

  if (perfil?.endereco_pj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    y += 4
    doc.text(perfil.endereco_pj, marginL, y)
  }

  // Separador
  y += 6
  doc.setDrawColor(180, 180, 180)
  doc.line(marginL, y, W - marginR, y)
  y += 7

  // ── Título ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`BOLETIM DE MEDIÇÃO Nº ${medicao.numero}`, W / 2, y, { align: 'center' })
  y += 9

  // ── Dados da obra ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DADOS DA OBRA', marginL, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const infoRows: [string, string][] = [
    ['Obra:', obra.nome],
    ['Órgão Contratante:', obra.orgao_contratante],
  ]
  if (obra.numero_licitacao) infoRows.push(['Nº Licitação:', obra.numero_licitacao])
  if (obra.objeto) infoRows.push(['Objeto:', obra.objeto])
  if (obra.art_rrt) infoRows.push(['ART/RRT:', obra.art_rrt])

  for (const [label, value] of infoRows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, marginL, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginL + 38, y)
    y += 5
  }

  // ── Período ──────────────────────────────────────────────────────────────────
  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PERÍODO:', marginL, y)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${fmtDate(medicao.periodo_inicio)} a ${fmtDate(medicao.periodo_fim)}`,
    marginL + 20,
    y
  )
  y += 8

  // Separador
  doc.setDrawColor(220, 220, 220)
  doc.line(marginL, y, W - marginR, y)
  y += 6

  // ── Tabela de itens ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ITENS MEDIDOS', marginL, y)
  y += 4

  const tableRows = itens.map(item => [
    item.codigo ?? '—',
    item.descricao,
    item.unidade,
    String(item.quantidade_executada),
    fmt(item.valor_unitario),
    fmt(item.valor_total),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Código', 'Descrição', 'Un.', 'Qtd Exec.', 'Valor Unit.', 'Valor Total']],
    body: tableRows,
    margin: { left: marginL, right: marginR },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 18 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Retenções e Resumo ───────────────────────────────────────────────────────
  const colX = W / 2 + 10
  const valX = W - marginR

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RESUMO FINANCEIRO', colX, y)
  y += 5

  const retRows: [string, number, number | null][] = [
    ['Caução', obra.aliquota_caucao, medicao.retencao_caucao],
    ['ISS', obra.aliquota_iss, medicao.retencao_iss],
    ['INSS', obra.aliquota_inss, medicao.retencao_inss],
    ['IRRF', obra.aliquota_irrf, medicao.retencao_irrf],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  // Valor bruto
  doc.text('Valor Bruto:', colX, y)
  doc.text(fmt(medicao.valor_bruto), valX, y, { align: 'right' })
  y += 5

  for (const [label, aliquota, retencao] of retRows) {
    if (aliquota > 0) {
      doc.text(`(-) ${label} (${aliquota}%):`, colX, y)
      doc.text(fmt(retencao ?? 0), valX, y, { align: 'right' })
      y += 5
    }
  }

  const totalRetencoes =
    (medicao.retencao_caucao ?? 0) +
    (medicao.retencao_iss ?? 0) +
    (medicao.retencao_inss ?? 0) +
    (medicao.retencao_irrf ?? 0)

  // Linha separadora
  doc.setDrawColor(180, 180, 180)
  doc.line(colX, y, valX, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.text('Total Retenções:', colX, y)
  doc.text(fmt(totalRetencoes), valX, y, { align: 'right' })
  y += 2

  doc.setDrawColor(100, 100, 100)
  doc.line(colX, y, valX, y)
  y += 5

  // Valor líquido em destaque
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('VALOR LÍQUIDO:', colX, y)
  doc.text(fmt(medicao.valor_liquido), valX, y, { align: 'right' })
  y += 10

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  const hoje = format(new Date(), 'dd/MM/yyyy')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Documento gerado em ${hoje}`, marginL, y)

  doc.save(`boletim-medicao-${medicao.numero}.pdf`)
}
