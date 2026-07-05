import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { parseCentavos, todayStr } from '@/lib/currency'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import { gerarRpaPDF } from '@/lib/pdf/rpa'
import type { Obra, MaoDeObra } from '@/types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  cpf_cnpj: z
    .string()
    .min(1, 'Obrigatório')
    .regex(
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
      'CPF inválido — use 000.000.000-00 ou 11 dígitos'
    ),
  funcao: z.string().min(1, 'Obrigatório'),
  valor_bruto_reais: z
    .string()
    .min(1, 'Obrigatório')
    .refine(v => {
      const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
      return isFinite(n) && n > 0
    }, 'Deve ser maior que zero'),
  data_pagamento: z.string().min(1, 'Obrigatório'),
  observacao: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── RpaFormPage ───────────────────────────────────────────────────────────────

export function RpaFormPage() {
  const { id } = useParams<{ id: string }>()
  const { user, perfil } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [obra, setObra] = useState<Obra | null>(null)
  const [loadingObra, setLoadingObra] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      cpf_cnpj: '',
      funcao: '',
      valor_bruto_reais: '',
      data_pagamento: todayStr(),
      observacao: '',
    },
  })

  const valorBrutoStr = useWatch({ control, name: 'valor_bruto_reais' })

  // ── Load obra ──
  useEffect(() => {
    if (!id || !user) return
    async function load() {
      setLoadingObra(true)
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single()

      if (error || !data) {
        toast({ description: 'Obra não encontrada.', variant: 'destructive' })
        navigate('/obras')
        return
      }
      setObra(data)
      setLoadingObra(false)
    }
    load()
  }, [id, user, navigate, toast])

  // ── Derived calculations ──
  const valorBrutoCentavos = parseCentavos(valorBrutoStr ?? '')

  const inssAliq = obra?.aliquota_inss ?? perfil?.aliquota_inss ?? 11
  const issAliq = obra?.aliquota_iss ?? perfil?.aliquota_iss ?? 2
  const irrfAliq = obra?.aliquota_irrf ?? perfil?.aliquota_irrf ?? 1.5

  const retencaoInss = Math.round(valorBrutoCentavos * inssAliq / 100)
  const retencaoIss = Math.round(valorBrutoCentavos * issAliq / 100)
  const retencaoIrrf = Math.round(valorBrutoCentavos * irrfAliq / 100)
  const totalRetencoes = retencaoInss + retencaoIss + retencaoIrrf
  const valorPago = valorBrutoCentavos - totalRetencoes

  // ── Submit ──
  async function onSubmit(values: FormValues) {
    if (!user || !obra) return
    setSaving(true)

    const valorBrutoCents = parseCentavos(values.valor_bruto_reais)
    const inss = Math.round(valorBrutoCents * inssAliq / 100)
    const iss = Math.round(valorBrutoCents * issAliq / 100)
    const irrf = Math.round(valorBrutoCents * irrfAliq / 100)
    const pago = valorBrutoCents - inss - iss - irrf

    // 1. Insert mao_de_obra
    const { data: mdo, error: mdoError } = await supabase
      .from('mao_de_obra')
      .insert({
        obra_id: obra.id,
        user_id: user.id,
        modalidade: 'rpa' as const,
        nome: values.nome,
        cpf_cnpj: values.cpf_cnpj,
        funcao: values.funcao,
        valor_bruto: valorBrutoCents,
        retencao_inss: inss,
        retencao_iss: iss,
        retencao_irrf: irrf,
        numero_nf: null,
        valor_diaria: null,
        quantidade_dias: null,
        periodo_inicio: null,
        periodo_fim: null,
        pdf_url: null,
        valor_pago: pago,
        data_pagamento: values.data_pagamento,
        status: 'previsto' as const,
        incluir_contador: true,
        observacao: values.observacao || null,
      })
      .select()
      .single()

    if (mdoError || !mdo) {
      toast({ description: 'Erro ao salvar RPA.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // 2. Insert fluxo_caixa
    const { error: fluxoError } = await supabase.from('fluxo_caixa').insert({
      user_id: user.id,
      obra_id: obra.id,
      tipo: 'saida' as const,
      escopo: 'pj_obra' as const,
      origem: 'mao_de_obra' as const,
      origem_id: mdo.id,
      descricao: `RPA — ${values.nome}`,
      categoria: 'mao_de_obra',
      valor: pago,
      data_lancamento: values.data_pagamento,
      status: 'previsto' as const,
      data_realizacao: null,
      incluir_contador: true,
      observacao: values.observacao || null,
    })

    if (fluxoError) {
      // Rollback compensation
      await supabase.from('mao_de_obra').delete().eq('id', mdo.id)
      toast({ description: 'Erro ao registrar no fluxo de caixa. Operação revertida.', variant: 'destructive' })
      setSaving(false)
      return
    }

    // 3. Generate PDF
    try {
      const mdoObj: MaoDeObra = mdo as MaoDeObra
      await gerarRpaPDF(obra, mdoObj, perfil)
    } catch {
      // PDF failure doesn't roll back the saved record
    }

    toast({ description: 'RPA registrado com sucesso!' })
    navigate(`/obras/${obra.id}?tab=mao-de-obra`)
  }

  // ── Render ──
  if (loadingObra) {
    return (
      <div className="text-[var(--color-muted)] p-6">Carregando...</div>
    )
  }

  if (!obra) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-[var(--color-text)]">
      {/* Back link */}
      <Link
        to={`/obras/${id}?tab=mao-de-obra`}
        className="inline-flex items-center gap-1.5 text-sm mb-4"
        style={{ color: 'var(--color-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Mão de Obra
      </Link>

      <h1 className="text-2xl font-bold mb-1">Novo RPA</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {obra.nome}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: form fields ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome do Autônomo *</Label>
            <Input
              id="nome"
              {...register('nome')}
              placeholder="Nome completo"
              className="mt-1"
            />
            {errors.nome && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.nome.message}
              </p>
            )}
          </div>

          {/* CPF */}
          <div>
            <Label htmlFor="cpf_cnpj">CPF *</Label>
            <Input
              id="cpf_cnpj"
              {...register('cpf_cnpj')}
              placeholder="000.000.000-00"
              className="mt-1"
            />
            {errors.cpf_cnpj && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.cpf_cnpj.message}
              </p>
            )}
          </div>

          {/* Função */}
          <div>
            <Label htmlFor="funcao">Função *</Label>
            <Input
              id="funcao"
              {...register('funcao')}
              placeholder="Ex: Pedreiro, Eletricista..."
              className="mt-1"
            />
            {errors.funcao && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.funcao.message}
              </p>
            )}
          </div>

          {/* Valor bruto */}
          <div>
            <Label htmlFor="valor_bruto_reais">Valor Bruto (R$) *</Label>
            <Input
              id="valor_bruto_reais"
              {...register('valor_bruto_reais')}
              placeholder="0,00"
              className="mt-1"
            />
            {errors.valor_bruto_reais && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.valor_bruto_reais.message}
              </p>
            )}
          </div>

          {/* Data pagamento */}
          <div>
            <Label htmlFor="data_pagamento">Data de Pagamento *</Label>
            <Input
              id="data_pagamento"
              type="date"
              {...register('data_pagamento')}
              className="mt-1"
            />
            {errors.data_pagamento && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.data_pagamento.message}
              </p>
            )}
          </div>

          {/* Observação */}
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              {...register('observacao')}
              placeholder="Opcional"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        {/* ── Right: resumo ── */}
        <div className="lg:col-span-1">
          {valorBrutoCentavos > 0 && (
            <Card className="bg-[var(--color-surface-2)] border-[var(--color-border)]">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Demonstrativo de pagamento</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-muted)]">Valor bruto</span>
                    <ValorMonetario value={valorBrutoCentavos} className="text-[var(--color-text)]" />
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-1.5 space-y-1.5">
                    <div className="flex justify-between text-[var(--color-danger)]">
                      <span>(−) INSS {inssAliq}%</span>
                      <ValorMonetario value={retencaoInss} className="" />
                    </div>
                    <div className="flex justify-between text-[var(--color-danger)]">
                      <span>(−) ISS {issAliq}%</span>
                      <ValorMonetario value={retencaoIss} className="" />
                    </div>
                    <div className="flex justify-between text-[var(--color-danger)]">
                      <span>(−) IRRF {irrfAliq}%</span>
                      <ValorMonetario value={retencaoIrrf} className="" />
                    </div>
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-2 flex justify-between items-center">
                    <span className="font-bold text-[var(--color-text)]">Valor líquido a pagar</span>
                    <ValorMonetario value={Math.max(0, valorPago)} className="text-xl font-bold text-[var(--color-success)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar RPA e Gerar PDF'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/obras/${id}?tab=mao-de-obra`)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
