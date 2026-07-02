import { useCallback, useEffect, useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, ArrowRightLeft } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { todayStr } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { Equipamento, AlocacaoEquipamento, EquipamentoTipo, EquipamentoStatus, Obra } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const tipoLabel: Record<EquipamentoTipo, string> = {
  proprio: 'Próprio',
  alugado: 'Alugado',
  terceiro: 'Terceiro',
}

function statusBadge(status: EquipamentoStatus, proxManutencao: string | null) {
  const vencida = proxManutencao && parseISO(proxManutencao) < new Date()
  if (vencida) return <Badge className="bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30"><AlertTriangle className="w-3 h-3 mr-1" />Manutenção vencida</Badge>
  if (status === 'manutencao') return <Badge className="bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/30"><Clock className="w-3 h-3 mr-1" />Manutenção</Badge>
  if (status === 'alocado') return <Badge className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30"><ArrowRightLeft className="w-3 h-3 mr-1" />Alocado</Badge>
  return <Badge className="bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30"><CheckCircle className="w-3 h-3 mr-1" />Disponível</Badge>
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const equipSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  tipo: z.enum(['proprio', 'alugado', 'terceiro']),
  numero_serie: z.string().optional(),
  valor_aquisicao_reais: z.coerce.number().min(0),
  custo_diaria_reais: z.coerce.number().min(0),
  proxima_manutencao: z.string().optional(),
})

const alocacaoSchema = z.object({
  equipamento_id: z.string().min(1, 'Obrigatório'),
  obra_id: z.string().min(1, 'Obrigatório'),
  data_inicio: z.string().min(1, 'Obrigatório'),
  custo_diaria_override_reais: z.coerce.number().min(0).optional(),
  observacao: z.string().optional(),
})

type EquipForm = z.infer<typeof equipSchema>
type AlocacaoForm = z.infer<typeof alocacaoSchema>

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

type AlocacaoComObra = AlocacaoEquipamento & { obras: { nome: string } | null }
type EquipComAlocacao = Equipamento & { alocacao_atual: AlocacaoComObra | null }

// ── Component ─────────────────────────────────────────────────────────────────

export function EquipamentosPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [equipamentos, setEquipamentos] = useState<EquipComAlocacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogEquip, setDialogEquip] = useState(false)
  const [dialogAlocacao, setDialogAlocacao] = useState(false)
  const [saving, setSaving] = useState(false)

  const equipForm = useForm<EquipForm>({
    resolver: zodResolver(equipSchema),
    defaultValues: { nome: '', tipo: 'proprio', numero_serie: '', valor_aquisicao_reais: 0, custo_diaria_reais: 0, proxima_manutencao: '' },
  })
  const alocacaoForm = useForm<AlocacaoForm>({
    resolver: zodResolver(alocacaoSchema),
    defaultValues: { equipamento_id: '', obra_id: '', data_inicio: todayStr(), custo_diaria_override_reais: 0, observacao: '' },
  })

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [equipRes, alocRes, obrasRes] = await Promise.all([
      supabase.from('equipamentos').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('alocacoes_equipamento').select('*, obras(nome)').eq('user_id', user.id).is('data_fim', null),
      supabase.from('obras').select('id, nome').eq('user_id', user.id).eq('status', 'em_andamento').order('nome'),
    ])
    const alocacoes = (alocRes.data ?? []) as AlocacaoComObra[]
    const alocMap = new Map(alocacoes.map(a => [a.equipamento_id, a]))
    setEquipamentos(
      (equipRes.data ?? []).map(e => ({ ...e, alocacao_atual: alocMap.get(e.id) ?? null }))
    )
    setObras((obrasRes.data ?? []) as Obra[])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Submit: novo equipamento ──────────────────────────────────────────────

  async function onSaveEquip(values: EquipForm) {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('equipamentos').insert({
      user_id: user.id,
      nome: values.nome,
      tipo: values.tipo as EquipamentoTipo,
      numero_serie: values.numero_serie || null,
      valor_aquisicao: Math.round(values.valor_aquisicao_reais * 100),
      custo_diaria: Math.round(values.custo_diaria_reais * 100),
      proxima_manutencao: values.proxima_manutencao || null,
      status: 'disponivel' as EquipamentoStatus,
    })
    setSaving(false)
    if (error) { toast({ title: 'Erro ao salvar equipamento', variant: 'destructive' }); return }
    toast({ title: 'Equipamento cadastrado' })
    setDialogEquip(false)
    equipForm.reset()
    load()
  }

  // ── Submit: alocar ────────────────────────────────────────────────────────

  async function onSaveAlocacao(values: AlocacaoForm) {
    if (!user) return
    setSaving(true)
    const override = values.custo_diaria_override_reais
      ? Math.round(values.custo_diaria_override_reais * 100)
      : null

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('alocacoes_equipamento').insert({
        user_id: user.id,
        equipamento_id: values.equipamento_id,
        obra_id: values.obra_id,
        data_inicio: values.data_inicio,
        data_fim: null,
        custo_diaria_override: override,
        observacao: values.observacao || null,
      }),
      supabase.from('equipamentos').update({ status: 'alocado' })
        .eq('id', values.equipamento_id).eq('user_id', user.id),
    ])
    setSaving(false)
    if (e1 || e2) { toast({ title: 'Erro ao alocar', variant: 'destructive' }); return }
    toast({ title: 'Equipamento alocado com sucesso' })
    setDialogAlocacao(false)
    alocacaoForm.reset({ data_inicio: todayStr() })
    load()
  }

  // ── Devolver equipamento ──────────────────────────────────────────────────

  async function devolver(equip: EquipComAlocacao) {
    if (!equip.alocacao_atual || !user) return
    const hoje = todayStr()
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('alocacoes_equipamento').update({ data_fim: hoje })
        .eq('id', equip.alocacao_atual.id).eq('user_id', user.id),
      supabase.from('equipamentos').update({ status: 'disponivel' })
        .eq('id', equip.id).eq('user_id', user.id),
    ])
    if (e1 || e2) { toast({ title: 'Erro ao devolver', variant: 'destructive' }); return }
    toast({ title: 'Equipamento devolvido' })
    load()
  }

  // ── Custo acumulado de uma alocação ───────────────────────────────────────

  function custoAcumulado(equip: EquipComAlocacao): number {
    const aloc = equip.alocacao_atual
    if (!aloc) return 0
    const dias = differenceInDays(new Date(), parseISO(aloc.data_inicio)) + 1
    const diaria = aloc.custo_diaria_override ?? equip.custo_diaria
    return dias * diaria
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const disponiveis = equipamentos.filter(e => e.status === 'disponivel' && !(e.proxima_manutencao && parseISO(e.proxima_manutencao) < new Date()))

  return (
    <div className="space-y-6 text-[var(--color-text)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Máquinas e ferramentas — alocação e custo por obra</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[var(--color-border)] text-[var(--color-text)]"
            onClick={() => setDialogAlocacao(true)}
            disabled={disponiveis.length === 0}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Alocar para obra
          </Button>
          <Button
            className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]"
            onClick={() => setDialogEquip(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo equipamento
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--color-muted)]">Carregando...</div>
        ) : equipamentos.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench className="w-10 h-10 mx-auto mb-3 text-[var(--color-muted)]" />
            <p className="text-[var(--color-muted)] text-sm">Nenhum equipamento cadastrado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Equipamento</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Obra atual</th>
                <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Custo/dia</th>
                <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Custo acumulado</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Próx. manutenção</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map(e => {
                const diaria = e.alocacao_atual?.custo_diaria_override ?? e.custo_diaria
                return (
                  <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div>{e.nome}</div>
                      {e.numero_serie && <div className="text-xs text-[var(--color-muted)]">Série: {e.numero_serie}</div>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{tipoLabel[e.tipo]}</td>
                    <td className="px-4 py-3">{statusBadge(e.status, e.proxima_manutencao)}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)] text-sm">
                      {e.alocacao_atual
                        ? <><span className="text-[var(--color-text)]">{e.alocacao_atual.obras?.nome ?? '—'}</span><br /><span className="text-xs">desde {format(parseISO(e.alocacao_atual.data_inicio), 'dd/MM/yy', { locale: ptBR })}</span></>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ValorMonetario value={diaria} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {e.alocacao_atual
                        ? <ValorMonetario value={custoAcumulado(e)} className="text-[var(--color-warning)]" />
                        : <span className="text-[var(--color-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {e.proxima_manutencao
                        ? <span className={parseISO(e.proxima_manutencao) < new Date() ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}>
                            {format(parseISO(e.proxima_manutencao), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        : <span className="text-[var(--color-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {e.alocacao_atual && (
                        <Button size="sm" variant="outline"
                          className="border-[var(--color-border)] text-[var(--color-text)] text-xs"
                          onClick={() => devolver(e)}
                        >
                          Devolver
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog: Novo equipamento */}
      <Dialog open={dialogEquip} onOpenChange={setDialogEquip}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle>Novo Equipamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={equipForm.handleSubmit(onSaveEquip)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Nome *</Label>
              <Input {...equipForm.register('nome')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" placeholder="Ex: Betoneira 400L" />
              {equipForm.formState.errors.nome && <p className="text-xs text-[var(--color-danger)] mt-1">{equipForm.formState.errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Tipo *</Label>
                <Controller name="tipo" control={equipForm.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      <SelectItem value="proprio" className="text-[var(--color-text)]">Próprio</SelectItem>
                      <SelectItem value="alugado" className="text-[var(--color-text)]">Alugado</SelectItem>
                      <SelectItem value="terceiro" className="text-[var(--color-text)]">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Número de série</Label>
                <Input {...equipForm.register('numero_serie')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Valor de aquisição (R$)</Label>
                <Input type="number" step="0.01" min="0" {...equipForm.register('valor_aquisicao_reais')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Custo/dia (R$)</Label>
                <Input type="number" step="0.01" min="0" {...equipForm.register('custo_diaria_reais')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Próxima manutenção</Label>
              <Input type="date" {...equipForm.register('proxima_manutencao')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogEquip(false)} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Alocar para obra */}
      <Dialog open={dialogAlocacao} onOpenChange={setDialogAlocacao}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle><ArrowRightLeft className="w-4 h-4 inline mr-2" />Alocar para Obra</DialogTitle>
          </DialogHeader>
          <form onSubmit={alocacaoForm.handleSubmit(onSaveAlocacao)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Equipamento *</Label>
              <Controller name="equipamento_id" control={alocacaoForm.control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                    {disponiveis.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-[var(--color-text)]">
                        {e.nome} — R$ {(e.custo_diaria / 100).toFixed(2)}/dia
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Obra *</Label>
              <Controller name="obra_id" control={alocacaoForm.control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                    {obras.map(o => <SelectItem key={o.id} value={o.id} className="text-[var(--color-text)]">{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Data início *</Label>
                <Input type="date" {...alocacaoForm.register('data_inicio')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Custo/dia diferente (R$)</Label>
                <Input type="number" step="0.01" min="0" {...alocacaoForm.register('custo_diaria_override_reais')} placeholder="Deixe 0 para usar o padrão" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Observação</Label>
              <textarea {...alocacaoForm.register('observacao')} rows={2} className="mt-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-md px-3 py-2 text-sm resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogAlocacao(false)} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]">{saving ? 'Alocando...' : 'Alocar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
