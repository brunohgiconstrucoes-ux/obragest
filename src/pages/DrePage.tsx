import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { format, subMonths, startOfMonth, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { FluxoCaixa, VwObraKpis } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMes(isoDate: string) {
  return format(parseISO(isoDate + '-01'), 'MMM/yy', { locale: ptBR })
}

function fmtBRL(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MesData = {
  mes: string       // 'YYYY-MM'
  label: string     // 'jan/25'
  receita: number   // centavos
  despesa: number
  resultado: number
}

type ProjecaoData = MesData & { projecao: true }

type ObraMargemRow = {
  id: string
  nome: string
  valor_total: number
  total_recebido: number
  total_gasto: number
  margem: number
  percentual_executado: number
}

// ── Tooltip customizado ───────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--color-text)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-muted)]">{p.name}:</span>
          <span className="font-medium text-[var(--color-text)]">{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DrePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [meses, setMeses] = useState<MesData[]>([])
  const [projecao, setProjecao] = useState<(MesData | ProjecaoData)[]>([])
  const [obras, setObras] = useState<ObraMargemRow[]>([])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Últimos 6 meses reais
    const hoje = new Date()
    const inicio6 = startOfMonth(subMonths(hoje, 5))

    const [fluxoRes, obrasRes, kpisRes] = await Promise.all([
      supabase
        .from('fluxo_caixa')
        .select('tipo, escopo, valor, data_lancamento, status')
        .eq('user_id', user.id)
        .in('escopo', ['pj_obra', 'pj_admin'])
        .gte('data_lancamento', format(inicio6, 'yyyy-MM-dd'))
        .order('data_lancamento'),
      supabase.from('obras').select('id, nome, valor_total').eq('user_id', user.id).eq('status', 'em_andamento'),
      supabase.from('vw_obra_kpis').select('*').eq('user_id', user.id),
    ])

    // ── Agrupamento mensal ────────────────────────────────────────────────────
    const mapaMs = new Map<string, { receita: number; despesa: number }>()

    // Garante 6 meses mesmo sem dados
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(hoje, i), 'yyyy-MM')
      mapaMs.set(key, { receita: 0, despesa: 0 })
    }

    for (const f of (fluxoRes.data ?? []) as FluxoCaixa[]) {
      const key = f.data_lancamento.slice(0, 7)
      if (!mapaMs.has(key)) continue
      const row = mapaMs.get(key)!
      if (f.tipo === 'entrada') row.receita += f.valor
      else row.despesa += f.valor
    }

    const mesesArr: MesData[] = Array.from(mapaMs.entries()).map(([mes, v]) => ({
      mes,
      label: fmtMes(mes),
      receita: v.receita,
      despesa: v.despesa,
      resultado: v.receita - v.despesa,
    }))
    setMeses(mesesArr)

    // ── Projeção 30/60/90 dias (média dos últimos 3 meses reais) ─────────────
    const ultimos3 = mesesArr.slice(-3)
    const mediaReceita = ultimos3.reduce((s, m) => s + m.receita, 0) / 3
    const mediaDespesa = ultimos3.reduce((s, m) => s + m.despesa, 0) / 3

    const projecaoArr: (MesData | ProjecaoData)[] = [...mesesArr]
    for (let i = 1; i <= 3; i++) {
      const dt = addMonths(startOfMonth(hoje), i)
      const mes = format(dt, 'yyyy-MM')
      projecaoArr.push({
        mes,
        label: fmtMes(mes),
        receita: Math.round(mediaReceita),
        despesa: Math.round(mediaDespesa),
        resultado: Math.round(mediaReceita - mediaDespesa),
        projecao: true,
      })
    }
    setProjecao(projecaoArr)

    // ── Margem por obra ───────────────────────────────────────────────────────
    const kpisMap = new Map<string, VwObraKpis>(
      (kpisRes.data ?? []).map((k) => [k.obra_id, k])
    )

    // Total gasto por obra (fluxo saída)
    const { data: fluxoObra } = await supabase
      .from('fluxo_caixa')
      .select('obra_id, valor, tipo')
      .eq('user_id', user.id)
      .in('escopo', ['pj_obra'])
      .not('obra_id', 'is', null)

    const gastoPorObra = new Map<string, number>()
    for (const f of (fluxoObra ?? []) as FluxoCaixa[]) {
      if (f.tipo === 'saida' && f.obra_id) {
        gastoPorObra.set(f.obra_id, (gastoPorObra.get(f.obra_id) ?? 0) + f.valor)
      }
    }

    const obrasComMargem: ObraMargemRow[] = (obrasRes.data ?? []).map(o => {
      const kpi = kpisMap.get(o.id)
      const totalRecebido = kpi?.total_recebido ?? 0
      const totalGasto = gastoPorObra.get(o.id) ?? 0
      const margem = totalRecebido - totalGasto
      return {
        id: o.id,
        nome: o.nome,
        valor_total: o.valor_total,
        total_recebido: totalRecebido,
        total_gasto: totalGasto,
        margem,
        percentual_executado: kpi?.percentual_executado ?? 0,
      }
    })
    setObras(obrasComMargem)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Totais resumo ─────────────────────────────────────────────────────────
  const totalReceita6m = meses.reduce((s, m) => s + m.receita, 0)
  const totalDespesa6m = meses.reduce((s, m) => s + m.despesa, 0)
  const resultado6m = totalReceita6m - totalDespesa6m
  const margemPct = totalReceita6m > 0 ? (resultado6m / totalReceita6m) * 100 : 0

  // Projeção próximos 3 meses
  const proj3 = projecao.filter(p => 'projecao' in p)
  const projReceita = proj3.reduce((s, m) => s + m.receita, 0)
  const projDespesa = proj3.reduce((s, m) => s + m.despesa, 0)
  const projResultado = projReceita - projDespesa

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-48 rounded-lg bg-[var(--color-surface)] animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[var(--color-text)]">
      <div>
        <h1 className="text-2xl font-bold">DRE Simplificado</h1>
        <p className="text-sm text-[var(--color-muted)] mt-0.5">Receitas e despesas PJ — últimos 6 meses + projeção</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Receitas 6m"
          valor={totalReceita6m}
          cor="var(--color-success)"
        />
        <ResumoCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Despesas 6m"
          valor={totalDespesa6m}
          cor="var(--color-danger)"
        />
        <ResumoCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Resultado 6m"
          valor={resultado6m}
          cor={resultado6m >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          sub={`Margem ${margemPct.toFixed(1)}%`}
        />
        <ResumoCard
          icon={<Target className="w-5 h-5" />}
          label="Projeção 3m"
          valor={projResultado}
          cor={projResultado >= 0 ? 'var(--color-pj)' : 'var(--color-danger)'}
          sub={`R: ${fmtBRL(projReceita)} / D: ${fmtBRL(projDespesa)}`}
        />
      </div>

      {/* Gráfico de barras — Receita vs Despesa */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[var(--color-text)]">Receitas × Despesas — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtBRL(v)} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{v}</span>} />
              <Bar dataKey="receita" name="Receita" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de linha — Resultado com projeção */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[var(--color-text)]">Resultado mensal + projeção 3 meses</CardTitle>
          <p className="text-xs text-[var(--color-muted)]">Área tracejada = projeção baseada na média dos últimos 3 meses</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={projecao} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtBRL(v)} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1.5} />
              <Line
                dataKey="resultado"
                name="Resultado"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const isProj = projecao[props.index] && 'projecao' in projecao[props.index]
                  return <circle key={props.index} cx={props.cx} cy={props.cy} r={4}
                    fill={isProj ? 'transparent' : 'var(--color-primary)'}
                    stroke="var(--color-primary)" strokeWidth={2}
                    strokeDasharray={isProj ? '4 2' : '0'} />
                }}
                strokeDasharray="0"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margem por obra */}
      {obras.length > 0 && (
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--color-text)]">Margem real por obra</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <th className="text-left px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Obra</th>
                  <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Contratado</th>
                  <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Recebido</th>
                  <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Gasto</th>
                  <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Margem</th>
                  <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Exec.</th>
                </tr>
              </thead>
              <tbody>
                {obras.map(o => (
                  <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]">
                    <td className="px-4 py-3">
                      <Link to={`/obras/${o.id}`} className="text-[var(--color-primary)] hover:underline text-sm font-medium">
                        {o.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right"><ValorMonetario value={o.valor_total} /></td>
                    <td className="px-4 py-3 text-right text-[var(--color-success)]"><ValorMonetario value={o.total_recebido} /></td>
                    <td className="px-4 py-3 text-right text-[var(--color-danger)]"><ValorMonetario value={o.total_gasto} /></td>
                    <td className="px-4 py-3 text-right font-bold">
                      <ValorMonetario
                        value={o.margem}
                        className={o.margem >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-muted)]">
                      {o.percentual_executado.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResumoCard({
  icon, label, valor, cor, sub,
}: {
  icon: React.ReactNode
  label: string
  valor: number
  cor: string
  sub?: string
}) {
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2" style={{ color: cor }}>
          {icon}
          <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
        </div>
        <ValorMonetario value={valor} className="text-xl font-bold" />
        {sub && <p className="text-xs text-[var(--color-muted)] mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
