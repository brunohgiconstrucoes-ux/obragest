import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Package, Plus, ArrowRightLeft, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
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
import type { EstoqueItem, VwSaldoEstoque, EstoqueCategoria, Obra } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const categoriaLabel: Record<EstoqueCategoria, string> = {
  cimento: 'Cimento',
  aco: 'Aço',
  madeira: 'Madeira',
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  epi: 'EPI',
  outros: 'Outros',
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  unidade: z.string().min(1, 'Obrigatório'),
  categoria: z.enum(['cimento', 'aco', 'madeira', 'eletrica', 'hidraulica', 'epi', 'outros']),
  estoque_minimo: z.coerce.number().min(0),
})

const entradaSchema = z.object({
  item_id: z.string().min(1, 'Obrigatório'),
  quantidade: z.coerce.number().positive('Deve ser maior que zero'),
  custo_unitario_reais: z.coerce.number().min(0),
  data: z.string().min(1, 'Obrigatório'),
  observacao: z.string().optional(),
})

const transferenciaSchema = z.object({
  item_id: z.string().min(1, 'Obrigatório'),
  obra_id: z.string().min(1, 'Obrigatório'),
  quantidade: z.coerce.number().positive('Deve ser maior que zero'),
  data: z.string().min(1, 'Obrigatório'),
  observacao: z.string().optional(),
})

type ItemForm = z.infer<typeof itemSchema>
type EntradaForm = z.infer<typeof entradaSchema>
type TransferenciaForm = z.infer<typeof transferenciaSchema>

// ── Component ─────────────────────────────────────────────────────────────────

export function AlmoxarifadoPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [saldos, setSaldos] = useState<VwSaldoEstoque[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogItem, setDialogItem] = useState(false)
  const [dialogEntrada, setDialogEntrada] = useState(false)
  const [dialogTransferencia, setDialogTransferencia] = useState(false)
  const [saving, setSaving] = useState(false)

  const itemForm = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { nome: '', unidade: '', categoria: 'outros', estoque_minimo: 0 },
  })
  const entradaForm = useForm<EntradaForm>({
    resolver: zodResolver(entradaSchema),
    defaultValues: { item_id: '', quantidade: 0, custo_unitario_reais: 0, data: todayStr(), observacao: '' },
  })
  const transferenciaForm = useForm<TransferenciaForm>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: { item_id: '', obra_id: '', quantidade: 0, data: todayStr(), observacao: '' },
  })

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [itensRes, saldosRes, obrasRes] = await Promise.all([
      supabase.from('estoque_itens').select('*').eq('user_id', user.id).order('nome'),
      supabase.from('vw_saldo_estoque').select('*').eq('user_id', user.id).is('obra_id', null),
      supabase.from('obras').select('id, nome').eq('user_id', user.id).eq('status', 'em_andamento').order('nome'),
    ])
    setItens(itensRes.data ?? [])
    setSaldos(saldosRes.data ?? [])
    setObras((obrasRes.data ?? []) as Obra[])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Submit: novo item ─────────────────────────────────────────────────────

  async function onSaveItem(values: ItemForm) {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('estoque_itens').insert({
      user_id: user.id,
      nome: values.nome,
      unidade: values.unidade,
      categoria: values.categoria as EstoqueCategoria,
      estoque_minimo: values.estoque_minimo,
    })
    setSaving(false)
    if (error) { toast({ title: 'Erro ao salvar item', variant: 'destructive' }); return }
    toast({ title: 'Item cadastrado com sucesso' })
    setDialogItem(false)
    itemForm.reset()
    load()
  }

  // ── Submit: entrada ───────────────────────────────────────────────────────

  async function onSaveEntrada(values: EntradaForm) {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('movimentacoes_estoque').insert({
      user_id: user.id,
      item_id: values.item_id,
      obra_id: null,
      tipo: 'entrada',
      quantidade: values.quantidade,
      custo_unitario: Math.round(values.custo_unitario_reais * 100),
      data: values.data,
      observacao: values.observacao || null,
    })
    setSaving(false)
    if (error) { toast({ title: 'Erro ao registrar entrada', variant: 'destructive' }); return }
    toast({ title: 'Entrada registrada com sucesso' })
    setDialogEntrada(false)
    entradaForm.reset({ data: todayStr() })
    load()
  }

  // ── Submit: transferência ─────────────────────────────────────────────────

  async function onSaveTransferencia(values: TransferenciaForm) {
    if (!user) return
    setSaving(true)
    const saldoCentral = saldos.find(s => s.item_id === values.item_id)?.saldo ?? 0
    if (values.quantidade > saldoCentral) {
      setSaving(false)
      toast({ title: 'Saldo insuficiente no estoque central', variant: 'destructive' })
      return
    }
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('movimentacoes_estoque').insert({
        user_id: user.id, item_id: values.item_id, obra_id: null,
        tipo: 'transferencia_saida', quantidade: values.quantidade,
        custo_unitario: 0, data: values.data, observacao: values.observacao || null,
      }),
      supabase.from('movimentacoes_estoque').insert({
        user_id: user.id, item_id: values.item_id, obra_id: values.obra_id,
        tipo: 'transferencia_entrada', quantidade: values.quantidade,
        custo_unitario: 0, data: values.data, observacao: values.observacao || null,
      }),
    ])
    setSaving(false)
    if (e1 || e2) { toast({ title: 'Erro ao transferir', variant: 'destructive' }); return }
    toast({ title: 'Transferência realizada com sucesso' })
    setDialogTransferencia(false)
    transferenciaForm.reset({ data: todayStr() })
    load()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const saldoMap = new Map(saldos.map(s => [s.item_id, s.saldo]))

  return (
    <div className="space-y-6 text-[var(--color-text)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Almoxarifado</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Estoque central de materiais</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-[var(--color-border)] text-[var(--color-text)]"
            onClick={() => setDialogEntrada(true)}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Entrada de material
          </Button>
          <Button
            variant="outline"
            className="border-[var(--color-border)] text-[var(--color-text)]"
            onClick={() => setDialogTransferencia(true)}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferir para obra
          </Button>
          <Button
            className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]"
            onClick={() => setDialogItem(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo item
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--color-muted)]">Carregando...</div>
        ) : itens.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-[var(--color-muted)]" />
            <p className="text-[var(--color-muted)] text-sm">Nenhum item cadastrado. Cadastre o primeiro item acima.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Item</th>
                <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">Categoria</th>
                <th className="text-center px-4 py-3 text-[var(--color-muted)] font-medium">Unid.</th>
                <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Saldo Central</th>
                <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Mínimo</th>
                <th className="text-center px-4 py-3 text-[var(--color-muted)] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => {
                const saldo = saldoMap.get(item.id) ?? 0
                const abaixoMinimo = saldo <= item.estoque_minimo
                return (
                  <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium">{item.nome}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{categoriaLabel[item.categoria as EstoqueCategoria]}</td>
                    <td className="px-4 py-3 text-center text-[var(--color-muted)]">{item.unidade}</td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${abaixoMinimo ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                      {saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-muted)]">
                      {item.estoque_minimo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {abaixoMinimo ? (
                        <Badge className="bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Abaixo do mínimo
                        </Badge>
                      ) : (
                        <Badge className="bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30">
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog: Novo item */}
      <Dialog open={dialogItem} onOpenChange={setDialogItem}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle>Novo Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Nome *</Label>
              <Input {...itemForm.register('nome')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" placeholder="Ex: Cimento CP-II" />
              {itemForm.formState.errors.nome && <p className="text-xs text-[var(--color-danger)] mt-1">{itemForm.formState.errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Unidade *</Label>
                <Input {...itemForm.register('unidade')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" placeholder="saco, kg, m², un" />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Categoria *</Label>
                <Controller
                  name="categoria"
                  control={itemForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                        {Object.entries(categoriaLabel).map(([v, l]) => (
                          <SelectItem key={v} value={v} className="text-[var(--color-text)]">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Estoque mínimo</Label>
              <Input type="number" step="0.001" min="0" {...itemForm.register('estoque_minimo')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogItem(false)} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Entrada de material */}
      <Dialog open={dialogEntrada} onOpenChange={setDialogEntrada}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle>
              <ArrowDownToLine className="w-4 h-4 inline mr-2 text-[var(--color-success)]" />
              Entrada de Material
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={entradaForm.handleSubmit(onSaveEntrada)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Item *</Label>
              <Controller
                name="item_id"
                control={entradaForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue placeholder="Selecione o item..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      {itens.map(i => (
                        <SelectItem key={i.id} value={i.id} className="text-[var(--color-text)]">{i.nome} ({i.unidade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {entradaForm.formState.errors.item_id && <p className="text-xs text-[var(--color-danger)] mt-1">Obrigatório</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Quantidade *</Label>
                <Input type="number" step="0.001" min="0" {...entradaForm.register('quantidade')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Custo unitário (R$)</Label>
                <Input type="number" step="0.01" min="0" {...entradaForm.register('custo_unitario_reais')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Data *</Label>
              <Input type="date" {...entradaForm.register('data')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Observação</Label>
              <textarea {...entradaForm.register('observacao')} rows={2} className="mt-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-md px-3 py-2 text-sm resize-none" placeholder="Fornecedor, NF, etc." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogEntrada(false)} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/80">{saving ? 'Salvando...' : 'Registrar entrada'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Transferência para obra */}
      <Dialog open={dialogTransferencia} onOpenChange={setDialogTransferencia}>
        <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle>
              <ArrowRightLeft className="w-4 h-4 inline mr-2 text-[var(--color-primary)]" />
              Transferir para Obra
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={transferenciaForm.handleSubmit(onSaveTransferencia)} className="space-y-4">
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Item *</Label>
              <Controller
                name="item_id"
                control={transferenciaForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue placeholder="Selecione o item..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      {itens.map(i => {
                        const saldo = saldoMap.get(i.id) ?? 0
                        return (
                          <SelectItem key={i.id} value={i.id} className="text-[var(--color-text)]">
                            {i.nome} — saldo: {saldo} {i.unidade}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Obra *</Label>
              <Controller
                name="obra_id"
                control={transferenciaForm.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue placeholder="Selecione a obra..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      {obras.map(o => (
                        <SelectItem key={o.id} value={o.id} className="text-[var(--color-text)]">{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Quantidade *</Label>
                <Input type="number" step="0.001" min="0" {...transferenciaForm.register('quantidade')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
              <div>
                <Label className="text-[var(--color-muted)] text-sm">Data *</Label>
                <Input type="date" {...transferenciaForm.register('data')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              </div>
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-sm">Observação</Label>
              <textarea {...transferenciaForm.register('observacao')} rows={2} className="mt-1 w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-md px-3 py-2 text-sm resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogTransferencia(false)} className="border-[var(--color-border)] text-[var(--color-text)]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-dim)]">{saving ? 'Transferindo...' : 'Transferir'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
