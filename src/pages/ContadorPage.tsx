import { useCallback, useEffect, useState } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ValorMonetario } from '@/components/shared/ValorMonetario'

// ── Types ──────────────────────────────────────────────────────────────────────

type ContadorItem = {
  id: string
  tipo: 'Medição' | 'Mão de obra' | 'Material'
  descricao: string
  obra: string
  valor: number // centavos
  data: string  // YYYY-MM-DD
  checked: boolean
}

type ExportacaoContador = {
  id: string
  user_id: string
  mes_referencia: number
  ano_referencia: number
  total_documentos: number
  total_valor: number
  zip_url: string | null
  csv_url: string | null
  pdf_resumo_url: string | null
  gerado_em: string
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

// ── ContadorPage ───────────────────────────────────────────────────────────────

export function ContadorPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [items, setItems] = useState<ContadorItem[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [historico, setHistorico] = useState<ExportacaoContador[]>([])
  const [saving, setSaving] = useState(false)

  // ── Load items ──────────────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const mesStr = String(mes).padStart(2, '0')
      const lastDay = getDaysInMonth(new Date(ano, mes - 1))
      const inicio = `${ano}-${mesStr}-01`
      const fim = `${ano}-${mesStr}-${String(lastDay).padStart(2, '0')}`

      const [{ data: medicoes }, { data: mdo }, { data: materiais }] = await Promise.all([
        supabase
          .from('medicoes')
          .select('*, obras(id, nome)')
          .eq('user_id', user.id)
          .eq('incluir_contador', true)
          .gte('periodo_inicio', inicio)
          .lte('periodo_inicio', fim),

        supabase
          .from('mao_de_obra')
          .select('*, obras(id, nome)')
          .eq('user_id', user.id)
          .eq('incluir_contador', true)
          .gte('data_pagamento', inicio)
          .lte('data_pagamento', fim),

        supabase
          .from('materiais')
          .select('*, obras(id, nome)')
          .eq('user_id', user.id)
          .eq('incluir_contador', true)
          .gte('data_compra', inicio)
          .lte('data_compra', fim),
      ])

      const normalized: ContadorItem[] = [
        ...(medicoes ?? []).map((m: any) => ({
          id: `med-${m.id}`,
          tipo: 'Medição' as const,
          descricao: `Medição #${m.numero}`,
          obra: m.obras?.nome ?? '—',
          valor: m.valor_liquido ?? 0,
          data: m.periodo_inicio,
          checked: true,
        })),
        ...(mdo ?? []).map((m: any) => ({
          id: `mdo-${m.id}`,
          tipo: 'Mão de obra' as const,
          descricao: m.nome,
          obra: m.obras?.nome ?? '—',
          valor: m.valor_pago ?? 0,
          data: m.data_pagamento,
          checked: true,
        })),
        ...(materiais ?? []).map((m: any) => ({
          id: `mat-${m.id}`,
          tipo: 'Material' as const,
          descricao: `${m.item} - ${m.fornecedor}`,
          obra: m.obras?.nome ?? '—',
          valor: m.valor_total ?? 0,
          data: m.data_compra,
          checked: true,
        })),
      ]

      setItems(normalized)
      setCheckedIds(new Set(normalized.map(i => i.id)))
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao carregar lançamentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user, mes, ano, toast])

  // ── Load historico ──────────────────────────────────────────────────────────

  const loadHistorico = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('exportacoes_contador')
      .select('*')
      .eq('user_id', user.id)
      .order('gerado_em', { ascending: false })
      .limit(10)
    if (error) {
      console.error(error)
    } else {
      setHistorico(data ?? [])
    }
  }, [user])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    loadHistorico()
  }, [loadHistorico])

  // ── Toggle checkbox ─────────────────────────────────────────────────────────

  function toggleItem(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (checked) setCheckedIds(new Set(items.map(i => i.id)))
    else setCheckedIds(new Set())
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  function exportCSV() {
    const csvRows = items
      .filter(i => checkedIds.has(i.id))
      .map(i => [
        i.tipo,
        `"${i.descricao.replace(/"/g, '""')}"`,
        `"${i.obra.replace(/"/g, '""')}"`,
        (i.valor / 100).toFixed(2),
        i.data,
        i.tipo === 'Medição' ? 'medicao' : i.tipo === 'Mão de obra' ? 'mao_de_obra' : 'material',
      ].join(','))
    const csvContent = ['tipo,descricao,obra,valor_em_reais,data,origem', ...csvRows].join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `contador-${ano}-${String(mes).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Save historico ──────────────────────────────────────────────────────────

  async function saveHistorico() {
    if (!user) return
    setSaving(true)
    try {
      const markedItems = items.filter(i => checkedIds.has(i.id))
      const { error } = await supabase.from('exportacoes_contador').insert({
        user_id: user.id,
        mes_referencia: mes,
        ano_referencia: ano,
        total_documentos: markedItems.length,
        total_valor: markedItems.reduce((a, i) => a + i.valor, 0),
        zip_url: null,
        csv_url: null,
        pdf_resumo_url: null,
      })
      if (error) throw error
      toast({ title: 'Histórico salvo com sucesso!' })
      await loadHistorico()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao salvar histórico', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const markedItems = items.filter(i => checkedIds.has(i.id))
  const totalMarcado = markedItems.reduce((a, i) => a + i.valor, 0)
  const allChecked = items.length > 0 && checkedIds.size === items.length
  const someChecked = checkedIds.size > 0

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Pacote do Contador</h1>
        <p className="text-[var(--color-muted)] mt-1">
          Selecione o período e revise os lançamentos antes de exportar.
        </p>
      </div>

      {/* Period selector */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--color-text)] text-base">Período de referência</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-muted)]">Mês</label>
            <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
              <SelectTrigger className="w-40 bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((nome, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-muted)]">Ano</label>
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="w-28 bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--color-text)] text-base">
            Lançamentos do período — {MESES[mes - 1]} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-[var(--color-muted)] p-6">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-[var(--color-muted)] p-6">
              Nenhum lançamento com <code>incluir_contador = true</code> neste período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={e => toggleAll(e.target.checked)}
                        className="accent-[var(--color-primary)]"
                      />
                    </th>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-left">Obra</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover,var(--color-surface))] transition-colors"
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="p-3 text-[var(--color-text)]">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          item.tipo === 'Medição'
                            ? 'bg-blue-100 text-blue-800'
                            : item.tipo === 'Mão de obra'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-3 text-[var(--color-text)] max-w-xs truncate">{item.descricao}</td>
                      <td className="p-3 text-[var(--color-muted)] max-w-xs truncate">{item.obra}</td>
                      <td className="p-3 text-right text-[var(--color-text)]">
                        <ValorMonetario value={item.valor} />
                      </td>
                      <td className="p-3 text-[var(--color-muted)] whitespace-nowrap">
                        {format(new Date(item.data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                    <td colSpan={4} className="p-3 text-[var(--color-muted)] text-right">
                      Total selecionado ({checkedIds.size} itens):
                    </td>
                    <td className="p-3 text-right text-[var(--color-text)]">
                      <ValorMonetario value={totalMarcado} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={exportCSV}
          disabled={!someChecked}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button
          variant="outline"
          onClick={saveHistorico}
          disabled={!someChecked || saving}
          className="gap-2 border-[var(--color-border)] text-[var(--color-text)]"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar histórico'}
        </Button>
      </div>

      {/* Historico */}
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--color-text)] text-base">Histórico de exportações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <p className="text-[var(--color-muted)] p-6">Nenhuma exportação registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="p-3 text-left">Período</th>
                    <th className="p-3 text-center">Documentos</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-left">Gerado em</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr
                      key={h.id}
                      className="border-b border-[var(--color-border)]"
                    >
                      <td className="p-3 text-[var(--color-text)]">
                        {MESES[h.mes_referencia - 1]} {h.ano_referencia}
                      </td>
                      <td className="p-3 text-center text-[var(--color-text)]">
                        {h.total_documentos}
                      </td>
                      <td className="p-3 text-right text-[var(--color-text)]">
                        <ValorMonetario value={h.total_valor} />
                      </td>
                      <td className="p-3 text-[var(--color-muted)] whitespace-nowrap">
                        {format(new Date(h.gerado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
