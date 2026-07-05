import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { Obra, VwPlanilhaSaldo, MedicaoStatus, FluxoTipo, FluxoEscopo, FluxoOrigem, LancamentoStatus } from '@/types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  periodo_inicio: z.string().min(1, 'Obrigatório'),
  periodo_fim: z.string().min(1, 'Obrigatório'),
  data_prevista_recebimento: z.string().optional(),
}).refine(d => !d.periodo_inicio || !d.periodo_fim || d.periodo_inicio <= d.periodo_fim, {
  message: 'A data de início deve ser anterior ou igual ao término',
  path: ['periodo_fim'],
})

type FormValues = z.infer<typeof schema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

// ── MedicaoFormPage ───────────────────────────────────────────────────────────

export function MedicaoFormPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // ── State ──
  const [obra, setObra] = useState<Obra | null>(null)
  const [loadingObra, setLoadingObra] = useState(true)

  const [saldos, setSaldos] = useState<VwPlanilhaSaldo[]>([])
  const [totalItensPlanilha, setTotalItensPlanilha] = useState(0)
  const [loadingSaldos, setLoadingSaldos] = useState(true)

  const [proximoNumero, setProximoNumero] = useState<number>(1)

  // quantidade_periodo per planilha_item_id → string to allow empty input
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)

  // ── Form ──
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodo_inicio: today(),
      periodo_fim: today(),
      data_prevista_recebimento: '',
    },
  })

  // ── Loaders ──
  useEffect(() => {
    if (!id || !user) return
    async function load() {
      const [{ data: obraData }, { data: saldoData }, { data: medData }] = await Promise.all([
        supabase.from('obras').select('*').eq('id', id!).eq('user_id', user!.id).single(),
        supabase.from('vw_planilha_saldo').select('*').eq('obra_id', id!).eq('user_id', user!.id),
        supabase.from('medicoes').select('numero').eq('obra_id', id!).eq('user_id', user!.id).order('numero', { ascending: false }).limit(1),
      ])

      if (!obraData) {
        toast({ description: 'Obra não encontrada.', variant: 'destructive' })
        navigate('/obras')
        return
      }

      setObra(obraData)

      const todosItens = saldoData ?? []
      const itensComSaldo = todosItens.filter(i => i.quantidade_restante > 0)
      setTotalItensPlanilha(todosItens.length)
      setSaldos(itensComSaldo)

      const maxNum = (medData ?? []).length > 0 ? medData![0].numero : 0
      setProximoNumero(maxNum + 1)

      setLoadingObra(false)
      setLoadingSaldos(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  // ── Calculations (all in centavos) ──
  const resumo = useMemo(() => {
    if (!obra) return null

    let valor_bruto = 0
    for (const item of saldos) {
      const qtdStr = quantidades[item.planilha_item_id] ?? ''
      const qtd = qtdStr === '' ? 0 : parseFloat(qtdStr)
      if (isNaN(qtd) || qtd <= 0) continue
      valor_bruto += qtd * item.valor_unitario
    }
    valor_bruto = Math.round(valor_bruto)

    const retencao_caucao = Math.round(valor_bruto * obra.aliquota_caucao / 100)
    const retencao_iss    = Math.round(valor_bruto * obra.aliquota_iss / 100)
    const retencao_inss   = Math.round(valor_bruto * obra.aliquota_inss / 100)
    const retencao_irrf   = Math.round(valor_bruto * obra.aliquota_irrf / 100)
    const total_retencoes = retencao_caucao + retencao_iss + retencao_inss + retencao_irrf
    const valor_liquido   = valor_bruto - total_retencoes

    return { valor_bruto, retencao_caucao, retencao_iss, retencao_inss, retencao_irrf, total_retencoes, valor_liquido }
  }, [obra, saldos, quantidades])

  // ── Submit ──
  async function onSubmit(values: FormValues) {
    if (!obra || !user || !resumo) return

    // At least one item with quantidade > 0
    const itensAtivos = saldos.filter(item => {
      const v = parseFloat(quantidades[item.planilha_item_id] ?? '')
      return !isNaN(v) && v > 0
    })

    if (itensAtivos.length === 0) {
      toast({ description: 'Informe a quantidade executada em ao menos um item.', variant: 'destructive' })
      return
    }

    setSaving(true)

    // Step 1: Insert medicao
    const { data: medicao, error: medErr } = await supabase
      .from('medicoes')
      .insert({
        obra_id: obra.id,
        user_id: user.id,
        numero: proximoNumero,
        periodo_inicio: values.periodo_inicio,
        periodo_fim: values.periodo_fim,
        valor_bruto: resumo.valor_bruto,
        retencao_caucao: resumo.retencao_caucao,
        retencao_iss: resumo.retencao_iss,
        retencao_inss: resumo.retencao_inss,
        retencao_irrf: resumo.retencao_irrf,
        valor_liquido: resumo.valor_liquido,
        status: 'aguardando' as MedicaoStatus,
        data_prevista_recebimento: values.data_prevista_recebimento || null,
        data_recebimento: null,
        valor_recebido: null,
        boletim_pdf_url: null,
        incluir_contador: true,
      })
      .select('id')
      .single()

    if (medErr || !medicao) {
      toast({ description: 'Erro ao criar medição. Tente novamente.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Step 2: Insert medicao_itens
    const medicaoItensRows = itensAtivos.map(item => {
      const qtd = parseFloat(quantidades[item.planilha_item_id])
      return {
        medicao_id: medicao.id,
        planilha_item_id: item.planilha_item_id,
        user_id: user.id,
        codigo: item.codigo ?? null,
        descricao: item.descricao,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        quantidade_executada: qtd,
      }
    })

    const { error: itensErr } = await supabase.from('medicao_itens').insert(medicaoItensRows)

    if (itensErr) {
      // Rollback: delete medicao (cascade handles medicao_itens)
      await supabase.from('medicoes').delete().eq('id', medicao.id)
      toast({ description: 'Erro ao salvar itens da medição. Nenhum dado foi salvo.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Step 3: Insert fluxo_caixa
    const dataLancamento = values.data_prevista_recebimento || values.periodo_fim || today()
    const { error: fluxoErr } = await supabase.from('fluxo_caixa').insert({
      user_id: user.id,
      obra_id: obra.id,
      tipo: 'entrada' as FluxoTipo,
      escopo: 'pj_obra' as FluxoEscopo,
      origem: 'medicao' as FluxoOrigem,
      origem_id: medicao.id,
      descricao: `Medição #${proximoNumero} — ${obra.nome}`,
      categoria: 'medicao',
      valor: resumo.valor_liquido,
      data_lancamento: dataLancamento,
      status: 'previsto' as LancamentoStatus,
      data_realizacao: null,
      incluir_contador: true,
      observacao: null,
    })

    if (fluxoErr) {
      // Rollback: delete medicao (cascade handles medicao_itens)
      await supabase.from('medicoes').delete().eq('id', medicao.id)
      toast({ description: 'Erro ao lançar no fluxo de caixa. Nenhum dado foi salvo.', variant: 'destructive' })
      setSaving(false)
      return
    }

    toast({ description: `Medição #${proximoNumero} criada com sucesso.` })
    navigate(`/obras/${obra.id}/medicoes/${medicao.id}`)
  }

  // ── Loading ──
  if (loadingObra || loadingSaldos) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--color-surface)] animate-pulse" />
        <div className="h-64 rounded-lg bg-[var(--color-surface)] animate-pulse" />
      </div>
    )
  }

  if (!obra) return null

  // ── Guard: no planilha items ──
  if (saldos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/obras/${obra.id}?tab=medicoes`)}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] -ml-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-[var(--color-warning)]" />
            {totalItensPlanilha === 0 ? (
              <>
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Planilha de serviços não cadastrada</h2>
                <p className="text-sm text-[var(--color-muted)] mb-6 max-w-md mx-auto">
                  Para abrir uma medição é necessário cadastrar os itens da planilha de serviços primeiro.
                </p>
                <Button asChild className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
                  <Link to={`/obras/${obra.id}/planilha`}>Cadastrar planilha</Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Obra 100% medida</h2>
                <p className="text-sm text-[var(--color-muted)] mb-6 max-w-md mx-auto">
                  Todos os {totalItensPlanilha} itens da planilha já atingiram 100% da quantidade contratada. Não há saldo disponível para nova medição.
                </p>
                <Button variant="outline" onClick={() => navigate(`/obras/${obra.id}?tab=medicoes`)} className="border-[var(--color-border)] text-[var(--color-text)]">
                  Ver medições
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render form ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/obras/${obra.id}?tab=medicoes`)}
          className="text-[var(--color-muted)] hover:text-[var(--color-text)] -ml-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Medições
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Nova Medição</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">{obra.nome} — Medição #{proximoNumero}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Período */}
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Período</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[var(--color-muted)] text-xs">Data de Início *</Label>
                <Input
                  {...register('periodo_inicio')}
                  type="date"
                  className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                />
                {errors.periodo_inicio && (
                  <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.periodo_inicio.message}</p>
                )}
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-xs">Data de Término *</Label>
                <Input
                  {...register('periodo_fim')}
                  type="date"
                  className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                />
                {errors.periodo_fim && (
                  <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.periodo_fim.message}</p>
                )}
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-xs">Previsão de Recebimento</Label>
                <Input
                  {...register('data_prevista_recebimento')}
                  type="date"
                  className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de itens */}
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Itens com Saldo Disponível</h2>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Cód.</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Descrição</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Un.</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Contratada</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Medida</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Saldo</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">V. Unit.</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium w-32">Qtd. Período</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">V. Período</th>
                  </tr>
                </thead>
                <tbody>
                  {saldos.map(item => {
                    const qtdStr = quantidades[item.planilha_item_id] ?? ''
                    const qtd = qtdStr === '' ? 0 : parseFloat(qtdStr)
                    const valorPeriodo = isNaN(qtd) ? 0 : Math.round(qtd * item.valor_unitario)
                    const saldo = item.quantidade_restante

                    return (
                      <tr key={item.planilha_item_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50">
                        <td className="px-3 py-2 text-[var(--color-muted)] text-xs">{item.codigo ?? '—'}</td>
                        <td className="px-3 py-2 text-[var(--color-text)] max-w-xs">{item.descricao}</td>
                        <td className="px-3 py-2 text-center text-[var(--color-muted)]">{item.unidade}</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text)]">{item.quantidade_contratada}</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text)]">{item.quantidade_medida}</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text)]">{saldo}</td>
                        <td className="px-3 py-2 text-right">
                          <ValorMonetario value={item.valor_unitario} />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={saldo}
                            step="any"
                            value={qtdStr}
                            onChange={e => {
                              setQuantidades(prev => ({ ...prev, [item.planilha_item_id]: e.target.value }))
                            }}
                            className="bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] text-right w-full"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {valorPeriodo > 0 ? (
                            <ValorMonetario value={valorPeriodo} className="text-[var(--color-success)]" />
                          ) : (
                            <span className="text-[var(--color-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Resumo financeiro */}
        {resumo && (
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Resumo Financeiro</h2>
              <div className="space-y-2 max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted)]">Valor Bruto</span>
                  <ValorMonetario value={resumo.valor_bruto} className="text-[var(--color-text)] font-medium" />
                </div>
                {obra.aliquota_caucao > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">(-) Caução ({obra.aliquota_caucao}%)</span>
                    <ValorMonetario value={resumo.retencao_caucao} className="text-[var(--color-danger)]" />
                  </div>
                )}
                {obra.aliquota_iss > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">(-) ISS ({obra.aliquota_iss}%)</span>
                    <ValorMonetario value={resumo.retencao_iss} className="text-[var(--color-danger)]" />
                  </div>
                )}
                {obra.aliquota_inss > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">(-) INSS ({obra.aliquota_inss}%)</span>
                    <ValorMonetario value={resumo.retencao_inss} className="text-[var(--color-danger)]" />
                  </div>
                )}
                {obra.aliquota_irrf > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">(-) IRRF ({obra.aliquota_irrf}%)</span>
                    <ValorMonetario value={resumo.retencao_irrf} className="text-[var(--color-danger)]" />
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-[var(--color-border)] pt-2">
                  <span className="text-[var(--color-muted)]">Total Retenções</span>
                  <ValorMonetario value={resumo.total_retencoes} className="text-[var(--color-danger)]" />
                </div>
                <div className="flex justify-between text-base font-bold border-t border-[var(--color-border)] pt-2">
                  <span className="text-[var(--color-text)]">Valor Líquido</span>
                  <ValorMonetario value={resumo.valor_liquido} className="text-[var(--color-success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/obras/${obra.id}?tab=medicoes`)}
            className="border-[var(--color-border)] text-[var(--color-text)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || !resumo || resumo.valor_bruto === 0}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black"
          >
            {saving ? 'Salvando…' : 'Confirmar medição'}
          </Button>
        </div>
      </form>
    </div>
  )
}
