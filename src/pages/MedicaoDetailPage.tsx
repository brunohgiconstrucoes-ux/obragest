import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, FileText, CheckCircle, Clock, AlertCircle, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import { gerarBoletimPDF } from '@/lib/pdf/boletim'
import type { Obra, Medicao, MedicaoItem } from '@/types'

// ── Zod schema for "Marcar como recebido" ─────────────────────────────────────

const recebidoSchema = z.object({
  tipo_recebimento: z.enum(['total', 'parcial']),
  data_recebimento: z.string().min(1, 'Obrigatório'),
  valor_recebido_reais: z
    .string()
    .min(1, 'Obrigatório')
    .refine(
      v => {
        // BRL-aware parser: strip periods (thousands), replace last comma with period (decimal)
        const normalized = v.replace(/\./g, '').replace(',', '.')
        const parsed = parseFloat(normalized)
        return isFinite(parsed) && parsed > 0
      },
      {
        message: 'Valor deve ser maior que zero',
      }
    ),
})

type RecebidoFormValues = z.infer<typeof recebidoSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'dd/MM/yyyy')
}

function StatusBadge({ status }: { status: Medicao['status'] }) {
  if (status === 'recebido') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Recebido
      </span>
    )
  }
  if (status === 'parcial') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'var(--color-warning)', color: '#000' }}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Parcial
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: 'var(--color-muted)', color: '#fff' }}
    >
      <Clock className="w-3.5 h-3.5" />
      Aguardando
    </span>
  )
}

// ── EditMedicaoForm ───────────────────────────────────────────────────────────

type EditItemRow = MedicaoItem & { qtdEdit: string }

function EditMedicaoForm({
  medicao,
  obra,
  itensOriginais,
  onSaved,
  onCancel,
}: {
  medicao: Medicao
  obra: Obra
  itensOriginais: MedicaoItem[]
  onSaved: (updated: Medicao, updatedItens: MedicaoItem[]) => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<EditItemRow[]>(() =>
    itensOriginais.map(i => ({ ...i, qtdEdit: (i.quantidade_executada).toString() }))
  )
  const [periodoInicio, setPeriodoInicio] = useState(medicao.periodo_inicio)
  const [periodoFim, setPeriodoFim] = useState(medicao.periodo_fim)
  const [dataPrevista, setDataPrevista] = useState(medicao.data_prevista_recebimento ?? '')

  const caucaoPct = obra.aliquota_caucao ?? 0
  const issPct = obra.aliquota_iss ?? 0
  const inssPct = obra.aliquota_inss ?? 0
  const irrfPct = obra.aliquota_irrf ?? 0

  // Recalculate totals from edited rows
  const bruto = rows.reduce((s, r) => {
    const qtd = parseFloat(r.qtdEdit || '0')
    return s + Math.round(qtd * r.valor_unitario)
  }, 0)
  const retCaucao = Math.round(bruto * caucaoPct / 100)
  const retIss = Math.round(bruto * issPct / 100)
  const retInss = Math.round(bruto * inssPct / 100)
  const retIrrf = Math.round(bruto * irrfPct / 100)
  const liquido = bruto - retCaucao - retIss - retInss - retIrrf

  function setQtd(id: string, val: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, qtdEdit: val } : r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Build updated items
    const updatedItens = rows.map(r => {
      const qtd = parseFloat(r.qtdEdit || '0')
      return { ...r, quantidade_executada: qtd, valor_total: Math.round(qtd * r.valor_unitario) }
    })

    // Update each medicao_item (view vw_planilha_saldo recalculates accumulation automatically)
    const itemUpdates = updatedItens.map(r =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('medicao_itens') as any).update({
        quantidade_executada: r.quantidade_executada,
        valor_total: r.valor_total,
      }).eq('id', r.id)
    )

    const medicaoUpdate = {
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      data_prevista_recebimento: dataPrevista || null,
      valor_bruto: bruto,
      retencao_caucao: retCaucao,
      retencao_iss: retIss,
      retencao_inss: retInss,
      retencao_irrf: retIrrf,
      valor_liquido: liquido,
    }

    await Promise.all(itemUpdates)
    const { error } = await supabase.from('medicoes').update(medicaoUpdate).eq('id', medicao.id)

    if (error) {
      toast({ description: 'Erro ao salvar medição.', variant: 'destructive' })
      setSaving(false)
      return
    }

    await supabase.from('fluxo_caixa')
      .update({ valor: liquido })
      .eq('origem_id', medicao.id)
      .eq('origem', 'medicao')

    toast({ description: 'Medição atualizada com sucesso.' })
    onSaved({ ...medicao, ...medicaoUpdate }, updatedItens)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2 max-h-[80vh] overflow-y-auto pr-1">
      {/* Período */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-[var(--color-muted)]">Período início *</Label>
          <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" required />
        </div>
        <div>
          <Label className="text-xs text-[var(--color-muted)]">Período fim *</Label>
          <Input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" required />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-[var(--color-muted)]">Data prevista de recebimento</Label>
          <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
        </div>
      </div>

      {/* Itens editáveis */}
      {rows.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
            Itens medidos — edite as quantidades
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)]">Descrição</th>
                <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)]">Un.</th>
                <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)]">V. Unit.</th>
                <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] w-28">Qtd. executada</th>
                <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const qtd = parseFloat(r.qtdEdit || '0')
                const total = Math.round(qtd * r.valor_unitario)
                return (
                  <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2 text-[var(--color-text)]">
                      <div>{r.descricao}</div>
                      {r.codigo && <div className="text-xs text-[var(--color-muted)]">{r.codigo}</div>}
                    </td>
                    <td className="px-3 py-2 text-center text-[var(--color-muted)] text-xs">{r.unidade}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-muted)]"><ValorMonetario value={r.valor_unitario} /></td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={r.qtdEdit}
                        onChange={e => setQtd(r.id, e.target.value)}
                        className="h-7 text-xs text-right bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium"><ValorMonetario value={total} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumo financeiro recalculado */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm space-y-1.5">
        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Resumo financeiro</p>
        <div className="flex justify-between"><span className="text-[var(--color-muted)]">Valor Bruto</span><ValorMonetario value={bruto} /></div>
        {caucaoPct > 0 && <div className="flex justify-between"><span className="text-[var(--color-muted)]">(−) Caução {caucaoPct}%</span><ValorMonetario value={retCaucao} className="text-[var(--color-danger)]" /></div>}
        {issPct > 0 && <div className="flex justify-between"><span className="text-[var(--color-muted)]">(−) ISS {issPct}%</span><ValorMonetario value={retIss} className="text-[var(--color-danger)]" /></div>}
        {inssPct > 0 && <div className="flex justify-between"><span className="text-[var(--color-muted)]">(−) INSS {inssPct}%</span><ValorMonetario value={retInss} className="text-[var(--color-danger)]" /></div>}
        {irrfPct > 0 && <div className="flex justify-between"><span className="text-[var(--color-muted)]">(−) IRRF {irrfPct}%</span><ValorMonetario value={retIrrf} className="text-[var(--color-danger)]" /></div>}
        <div className="flex justify-between font-bold border-t border-[var(--color-border)] pt-2">
          <span className="text-[var(--color-text)]">Valor Líquido</span>
          <ValorMonetario value={liquido} className="text-[var(--color-success)] text-base" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pb-2">
        <Button type="button" variant="outline" onClick={onCancel} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">{saving ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}

// ── MedicaoDetailPage ─────────────────────────────────────────────────────────

export function MedicaoDetailPage() {
  const { id, mid } = useParams<{ id: string; mid: string }>()
  const { user, perfil } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [obra, setObra] = useState<Obra | null>(null)
  const [medicao, setMedicao] = useState<Medicao | null>(null)
  const [itens, setItens] = useState<MedicaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  // ── Form ──
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<RecebidoFormValues>({
    resolver: zodResolver(recebidoSchema),
    defaultValues: {
      tipo_recebimento: 'total',
      data_recebimento: format(new Date(), 'yyyy-MM-dd'),
      valor_recebido_reais: '',
    },
  })

  // ── Load data ──
  useEffect(() => {
    if (!id || !mid || !user) return
    async function load() {
      const [{ data: obraData }, { data: medicaoData }, { data: itensData }] = await Promise.all([
        supabase.from('obras').select('*').eq('id', id!).eq('user_id', user!.id).single(),
        supabase.from('medicoes').select('*').eq('id', mid!).eq('user_id', user!.id).single(),
        supabase.from('medicao_itens').select('*').eq('medicao_id', mid!).eq('user_id', user!.id).order('created_at'),
      ])

      if (!obraData || !medicaoData) {
        toast({ description: 'Medição não encontrada.', variant: 'destructive' })
        navigate(`/obras/${id}?tab=medicoes`)
        return
      }

      setObra(obraData)
      setMedicao(medicaoData)
      setItens(itensData ?? [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mid, user])

  // Pre-populate valor when opening dialog (set to valor_liquido)
  function openDialog() {
    if (!medicao) return
    const valorLiquidoReais = (medicao.valor_liquido / 100).toFixed(2).replace('.', ',')
    reset({
      tipo_recebimento: 'total',
      data_recebimento: format(new Date(), 'yyyy-MM-dd'),
      valor_recebido_reais: valorLiquidoReais,
    })
    setShowDialog(true)
  }

  // ── Marcar como recebido ──
  async function onConfirmarRecebimento(values: RecebidoFormValues) {
    if (!medicao || !user) return
    setSaving(true)

    const normalized = values.valor_recebido_reais.replace(/\./g, '').replace(',', '.')
    const valorCentavos = Math.round(parseFloat(normalized) * 100)
    const novoStatus = values.tipo_recebimento === 'total' ? 'recebido' : 'parcial'

    // Update medicoes
    const { error: medErr } = await supabase
      .from('medicoes')
      .update({
        status: novoStatus,
        data_recebimento: values.data_recebimento,
        valor_recebido: valorCentavos,
      })
      .eq('id', medicao.id)
      .eq('user_id', user.id)

    if (medErr) {
      toast({ description: 'Erro ao atualizar medição.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Update fluxo_caixa
    const { error: fluxoErr } = await supabase
      .from('fluxo_caixa')
      .update({
        status: 'realizado',
        data_realizacao: values.data_recebimento,
      })
      .eq('origem', 'medicao')
      .eq('origem_id', medicao.id)
      .eq('user_id', user.id)

    if (fluxoErr) {
      toast({ description: 'Medição atualizada, mas erro ao atualizar fluxo de caixa.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Refresh medicao state
    setMedicao(prev =>
      prev
        ? {
            ...prev,
            status: novoStatus,
            data_recebimento: values.data_recebimento,
            valor_recebido: valorCentavos,
          }
        : prev
    )

    setShowDialog(false)
    setSaving(false)
    toast({ description: `Medição marcada como ${novoStatus === 'recebido' ? 'recebida' : 'parcialmente recebida'}.` })
  }

  // ── Gerar PDF ──
  async function handleGerarPdf() {
    if (!obra || !medicao) return
    setGerandoPdf(true)
    try {
      await gerarBoletimPDF(obra, medicao, itens, perfil)
    } catch {
      toast({ description: 'Erro ao gerar PDF.', variant: 'destructive' })
    } finally {
      setGerandoPdf(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }} />
        <div className="h-64 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }} />
      </div>
    )
  }

  if (!obra || !medicao) return null

  const totalRetencoes =
    medicao.retencao_caucao + medicao.retencao_iss + medicao.retencao_inss + medicao.retencao_irrf

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2">
        <Link
          to={`/obras/${obra.id}?tab=medicoes`}
          className="flex items-center gap-1 text-sm hover:underline"
          style={{ color: 'var(--color-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Medições
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Medição #{medicao.numero}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {obra.nome} &mdash; {fmtDate(medicao.periodo_inicio)} a {fmtDate(medicao.periodo_fim)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={medicao.status} />
          {medicao.status !== 'recebido' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              <Pencil className="w-4 h-4" />
              Editar medição
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGerarPdf}
            disabled={gerandoPdf}
            className="flex items-center gap-2"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <FileText className="w-4 h-4" />
            {gerandoPdf ? 'Gerando…' : 'Gerar boletim PDF'}
          </Button>
        </div>
      </div>

      {/* Resumo financeiro */}
      <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Resumo Financeiro
          </h2>
          <div className="space-y-2 max-w-sm">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-muted)' }}>Valor Bruto</span>
              <ValorMonetario value={medicao.valor_bruto} className="font-medium" />
            </div>
            {obra.aliquota_caucao > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted)' }}>(-) Caução ({obra.aliquota_caucao}%)</span>
                <ValorMonetario value={medicao.retencao_caucao} className="text-[var(--color-danger)]" />
              </div>
            )}
            {obra.aliquota_iss > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted)' }}>(-) ISS ({obra.aliquota_iss}%)</span>
                <ValorMonetario value={medicao.retencao_iss} className="text-[var(--color-danger)]" />
              </div>
            )}
            {obra.aliquota_inss > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted)' }}>(-) INSS ({obra.aliquota_inss}%)</span>
                <ValorMonetario value={medicao.retencao_inss} className="text-[var(--color-danger)]" />
              </div>
            )}
            {obra.aliquota_irrf > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted)' }}>(-) IRRF ({obra.aliquota_irrf}%)</span>
                <ValorMonetario value={medicao.retencao_irrf} className="text-[var(--color-danger)]" />
              </div>
            )}
            <div
              className="flex justify-between text-sm pt-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-muted)' }}>Total Retenções</span>
              <ValorMonetario value={totalRetencoes} className="text-[var(--color-danger)]" />
            </div>
            <div
              className="flex justify-between text-base font-bold pt-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span style={{ color: 'var(--color-text)' }}>Valor Líquido</span>
              <ValorMonetario value={medicao.valor_liquido} className="text-[var(--color-success)]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de itens */}
      <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Itens Medidos
          </h2>
          {itens.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Nenhum item encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                    <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Código
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Descrição
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Un.
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Qtd. Exec.
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Valor Unit.
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                      Valor Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      className="hover:bg-[var(--color-surface-2)]/50"
                    >
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {item.codigo ?? '—'}
                      </td>
                      <td className="px-3 py-2 max-w-xs" style={{ color: 'var(--color-text)' }}>
                        {item.descricao}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--color-muted)' }}>
                        {item.unidade}
                      </td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text)' }}>
                        {item.quantidade_executada}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ValorMonetario value={item.valor_unitario} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ValorMonetario value={item.valor_total} className="text-[var(--color-success)]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloco de recebimento */}
      <Card style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Recebimento
          </h2>

          {medicao.status === 'aguardando' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {medicao.data_prevista_recebimento && (
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  Previsão:{' '}
                  <span style={{ color: 'var(--color-text)' }}>
                    {fmtDate(medicao.data_prevista_recebimento)}
                  </span>
                </p>
              )}
              <Button
                onClick={openDialog}
                className="sm:ml-auto"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#000',
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como recebido
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm max-w-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted)' }}>Data de recebimento</span>
                <span style={{ color: 'var(--color-text)' }}>{fmtDate(medicao.data_recebimento)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted)' }}>Valor recebido</span>
                {medicao.valor_recebido != null ? (
                  <ValorMonetario value={medicao.valor_recebido} className="text-[var(--color-success)]" />
                ) : (
                  <span style={{ color: 'var(--color-muted)' }}>—</span>
                )}
              </div>
              {medicao.status === 'parcial' && (
                <div
                  className="pt-2"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                    Recebimento parcial. O saldo restante ainda está aguardando.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Marcar como recebido */}
      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text)' }}>
              Registrar Recebimento — Medição #{medicao.numero}
            </h3>

            <form onSubmit={handleSubmit(onConfirmarRecebimento)} className="space-y-4">
              {/* Tipo */}
              <div>
                <Label className="text-xs mb-1.5 block" style={{ color: 'var(--color-muted)' }}>
                  Tipo de recebimento *
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text)' }}>
                    <input
                      type="radio"
                      value="total"
                      {...register('tipo_recebimento')}
                    />
                    Total
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text)' }}>
                    <input
                      type="radio"
                      value="parcial"
                      {...register('tipo_recebimento')}
                    />
                    Parcial
                  </label>
                </div>
              </div>

              {/* Data */}
              <div>
                <Label htmlFor="data_recebimento" className="text-xs mb-1.5 block" style={{ color: 'var(--color-muted)' }}>
                  Data de recebimento *
                </Label>
                <Input
                  id="data_recebimento"
                  type="date"
                  {...register('data_recebimento')}
                  className="bg-[var(--color-surface-2)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {errors.data_recebimento && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                    {errors.data_recebimento.message}
                  </p>
                )}
              </div>

              {/* Valor */}
              <div>
                <Label htmlFor="valor_recebido_reais" className="text-xs mb-1.5 block" style={{ color: 'var(--color-muted)' }}>
                  Valor recebido (R$) *{' '}
                  {watch('tipo_recebimento') === 'parcial' && (
                    <span style={{ color: 'var(--color-warning)' }}>(informar valor parcial)</span>
                  )}
                </Label>
                <Input
                  id="valor_recebido_reais"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register('valor_recebido_reais')}
                  className="bg-[var(--color-surface-2)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
                {errors.valor_recebido_reais && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                    {errors.valor_recebido_reais.message}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Valor líquido da medição:{' '}
                  <ValorMonetario value={medicao.valor_liquido} className="font-mono" />
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                >
                  {saving ? 'Salvando…' : 'Confirmar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog editar medição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-text)]">Editar Medição #{medicao.numero}</DialogTitle>
          </DialogHeader>
          <EditMedicaoForm
            medicao={medicao}
            obra={obra}
            itensOriginais={itens}
            onSaved={(updated, updatedItens) => { setMedicao(updated); setItens(updatedItens); setShowEditDialog(false) }}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
