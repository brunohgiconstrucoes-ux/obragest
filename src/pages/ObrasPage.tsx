import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { Obra, ObraStatus } from '@/types'

export function ObrasPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<ObraStatus | 'todas'>('todas')

  useEffect(() => {
    if (!user) return
    loadObras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadObras() {
    setLoading(true)
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setObras(data)
    } else if (error) {
      toast({ description: 'Erro ao carregar obras.', variant: 'destructive' })
    }
    setLoading(false)
  }

  const obrasFiltradas = obras.filter(o => {
    const matchStatus = filtroStatus === 'todas' || o.status === filtroStatus
    const termo = busca.trim().toLowerCase()
    const matchBusca =
      termo === '' ||
      o.nome.toLowerCase().includes(termo) ||
      o.orgao_contratante.toLowerCase().includes(termo) ||
      (o.numero_licitacao ?? '').toLowerCase().includes(termo)
    return matchStatus && matchBusca
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Obras</h1>
        <Button asChild className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white">
          <Link to="/obras/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova obra
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, órgão ou contrato..."
            className="pl-9 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
          />
        </div>
        <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as ObraStatus | 'todas')}>
          <SelectTrigger className="w-44 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="paralisada">Paralisada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-lg bg-[var(--color-surface)] animate-pulse" />
          ))}
        </div>
      ) : obrasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-3" />
          <p className="text-[var(--color-text)] font-medium">Nenhuma obra encontrada.</p>
          <p className="text-[var(--color-muted)] text-sm mt-1">
            {obras.length === 0
              ? 'Cadastre sua primeira obra para começar.'
              : 'Tente ajustar os filtros.'}
          </p>
          {obras.length === 0 && (
            <Button asChild className="mt-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white">
              <Link to="/obras/nova">Nova obra</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {obrasFiltradas.map(obra => (
            <Card
              key={obra.id}
              className="bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-[var(--color-text)] truncate">{obra.nome}</h2>
                      <StatusBadge status={obra.status} />
                    </div>
                    <p className="text-sm text-[var(--color-muted)] truncate">{obra.orgao_contratante}</p>
                    {obra.numero_licitacao && (
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">Licitação: {obra.numero_licitacao}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <ValorMonetario value={obra.valor_total} className="text-lg font-semibold text-[var(--color-text)]" />
                    {obra.prazo_termino && (
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        Prazo: {format(new Date(obra.prazo_termino + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                  >
                    <Link to={`/obras/${obra.id}`}>Ver obra</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                  >
                    <Link to={`/obras/${obra.id}/editar`}>Editar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
