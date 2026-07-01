import { useCallback, useEffect, useState } from 'react'
import { format, parseISO, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, CheckCircle } from 'lucide-react'
import { parseCentavos, todayStr } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { FluxoCaixa } from '@/types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  tipo: z.enum(['entrada', 'saida'], { required_error: 'Obrigatório' }),
  descricao: z.string().min(1, 'Obrigatório'),
  categoria: z.string().optional(),
  valor: z.string().min(1, 'Obrigatório').refine(v => {
    const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
    return !isNaN(n) && n > 0
  }, 'Deve ser maior que zero'),
  data_lancamento: z.string().min(1, 'Obrigatório'),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────

export function FluxoCaixaPFPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())

  const [lancamentos, setLancamentos] = useState<FluxoCaixa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'saida',
      descricao: '',
      categoria: '',
      valor: '',
      data_lancamento: todayStr(),
      observacao: '',
    },
  })

  // ── Load lancamentos ───────────────────────────────────────────────────────

  const loadLancamentos = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const lastDay = getDaysInMonth(new Date(ano, mes - 1))
    const dateFrom = `${ano}-${String(mes).padStart(2, '0')}-01`
    const dateTo = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('fluxo_caixa')
      .select('*')
      .eq('user_id', user.id)
      .eq('escopo', 'pf')
      .gte('data_lancamento', dateFrom)
      .lte('data_lancamento', dateTo)
      .order('data_lancamento', { ascending: true })

    if (error) {
      toast({ title: 'Erro ao carregar lançamentos', variant: 'destructive' })
    } else {
      setLancamentos(data ?? [])
    }
    setLoading(false)
  }, [user, mes, ano, toast])

  useEffect(() => {
    loadLancamentos()
  }, [loadLancamentos])

  // ── Marcar como realizado ──────────────────────────────────────────────────

  async function marcarRealizado(lancamento: FluxoCaixa) {
    const { error } = await supabase
      .from('fluxo_caixa')
      .update({ status: 'realizado', data_realizacao: todayStr() })
      .eq('id', lancamento.id)
      .eq('user_id', user!.id)

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } else {
      toast({ title: 'Lançamento marcado como realizado' })
      loadLancamentos()
    }
  }

  // ── Novo lançamento PF ─────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSaving(true)
    const centavos = parseCentavos(values.valor)
    const { error } = await supabase.from('fluxo_caixa').insert({
      user_id: user.id,
      escopo: 'pf',
      obra_id: null,
      tipo: values.tipo,
      origem: 'manual',
      origem_id: null,
      descricao: values.descricao,
      categoria: values.categoria || null,
      valor: centavos,
      data_lancamento: values.data_lancamento,
      status: 'previsto',
      data_realizacao: null,
      incluir_contador: false,
      observacao: values.observacao || null,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } else {
      toast({ title: 'Lançamento criado com sucesso' })
      setDialogOpen(false)
      reset()
      loadLancamentos()
    }
  }

  // ── Sumário ────────────────────────────────────────────────────────────────

  const totalEntradas = lancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((s, l) => s + l.valor, 0)

  const totalSaidas = lancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((s, l) => s + l.valor, 0)

  const saldoPF = totalEntradas - totalSaidas

  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="text-[var(--color-text)] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fluxo de Caixa PF</h1>
        <p className="text-[var(--color-muted)] text-sm mt-0.5">Finanças pessoais do dono</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <Label className="text-[var(--color-muted)] text-xs mb-1 block">Mês</Label>
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded px-3 py-2 text-sm"
          >
            {meses.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[var(--color-muted)] text-xs mb-1 block">Ano</Label>
          <Input
            type="number"
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="w-24 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
          />
        </div>
        <Button
          variant="outline"
          className="border-[var(--color-border)] text-[var(--color-text)]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={16} className="mr-2" />
          Novo lançamento PF
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--color-muted)]">Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-muted)]">Nenhum lançamento no período.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Data</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Descrição</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Tipo</th>
                <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map(l => (
                <tr key={l.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {format(parseISO(l.data_lancamento), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">{l.descricao}</td>
                  <td className="px-4 py-3">
                    {l.tipo === 'entrada' ? (
                      <Badge className="bg-[var(--color-success)] text-white border-0">Entrada</Badge>
                    ) : (
                      <Badge className="bg-[var(--color-danger)] text-white border-0">Saída</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ValorMonetario value={l.valor} />
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'realizado' ? (
                      <Badge className="bg-[var(--color-success)] text-white border-0">Realizado</Badge>
                    ) : (
                      <Badge variant="outline" className="border-[var(--color-border)] text-[var(--color-muted)]">Previsto</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'previsto' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => marcarRealizado(l)}
                        className="text-[var(--color-success)] hover:text-[var(--color-success)] hover:bg-[var(--color-surface-2)] text-xs"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Marcar realizado
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sumário */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-[var(--color-muted)] text-xs mb-1">Entradas</p>
          <ValorMonetario value={totalEntradas} className="text-[var(--color-success)] text-lg font-bold" />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-[var(--color-muted)] text-xs mb-1">Saídas</p>
          <ValorMonetario value={totalSaidas} className="text-[var(--color-danger)] text-lg font-bold" />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-[var(--color-muted)] text-xs mb-1">Saldo PF</p>
          <ValorMonetario
            value={saldoPF}
            className={`text-lg font-bold ${saldoPF >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
          />
        </div>
      </div>

      {/* Dialog novo lançamento PF */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-text)]">Novo Lançamento PF</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Tipo *</Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      <SelectItem value="entrada" className="text-[var(--color-text)]">Entrada</SelectItem>
                      <SelectItem value="saida" className="text-[var(--color-text)]">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipo && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.tipo.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Descrição *</Label>
              <Input
                {...register('descricao')}
                className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
              />
              {errors.descricao && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.descricao.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Categoria</Label>
              <Input
                {...register('categoria')}
                className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                placeholder="Ex: Moradia, Alimentação..."
              />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Valor (R$) *</Label>
              <Input
                {...register('valor')}
                className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                placeholder="0,00"
              />
              {errors.valor && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.valor.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Data *</Label>
              <Input
                type="date"
                {...register('data_lancamento')}
                className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
              />
              {errors.data_lancamento && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.data_lancamento.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Observação</Label>
              <textarea
                {...register('observacao')}
                rows={2}
                className="mt-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); reset() }}
                className="border-[var(--color-border)] text-[var(--color-text)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[var(--color-primary)] text-[var(--color-bg)] hover:bg-[var(--color-primary-dim)]"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
