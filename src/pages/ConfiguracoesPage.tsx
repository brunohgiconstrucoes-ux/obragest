import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import type { RegimeTributario } from '@/types'

const perfilPJSchema = z.object({
  razao_social: z.string().min(1, 'Obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  endereco_pj: z.string(),
  regime_tributario: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', '']),
  responsavel_tecnico: z.string(),
  crea_cau: z.string(),
})

const perfilPFSchema = z.object({
  nome_completo: z.string().min(1, 'Obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  endereco_pf: z.string(),
})

const aliquotasSchema = z.object({
  aliquota_caucao: z.coerce.number().min(0).max(100),
  aliquota_iss: z.coerce.number().min(0).max(100),
  aliquota_inss: z.coerce.number().min(0).max(100),
  aliquota_irrf: z.coerce.number().min(0).max(100),
})

type PJFormValues = z.infer<typeof perfilPJSchema>
type PFFormValues = z.infer<typeof perfilPFSchema>
type AliquotasFormValues = z.infer<typeof aliquotasSchema>

export function ConfiguracoesPage() {
  const { user, perfil } = useAuth()
  const { toast } = useToast()

  // --- Aba PJ ---
  const pjForm = useForm<PJFormValues>({
    resolver: zodResolver(perfilPJSchema),
    defaultValues: {
      razao_social: '',
      cnpj: '',
      endereco_pj: '',
      regime_tributario: '',
      responsavel_tecnico: '',
      crea_cau: '',
    },
  })

  // --- Aba PF ---
  const pfForm = useForm<PFFormValues>({
    resolver: zodResolver(perfilPFSchema),
    defaultValues: { nome_completo: '', cpf: '', endereco_pf: '' },
  })

  // --- Aba Alíquotas ---
  const aliquotasForm = useForm<AliquotasFormValues>({
    resolver: zodResolver(aliquotasSchema),
    defaultValues: { aliquota_caucao: 5, aliquota_iss: 2, aliquota_inss: 11, aliquota_irrf: 1.5 },
  })

  useEffect(() => {
    if (!perfil) return
    pjForm.reset({
      razao_social: perfil.razao_social ?? '',
      cnpj: perfil.cnpj ?? '',
      endereco_pj: perfil.endereco_pj ?? '',
      regime_tributario: (perfil.regime_tributario ?? '') as RegimeTributario | '',
      responsavel_tecnico: perfil.responsavel_tecnico ?? '',
      crea_cau: perfil.crea_cau ?? '',
    })
    pfForm.reset({
      nome_completo: perfil.nome_completo ?? '',
      cpf: perfil.cpf ?? '',
      endereco_pf: perfil.endereco_pf ?? '',
    })
    aliquotasForm.reset({
      aliquota_caucao: perfil.aliquota_caucao,
      aliquota_iss: perfil.aliquota_iss,
      aliquota_inss: perfil.aliquota_inss,
      aliquota_irrf: perfil.aliquota_irrf,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  async function salvarPJ(data: PJFormValues) {
    if (!user) return
    const { error } = await supabase
      .from('perfis')
      .update({
        razao_social: data.razao_social,
        cnpj: data.cnpj,
        endereco_pj: data.endereco_pj,
        regime_tributario: data.regime_tributario || null,
        responsavel_tecnico: data.responsavel_tecnico,
        crea_cau: data.crea_cau,
      })
      .eq('id', user.id)
    if (error) toast({ description: 'Erro ao salvar dados PJ.', variant: 'destructive' })
    else toast({ description: 'Dados PJ salvos com sucesso!' })
  }

  async function salvarPF(data: PFFormValues) {
    if (!user) return
    const { error } = await supabase
      .from('perfis')
      .update({
        nome_completo: data.nome_completo,
        cpf: data.cpf,
        endereco_pf: data.endereco_pf,
      })
      .eq('id', user.id)
    if (error) toast({ description: 'Erro ao salvar dados PF.', variant: 'destructive' })
    else toast({ description: 'Dados pessoais salvos!' })
  }

  async function salvarAliquotas(data: AliquotasFormValues) {
    if (!user) return
    const { error } = await supabase
      .from('perfis')
      .update({
        aliquota_caucao: data.aliquota_caucao,
        aliquota_iss: data.aliquota_iss,
        aliquota_inss: data.aliquota_inss,
        aliquota_irrf: data.aliquota_irrf,
      })
      .eq('id', user.id)
    if (error) toast({ description: 'Erro ao salvar alíquotas.', variant: 'destructive' })
    else toast({ description: 'Alíquotas padrão salvas!' })
  }

  // --- Aba Identidade Visual ---
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(perfil?.logo_url ?? null)

  useEffect(() => {
    setLogoPreview(perfil?.logo_url ?? null)
  }, [perfil?.logo_url])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) {
      toast({ description: 'Imagem deve ter no máximo 2MB.', variant: 'destructive' })
      return
    }
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      toast({ description: 'Erro ao fazer upload do logo.', variant: 'destructive' })
      setLogoUploading(false)
      return
    }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const url = data.publicUrl
    const { error: updateError } = await supabase
      .from('perfis')
      .update({ logo_url: url })
      .eq('id', user.id)
    if (updateError) {
      toast({ description: 'Erro ao salvar URL do logo.', variant: 'destructive' })
    } else {
      setLogoPreview(url)
      toast({ description: 'Logo salvo com sucesso!' })
    }
    setLogoUploading(false)
  }

  async function handleLogoRemove() {
    if (!user) return
    await supabase.from('perfis').update({ logo_url: null }).eq('id', user.id)
    setLogoPreview(null)
    toast({ description: 'Logo removido.' })
  }

  const inputClass = 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]'
  const labelClass = 'text-[var(--color-text)] text-sm font-medium'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Configurações</h1>

      <Tabs defaultValue="pj">
        <TabsList className="bg-[var(--color-surface-2)] mb-6">
          <TabsTrigger value="pj">Dados PJ</TabsTrigger>
          <TabsTrigger value="pf">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="aliquotas">Alíquotas Padrão</TabsTrigger>
          <TabsTrigger value="identidade">Identidade Visual</TabsTrigger>
        </TabsList>

        {/* Aba PJ */}
        <TabsContent value="pj">
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Dados da Empresa (PJ)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={pjForm.handleSubmit(salvarPJ)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Razão Social *</Label>
                  <Input {...pjForm.register('razao_social')} className={inputClass} />
                  {pjForm.formState.errors.razao_social && (
                    <p className="text-xs text-[var(--color-danger)]">{pjForm.formState.errors.razao_social.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>CNPJ *</Label>
                  <Input {...pjForm.register('cnpj')} placeholder="00.000.000/0000-00" className={inputClass} />
                  {pjForm.formState.errors.cnpj && (
                    <p className="text-xs text-[var(--color-danger)]">{pjForm.formState.errors.cnpj.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Endereço</Label>
                  <Input {...pjForm.register('endereco_pj')} className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Regime Tributário</Label>
                  <Select
                    value={pjForm.watch('regime_tributario')}
                    onValueChange={v => pjForm.setValue('regime_tributario', v as RegimeTributario | '')}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                      <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Responsável Técnico</Label>
                  <Input {...pjForm.register('responsavel_tecnico')} className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>CREA / CAU</Label>
                  <Input {...pjForm.register('crea_cau')} className={inputClass} />
                </div>

                <Button type="submit" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar dados PJ
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba PF */}
        <TabsContent value="pf">
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Dados Pessoais do Dono</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={pfForm.handleSubmit(salvarPF)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Nome Completo *</Label>
                  <Input {...pfForm.register('nome_completo')} className={inputClass} />
                  {pfForm.formState.errors.nome_completo && (
                    <p className="text-xs text-[var(--color-danger)]">{pfForm.formState.errors.nome_completo.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>CPF *</Label>
                  <Input {...pfForm.register('cpf')} placeholder="000.000.000-00" className={inputClass} />
                  {pfForm.formState.errors.cpf && (
                    <p className="text-xs text-[var(--color-danger)]">{pfForm.formState.errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Endereço Pessoal</Label>
                  <Input {...pfForm.register('endereco_pf')} className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>E-mail de acesso</Label>
                  <Input value={user?.email ?? ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                  <p className="text-xs text-[var(--color-muted)]">Para alterar o e-mail, use as configurações do Supabase.</p>
                </div>

                <Button type="submit" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar dados pessoais
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Alíquotas */}
        <TabsContent value="aliquotas">
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Alíquotas Padrão</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={aliquotasForm.handleSubmit(salvarAliquotas)} className="space-y-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Esses valores serão pré-preenchidos em cada nova obra. Você pode alterar por obra se necessário.
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
                        {...aliquotasForm.register(name)}
                        className={inputClass}
                      />
                      {aliquotasForm.formState.errors[name] && (
                        <p className="text-xs text-[var(--color-danger)]">Valor deve ser entre 0 e 100</p>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar alíquotas
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Identidade Visual */}
        <TabsContent value="identidade">
          <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Logo da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--color-muted)]">
                Aparece na barra lateral e no cabeçalho dos PDFs gerados (boletins, RPAs, recibos).
                Formatos aceitos: PNG, SVG, JPG. Tamanho máximo: 2MB.
              </p>
              {logoPreview && (
                <div className="border border-[var(--color-border)] rounded-md p-4 flex items-center gap-4 bg-[var(--color-surface-2)]">
                  <img
                    src={logoPreview}
                    alt="Logo da empresa"
                    className="h-12 object-contain max-w-[200px]"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogoRemove}
                    className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                  >
                    Remover logo
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className={labelClass}>
                  {logoPreview ? 'Substituir logo' : 'Selecionar logo'}
                </Label>
                <Input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className={inputClass}
                />
                {logoUploading && (
                  <p className="text-xs text-[var(--color-muted)]">Enviando…</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
