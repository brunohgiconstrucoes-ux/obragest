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
  const marginL = 16
  const marginR = 16
  const contentW = W - marginL - marginR
  let y = 16

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  const empresa = perfil?.razao_social ?? 'ObraGest'

  if (perfil?.logo_url) {
    const base64 = await fetchLogoBase64(perfil.logo_url)
    if (base64) {
      doc.addImage(base64, 'PNG', marginL, y, 36, 12)
      // Empresa name and CNPJ to the right
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      doc.text(empresa, marginL + 40, y + 5)
      if (perfil?.cnpj) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(100, 100, 100)
        doc.text(`CNPJ: ${perfil.cnpj}`, marginL + 40, y + 11)
      }
      y += 20
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(30, 30, 30)
    doc.text(empresa, marginL, y + 4)
    if (perfil?.cnpj) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 100, 100)
      doc.text(`CNPJ: ${perfil.cnpj}`, marginL, y + 10)
    }
    y += 18
  }

  // Separador duplo
  doc.setDrawColor(40, 40, 40)
  doc.setLineWidth(0.6)
  doc.line(marginL, y, W - marginR, y)
  doc.setLineWidth(0.2)
  doc.setDrawColor(180, 180, 180)
  doc.line(marginL, y + 1.2, W - marginR, y + 1.2)
  y += 9

  // ── Título ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(20, 20, 20)
  doc.text('RECIBO DE PAGAMENTO', W / 2, y, { align: 'center' })
  y += 4

  // Número e data de emissão à direita
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text(`Emitido em: ${format(new Date(), 'dd/MM/yyyy')}`, W - marginR, y, { align: 'right' })
  y += 9

  // ── Box: Dados do Prestador ────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginL, y, contentW, 30, 2, 2, 'FD')

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.text('PRESTADOR DO SERVIÇO', marginL + 4, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  const nomeLines = doc.splitTextToSize(mdo.nome, contentW - 8)
  doc.text(nomeLines, marginL + 4, y)
  y += nomeLines.length * 5

  const funcao = mdo.funcao ?? '—'
  const cpfLine = mdo.cpf_cnpj ? `CPF: ${mdo.cpf_cnpj}` : ''
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(70, 70, 70)
  doc.text(`Função: ${funcao}${cpfLine ? `     ${cpfLine}` : ''}`, marginL + 4, y)
  y += 12  // padding bottom of box

  // ── Box: Dados da Obra ────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(210, 210, 210)
  doc.roundedRect(marginL, y, contentW, 28, 2, 2, 'FD')

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.text('REFERENTE À OBRA', marginL + 4, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(20, 20, 20)
  const obraLines = doc.splitTextToSize(obra.nome, contentW - 8)
  doc.text(obraLines, marginL + 4, y)
  y += obraLines.length * 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(70, 70, 70)
  const orgaoLines = doc.splitTextToSize(`Órgão: ${obra.orgao_contratante}`, contentW - 8)
  doc.text(orgaoLines, marginL + 4, y)
  y += 12

  // ── Período ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('PERÍODO DE SERVIÇO', marginL, y)
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text(`${fmtDate(mdo.periodo_inicio)}  →  ${fmtDate(mdo.periodo_fim)}`, marginL, y)
  y += 9

  // ── Discriminação do pagamento ────────────────────────────────────────────────
  // Box de discriminação
  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginL, y, contentW, 36, 2, 2, 'FD')

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 100, 100)
  doc.text('DISCRIMINAÇÃO DO PAGAMENTO', marginL + 4, y)
  y += 6

  const colX = marginL + 4
  const valX = W - marginR - 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(40, 40, 40)

  const diasLabel = mdo.quantidade_dias != null ? `${mdo.quantidade_dias} dia(s)` : '—'
  doc.text(`Valor da diária (${diasLabel}):`, colX, y)
  doc.text(fmt(mdo.valor_diaria), valX, y, { align: 'right' })
  y += 6

  doc.text('Número de dias:', colX, y)
  doc.text(String(mdo.quantidade_dias ?? '—'), valX, y, { align: 'right' })
  y += 6

  // Total
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(colX, y, valX, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(20, 20, 20)
  doc.text('TOTAL A RECEBER:', colX, y)
  doc.text(fmt(mdo.valor_pago), valX, y, { align: 'right' })
  y += 12

  // ── Declaração ───────────────────────────────────────────────────────────────
  if (mdo.observacao) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(80, 80, 80)
    const obsLines = doc.splitTextToSize(`Obs.: ${mdo.observacao}`, contentW)
    doc.text(obsLines, marginL, y)
    y += obsLines.length * 4.5 + 3
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  const declaracaoText = `Declaro ter recebido a importância de ${fmt(mdo.valor_pago)} referente aos serviços prestados conforme discriminado acima.`
  const declLines = doc.splitTextToSize(declaracaoText, contentW)
  doc.text(declLines, marginL, y)
  y += declLines.length * 4.5 + 14

  // ── Assinatura ────────────────────────────────────────────────────────────────
  const sigY = y
  const sigW = 70

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(marginL, sigY, marginL + sigW, sigY)
  doc.line(W - marginR - sigW, sigY, W - marginR, sigY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  doc.text('Assinatura do Prestador', marginL, sigY + 4)
  doc.text('Assinatura do Contratante', W - marginR - sigW, sigY + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 30, 30)
  const nomeAssinLines = doc.splitTextToSize(mdo.nome, sigW)
  doc.text(nomeAssinLines, marginL, sigY + 9)

  const empresaAssinLines = doc.splitTextToSize(empresa, sigW)
  doc.text(empresaAssinLines, W - marginR - sigW, sigY + 9)

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 160)
  doc.text(`Documento gerado em ${format(new Date(), 'dd/MM/yyyy')} pelo Sistema de Gestão de Obras`, W / 2, 287, { align: 'center' })

  doc.save(`recibo-${mdo.nome.replace(/ /g, '-')}.pdf`)
}
