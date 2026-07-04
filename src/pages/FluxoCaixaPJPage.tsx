import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
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
import { Card, CardContent } from '@/components/ui/card'
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

// ── Types ─────────────────────────────────────────────────────────────────────

type FluxoCaixaComObra = FluxoCaixa & { obras: { nome: string } | null }

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function origemLabel(origem: string): string {
  const map: Record<string, string> = {
    medicao: 'Medição',
    material: 'Material',
    mao_de_obra: 'Mão de Obra',
    manual: 'Manual',
  }
  return map[origem] ?? origem
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FluxoCaixaPJPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const hoje = new Date()
  const paramMes = searchParams.get('mes')
  const anoAtivo = paramMes ? parseInt(paramMes.split('-')[0]) : hoje.getFullYear()
  const mesAtivo = paramMes ? parseInt(paramMes.split('-')[1]) : hoje.getMonth() + 1

  function navegarMes(delta: number) {
    let novoMes = mesAtivo + delta
    let novoAno = anoAtivo
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setSearchParams({ mes: `${novoAno}-${String(novoMes).padStart(2, '0')}` })
  }

  // Keep legacy aliases for the rest of the code
  const mes = mesAtivo
  const ano = anoAtivo

  const [lancamentos, setLancamentos] = useState<FluxoCaixaComObra[]>([])
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
      .select('*, obras(nome)')
      .eq('user_id', user.id)
      .in('escopo', ['pj_obra', 'pj_admin'])
      .gte('data_lancamento', dateFrom)
      .lte('data_lancamento', dateTo)
      .order('data_lancamento', { ascending: true })

    if (error) {
      toast({ title: 'Erro ao carregar lançamentos', variant: 'destructive' })
    } else {
      setLancamentos((data as unknown as FluxoCaixaComObra[]) ?? [])
    }
    setLoading(false)
  }, [user, mes, ano, toast])

  useEffect(() => {
    loadLancamentos()
  }, [loadLancamentos])

  // ── Marcar como realizado ──────────────────────────────────────────────────

  async function marcarRealizado(lancamento: FluxoCaixaComObra) {
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

  // ── Novo lançamento administrativo ─────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSaving(true)
    const centavos = parseCentavos(values.valor)
    const { error } = await supabase.from('fluxo_caixa').insert({
      user_id: user.id,
      escopo: 'pj_admin',
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

  const realizados = lancamentos.filter(l => l.status === 'realizado')
  const previstos = lancamentos.filter(l => l.status === 'previsto')

  const totalEntradasReal = realizados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0)
  const totalSaidasReal = realizados.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0)
  const saldoReal = totalEntradasReal - totalSaidasReal
  const totalEntradasPrev = previstos.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0)
  const totalSaidasPrev = previstos.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0)

  const totalEntradas = lancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((s, l) => s + l.valor, 0)

  const totalSaidas = lancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((s, l) => s + l.valor, 0)

  const saldoLiquido = totalEntradas - totalSaidas

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="text-[var(--color-text)] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        <p className="text-[var(--color-muted)] text-sm mt-0.5">Consolidado de obras e administrativo</p>
      </div>

      {/* Abas PJ/PF */}
      <div className="flex gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg w-fit">
        <Link
          to="/fluxo/pj"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname.startsWith('/fluxo/pj')
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Fluxo PJ
        </Link>
        <Link
          to="/fluxo/pf"
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname.startsWith('/fluxo/pf')
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Fluxo PF
        </Link>
      </div>

      {/* Navegação de período */}
      <div className="flex items-center gap-3">
        <button onClick={() => navegarMes(-1)} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-muted)]">←</button>
        <span className="text-sm font-medium text-[var(--color-text)] capitalize">
          {new Date(anoAtivo, mesAtivo - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => navegarMes(1)} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-muted)]">→</button>
        <Button
          variant="outline"
          className="ml-auto border-[var(--color-border)] text-[var(--color-text)]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={16} className="mr-2" />
          Novo lançamento administrativo
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-muted)]">Entradas realizadas</p>
            <ValorMonetario value={totalEntradasReal} className="text-base font-bold text-[var(--color-success)]" />
          </CardContent>
        </Card>
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-muted)]">Saídas realizadas</p>
            <ValorMonetario value={totalSaidasReal} className="text-base font-bold text-[var(--color-danger)]" />
          </CardContent>
        </Card>
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-muted)]">Saldo do período</p>
            <ValorMonetario value={saldoReal} className={`text-base font-bold ${saldoReal >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`} />
          </CardContent>
        </Card>
        <Card className="bg-[var(--color-surface-2)] border-[var(--color-border)] border-dashed">
          <CardContent className="p-3">
            <p className="text-xs text-[var(--color-muted)]">Previsão líquida</p>
            <ValorMonetario value={totalEntradasPrev - totalSaidasPrev} className="text-base font-bold text-[var(--color-muted)]" />
          </CardContent>
        </Card>
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
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Obra</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Origem</th>
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
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {l.obras?.nome ?? 'Adm'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-[var(--color-border)] text-[var(--color-muted)]">
                      {origemLabel(l.origem)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {l.tipo === 'entrada' ? (
                      <span className="text-[var(--color-success)] font-medium">Entrada</span>
                    ) : (
                      <span className="text-[var(--color-danger)] font-medium">Saída</span>
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
          <p className="text-[var(--color-muted)] text-xs mb-1">Total Entradas</p>
          <ValorMonetario value={totalEntradas} className="text-[var(--color-success)] text-lg font-bold" />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-[var(--color-muted)] text-xs mb-1">Total Saídas</p>
          <ValorMonetario value={totalSaidas} className="text-[var(--color-danger)] text-lg font-bold" />
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-[var(--color-muted)] text-xs mb-1">Saldo Líquido</p>
          <ValorMonetario
            value={saldoLiquido}
            className={`text-lg font-bold ${saldoLiquido >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
          />
        </div>
      </div>

      {/* Dialog novo lançamento administrativo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-text)]">Novo Lançamento Administrativo</DialogTitle>
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
                placeholder="Ex: Despesas fixas, Honorários..."
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
