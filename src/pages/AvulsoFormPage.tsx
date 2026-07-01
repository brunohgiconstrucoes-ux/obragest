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
import { gerarReciboAvulsoPDF } from '@/lib/pdf/recibo-avulso'
import type { Obra, MaoDeObra } from '@/types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z
  .object({
    nome: z.string().min(1, 'Obrigatório'),
    cpf_cnpj: z
      .string()
      .optional()
      .refine(
        v =>
          !v ||
          v === '' ||
          /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) ||
          /^\d{11}$/.test(v),
        'CPF inválido — use 000.000.000-00 ou 11 dígitos'
      ),
    funcao: z.string().min(1, 'Obrigatório'),
    valor_diaria_reais: z
      .string()
      .min(1, 'Obrigatório')
      .refine(v => {
        const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
        return isFinite(n) && n > 0
      }, 'Deve ser maior que zero'),
    quantidade_dias: z
      .string()
      .min(1, 'Obrigatório')
      .refine(v => {
        const n = parseInt(v)
        return !isNaN(n) && n >= 1
      }, 'Mínimo 1 dia'),
    periodo_inicio: z.string().min(1, 'Obrigatório'),
    periodo_fim: z.string().min(1, 'Obrigatório'),
    observacao: z.string().optional(),
  })
  .refine(
    d =>
      !d.periodo_inicio ||
      !d.periodo_fim ||
      d.periodo_inicio <= d.periodo_fim,
    {
      message: 'Data início deve ser anterior ou igual ao término',
      path: ['periodo_fim'],
    }
  )

type FormValues = z.infer<typeof schema>

// ── AvulsoFormPage ─────────────────────────────────────────────────────────────

export function AvulsoFormPage() {
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
      valor_diaria_reais: '',
      quantidade_dias: '1',
      periodo_inicio: todayStr(),
      periodo_fim: todayStr(),
      observacao: '',
    },
  })

  const valorDiariaStr = useWatch({ control, name: 'valor_diaria_reais' })
  const quantidadeDiasStr = useWatch({ control, name: 'quantidade_dias' })

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
  const valorDiariaCentavos = parseCentavos(valorDiariaStr ?? '')
  const quantidadeDias = parseInt(quantidadeDiasStr ?? '1') || 0
  const valorPago = valorDiariaCentavos * quantidadeDias

  // ── Submit ──
  async function onSubmit(values: FormValues) {
    if (!user || !obra) return
    setSaving(true)

    const diariaCents = parseCentavos(values.valor_diaria_reais)
    const dias = parseInt(values.quantidade_dias)
    const totalCents = diariaCents * dias

    // 1. Insert mao_de_obra
    const { data: mdo, error: mdoError } = await supabase
      .from('mao_de_obra')
      .insert({
        obra_id: obra.id,
        user_id: user.id,
        modalidade: 'avulso' as const,
        nome: values.nome,
        cpf_cnpj: values.cpf_cnpj || null,
        funcao: values.funcao,
        valor_bruto: null,
        retencao_inss: null,
        retencao_iss: null,
        retencao_irrf: null,
        numero_nf: null,
        pdf_url: null,
        valor_diaria: diariaCents,
        quantidade_dias: dias,
        periodo_inicio: values.periodo_inicio,
        periodo_fim: values.periodo_fim,
        valor_pago: totalCents,
        data_pagamento: values.periodo_fim,
        status: 'previsto' as const,
        incluir_contador: false,
        observacao: values.observacao || null,
      })
      .select()
      .single()

    if (mdoError || !mdo) {
      toast({ description: 'Erro ao salvar avulso.', variant: 'destructive' })
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
      descricao: `Avulso — ${values.nome}`,
      categoria: 'mao_de_obra',
      valor: totalCents,
      data_lancamento: values.periodo_fim,
      status: 'previsto' as const,
      data_realizacao: null,
      incluir_contador: false,
      observacao: values.observacao || null,
    })

    if (fluxoError) {
      // Rollback compensation
      await supabase.from('mao_de_obra').delete().eq('id', mdo.id)
      toast({
        description: 'Erro ao registrar no fluxo de caixa. Operação revertida.',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    // 3. Generate PDF
    const mdoObj: MaoDeObra = mdo as MaoDeObra
    gerarReciboAvulsoPDF(obra, mdoObj, perfil)

    toast({ description: 'Avulso registrado com sucesso!' })
    navigate(`/obras/${obra.id}?tab=mao-de-obra`)
  }

  // ── Render ──
  if (loadingObra) {
    return <div className="text-[var(--color-muted)] p-6">Carregando...</div>
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

      <h1 className="text-2xl font-bold mb-1">Novo Avulso / Diarista</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {obra.nome}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: form fields ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Nome */}
          <div>
            <Label htmlFor="nome">Nome *</Label>
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

          {/* CPF (optional) */}
          <div>
            <Label htmlFor="cpf_cnpj">CPF (opcional)</Label>
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
              placeholder="Ex: Diarista, Servente..."
              className="mt-1"
            />
            {errors.funcao && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.funcao.message}
              </p>
            )}
          </div>

          {/* Valor diária + Dias */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_diaria_reais">Valor da Diária (R$) *</Label>
              <Input
                id="valor_diaria_reais"
                {...register('valor_diaria_reais')}
                placeholder="0,00"
                className="mt-1"
              />
              {errors.valor_diaria_reais && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.valor_diaria_reais.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="quantidade_dias">Nº de Dias *</Label>
              <Input
                id="quantidade_dias"
                type="number"
                min={1}
                {...register('quantidade_dias')}
                className="mt-1"
              />
              {errors.quantidade_dias && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.quantidade_dias.message}
                </p>
              )}
            </div>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="periodo_inicio">Data Início *</Label>
              <Input
                id="periodo_inicio"
                type="date"
                {...register('periodo_inicio')}
                className="mt-1"
              />
              {errors.periodo_inicio && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.periodo_inicio.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="periodo_fim">Data Fim *</Label>
              <Input
                id="periodo_fim"
                type="date"
                {...register('periodo_fim')}
                className="mt-1"
              />
              {errors.periodo_fim && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  {errors.periodo_fim.message}
                </p>
              )}
            </div>
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
          <Card style={{ borderColor: 'var(--color-border)' }}>
            <CardContent className="pt-5 space-y-3">
              <p className="font-semibold text-sm">Resumo de Cálculo</p>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted)' }}>Valor da Diária</span>
                  <ValorMonetario value={valorDiariaCentavos} />
                </div>

                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted)' }}>× Número de Dias</span>
                  <span>{quantidadeDias}</span>
                </div>

                <div
                  className="flex justify-between pt-2 font-bold text-base border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span>Total a Pagar</span>
                  <ValorMonetario value={Math.max(0, valorPago)} />
                </div>
              </div>

              <p className="text-xs pt-2" style={{ color: 'var(--color-muted)' }}>
                Avulso não possui retenções. Não incluído no pacote do contador por padrão.
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-col gap-3">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar e Gerar Recibo'}
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
