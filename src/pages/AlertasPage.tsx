import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, ArrowRight, RefreshCw, Bell } from 'lucide-react'
import { useAlertas } from '@/hooks/useAlertas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Alerta, AlertaTipo } from '@/types'

const tipoLabel: Record<AlertaTipo, string> = {
  prazo_critico: 'Prazo Crítico',
  prazo_atencao: 'Prazo',
  orcamento_estourado: 'Orçamento',
  orcamento_proximo: 'Orçamento',
  estoque_minimo: 'Estoque Mínimo',
  medicao_atrasada: 'Medição Atrasada',
  manutencao_vencida: 'Manutenção',
}

function AlertaCard({ alerta }: { alerta: Alerta }) {
  const critico = alerta.severidade === 'critico'
  return (
    <Link to={alerta.link} className="block group">
      <div className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-[var(--color-surface-2)] ${
        critico
          ? 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5'
          : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
      }`}>
        <div className={`mt-0.5 shrink-0 ${critico ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>
          {critico ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--color-text)]">{alerta.titulo}</span>
            <Badge variant="outline" className={`text-xs ${
              critico
                ? 'border-[var(--color-danger)]/40 text-[var(--color-danger)]'
                : 'border-[var(--color-warning)]/40 text-[var(--color-warning)]'
            }`}>
              {tipoLabel[alerta.tipo]}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-1">{alerta.descricao}</p>
          {alerta.obra_nome && (
            <p className="text-xs text-[var(--color-muted)] mt-0.5">Obra: {alerta.obra_nome}</p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--color-muted)] shrink-0 mt-0.5 group-hover:text-[var(--color-text)] transition-colors" />
      </div>
    </Link>
  )
}

export function AlertasPage() {
  const { alertas, loading, recarregar } = useAlertas()

  const criticos = alertas.filter(a => a.severidade === 'critico')
  const atencao = alertas.filter(a => a.severidade === 'atencao')

  return (
    <div className="space-y-6 text-[var(--color-text)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Central de Alertas</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {alertas.length === 0 ? 'Nenhum alerta ativo' : `${alertas.length} alerta${alertas.length > 1 ? 's' : ''} ativo${alertas.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="outline" onClick={recarregar} disabled={loading}
          className="border-[var(--color-border)] text-[var(--color-text)]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-[var(--color-surface)] animate-pulse" />)}</div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-12 h-12 text-[var(--color-success)] mb-4" />
          <p className="text-[var(--color-text)] font-semibold text-lg">Tudo certo!</p>
          <p className="text-[var(--color-muted)] text-sm mt-1">Nenhum alerta ativo no momento.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {criticos.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-danger)] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Críticos ({criticos.length})
              </h2>
              <div className="space-y-2">
                {criticos.map(a => <AlertaCard key={a.id} alerta={a} />)}
              </div>
            </section>
          )}
          {atencao.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-warning)] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Atenção ({atencao.length})
              </h2>
              <div className="space-y-2">
                {atencao.map(a => <AlertaCard key={a.id} alerta={a} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
