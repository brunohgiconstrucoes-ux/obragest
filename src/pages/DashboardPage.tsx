import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Building2, TrendingUp, TrendingDown, Plus, ArrowRight, AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useAlertas } from '@/hooks/useAlertas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { Obra, VwObraKpis, FluxoCaixa, Medicao } from '@/types'

type ObraComKpis = Obra & Partial<VwObraKpis>

type MedicaoComObra = Medicao & {
  obras: { id: string; nome: string } | null
}

type FluxoCaixaComObra = FluxoCaixa & { obras: { nome: string } | null }

export function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const { alertas } = useAlertas()
  const criticos = alertas.filter(a => a.severidade === 'critico')
  const atencao = alertas.filter(a => a.severidade === 'atencao')

  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<ObraComKpis[]>([])
  const [saldoPJ, setSaldoPJ] = useState(0)
  const [saldoPF, setSaldoPF] = useState(0)
  const [medicoesPendentes, setMedicoesPendentes] = useState<MedicaoComObra[]>([])
  const [entradasMesPJ, setEntradasMesPJ] = useState(0)
  const [saidasMesPJ, setSaidasMesPJ] = useState(0)
  const [entradasMesPF, setEntradasMesPF] = useState(0)
  const [saidasMesPF, setSaidasMesPF] = useState(0)
  const [gastoMateriais, setGastoMateriais] = useState(0)
  const [gastoMaoObra, setGastoMaoObra] = useState(0)
  const [gastoOutros, setGastoOutros] = useState(0)
  const [gastoMateriaisAnterior, setGastoMateriaisAnterior] = useState(0)
  const [gastoMaoObraAnterior, setGastoMaoObraAnterior] = useState(0)
  const [gastoOutrosAnterior, setGastoOutrosAnterior] = useState(0)
  const [proximosVencimentos, setProximosVencimentos] = useState<FluxoCaixaComObra[]>([])

  const loadDashboard = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [obrasRes, kpisRes, fluxoRes, medicoesRes] = await Promise.all([
      supabase
        .from('obras')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false }),
      supabase
        .from('vw_obra_kpis')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('fluxo_caixa')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'realizado'),
      supabase
        .from('medicoes')
        .select('*, obras(id, nome)')
        .eq('user_id', user.id)
        .eq('status', 'aguardando')
        .order('data_prevista_recebimento', { ascending: true })
        .limit(5),
    ])

    if (obrasRes.error || kpisRes.error || fluxoRes.error || medicoesRes.error) {
      toast({ description: 'Erro ao carregar dashboard.', variant: 'destructive' })
      setLoading(false)
      return
    }

    // Merge obras + kpis
    const kpisMap = new Map<string, VwObraKpis>(
      (kpisRes.data ?? []).map((k) => [k.obra_id, k])
    )
    const obrasComKpis: ObraComKpis[] = (obrasRes.data ?? []).map((o) => ({
      ...o,
      ...(kpisMap.get(o.id) ?? {}),
    }))
    setObras(obrasComKpis)

    // Saldos
    const fluxo = (fluxoRes.data ?? []) as FluxoCaixa[]
    const pjEntradas = fluxo
      .filter((f) => ['pj_obra', 'pj_admin'].includes(f.escopo) && f.tipo === 'entrada')
      .reduce((a, f) => a + f.valor, 0)
    const pjSaidas = fluxo
      .filter((f) => ['pj_obra', 'pj_admin'].includes(f.escopo) && f.tipo === 'saida')
      .reduce((a, f) => a + f.valor, 0)
    setSaldoPJ(pjEntradas - pjSaidas)

    const pfEntradas = fluxo
      .filter((f) => f.escopo === 'pf' && f.tipo === 'entrada')
      .reduce((a, f) => a + f.valor, 0)
    const pfSaidas = fluxo
      .filter((f) => f.escopo === 'pf' && f.tipo === 'saida')
      .reduce((a, f) => a + f.valor, 0)
    setSaldoPF(pfEntradas - pfSaidas)

    setMedicoesPendentes((medicoesRes.data ?? []) as unknown as MedicaoComObra[])

    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

    const primeiroDiaMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
    const ultimoDiaMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(new Date(anoAtual, mesAtual, 0).getDate()).padStart(2, '0')}`
    const primeiroDiaMesAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`
    const ultimoDiaMesAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(new Date(anoAnterior, mesAnterior, 0).getDate()).padStart(2, '0')}`

    const [fluxoMesRes, fluxoMesAntRes] = await Promise.all([
      supabase
        .from('fluxo_caixa')
        .select('tipo, escopo, origem, valor')
        .eq('user_id', user.id)
        .eq('status', 'realizado')
        .gte('data_competencia', primeiroDiaMes)
        .lte('data_competencia', ultimoDiaMes),
      supabase
        .from('fluxo_caixa')
        .select('tipo, escopo, origem, valor')
        .eq('user_id', user.id)
        .eq('status', 'realizado')
        .gte('data_competencia', primeiroDiaMesAnt)
        .lte('data_competencia', ultimoDiaMesAnt),
    ])

    const fluxoMes = (fluxoMesRes.data ?? []) as FluxoCaixa[]
    const fluxoMesAnt = (fluxoMesAntRes.data ?? []) as FluxoCaixa[]

    setEntradasMesPJ(fluxoMes.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'entrada').reduce((a,f) => a + f.valor, 0))
    setSaidasMesPJ(fluxoMes.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'saida').reduce((a,f) => a + f.valor, 0))
    setEntradasMesPF(fluxoMes.filter(f => f.escopo === 'pf' && f.tipo === 'entrada').reduce((a,f) => a + f.valor, 0))
    setSaidasMesPF(fluxoMes.filter(f => f.escopo === 'pf' && f.tipo === 'saida').reduce((a,f) => a + f.valor, 0))

    setGastoMateriais(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'material').reduce((a,f) => a + f.valor, 0))
    setGastoMaoObra(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'mao_de_obra').reduce((a,f) => a + f.valor, 0))
    setGastoOutros(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'manual').reduce((a,f) => a + f.valor, 0))
    setGastoMateriaisAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'material').reduce((a,f) => a + f.valor, 0))
    setGastoMaoObraAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'mao_de_obra').reduce((a,f) => a + f.valor, 0))
    setGastoOutrosAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'manual').reduce((a,f) => a + f.valor, 0))

    const em15dias = new Date(hoje)
    em15dias.setDate(em15dias.getDate() + 15)
    const hojeStr = hoje.toISOString().split('T')[0]
    const em15diasStr = em15dias.toISOString().split('T')[0]

    const vencimentosRes = await supabase
      .from('fluxo_caixa')
      .select('*, obras(nome)')
      .eq('user_id', user.id)
      .eq('status', 'previsto')
      .gte('data_realizacao', hojeStr)
      .lte('data_realizacao', em15diasStr)
      .order('data_realizacao', { ascending: true })
      .limit(5)

    setProximosVencimentos((vencimentosRes.data ?? []) as FluxoCaixaComObra[])

    setLoading(false)
  }, [user, toast])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-muted)]">
        Carregando dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>

      {/* Alertas resumo */}
      {alertas.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              {criticos.length > 0
                ? <AlertTriangle className="w-4 h-4 text-[var(--color-danger)]" />
                : <Clock className="w-4 h-4 text-[var(--color-warning)]" />}
              {alertas.length} alerta{alertas.length > 1 ? 's' : ''} ativo{alertas.length > 1 ? 's' : ''}
            </h2>
            <Button asChild variant="outline" size="sm" className="border-[var(--color-border)] text-[var(--color-text)]">
              <Link to="/alertas">Ver todos</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {criticos.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20">
                <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-danger)]">{criticos.length} crítico{criticos.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-[var(--color-muted)]">{criticos[0].titulo}</p>
                </div>
              </div>
            )}
            {atencao.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20">
                <Clock className="w-5 h-5 text-[var(--color-warning)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-warning)]">{atencao.length} atenção</p>
                  <p className="text-xs text-[var(--color-muted)]">{atencao[0].titulo}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Saldo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SaldoCard label="Saldo PJ" valor={saldoPJ} cor="var(--color-pj)" entradasMes={entradasMesPJ} saidasMes={saidasMesPJ} />
        <SaldoCard label="Saldo PF" valor={saldoPF} cor="var(--color-pf)" entradasMes={entradasMesPF} saidasMes={saidasMesPF} />
      </div>

      {/* Gastos do mês */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">Gastos do mês</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GastoMesCard label="Materiais" valor={gastoMateriais} valorAnterior={gastoMateriaisAnterior} />
          <GastoMesCard label="Mão de Obra" valor={gastoMaoObra} valorAnterior={gastoMaoObraAnterior} />
          <GastoMesCard label="Outros" valor={gastoOutros} valorAnterior={gastoOutrosAnterior} />
        </div>
      </section>

      {/* Obras em andamento */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Obras em andamento</h2>
          <Button asChild variant="outline" size="sm"
            className="border-[var(--color-border)] text-[var(--color-text)]">
            <Link to="/obras/nova">
              <Plus className="w-4 h-4 mr-1" />
              Nova obra
            </Link>
          </Button>
        </div>

        {obras.length === 0 ? (
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Building2 className="w-12 h-12 text-[var(--color-muted)]" />
              <p className="text-[var(--color-muted)] text-center">Nenhuma obra em andamento.</p>
              <Button asChild className="bg-[var(--color-primary)] text-[var(--color-bg)]">
                <Link to="/obras/nova">Cadastrar obra</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {obras.map((obra) => (
              <ObraKpiCard key={obra.id} obra={obra} />
            ))}
          </div>
        )}
      </section>

      {/* Próximos vencimentos */}
      {proximosVencimentos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Próximos vencimentos</h2>
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--color-border)]">
                {proximosVencimentos.map((v) => {
                  const dias = Math.ceil(
                    (new Date((v.data_realizacao ?? v.data_lancamento) + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000
                  )
                  const badgeColor = dias > 7
                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    : dias >= 3
                    ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                  return (
                    <div key={v.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-[var(--color-text)] truncate">{v.descricao}</span>
                        {v.obras?.nome && (
                          <span className="text-xs text-[var(--color-muted)]">{v.obras.nome}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <ValorMonetario value={v.valor} className="text-sm font-semibold text-[var(--color-text)]" />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {dias === 0 ? 'hoje' : `${dias}d`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Medições pendentes */}
      {medicoesPendentes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Medições aguardando recebimento
          </h2>
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--color-border)]">
                {medicoesPendentes.map((m) => (
                  <MedicaoPendenteRow key={m.id} medicao={m} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SaldoCard({ label, valor, cor, entradasMes, saidasMes }: {
  label: string
  valor: number
  cor: string
  entradasMes: number
  saidasMes: number
}) {
  const positivo = valor >= 0
  const Icon = positivo ? TrendingUp : TrendingDown
  const colorClass = positivo
    ? 'text-[var(--color-success)]'
    : 'text-[var(--color-danger)]'
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--color-muted)] flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: cor }}
          />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          <ValorMonetario value={valor} className={`text-2xl font-bold ${colorClass}`} />
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {positivo ? 'Saldo positivo' : 'Saldo negativo'} — lançamentos realizados
        </p>
        <div className="flex gap-3 mt-2 text-xs text-[var(--color-muted)]">
          <span className="text-[var(--color-success)]">↑ <ValorMonetario value={entradasMes} className="inline" /></span>
          <span className="text-[var(--color-danger)]">↓ <ValorMonetario value={saidasMes} className="inline" /></span>
          <span>em {mesAtual}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ObraKpiCard({ obra }: { obra: ObraComKpis }) {
  const percentual = obra.percentual_executado ?? 0
  const margem = obra.margem_real ?? 0
  const margemPositiva = margem >= 0

  // Calcular dias restantes
  let diasRestantes: number | null = null
  if (obra.prazo_termino) {
    diasRestantes = Math.ceil((new Date(obra.prazo_termino + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
  }

  const prazoBadgeColor = diasRestantes === null
    ? ''
    : diasRestantes > 30
    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
    : diasRestantes > 10
    ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
    : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'

  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-[var(--color-text)] leading-snug line-clamp-2">
            {obra.nome}
          </CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={obra.status} />
            {diasRestantes !== null && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${prazoBadgeColor}`}>
                {diasRestantes < 0 ? 'Prazo vencido' : `${diasRestantes}d prazo`}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-[var(--color-muted)] truncate">{obra.orgao_contratante}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        {/* Valor contratado */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--color-muted)]">Contratado</span>
          <ValorMonetario value={obra.valor_total} className="font-semibold text-[var(--color-text)]" />
        </div>

        {/* Progresso */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--color-muted)]">
            <span>Executado</span>
            <span>{percentual.toFixed(1)}%</span>
          </div>
          <Progress value={percentual} className="h-2" />
        </div>

        {/* Faturado / Recebido */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[var(--color-muted)]">Faturado</p>
            <ValorMonetario
              value={obra.total_faturado ?? 0}
              className="font-medium text-[var(--color-text)]"
            />
          </div>
          <div>
            <p className="text-[var(--color-muted)]">Recebido</p>
            <ValorMonetario
              value={obra.total_recebido ?? 0}
              className="font-medium text-[var(--color-text)]"
            />
          </div>
        </div>

        {/* Margem real */}
        <div className="flex justify-between items-center text-sm border-t border-[var(--color-border)] pt-2 mt-auto">
          <span className="text-[var(--color-muted)]">Margem real</span>
          <ValorMonetario
            value={margem}
            className={`font-bold ${margemPositiva ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
          />
        </div>

        {/* Link */}
        <Link
          to={`/obras/${obra.id}`}
          className="flex items-center justify-end gap-1 text-xs text-[var(--color-primary)] hover:underline mt-1"
        >
          Ver obra
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  )
}

function GastoMesCard({ label, valor, valorAnterior }: { label: string; valor: number; valorAnterior: number }) {
  const pct = valorAnterior > 0 ? Math.min((valor / valorAnterior) * 100, 100) : 0
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-[var(--color-muted)]">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ValorMonetario value={valor} className="text-lg font-bold text-[var(--color-text)]" />
        {valorAnterior > 0 && (
          <>
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-[var(--color-muted)]">
              {pct.toFixed(0)}% vs mês anterior
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MedicaoPendenteRow({ medicao }: { medicao: MedicaoComObra }) {
  const obraId = medicao.obras?.id ?? medicao.obra_id
  const obraNome = medicao.obras?.nome ?? '—'
  const dataFormatada = medicao.data_prevista_recebimento
    ? format(new Date(medicao.data_prevista_recebimento + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })
    : '—'

  return (
    <Link
      to={`/obras/${obraId}/medicoes/${medicao.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors"
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium text-[var(--color-text)] truncate">{obraNome}</span>
        <span className="text-xs text-[var(--color-muted)]">Medição #{medicao.numero}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 ml-4 shrink-0">
        <ValorMonetario value={medicao.valor_liquido} className="text-sm font-semibold text-[var(--color-text)]" />
        <span className="text-xs text-[var(--color-muted)]">{dataFormatada}</span>
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--color-muted)] ml-3 shrink-0" />
    </Link>
  )
}
