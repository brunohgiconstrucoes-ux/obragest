import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ObraStatus } from '@/types'

const obraSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  numero_licitacao: z.string(),
  orgao_contratante: z.string().min(1, 'Obrigatório'),
  objeto: z.string(),
  art_rrt: z.string(),
  data_assinatura: z.string().min(1, 'Obrigatório'),
  prazo_termino: z.string(),
  // Digitado em reais (ex: 1234.56); convertido para centavos no submit.
  valor_total: z.coerce.number().positive('Deve ser maior que zero'),
  endereco: z.string(),
  status: z.enum(['em_andamento', 'paralisada', 'concluida']),
  aliquota_caucao: z.coerce.number().min(0).max(100),
  aliquota_iss: z.coerce.number().min(0).max(100),
  aliquota_inss: z.coerce.number().min(0).max(100),
  aliquota_irrf: z.coerce.number().min(0).max(100),
})

type ObraFormValues = z.infer<typeof obraSchema>

export function ObraFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { user, perfil } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [loadingObra, setLoadingObra] = useState(isEditing)

  const form = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues: {
      nome: '',
      numero_licitacao: '',
      orgao_contratante: '',
      objeto: '',
      art_rrt: '',
      data_assinatura: '',
      prazo_termino: '',
      valor_total: 0,
      endereco: '',
      status: 'em_andamento',
      aliquota_caucao: perfil?.aliquota_caucao ?? 5,
      aliquota_iss: perfil?.aliquota_iss ?? 2,
      aliquota_inss: perfil?.aliquota_inss ?? 11,
      aliquota_irrf: perfil?.aliquota_irrf ?? 1.5,
    },
  })

  useEffect(() => {
    if (isEditing) {
      loadObra()
    } else if (perfil) {
      form.setValue('aliquota_caucao', perfil.aliquota_caucao)
      form.setValue('aliquota_iss', perfil.aliquota_iss)
      form.setValue('aliquota_inss', perfil.aliquota_inss)
      form.setValue('aliquota_irrf', perfil.aliquota_irrf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, isEditing])

  async function loadObra() {
    if (!user || !id) return
    setLoadingObra(true)
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (error || !data) {
      toast({ description: 'Erro ao carregar obra.', variant: 'destructive' })
      navigate('/obras')
      return
    }
    form.reset({
      nome: data.nome,
      numero_licitacao: data.numero_licitacao ?? '',
      orgao_contratante: data.orgao_contratante,
      objeto: data.objeto ?? '',
      art_rrt: data.art_rrt ?? '',
      data_assinatura: data.data_assinatura ?? '',
      prazo_termino: data.prazo_termino ?? '',
      // valor_total é armazenado em centavos; exibido em reais no formulário
      valor_total: data.valor_total / 100,
      endereco: data.endereco ?? '',
      status: data.status,
      aliquota_caucao: data.aliquota_caucao,
      aliquota_iss: data.aliquota_iss,
      aliquota_inss: data.aliquota_inss,
      aliquota_irrf: data.aliquota_irrf,
    })
    setLoadingObra(false)
  }

  async function onSubmit(data: ObraFormValues) {
    if (!user) return
    setSubmitting(true)

    const payload = {
      user_id: user.id,
      nome: data.nome,
      numero_licitacao: data.numero_licitacao || null,
      orgao_contratante: data.orgao_contratante,
      objeto: data.objeto || null,
      art_rrt: data.art_rrt || null,
      data_assinatura: data.data_assinatura || null,
      prazo_termino: data.prazo_termino || null,
      // Converte reais (digitado) para centavos (armazenado)
      valor_total: Math.round(data.valor_total * 100),
      endereco: data.endereco || null,
      status: data.status,
      aliquota_caucao: data.aliquota_caucao,
      aliquota_iss: data.aliquota_iss,
      aliquota_inss: data.aliquota_inss,
      aliquota_irrf: data.aliquota_irrf,
    }

    const { error } = isEditing
      ? await supabase.from('obras').update(payload).eq('id', id!).eq('user_id', user.id)
      : await supabase.from('obras').insert(payload)

    setSubmitting(false)
    if (error) {
      toast({ description: 'Erro ao salvar obra. Tente novamente.', variant: 'destructive' })
    } else {
      toast({ description: isEditing ? 'Obra atualizada com sucesso!' : 'Obra cadastrada com sucesso!' })
      navigate('/obras')
    }
  }

  const inputClass = 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]'
  const labelClass = 'text-[var(--color-text)] text-sm font-medium'
  const errorClass = 'text-xs text-[var(--color-danger)] mt-1'

  if (loadingObra) {
    return <div className="text-[var(--color-muted)] text-sm">Carregando obra...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/obras')}
          className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isEditing ? 'Editar obra' : 'Nova obra'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seção 1: Dados do Contrato */}
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="text-base text-[var(--color-text)]">Dados do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className={labelClass}>Nome da obra *</Label>
              <Input {...form.register('nome')} className={inputClass} placeholder="Ex: Pavimentação Rua A" />
              {form.formState.errors.nome && <p className={errorClass}>{form.formState.errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelClass}>Número da licitação</Label>
                <Input {...form.register('numero_licitacao')} className={inputClass} placeholder="Ex: 001/2024" />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={v => form.setValue('status', v as ObraStatus)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="paralisada">Paralisada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Órgão contratante *</Label>
              <Input {...form.register('orgao_contratante')} className={inputClass} />
              {form.formState.errors.orgao_contratante && (
                <p className={errorClass}>{form.formState.errors.orgao_contratante.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Objeto do contrato</Label>
              <textarea
                {...form.register('objeto')}
                rows={3}
                className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] ${inputClass}`}
                placeholder="Descrição do objeto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelClass}>Data de assinatura *</Label>
                <Input type="date" {...form.register('data_assinatura')} className={inputClass} />
                {form.formState.errors.data_assinatura && (
                  <p className={errorClass}>{form.formState.errors.data_assinatura.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Prazo de término</Label>
                <Input type="date" {...form.register('prazo_termino')} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelClass}>Valor total do contrato (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('valor_total')}
                  className={inputClass}
                  placeholder="0,00"
                />
                {form.formState.errors.valor_total && (
                  <p className={errorClass}>{form.formState.errors.valor_total.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>ART / RRT</Label>
                <Input {...form.register('art_rrt')} className={inputClass} placeholder="Número da ART" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Endereço da obra</Label>
              <Input {...form.register('endereco')} className={inputClass} />
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Retenções */}
        <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="text-base text-[var(--color-text)]">Retenções e Impostos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-muted)]">
              Valores pré-preenchidos conforme configurações. Altere só se este contrato tiver alíquotas diferentes.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  { name: 'aliquota_caucao', label: 'Caução %' },
                  { name: 'aliquota_iss', label: 'ISS %' },
                  { name: 'aliquota_inss', label: 'INSS %' },
                  { name: 'aliquota_irrf', label: 'IRRF %' },
                ] as const
              ).map(({ name, label }) => (
                <div key={name} className="space-y-1.5">
                  <Label className={labelClass}>{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...form.register(name)}
                    className={inputClass}
                  />
                  {form.formState.errors[name] && <p className={errorClass}>Valor entre 0 e 100</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white"
          >
            {submitting ? 'Salvando...' : 'Salvar obra'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/obras')}
            className="border-[var(--color-border)] text-[var(--color-text)]"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
