import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Edit, Plus, FileText, ClipboardList, Wrench, Users, TrendingUp, ExternalLink, Package, Gauge, Sparkles, Upload } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { todayStr } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import { extrairDadosNf } from '@/lib/gemini'
import type {
  Obra,
  Medicao,
  MaoDeObra,
  Material,
  FluxoCaixa,
  VwPlanilhaSaldo,
  MedicaoStatus,
  MaoDeObraModalidade,
  MaterialCategoria,
  FormaPagamento,
  FluxoTipo,
  FluxoEscopo,
  FluxoOrigem,
  LancamentoStatus,
} from '@/types'

// ── Zod schemas ─────────────────────────────────────────────────────────────

const materialSchema = z.object({
  fornecedor: z.string().min(1, 'Obrigatório'),
  item: z.string().min(1, 'Obrigatório'),
  categoria: z.enum(['cimento', 'aco', 'eletrica', 'hidraulica', 'epi', 'ferramentas', 'madeira', 'outros']),
  quantidade: z.coerce.number().positive('Deve ser positivo').optional().or(z.literal('')),
  unidade: z.string().optional(),
  valor_total_reais: z.coerce.number().positive('Valor obrigatório'),
  data_compra: z.string().min(1, 'Obrigatório'),
  forma_pagamento: z.enum(['avista', 'boleto', 'cartao', 'cheque', 'prazo']),
  observacao: z.string().optional(),
})

type MaterialFormValues = z.infer<typeof materialSchema>

const quickMaterialSchema = z.object({
  fornecedor: z.string().min(1, 'Obrigatório'),
  item: z.string().min(1, 'Obrigatório'),
  valor_total_reais: z.coerce.number().positive('Obrigatório'),
  data_compra: z.string().min(1, 'Obrigatório'),
})
type QuickMaterialValues = z.infer<typeof quickMaterialSchema>

const nfSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  cpf_cnpj: z.string().optional(),
  numero_nf: z.string().optional(),
  valor_pago_reais: z.coerce.number().positive('Valor obrigatório'),
  data_pagamento: z.string().min(1, 'Obrigatório'),
  observacao: z.string().optional(),
})

type NfFormValues = z.infer<typeof nfSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  try {
    return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return d
  }
}


// ── Small badge components ────────────────────────────────────────────────────

const medicaoStatusLabel: Record<MedicaoStatus, string> = {
  aguardando: 'Aguardando',
  recebido: 'Recebido',
  parcial: 'Parcial',
}

const medicaoStatusClass: Record<MedicaoStatus, string> = {
  aguardando: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/40',
  recebido: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40',
  parcial: 'bg-[var(--color-pj)]/20 text-[var(--color-pj)] border-[var(--color-pj)]/40',
}

function MedicaoBadge({ status }: { status: MedicaoStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${medicaoStatusClass[status]}`}>
      {medicaoStatusLabel[status]}
    </Badge>
  )
}

const modalidadeLabel: Record<MaoDeObraModalidade, string> = {
  nf: 'NF',
  rpa: 'RPA',
  avulso: 'Avulso',
}

const modalidadeClass: Record<MaoDeObraModalidade, string> = {
  nf: 'bg-[var(--color-pj)]/20 text-[var(--color-pj)] border-[var(--color-pj)]/40',
  rpa: 'bg-[var(--color-pf)]/20 text-[var(--color-pf)] border-[var(--color-pf)]/40',
  avulso: 'bg-[var(--color-muted)]/20 text-[var(--color-muted)] border-[var(--color-muted)]/40',
}

function ModalidadeBadge({ modalidade }: { modalidade: MaoDeObraModalidade }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${modalidadeClass[modalidade]}`}>
      {modalidadeLabel[modalidade]}
    </Badge>
  )
}

const fluxoTipoClass: Record<FluxoTipo, string> = {
  entrada: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40',
  saida: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/40',
}

function FluxoTipoBadge({ tipo }: { tipo: FluxoTipo }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${fluxoTipoClass[tipo]}`}>
      {tipo === 'entrada' ? 'Entrada' : 'Saída'}
    </Badge>
  )
}

const statusLancClass: Record<LancamentoStatus, string> = {
  previsto: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/40',
  realizado: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40',
}

function LancStatusBadge({ status }: { status: LancamentoStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-medium ${statusLancClass[status]}`}>
      {status === 'previsto' ? 'Previsto' : 'Realizado'}
    </Badge>
  )
}

const categoriaLabel: Record<MaterialCategoria, string> = {
  cimento: 'Cimento',
  aco: 'Aço',
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  epi: 'EPI',
  ferramentas: 'Ferramentas',
  madeira: 'Madeira',
  outros: 'Outros',
}

const formaPagLabel: Record<FormaPagamento, string> = {
  avista: 'À vista',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque',
  prazo: 'Prazo',
}

// ── Field row helper ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-muted)] mb-0.5">{label}</dt>
      <dd className="text-sm text-[var(--color-text)]">{children}</dd>
    </div>
  )
}

// ── Material Dialog ──────────────────────────────────────────────────────────

function MaterialDialog({ obraId, onSaved }: { obraId: string; onSaved: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      data_compra: todayStr(),
      categoria: 'outros',
      forma_pagamento: 'avista',
    },
  })

  async function onSubmit(values: MaterialFormValues) {
    setSaving(true)
    const valorCentavos = Math.round(values.valor_total_reais * 100)
    const quantidadeNum = values.quantidade === '' || values.quantidade == null ? null : Number(values.quantidade)

    const { data: mat, error: matErr } = await supabase
      .from('materiais')
      .insert({
        obra_id: obraId,
        user_id: user!.id,
        fornecedor: values.fornecedor,
        item: values.item,
        categoria: values.categoria as MaterialCategoria,
        quantidade: quantidadeNum,
        unidade: values.unidade || null,
        valor_total: valorCentavos,
        data_compra: values.data_compra,
        forma_pagamento: values.forma_pagamento as FormaPagamento,
        incluir_contador: true,
        observacao: values.observacao || null,
      })
      .select('id')
      .single()

    if (matErr || !mat) {
      toast({ description: 'Erro ao salvar material.', variant: 'destructive' })
      setSaving(false)
      return
    }

    const { error: fluxoErr } = await supabase.from('fluxo_caixa').insert({
      user_id: user!.id,
      obra_id: obraId,
      escopo: 'pj_obra' as FluxoEscopo,
      tipo: 'saida' as FluxoTipo,
      origem: 'material' as FluxoOrigem,
      origem_id: mat.id,
      descricao: `Material: ${values.item} (${values.fornecedor})`,
      categoria: values.categoria,
      valor: valorCentavos,
      data_lancamento: values.data_compra,
      status: 'previsto' as LancamentoStatus,
      data_realizacao: null,
      incluir_contador: true,
      observacao: values.observacao || null,
    })

    if (fluxoErr) {
      await supabase.from('materiais').delete().eq('id', mat.id)
      toast({ description: 'Erro ao lançar no fluxo de caixa. Nenhum dado foi salvo.', variant: 'destructive' })
      setSaving(false)
      return
    }

    toast({ description: 'Material lançado com sucesso.' })
    reset({ data_compra: todayStr(), categoria: 'outros', forma_pagamento: 'avista' })
    setOpen(false)
    onSaved()
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
          <Plus className="w-4 h-4 mr-1" />
          Lançar material
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text)]">Lançar Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[var(--color-muted)] text-xs">Fornecedor *</Label>
              <Input {...register('fornecedor')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.fornecedor && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.fornecedor.message}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-[var(--color-muted)] text-xs">Item *</Label>
              <Input {...register('item')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.item && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.item.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Categoria *</Label>
              <Controller
                control={control}
                name="categoria"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      {(Object.entries(categoriaLabel) as [MaterialCategoria, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Forma de Pagamento *</Label>
              <Controller
                control={control}
                name="forma_pagamento"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      {(Object.entries(formaPagLabel) as [FormaPagamento, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Quantidade</Label>
              <Input {...register('quantidade')} type="number" step="any" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Unidade</Label>
              <Input {...register('unidade')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Valor Total (R$) *</Label>
              <Input {...register('valor_total_reais')} type="number" step="0.01" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.valor_total_reais && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.valor_total_reais.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Data da Compra *</Label>
              <Input {...register('data_compra')} type="date" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.data_compra && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.data_compra.message}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-[var(--color-muted)] text-xs">Observação</Label>
              <textarea
                {...register('observacao')}
                rows={2}
                className="mt-1 w-full rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[var(--color-border)] text-[var(--color-text)]">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── NF Dialog ────────────────────────────────────────────────────────────────

function NfDialog({ obraId, onSaved }: { obraId: string; onSaved: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [digitalizando, setDigitalizando] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<NfFormValues>({
    resolver: zodResolver(nfSchema),
    defaultValues: { data_pagamento: todayStr() },
  })

  async function handleDigitalizar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDigitalizando(true)
    try {
      const dados = await extrairDadosNf(file)
      if (dados.nome) setValue('nome', dados.nome)
      if (dados.cpf_cnpj) setValue('cpf_cnpj', dados.cpf_cnpj)
      if (dados.numero_nf) setValue('numero_nf', dados.numero_nf)
      if (dados.valor_pago_reais) setValue('valor_pago_reais', dados.valor_pago_reais)
      if (dados.data_pagamento) setValue('data_pagamento', dados.data_pagamento)
      toast({ description: 'Dados extraídos! Confira e ajuste se necessário.' })
    } catch {
      toast({ description: 'Não foi possível extrair os dados. Preencha manualmente.', variant: 'destructive' })
    }
    setDigitalizando(false)
    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }

  async function onSubmit(values: NfFormValues) {
    setSaving(true)
    const valorCentavos = Math.round(values.valor_pago_reais * 100)

    const { data: mo, error: moErr } = await supabase
      .from('mao_de_obra')
      .insert({
        obra_id: obraId,
        user_id: user!.id,
        modalidade: 'nf' as MaoDeObraModalidade,
        nome: values.nome,
        cpf_cnpj: values.cpf_cnpj || null,
        numero_nf: values.numero_nf || null,
        funcao: null,
        valor_bruto: null,
        retencao_inss: null,
        retencao_iss: null,
        retencao_irrf: null,
        valor_diaria: null,
        quantidade_dias: null,
        periodo_inicio: null,
        periodo_fim: null,
        valor_pago: valorCentavos,
        data_pagamento: values.data_pagamento,
        status: 'previsto' as LancamentoStatus,
        pdf_url: null,
        incluir_contador: true,
        observacao: values.observacao || null,
      })
      .select('id')
      .single()

    if (moErr || !mo) {
      toast({ description: 'Erro ao salvar NF.', variant: 'destructive' })
      setSaving(false)
      return
    }

    const { error: fluxoErr } = await supabase.from('fluxo_caixa').insert({
      user_id: user!.id,
      obra_id: obraId,
      escopo: 'pj_obra' as FluxoEscopo,
      tipo: 'saida' as FluxoTipo,
      origem: 'mao_de_obra' as FluxoOrigem,
      origem_id: mo.id,
      descricao: `NF: ${values.nome}${values.numero_nf ? ` — NF ${values.numero_nf}` : ''}`,
      categoria: 'mao_de_obra',
      valor: valorCentavos,
      data_lancamento: values.data_pagamento,
      status: 'previsto' as LancamentoStatus,
      data_realizacao: null,
      incluir_contador: true,
      observacao: values.observacao || null,
    })

    if (fluxoErr) {
      await supabase.from('mao_de_obra').delete().eq('id', mo.id)
      toast({ description: 'Erro ao lançar no fluxo de caixa. Nenhum dado foi salvo.', variant: 'destructive' })
      setSaving(false)
      return
    }

    toast({ description: 'NF lançada com sucesso.' })
    reset({ data_pagamento: todayStr() })
    setOpen(false)
    onSaved()
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
          <FileText className="w-4 h-4 mr-1" />
          NF
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text)]">Lançar Nota Fiscal</DialogTitle>
        </DialogHeader>
        {/* Botão Digitalizar NF com IA */}
        <div className="mt-2">
          <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm font-medium
            ${digitalizando
              ? 'border-[var(--color-primary)]/40 text-[var(--color-muted)] cursor-not-allowed'
              : 'border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
            }`}>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={digitalizando}
              onChange={handleDigitalizar}
            />
            {digitalizando
              ? <><Sparkles className="w-4 h-4 animate-pulse" /> Analisando NF com IA...</>
              : <><Upload className="w-4 h-4" /> Digitalizar NF com IA (foto ou PDF)</>
            }
          </label>
          <p className="text-xs text-[var(--color-muted)] text-center mt-1">Os campos serão preenchidos automaticamente</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
          <div>
            <Label className="text-[var(--color-muted)] text-xs">Nome / Razão Social *</Label>
            <Input {...register('nome')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            {errors.nome && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.nome.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[var(--color-muted)] text-xs">CPF / CNPJ</Label>
              <Input {...register('cpf_cnpj')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Número da NF</Label>
              <Input {...register('numero_nf')} className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Valor Pago (R$) *</Label>
              <Input {...register('valor_pago_reais')} type="number" step="0.01" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.valor_pago_reais && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.valor_pago_reais.message}</p>}
            </div>
            <div>
              <Label className="text-[var(--color-muted)] text-xs">Data do Pagamento *</Label>
              <Input {...register('data_pagamento')} type="date" className="mt-1 bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
              {errors.data_pagamento && <p className="text-xs text-[var(--color-danger)] mt-0.5">{errors.data_pagamento.message}</p>}
            </div>
          </div>
          <div>
            <Label className="text-[var(--color-muted)] text-xs">Observação</Label>
            <textarea
              {...register('observacao')}
              rows={2}
              className="mt-1 w-full rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[var(--color-border)] text-[var(--color-text)]">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── ObraDetailPage ────────────────────────────────────────────────────────────

const TABS = ['contrato', 'planilha', 'medicoes', 'materiais', 'mao-de-obra', 'fluxo', 'estoque', 'equipamentos'] as const
type TabValue = typeof TABS[number]

export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') ?? 'contrato') as TabValue

  function setTab(tab: TabValue) {
    setSearchParams({ tab })
  }

  // ── State ──
  const [obra, setObra] = useState<Obra | null>(null)
  const [loadingObra, setLoadingObra] = useState(true)

  const [planilha, setPlanilha] = useState<VwPlanilhaSaldo[]>([])
  const [loadingPlanilha, setLoadingPlanilha] = useState(false)

  const [medicoes, setMedicoes] = useState<Medicao[]>([])
  const [loadingMedicoes, setLoadingMedicoes] = useState(false)

  const [materiais, setMateriais] = useState<Material[]>([])
  const [loadingMateriais, setLoadingMateriais] = useState(false)

  const [maoDeObra, setMaoDeObra] = useState<MaoDeObra[]>([])
  const [loadingMao, setLoadingMao] = useState(false)

  const [fluxo, setFluxo] = useState<FluxoCaixa[]>([])
  const [loadingFluxo, setLoadingFluxo] = useState(false)

  const [estoqueObra, setEstoqueObra] = useState<{ nome: string; unidade: string; saldo: number }[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)

  const [equipamentosObra, setEquipamentosObra] = useState<{ nome: string; tipo: string; data_inicio: string; custo_diaria: number; custo_diaria_override: number | null; dias: number }[]>([])
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(false)

  // ── Quick-add material ──
  const [quickExpanded, setQuickExpanded] = useState(false)
  const [quickSaving, setQuickSaving] = useState(false)

  const quickForm = useForm<QuickMaterialValues>({
    resolver: zodResolver(quickMaterialSchema),
    defaultValues: { fornecedor: '', item: '', valor_total_reais: 0, data_compra: todayStr() },
  })

  async function handleQuickMaterial(data: QuickMaterialValues) {
    if (!obra || !user) return
    setQuickSaving(true)
    const valorCentavos = Math.round(data.valor_total_reais * 100)

    const { data: mat, error: matErr } = await supabase
      .from('materiais')
      .insert({
        obra_id: obra.id,
        user_id: user.id,
        fornecedor: data.fornecedor,
        item: data.item,
        categoria: 'outros',
        valor_total: valorCentavos,
        data_compra: data.data_compra,
        forma_pagamento: 'avista',
      })
      .select('id')
      .single()

    if (matErr || !mat) {
      toast({ description: 'Erro ao salvar material.', variant: 'destructive' })
      setQuickSaving(false)
      return
    }

    const { error: fluxoErr } = await supabase.from('fluxo_caixa').insert({
      user_id: user!.id,
      obra_id: obra.id,
      escopo: 'pj_obra' as FluxoEscopo,
      tipo: 'saida' as FluxoTipo,
      origem: 'material' as FluxoOrigem,
      origem_id: mat.id,
      descricao: `Material: ${data.item} (${data.fornecedor})`,
      categoria: 'outros',
      valor: valorCentavos,
      data_lancamento: data.data_compra,
      status: 'previsto' as LancamentoStatus,
      data_realizacao: null,
      incluir_contador: true,
      observacao: null,
    })

    if (fluxoErr) {
      await supabase.from('materiais').delete().eq('id', mat.id)
      toast({ description: 'Erro ao lançar no fluxo de caixa. Nenhum dado foi salvo.', variant: 'destructive' })
      setQuickSaving(false)
      return
    }

    toast({ description: 'Material adicionado!' })
    quickForm.reset({ fornecedor: '', item: '', valor_total_reais: 0, data_compra: todayStr() })
    await loadMateriais()
    setQuickSaving(false)
  }

  // ── Loaders ──
  async function loadObra() {
    if (!id || !user) return
    setLoadingObra(true)
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (error || !data) {
      toast({ description: 'Obra não encontrada.', variant: 'destructive' })
      navigate('/obras')
    } else {
      setObra(data)
    }
    setLoadingObra(false)
  }

  async function loadPlanilha() {
    if (!id || !user) return
    setLoadingPlanilha(true)
    const { data, error } = await supabase
      .from('vw_planilha_saldo')
      .select('*')
      .eq('obra_id', id)
      .eq('user_id', user.id)
      .order('planilha_item_id')
    if (!error && data) setPlanilha(data)
    setLoadingPlanilha(false)
  }

  async function loadMedicoes() {
    if (!id || !user) return
    setLoadingMedicoes(true)
    const { data, error } = await supabase
      .from('medicoes')
      .select('*')
      .eq('obra_id', id)
      .eq('user_id', user.id)
      .order('numero', { ascending: false })
    if (!error && data) setMedicoes(data)
    setLoadingMedicoes(false)
  }

  async function loadMateriais() {
    if (!id || !user) return
    setLoadingMateriais(true)
    const { data, error } = await supabase
      .from('materiais')
      .select('*')
      .eq('obra_id', id)
      .eq('user_id', user.id)
      .order('data_compra', { ascending: false })
    if (!error && data) setMateriais(data)
    setLoadingMateriais(false)
  }

  async function loadMaoDeObra() {
    if (!id || !user) return
    setLoadingMao(true)
    const { data, error } = await supabase
      .from('mao_de_obra')
      .select('*')
      .eq('obra_id', id)
      .eq('user_id', user.id)
      .order('data_pagamento', { ascending: false })
    if (!error && data) setMaoDeObra(data)
    setLoadingMao(false)
  }

  async function loadFluxo() {
    if (!id || !user) return
    setLoadingFluxo(true)
    const { data, error } = await supabase
      .from('fluxo_caixa')
      .select('*')
      .eq('obra_id', id)
      .eq('user_id', user.id)
      .order('data_lancamento', { ascending: false })
      .limit(50)
    if (!error && data) setFluxo(data)
    setLoadingFluxo(false)
  }

  async function loadEquipamentosObra() {
    if (!id || !user) return
    setLoadingEquipamentos(true)
    const { data } = await supabase
      .from('alocacoes_equipamento')
      .select('*, equipamentos(nome, tipo, custo_diaria)')
      .eq('user_id', user.id)
      .eq('obra_id', id)
      .is('data_fim', null)
    const { differenceInDays, parseISO } = await import('date-fns')
    setEquipamentosObra(
      (data ?? []).map((a: any) => ({
        nome: a.equipamentos?.nome ?? '—',
        tipo: a.equipamentos?.tipo ?? '—',
        data_inicio: a.data_inicio,
        custo_diaria: a.equipamentos?.custo_diaria ?? 0,
        custo_diaria_override: a.custo_diaria_override ?? null,
        dias: differenceInDays(new Date(), parseISO(a.data_inicio)) + 1,
      }))
    )
    setLoadingEquipamentos(false)
  }

  async function loadEstoqueObra() {
    if (!id || !user) return
    setLoadingEstoque(true)
    const { data } = await supabase
      .from('vw_saldo_estoque')
      .select('*')
      .eq('user_id', user.id)
      .eq('obra_id', id)
    setEstoqueObra(
      (data ?? [])
        .filter(s => s.saldo > 0)
        .map(s => ({ nome: s.nome, unidade: s.unidade, saldo: s.saldo }))
    )
    setLoadingEstoque(false)
  }

  // ── Effects ──
  useEffect(() => {
    loadObra()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  useEffect(() => {
    if (!obra) return
    if (activeTab === 'planilha') loadPlanilha()
    else if (activeTab === 'medicoes') loadMedicoes()
    else if (activeTab === 'materiais') loadMateriais()
    else if (activeTab === 'mao-de-obra') loadMaoDeObra()
    else if (activeTab === 'fluxo') loadFluxo()
    else if (activeTab === 'estoque') loadEstoqueObra()
    else if (activeTab === 'equipamentos') loadEquipamentosObra()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, obra])

  // ── Loading state ──
  if (loadingObra) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--color-surface)] animate-pulse" />
        <div className="h-64 rounded-lg bg-[var(--color-surface)] animate-pulse" />
      </div>
    )
  }

  if (!obra) return null

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/obras')}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] -ml-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Obras
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{obra.nome}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={obra.status} />
            {obra.orgao_contratante && (
              <span className="text-sm text-[var(--color-muted)]">{obra.orgao_contratante}</span>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] shrink-0">
          <Link to={`/obras/${obra.id}/editar`}>
            <Edit className="w-4 h-4 mr-1" />
            Editar obra
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setTab(v as TabValue)}>
        <TabsList className="bg-[var(--color-surface)] border border-[var(--color-border)] h-auto flex-wrap">
          <TabsTrigger value="contrato" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Contrato
          </TabsTrigger>
          <TabsTrigger value="planilha" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Planilha
          </TabsTrigger>
          <TabsTrigger value="medicoes" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Medições
          </TabsTrigger>
          <TabsTrigger value="materiais" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="mao-de-obra" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Mão de Obra
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Fluxo
          </TabsTrigger>
          <TabsTrigger value="estoque" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="equipamentos" className="data-[state=active]:bg-[var(--color-surface-2)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)]">
            <Gauge className="w-3.5 h-3.5 mr-1.5" />
            Equipamentos
          </TabsTrigger>
        </TabsList>

        {/* ── Aba Contrato ── */}
        <TabsContent value="contrato" className="mt-4">
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <dl className="col-span-full">
                  <Field label="Nome da Obra">{obra.nome}</Field>
                </dl>
                <Field label="Número de Licitação">{obra.numero_licitacao ?? '—'}</Field>
                <Field label="Órgão Contratante">{obra.orgao_contratante}</Field>
                <Field label="Status"><StatusBadge status={obra.status} /></Field>
                <Field label="Valor Total">
                  <ValorMonetario value={obra.valor_total} className="text-[var(--color-text)] font-semibold" />
                </Field>
                <Field label="Data de Assinatura">{fmtDate(obra.data_assinatura)}</Field>
                <Field label="Prazo de Término">{fmtDate(obra.prazo_termino)}</Field>
                {obra.art_rrt && <Field label="ART/RRT">{obra.art_rrt}</Field>}
                {obra.endereco && <Field label="Endereço">{obra.endereco}</Field>}
                {obra.objeto && (
                  <div className="col-span-full">
                    <Field label="Objeto">{obra.objeto}</Field>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">Alíquotas de Retenção</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Caução">{obra.aliquota_caucao}%</Field>
                  <Field label="ISS">{obra.aliquota_iss}%</Field>
                  <Field label="INSS">{obra.aliquota_inss}%</Field>
                  <Field label="IRRF">{obra.aliquota_irrf}%</Field>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Aba Planilha ── */}
        <TabsContent value="planilha" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Itens da Planilha de Serviços</h2>
            <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
              <Link to={`/obras/${obra.id}/planilha`}>
                <Edit className="w-4 h-4 mr-1" />
                Editar planilha
              </Link>
            </Button>
          </div>
          {loadingPlanilha ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : planilha.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum item cadastrado na planilha.</p>
              <Button asChild size="sm" className="mt-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
                <Link to={`/obras/${obra.id}/planilha`}>Cadastrar itens</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Cód.</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Descrição</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Un.</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Qtd. Contrat.</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">V. Unit.</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">V. Total</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Qtd. Medida</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Saldo</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">% Exec.</th>
                  </tr>
                </thead>
                <tbody>
                  {planilha.map(item => (
                    <tr key={item.planilha_item_id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50">
                      <td className="px-3 py-2 text-[var(--color-muted)] text-xs">{item.codigo ?? '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text)]">{item.descricao}</td>
                      <td className="px-3 py-2 text-center text-[var(--color-muted)]">{item.unidade}</td>
                      <td className="px-3 py-2 text-right text-[var(--color-text)]">{item.quantidade_contratada}</td>
                      <td className="px-3 py-2 text-right"><ValorMonetario value={item.valor_unitario} /></td>
                      <td className="px-3 py-2 text-right"><ValorMonetario value={item.valor_contratado} /></td>
                      <td className="px-3 py-2 text-right text-[var(--color-text)]">{item.quantidade_medida}</td>
                      <td className="px-3 py-2 text-right text-[var(--color-text)]">{item.quantidade_restante}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={item.percentual_executado >= 100 ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]'}>
                          {item.percentual_executado.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Medições ── */}
        <TabsContent value="medicoes" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Medições</h2>
            <Button asChild size="sm" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-black">
              <Link to={`/obras/${obra.id}/medicoes/nova`}>
                <Plus className="w-4 h-4 mr-1" />
                Nova medição
              </Link>
            </Button>
          </div>
          {loadingMedicoes ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : medicoes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhuma medição registrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {medicoes.map(med => (
                <Link key={med.id} to={`/obras/${obra.id}/medicoes/${med.id}`}>
                  <Card className="bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)]">Medição #{med.numero}</span>
                            <MedicaoBadge status={med.status} />
                          </div>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            {fmtDate(med.periodo_inicio)} — {fmtDate(med.periodo_fim)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <ValorMonetario value={med.valor_bruto} className="text-sm font-semibold text-[var(--color-text)]" />
                          <p className="text-xs text-[var(--color-muted)]">
                            Líquido: <ValorMonetario value={med.valor_liquido} className="text-[var(--color-success)]" />
                          </p>
                          {med.data_prevista_recebimento && (
                            <p className="text-xs text-[var(--color-muted)]">Prev.: {fmtDate(med.data_prevista_recebimento)}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba Materiais ── */}
        <TabsContent value="materiais" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Compras de Materiais</h2>
            <MaterialDialog obraId={obra.id} onSaved={loadMateriais} />
          </div>
          {/* Quick-add */}
          <div className="mb-4 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <form onSubmit={quickForm.handleSubmit(handleQuickMaterial)}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--color-muted)]">Fornecedor *</Label>
                  <Input {...quickForm.register('fornecedor')} placeholder="Nome" className="h-8 text-sm bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--color-muted)]">Item *</Label>
                  <Input {...quickForm.register('item')} placeholder="Descrição" className="h-8 text-sm bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--color-muted)]">Valor total (R$) *</Label>
                  <Input type="number" step="0.01" {...quickForm.register('valor_total_reais')} placeholder="0,00" className="h-8 text-sm bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--color-muted)]">Data *</Label>
                  <Input type="date" {...quickForm.register('data_compra')} className="h-8 text-sm bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setQuickExpanded(!quickExpanded)}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  {quickExpanded ? '▲ menos detalhes' : '▼ mais detalhes'}
                </button>
                <Button type="submit" size="sm" disabled={quickSaving} className="bg-[var(--color-primary)] text-white h-8">
                  {quickSaving ? 'Salvando…' : '+ Adicionar'}
                </Button>
              </div>
              {quickExpanded && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {/* Campos opcionais: categoria, quantidade, unidade, forma_pagamento — use MaterialDialog para edição completa */}
                </div>
              )}
            </form>
          </div>
          {loadingMateriais ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : materiais.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum material lançado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Fornecedor</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Item</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Categoria</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Valor</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map(m => (
                    <tr key={m.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50">
                      <td className="px-3 py-2 text-[var(--color-text)]">{m.fornecedor}</td>
                      <td className="px-3 py-2 text-[var(--color-text)]">{m.item}</td>
                      <td className="px-3 py-2 text-[var(--color-muted)]">{categoriaLabel[m.categoria]}</td>
                      <td className="px-3 py-2 text-right"><ValorMonetario value={m.valor_total} /></td>
                      <td className="px-3 py-2 text-center text-[var(--color-muted)]">{fmtDate(m.data_compra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Mão de Obra ── */}
        <TabsContent value="mao-de-obra" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Mão de Obra</h2>
            <div className="flex gap-2">
              <NfDialog obraId={obra.id} onSaved={loadMaoDeObra} />
              <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
                <Link to={`/obras/${obra.id}/mao-de-obra/rpa/novo`}>
                  <ClipboardList className="w-4 h-4 mr-1" />
                  RPA
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
                <Link to={`/obras/${obra.id}/mao-de-obra/avulso/novo`}>
                  <Users className="w-4 h-4 mr-1" />
                  Avulso
                </Link>
              </Button>
            </div>
          </div>
          {loadingMao ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : maoDeObra.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum lançamento de mão de obra.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Nome</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Modalidade</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Valor Pago</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {maoDeObra.map(mo => (
                    <tr key={mo.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50">
                      <td className="px-3 py-2 text-[var(--color-text)]">{mo.nome}</td>
                      <td className="px-3 py-2"><ModalidadeBadge modalidade={mo.modalidade} /></td>
                      <td className="px-3 py-2 text-right"><ValorMonetario value={mo.valor_pago} /></td>
                      <td className="px-3 py-2 text-center text-[var(--color-muted)]">{fmtDate(mo.data_pagamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Fluxo ── */}
        <TabsContent value="fluxo" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Fluxo de Caixa da Obra</h2>
            <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
              <Link to={`/obras/${obra.id}/fluxo`}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Ver fluxo completo
              </Link>
            </Button>
          </div>
          {loadingFluxo ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : fluxo.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum lançamento no fluxo de caixa desta obra.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Data</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Descrição</th>
                    <th className="text-left px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Origem</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Tipo</th>
                    <th className="text-right px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Valor</th>
                    <th className="text-center px-3 py-2 text-xs text-[var(--color-muted)] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.map(f => (
                    <tr key={f.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50">
                      <td className="px-3 py-2 text-center text-[var(--color-muted)]">{fmtDate(f.data_lancamento)}</td>
                      <td className="px-3 py-2 text-[var(--color-text)] max-w-xs truncate">{f.descricao}</td>
                      <td className="px-3 py-2 text-[var(--color-muted)] capitalize">{f.origem.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-center"><FluxoTipoBadge tipo={f.tipo} /></td>
                      <td className="px-3 py-2 text-right"><ValorMonetario value={f.valor} /></td>
                      <td className="px-3 py-2 text-center"><LancStatusBadge status={f.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Aba Estoque ── */}
        <TabsContent value="estoque" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Estoque alocado nesta obra</h2>
            <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
              <a href="/almoxarifado">Ver almoxarifado central</a>
            </Button>
          </div>
          {loadingEstoque ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : estoqueObra.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum material transferido para esta obra ainda.</p>
              <p className="text-[var(--color-muted)] text-xs mt-1">Use "Transferir para obra" no Almoxarifado para alocar materiais.</p>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Material</th>
                    <th className="text-center px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Unid.</th>
                    <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Saldo na Obra</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueObra.map((item, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]">
                      <td className="px-4 py-3 font-medium">{item.nome}</td>
                      <td className="px-4 py-3 text-center text-[var(--color-muted)]">{item.unidade}</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--color-success)] font-medium">
                        {item.saldo.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        {/* ── Aba Equipamentos ── */}
        <TabsContent value="equipamentos" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Equipamentos alocados nesta obra</h2>
            <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
              <a href="/equipamentos">Ver todos os equipamentos</a>
            </Button>
          </div>
          {loadingEquipamentos ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 rounded bg-[var(--color-surface)] animate-pulse" />)}</div>
          ) : equipamentosObra.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] text-sm">Nenhum equipamento alocado nesta obra.</p>
              <p className="text-[var(--color-muted)] text-xs mt-1">Use "Alocar para obra" em Equipamentos para registrar máquinas e ferramentas.</p>
            </div>
          ) : (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <th className="text-left px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Equipamento</th>
                    <th className="text-left px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Tipo</th>
                    <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Dias</th>
                    <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Custo/dia</th>
                    <th className="text-right px-4 py-3 text-xs text-[var(--color-muted)] font-medium">Custo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {equipamentosObra.map((e, i) => {
                    const diaria = e.custo_diaria_override ?? e.custo_diaria
                    const total = diaria * e.dias
                    return (
                      <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3 font-medium">{e.nome}</td>
                        <td className="px-4 py-3 text-[var(--color-muted)] capitalize">{e.tipo}</td>
                        <td className="px-4 py-3 text-right text-[var(--color-muted)]">{e.dias}</td>
                        <td className="px-4 py-3 text-right"><ValorMonetario value={diaria} /></td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--color-warning)]"><ValorMonetario value={total} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
