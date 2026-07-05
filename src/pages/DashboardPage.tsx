import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useAlertas } from '@/hooks/useAlertas'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Obra, VwObraKpis, FluxoCaixa, Medicao } from '@/types'

type ObraComKpis = Obra & Partial<VwObraKpis>

type MedicaoComObra = Medicao & {
  obras: { id: string; nome: string } | null
}

type FluxoCaixaComObra = FluxoCaixa & { obras: { nome: string } | null }

// ── helpers ────────────────────────────────────────────────────────────────────

function fmtBrl(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function fmtPct(v: number, decimals = 1) {
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

function todayLabel() {
  return format(new Date(), "dd/MMM/yyyy HH:mm", { locale: ptBR }).toUpperCase()
}

function mesAtualLabel() {
  return format(new Date(), "MMM/yyyy", { locale: ptBR }).toUpperCase()
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, perfil } = useAuth()
  const { toast } = useToast()
  const { alertas } = useAlertas()
  const criticos = alertas.filter(a => a.severidade === 'critico')

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
      supabase.from('obras').select('*').eq('user_id', user.id).eq('status', 'em_andamento').order('created_at', { ascending: false }),
      supabase.from('vw_obra_kpis').select('*').eq('user_id', user.id),
      supabase.from('fluxo_caixa').select('*').eq('user_id', user.id).eq('status', 'realizado'),
      supabase.from('medicoes').select('*, obras(id, nome)').eq('user_id', user.id).eq('status', 'aguardando').order('data_prevista_recebimento', { ascending: true }).limit(5),
    ])

    if (obrasRes.error || kpisRes.error || fluxoRes.error || medicoesRes.error) {
      toast({ description: 'Erro ao carregar dashboard.', variant: 'destructive' })
      setLoading(false)
      return
    }

    const kpisMap = new Map<string, VwObraKpis>((kpisRes.data ?? []).map(k => [k.obra_id, k]))
    setObras((obrasRes.data ?? []).map(o => ({ ...o, ...(kpisMap.get(o.id) ?? {}) })))

    const fluxo = (fluxoRes.data ?? []) as FluxoCaixa[]
    setSaldoPJ(
      fluxo.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'entrada').reduce((a,f) => a+f.valor,0) -
      fluxo.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'saida').reduce((a,f) => a+f.valor,0)
    )
    setSaldoPF(
      fluxo.filter(f => f.escopo === 'pf' && f.tipo === 'entrada').reduce((a,f) => a+f.valor,0) -
      fluxo.filter(f => f.escopo === 'pf' && f.tipo === 'saida').reduce((a,f) => a+f.valor,0)
    )
    setMedicoesPendentes((medicoesRes.data ?? []) as unknown as MedicaoComObra[])

    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()
    const mesAnt = mesAtual === 1 ? 12 : mesAtual - 1
    const anoAnt  = mesAtual === 1 ? anoAtual - 1 : anoAtual
    const pad = (n: number) => String(n).padStart(2, '0')
    const diasMes = (a: number, m: number) => new Date(a, m, 0).getDate()
    const d1 = `${anoAtual}-${pad(mesAtual)}-01`
    const d2 = `${anoAtual}-${pad(mesAtual)}-${pad(diasMes(anoAtual, mesAtual))}`
    const d1a = `${anoAnt}-${pad(mesAnt)}-01`
    const d2a = `${anoAnt}-${pad(mesAnt)}-${pad(diasMes(anoAnt, mesAnt))}`

    const [mRes, mAntRes] = await Promise.all([
      supabase.from('fluxo_caixa').select('tipo,escopo,origem,valor').eq('user_id',user.id).eq('status','realizado').gte('data_lancamento',d1).lte('data_lancamento',d2),
      supabase.from('fluxo_caixa').select('tipo,escopo,origem,valor').eq('user_id',user.id).eq('status','realizado').gte('data_lancamento',d1a).lte('data_lancamento',d2a),
    ])

    const fm = (mRes.data ?? []) as FluxoCaixa[]
    const fa = (mAntRes.data ?? []) as FluxoCaixa[]
    setEntradasMesPJ(fm.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo==='entrada').reduce((a,f)=>a+f.valor,0))
    setSaidasMesPJ(fm.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo==='saida').reduce((a,f)=>a+f.valor,0))
    setEntradasMesPF(fm.filter(f => f.escopo==='pf' && f.tipo==='entrada').reduce((a,f)=>a+f.valor,0))
    setSaidasMesPF(fm.filter(f => f.escopo==='pf' && f.tipo==='saida').reduce((a,f)=>a+f.valor,0))
    setGastoMateriais(fm.filter(f=>f.tipo==='saida'&&f.origem==='material').reduce((a,f)=>a+f.valor,0))
    setGastoMaoObra(fm.filter(f=>f.tipo==='saida'&&f.origem==='mao_de_obra').reduce((a,f)=>a+f.valor,0))
    setGastoOutros(fm.filter(f=>f.tipo==='saida'&&f.origem==='manual').reduce((a,f)=>a+f.valor,0))
    setGastoMateriaisAnterior(fa.filter(f=>f.tipo==='saida'&&f.origem==='material').reduce((a,f)=>a+f.valor,0))
    setGastoMaoObraAnterior(fa.filter(f=>f.tipo==='saida'&&f.origem==='mao_de_obra').reduce((a,f)=>a+f.valor,0))
    setGastoOutrosAnterior(fa.filter(f=>f.tipo==='saida'&&f.origem==='manual').reduce((a,f)=>a+f.valor,0))

    const em15 = new Date(hoje); em15.setDate(em15.getDate() + 15)
    const vRes = await supabase.from('fluxo_caixa').select('*, obras(nome)').eq('user_id',user.id).eq('status','previsto').gte('data_realizacao',hoje.toISOString().split('T')[0]).lte('data_realizacao',em15.toISOString().split('T')[0]).order('data_realizacao',{ascending:true}).limit(5)
    setProximosVencimentos((vRes.data ?? []) as unknown as FluxoCaixaComObra[])

    setLoading(false)
  }, [user, toast])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const companyName = perfil?.razao_social ?? 'HGI Construções'
  const cnpj = perfil?.cnpj ?? '—'
  const totalGastos = gastoMateriais + gastoMaoObra + gastoOutros

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="bp-label" style={{ letterSpacing: '0.2em' }}>Carregando…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ padding: '0' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid var(--cyan-dim)' }}>
        <div>
          <p className="bp-label mb-1">Prancha 01/10 ── Dashboard · Geral</p>
          <h1 className="font-display font-700 text-white uppercase tracking-wide" style={{ fontSize: '2.2rem', lineHeight: 1 }}>
            Panorama <span style={{ color: 'var(--cyan-line)' }}>Financeiro</span>
          </h1>
          <p className="bp-label mt-1.5">
            Escala 1:1 · Atualizado {todayLabel()}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <Link
            to="/contador"
            className="font-mono-bp text-xs tracking-widest uppercase px-3 py-1.5 transition-colors"
            style={{ border: '1px solid var(--cyan-dim)', color: 'var(--ink-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cyan-line)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
          >
            Exportar
          </Link>
          <Link
            to="/obras/nova"
            className="font-mono-bp text-xs tracking-widest uppercase px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            style={{ border: '1px solid var(--cyan-line)', color: 'var(--cyan-line)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cyan-dim)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Plus className="w-3 h-3" />
            Nova Obra
          </Link>
        </div>
      </header>

      <div className="flex-1 px-8 py-6 space-y-8">

        {/* ── Alert banner ──────────────────────────────────── */}
        {criticos.length > 0 && (
          <div
            className="flex items-center gap-4 px-5 py-3"
            style={{ border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.05)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--amber)' }} />
            <div className="flex-1 min-w-0">
              <span className="font-mono-bp text-xs tracking-wider uppercase" style={{ color: 'var(--amber)' }}>
                Alerta Crítico · #{criticos[0].id?.slice(-4).toUpperCase() ?? 'A-001'}
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                {criticos[0].titulo}
                {criticos[0].descricao ? ` — ${criticos[0].descricao}` : ''}
              </p>
            </div>
            <Link
              to="/alertas"
              className="font-mono-bp text-xs tracking-wider uppercase shrink-0 transition-colors"
              style={{ color: 'var(--amber)' }}
            >
              Resolver →
            </Link>
          </div>
        )}

        {/* ── A — Saldos consolidados ────────────────────────── */}
        <section>
          <div className="bp-section-rule mb-4">
            <span className="font-mono-bp text-xs" style={{ color: 'var(--cyan-line)' }}>· A</span>
            <span className="font-display font-600 text-sm text-white uppercase tracking-widest">Saldos Consolidados</span>
            <span className="bp-label">Escopo · {mesAtualLabel()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SaldoCard
              tipo="PJ" subtipo={companyName}
              valor={saldoPJ} entradas={entradasMesPJ} saidas={saidasMesPJ}
            />
            <SaldoCard
              tipo="PF" subtipo={perfil?.nome_completo ?? 'Sócio Diretor'}
              valor={saldoPF} entradas={entradasMesPF} saidas={saidasMesPF}
            />
          </div>
        </section>

        {/* ── B — Composição de gastos ───────────────────────── */}
        <section>
          <div className="bp-section-rule mb-4">
            <span className="font-mono-bp text-xs" style={{ color: 'var(--cyan-line)' }}>· B</span>
            <span className="font-display font-600 text-sm text-white uppercase tracking-widest">Composição de Gastos</span>
            <span className="bp-label">{mesAtualLabel()}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <GastoCard label="Materiais"   valor={gastoMateriais} total={totalGastos} anterior={gastoMateriaisAnterior} acento="var(--cyan-line)" />
            <GastoCard label="Mão de Obra" valor={gastoMaoObra}   total={totalGastos} anterior={gastoMaoObraAnterior}   acento="var(--amber)" />
            <GastoCard label="Outros"      valor={gastoOutros}    total={totalGastos} anterior={gastoOutrosAnterior}     acento="var(--ink-muted)" />
          </div>
        </section>

        {/* ── C — Contratos em execução ──────────────────────── */}
        <section>
          <div className="bp-section-rule mb-4">
            <span className="font-mono-bp text-xs" style={{ color: 'var(--cyan-line)' }}>· C</span>
            <span className="font-display font-600 text-sm text-white uppercase tracking-widest">Contratos em Execução</span>
            {obras.length > 0 && (
              <span className="bp-label">{obras.length} {obras.length === 1 ? 'obra ativa' : 'obras ativas'}</span>
            )}
            <div style={{ flex: 1 }} />
            <Link to="/obras" className="font-mono-bp text-xs uppercase tracking-wider transition-colors" style={{ color: 'var(--ink-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--cyan-line)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
            >
              Ver Todas →
            </Link>
          </div>

          {obras.length === 0 ? (
            <div className="bp-card p-8 text-center">
              <p className="bp-label mb-4">Nenhum contrato em execução</p>
              <Link to="/obras/nova" className="font-mono-bp text-xs uppercase tracking-widest" style={{ color: 'var(--cyan-line)', border: '1px solid var(--cyan-line)', padding: '0.5rem 1.25rem' }}>
                + Cadastrar Obra
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {obras.map(obra => <ObraCard key={obra.id} obra={obra} />)}
            </div>
          )}
        </section>

        {/* ── D — Medições pendentes ─────────────────────────── */}
        {medicoesPendentes.length > 0 && (
          <section>
            <div className="bp-section-rule mb-4">
              <span className="font-mono-bp text-xs" style={{ color: 'var(--cyan-line)' }}>· D</span>
              <span className="font-display font-600 text-sm text-white uppercase tracking-widest">Medições Aguardando Recebimento</span>
            </div>
            <div className="bp-card divide-y" style={{ borderColor: 'var(--cyan-dim)' }}>
              {medicoesPendentes.map(m => <MedicaoRow key={m.id} medicao={m} />)}
            </div>
          </section>
        )}

        {/* ── E — Próximos vencimentos ───────────────────────── */}
        {proximosVencimentos.length > 0 && (
          <section>
            <div className="bp-section-rule mb-4">
              <span className="font-mono-bp text-xs" style={{ color: 'var(--amber)' }}>· E</span>
              <span className="font-display font-600 text-sm text-white uppercase tracking-widest">Próximos Vencimentos</span>
              <span className="bp-label">Próximos 15 dias</span>
            </div>
            <div className="bp-card divide-y" style={{ borderColor: 'var(--cyan-dim)' }}>
              {proximosVencimentos.map(v => <VencimentoRow key={v.id} item={v} />)}
            </div>
          </section>
        )}

      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="px-8 py-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--cyan-dim)' }}
      >
        <span className="bp-label">{companyName.toUpperCase()} · CNPJ {cnpj}</span>
        <span className="bp-label">Desenho Técnico · Rev.01 · {format(new Date(), 'dd·MM·yyyy', { locale: ptBR })}</span>
      </footer>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SaldoCard({ tipo, subtipo, valor, entradas, saidas }: {
  tipo: 'PJ' | 'PF'; subtipo: string; valor: number; entradas: number; saidas: number
}) {
  const positivo = valor >= 0
  return (
    <div className="bp-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="bp-label">Saldo / {tipo}</p>
        </div>
        <span
          className="font-mono-bp text-[0.55rem] tracking-widest uppercase px-1.5 py-0.5"
          style={{
            border: `1px solid ${positivo ? 'var(--positive)' : 'var(--negative)'}`,
            color: positivo ? 'var(--positive)' : 'var(--negative)',
          }}
        >
          {positivo ? 'Crédito' : 'Débito'}
        </span>
      </div>

      <p className="font-body text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>
        {tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} — {subtipo}
      </p>

      <p
        className="font-display font-700 mb-3"
        style={{
          fontSize: '2rem',
          lineHeight: 1,
          color: positivo ? 'var(--positive)' : 'var(--negative)',
        }}
      >
        {fmtBrl(valor)}
      </p>

      {/* Simplified timeline bar */}
      <div className="bp-progress mb-4">
        <div className="bp-progress-bar" style={{ width: positivo ? '60%' : '100%', background: positivo ? 'var(--positive)' : 'var(--negative)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--cyan-dim)' }}>
        <div>
          <p className="bp-label mb-0.5">↑ Entradas</p>
          <p className="font-mono-bp text-xs font-500" style={{ color: 'var(--positive)' }}>{fmtBrl(entradas)}</p>
        </div>
        <div>
          <p className="bp-label mb-0.5">↓ Saídas</p>
          <p className="font-mono-bp text-xs font-500" style={{ color: 'var(--negative)' }}>{fmtBrl(saidas)}</p>
        </div>
      </div>
    </div>
  )
}

function GastoCard({ label, valor, total, anterior, acento }: {
  label: string; valor: number; total: number; anterior: number; acento: string
}) {
  const pctTotal = total > 0 ? Math.round((valor / total) * 100) : 0
  const pctAnterior = anterior > 0 ? Math.min((valor / anterior) * 100, 100) : 0
  return (
    <div className="bp-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="bp-label uppercase">{label}</p>
        <span className="font-mono-bp text-xs" style={{ color: acento }}>{pctTotal}%</span>
      </div>
      <p className="font-display font-600 text-white mb-3" style={{ fontSize: '1.35rem' }}>
        {fmtBrl(valor)}
      </p>
      <div className="bp-progress">
        <div className="bp-progress-bar" style={{ width: `${pctAnterior}%`, background: acento }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="bp-label">0</span>
        <span className="bp-label">100%</span>
      </div>
    </div>
  )
}

function ObraCard({ obra }: { obra: ObraComKpis }) {
  const percentual = obra.percentual_executado ?? 0
  const margem = obra.margem_real ?? 0
  const contratado = obra.valor_total ?? 0
  const margemPct = contratado > 0 ? (margem / contratado) * 100 : 0
  const margemPos = margem >= 0
  const faturado = obra.total_faturado ?? 0
  const recebido = obra.total_recebido ?? 0
  const aReceber = faturado - recebido

  let diasRestantes: number | null = null
  if (obra.prazo_termino) {
    diasRestantes = Math.ceil(
      (new Date(obra.prazo_termino + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000
    )
  }

  const prazoColor = diasRestantes === null ? 'var(--cyan-line)'
    : diasRestantes > 60 ? 'var(--positive)'
    : diasRestantes > 15 ? 'var(--amber)'
    : 'var(--negative)'

  return (
    <div className="bp-card grid" style={{ gridTemplateColumns: '1fr 200px' }}>
      {/* Left panel */}
      <div className="p-5" style={{ borderRight: '1px solid var(--cyan-dim)' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono-bp text-[0.6rem] tracking-widest mb-1" style={{ color: 'var(--cyan-line)' }}>
              {obra.numero_licitacao ?? '—'}
            </p>
            <h3 className="font-display font-600 text-white uppercase leading-tight" style={{ fontSize: '0.95rem' }}>
              {obra.nome}
            </h3>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--ink-muted)', fontSize: '0.68rem' }}>
              {obra.orgao_contratante}
            </p>
          </div>
          <StatusBadge status={obra.status} />
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--cyan-dim)' }}>
          {[
            { l: 'Contratado', v: fmtBrl(contratado), c: 'var(--ink-dim)' },
            { l: 'Faturado',   v: fmtBrl(faturado),   c: 'var(--cyan-line)' },
            { l: 'Recebido',   v: fmtBrl(recebido),   c: 'var(--positive)' },
            { l: 'Margem Real',v: fmtPct(margemPct),   c: margemPos ? 'var(--positive)' : 'var(--negative)' },
          ].map(({ l, v, c }) => (
            <div key={l}>
              <p className="bp-label mb-0.5">{l}</p>
              <p className="font-mono-bp text-xs font-500" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Execução física */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="bp-label">Execução Física</p>
            <p className="bp-label" style={{ color: 'var(--cyan-line)' }}>{percentual.toFixed(1)}% Concluído</p>
          </div>
          <div className="bp-progress">
            <div className="bp-progress-bar" style={{ width: `${percentual}%` }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="bp-label">0</span>
            <span className="bp-label" style={{ marginLeft: '25%' }}>25</span>
            <span className="bp-label" style={{ marginLeft: '25%' }}>50</span>
            <span className="bp-label" style={{ marginLeft: '25%' }}>75</span>
            <span className="bp-label">100</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="p-5 flex flex-col justify-between">
        <div>
          <p className="bp-label mb-1">Prazo Restante</p>
          <p className="font-display font-700" style={{ fontSize: '2.5rem', lineHeight: 1, color: prazoColor }}>
            {diasRestantes !== null ? Math.abs(diasRestantes) : '—'}
          </p>
          <p className="font-mono-bp text-xs mt-0.5" style={{ color: prazoColor }}>
            {diasRestantes === null ? '—' : diasRestantes < 0 ? 'dias vencido' : 'dias'}
          </p>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--cyan-dim)' }}>
          <p className="bp-label mb-1">A Receber (Líquido)</p>
          <p className="font-mono-bp text-sm font-500 text-white">{fmtBrl(aReceber)}</p>
        </div>

        <Link
          to={`/obras/${obra.id}`}
          className="flex items-center gap-1.5 mt-4 font-mono-bp text-xs uppercase tracking-wider transition-colors"
          style={{ color: 'var(--cyan-line)' }}
        >
          Ver Detalhamento
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

function MedicaoRow({ medicao }: { medicao: MedicaoComObra }) {
  const obraId = medicao.obras?.id ?? medicao.obra_id
  const obraNome = medicao.obras?.nome ?? '—'
  const dataFmt = medicao.data_prevista_recebimento
    ? format(new Date(medicao.data_prevista_recebimento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
    : '—'

  return (
    <Link
      to={`/obras/${obraId}/medicoes/${medicao.id}`}
      className="flex items-center justify-between px-5 py-3 transition-colors"
      style={{ color: 'inherit' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(125,211,252,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs text-white truncate">{obraNome}</p>
        <p className="bp-label mt-0.5">Medição #{medicao.numero}</p>
      </div>
      <div className="text-right ml-4 shrink-0">
        <p className="font-mono-bp text-xs font-500 text-white">{fmtBrl(medicao.valor_liquido)}</p>
        <p className="bp-label mt-0.5">{dataFmt}</p>
      </div>
    </Link>
  )
}

function VencimentoRow({ item }: { item: FluxoCaixaComObra }) {
  const dias = Math.ceil(
    (new Date((item.data_realizacao ?? item.data_lancamento) + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000
  )
  const cor = dias > 7 ? 'var(--positive)' : dias >= 3 ? 'var(--amber)' : 'var(--negative)'

  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderColor: 'var(--cyan-dim)' }}>
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs text-white truncate">{item.descricao}</p>
        {item.obras?.nome && <p className="bp-label mt-0.5">{item.obras.nome}</p>}
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <p className="font-mono-bp text-xs font-500 text-white">{fmtBrl(item.valor)}</p>
        <span className="font-mono-bp text-[0.6rem] tracking-wider px-1.5 py-0.5" style={{ color: cor, border: `1px solid ${cor}` }}>
          {dias === 0 ? 'Hoje' : `${dias}d`}
        </span>
      </div>
    </div>
  )
}
