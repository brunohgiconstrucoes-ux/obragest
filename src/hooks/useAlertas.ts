import { useCallback, useEffect, useState } from 'react'
import { addDays, isBefore, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Alerta } from '@/types'

export function useAlertas() {
  const { user } = useAuth()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  const computar = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const hoje = new Date()
    const em30 = addDays(hoje, 30)
    const em60 = addDays(hoje, 60)

    const [obrasRes, estoqueRes, equipRes, medicoesRes] = await Promise.all([
      supabase.from('obras').select('id, nome, prazo_termino').eq('user_id', user.id).eq('status', 'em_andamento'),
      supabase.from('vw_saldo_estoque').select('item_id, nome, saldo, estoque_minimo').eq('user_id', user.id).is('obra_id', null),
      supabase.from('equipamentos').select('id, nome, proxima_manutencao, status').eq('user_id', user.id).not('proxima_manutencao', 'is', null),
      supabase.from('medicoes').select('id, obra_id, numero, data_prevista_recebimento, obras(nome)').eq('user_id', user.id).eq('status', 'aguardando'),
    ])

    const lista: Alerta[] = []
    let seq = 0
    const id = () => `alert-${seq++}`

    // ── Prazos das obras ──────────────────────────────────────────────────────
    for (const o of obrasRes.data ?? []) {
      if (!o.prazo_termino) continue
      const prazo = parseISO(o.prazo_termino)
      if (isBefore(prazo, hoje)) {
        lista.push({
          id: id(), tipo: 'prazo_critico', severidade: 'critico',
          titulo: `Prazo vencido: ${o.nome}`,
          descricao: `A obra ultrapassou a data de término contratual.`,
          obra_id: o.id, obra_nome: o.nome,
          link: `/obras/${o.id}`,
        })
      } else if (isBefore(prazo, em30)) {
        lista.push({
          id: id(), tipo: 'prazo_critico', severidade: 'critico',
          titulo: `Prazo crítico: ${o.nome}`,
          descricao: `Término em menos de 30 dias.`,
          obra_id: o.id, obra_nome: o.nome,
          link: `/obras/${o.id}`,
        })
      } else if (isBefore(prazo, em60)) {
        lista.push({
          id: id(), tipo: 'prazo_atencao', severidade: 'atencao',
          titulo: `Prazo próximo: ${o.nome}`,
          descricao: `Término em menos de 60 dias.`,
          obra_id: o.id, obra_nome: o.nome,
          link: `/obras/${o.id}`,
        })
      }
    }

    // ── Estoque abaixo do mínimo ──────────────────────────────────────────────
    for (const s of estoqueRes.data ?? []) {
      if (s.estoque_minimo != null && s.saldo < s.estoque_minimo) {
        lista.push({
          id: id(), tipo: 'estoque_minimo', severidade: 'atencao',
          titulo: `Estoque baixo: ${s.nome}`,
          descricao: `Saldo ${s.saldo} abaixo do mínimo de ${s.estoque_minimo}.`,
          obra_id: null, obra_nome: null,
          link: `/almoxarifado`,
        })
      }
    }

    // ── Manutenção vencida ────────────────────────────────────────────────────
    for (const e of equipRes.data ?? []) {
      if (!e.proxima_manutencao) continue
      if (isBefore(parseISO(e.proxima_manutencao), hoje)) {
        lista.push({
          id: id(), tipo: 'manutencao_vencida', severidade: 'critico',
          titulo: `Manutenção vencida: ${e.nome}`,
          descricao: `A manutenção programada está atrasada.`,
          obra_id: null, obra_nome: null,
          link: `/equipamentos`,
        })
      }
    }

    // ── Medições atrasadas ────────────────────────────────────────────────────
    for (const m of (medicoesRes.data ?? []) as any[]) {
      if (!m.data_prevista_recebimento) continue
      if (isBefore(parseISO(m.data_prevista_recebimento), hoje)) {
        lista.push({
          id: id(), tipo: 'medicao_atrasada', severidade: 'atencao',
          titulo: `Medição atrasada: ${m.obras?.nome ?? '—'}`,
          descricao: `Medição #${m.numero} aguarda recebimento além da data prevista.`,
          obra_id: m.obra_id, obra_nome: m.obras?.nome ?? null,
          link: `/obras/${m.obra_id}/medicoes/${m.id}`,
        })
      }
    }

    // Críticos primeiro, depois atenção
    lista.sort((a, b) => (a.severidade === 'critico' && b.severidade !== 'critico' ? -1 : 1))
    setAlertas(lista)
    setLoading(false)
  }, [user])

  useEffect(() => { computar() }, [computar])

  return { alertas, loading, recarregar: computar }
}
