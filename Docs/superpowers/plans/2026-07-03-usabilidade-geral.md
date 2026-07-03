# Melhorias de Usabilidade Geral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar logo da empresa, dashboard expandido, formulários mais ágeis e fluxo de caixa visual conforme spec `2026-07-03-usabilidade-geral.md`.

**Architecture:** Melhorias incrementais em componentes React existentes. Sem novos módulos de roteamento ou contextos — apenas extensão de páginas e componentes já existentes. Logo usa Supabase Storage (bucket `logos`). Fluxo de caixa unificado mantém as duas rotas existentes mas passa a renderizar com abas.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, jsPDF + jspdf-autotable, Supabase JS v2, React Hook Form + Zod, date-fns

## Global Constraints

- Toda query ao Supabase inclui `.eq('user_id', user.id)` — nunca omitir
- Valores monetários armazenados em centavos (integer); exibir via `<ValorMonetario />` ou `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Todo lançamento novo nasce com `status = 'previsto'` — inline confirm só atualiza registros existentes
- Escopo de lançamento: `'pj_obra' | 'pj_admin' | 'pf'` — nunca misturar
- Verificar TypeScript após cada tarefa: `npx tsc --noEmit`
- Commit após cada tarefa concluída

---

## Mapa de arquivos

| Arquivo | Tarefa |
|---|---|
| `src/pages/ConfiguracoesPage.tsx` | Task 1 |
| `src/components/layout/Sidebar.tsx` | Task 2, Task 9 |
| `src/lib/pdf/boletim.ts` | Task 3 |
| `src/lib/pdf/rpa.ts` | Task 3 |
| `src/lib/pdf/recibo-avulso.ts` | Task 3 |
| `src/pages/DashboardPage.tsx` | Tasks 4, 5 |
| `src/pages/ObraDetailPage.tsx` | Tasks 6, 7 |
| `src/pages/AvulsoFormPage.tsx` | Task 8 |
| `src/pages/RpaFormPage.tsx` | Task 8 |
| `src/pages/FluxoCaixaPJPage.tsx` | Tasks 9, 10 |
| `src/pages/FluxoCaixaPFPage.tsx` | Tasks 9, 10 |

---

## Task 1: Upload de logo em ConfiguracoesPage

**Files:**
- Modify: `src/pages/ConfiguracoesPage.tsx`

**Interfaces:**
- Produces: `perfil.logo_url` salvo no Supabase Storage e em `perfis.logo_url`
- Consumed by: Task 2 (Sidebar), Task 3 (PDFs)

- [ ] **Step 1: Adicionar aba "Identidade Visual" ao TabsList**

Em `ConfiguracoesPage.tsx`, localizar o `<TabsList>` existente e adicionar a nova aba:

```tsx
<TabsList className="bg-[var(--color-surface-2)] mb-6">
  <TabsTrigger value="pj">Dados PJ</TabsTrigger>
  <TabsTrigger value="pf">Dados Pessoais</TabsTrigger>
  <TabsTrigger value="aliquotas">Alíquotas Padrão</TabsTrigger>
  <TabsTrigger value="identidade">Identidade Visual</TabsTrigger>
</TabsList>
```

- [ ] **Step 2: Adicionar estado e handlers de upload**

Logo abaixo dos imports existentes, adicionar o state e a função de upload:

```tsx
// dentro de ConfiguracoesPage(), após as declarações de form existentes:
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
```

- [ ] **Step 3: Adicionar o conteúdo da aba Identidade Visual**

Após o `</TabsContent>` da aba `aliquotas`, inserir:

```tsx
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
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros. Se `useState` não estiver importado, adicionar ao import do React.

- [ ] **Step 5: Testar manualmente**
  - Navegar para `/configuracoes` → aba "Identidade Visual"
  - Fazer upload de uma imagem PNG
  - Verificar que preview aparece
  - Verificar que o botão "Remover logo" funciona

- [ ] **Step 6: Commit**

```bash
git add src/pages/ConfiguracoesPage.tsx
git commit -m "feat: upload de logo da empresa em Configurações"
```

---

## Task 2: Logo na Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `perfil.logo_url` via `useAuth()` hook (já disponível)

- [ ] **Step 1: Substituir bloco de logo estático por condicional**

Localizar o bloco atual (linhas 36–41 de `Sidebar.tsx`):

```tsx
{/* Logo */}
<div className="p-6 pb-4">
  <div className="flex items-center gap-2">
    <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
    <span className="font-bold text-lg text-[var(--color-text)] tracking-tight">ObraGest</span>
  </div>
</div>
```

Substituir por:

```tsx
{/* Logo */}
<div className="p-6 pb-4">
  {perfil?.logo_url ? (
    <img
      src={perfil.logo_url}
      alt="Logo da empresa"
      className="h-9 object-contain max-w-[140px]"
    />
  ) : (
    <div className="flex items-center gap-2">
      <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
      <span className="font-bold text-lg text-[var(--color-text)] tracking-tight">ObraGest</span>
    </div>
  )}
</div>
```

- [ ] **Step 2: Garantir que `perfil` está desestruturado no hook**

Verificar que a linha do hook já inclui `perfil`:

```tsx
const { perfil, signOut } = useAuth()
```

Se não tiver `perfil`, adicionar.

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Testar manualmente**
  - Com logo cadastrado: verificar que imagem aparece na sidebar
  - Remover logo nas configurações: verificar que volta para ícone + "ObraGest"

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: exibir logo da empresa na sidebar"
```

---

## Task 3: Logo nos PDFs

**Files:**
- Modify: `src/lib/pdf/boletim.ts`
- Modify: `src/lib/pdf/rpa.ts`
- Modify: `src/lib/pdf/recibo-avulso.ts`

**Interfaces:**
- Consumes: `perfil.logo_url` (já existe como parâmetro `perfil: Perfil | null` nas três funções)

- [ ] **Step 1: Criar helper para carregar imagem como base64**

Criar arquivo `src/lib/pdf/logoHelper.ts`:

```ts
export async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Adicionar logo ao boletim.ts**

A função `gerarBoletimPDF` precisa virar `async`. Localizar o cabeçalho (linhas 29–51) e substituir o bloco completo da empresa:

```ts
export async function gerarBoletimPDF(
  obra: Obra,
  medicao: Medicao,
  itens: MedicaoItem[],
  perfil: Perfil | null
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const marginL = 14
  const marginR = 14
  let y = 14

  // ── Cabeçalho ────────────────────────────────────────────────────────────────
  if (perfil?.logo_url) {
    const base64 = await fetchLogoBase64(perfil.logo_url)
    if (base64) {
      doc.addImage(base64, 'PNG', marginL, y, 40, 13)
      y += 16
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(perfil?.razao_social ?? 'ObraGest', marginL, y)
    y += 5
  }

  if (perfil?.cnpj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`CNPJ: ${perfil.cnpj}`, marginL, y)
    y += 4
  }
  if (perfil?.endereco_pj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(perfil.endereco_pj, marginL, y)
    y += 4
  }
  // ... resto da função continua igual
```

Adicionar o import no topo:
```ts
import { fetchLogoBase64 } from './logoHelper'
```

- [ ] **Step 3: Adicionar logo ao rpa.ts**

Mesma abordagem — virar `async`, adicionar import e bloco condicional de logo no cabeçalho, substituindo o bloco de empresa atual (linhas 24–39):

```ts
import { fetchLogoBase64 } from './logoHelper'

export async function gerarRpaPDF(obra: Obra, mdo: MaoDeObra, perfil: Perfil | null): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const marginL = 14
  const marginR = 14
  let y = 14

  if (perfil?.logo_url) {
    const base64 = await fetchLogoBase64(perfil.logo_url)
    if (base64) {
      doc.addImage(base64, 'PNG', marginL, y, 40, 13)
      y += 16
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(perfil?.razao_social ?? 'ObraGest', marginL, y)
    y += 5
  }

  if (perfil?.cnpj) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`CNPJ: ${perfil.cnpj}`, marginL, y)
    y += 4
  }
  // ... resto continua igual
```

- [ ] **Step 4: Aplicar o mesmo padrão em recibo-avulso.ts**

Mesma lógica: `async`, import de `fetchLogoBase64`, bloco condicional no cabeçalho.

- [ ] **Step 5: Atualizar chamadas nos componentes**

Buscar todos os lugares que chamam `gerarBoletimPDF`, `gerarRpaPDF` e `gerarReciboAvulsoPDF` e adicionar `await`:

```bash
grep -r "gerarBoletimPDF\|gerarRpaPDF\|gerarReciboAvulsoPDF" src --include="*.tsx" -l
```

Para cada arquivo encontrado, verificar se a função chamadora já é `async` e adicionar `await` antes da chamada.

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Testar manualmente**
  - Com logo cadastrado: gerar um boletim e verificar que o logo aparece no cabeçalho do PDF
  - Sem logo: verificar que o PDF usa razão social como texto (comportamento anterior)

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdf/logoHelper.ts src/lib/pdf/boletim.ts src/lib/pdf/rpa.ts src/lib/pdf/recibo-avulso.ts
git commit -m "feat: logo da empresa no cabeçalho dos PDFs (boletim, RPA, recibo)"
```

---

## Task 4: Dashboard — saldo com detalhes do mês + gastos do mês

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Produces: dois novos blocos visuais no dashboard (entradas/saídas do mês, gastos por categoria)

- [ ] **Step 1: Adicionar queries de gastos do mês ao `loadDashboard`**

Dentro de `loadDashboard`, adicionar ao `Promise.all` existente mais duas queries e os states correspondentes:

```tsx
// Adicionar states no topo do componente:
const [entradasMesPJ, setEntradasMesPJ] = useState(0)
const [saidasMesPJ, setSaidasMesPJ] = useState(0)
const [entradasMesPF, setEntradasMesPF] = useState(0)
const [saidasMesPF, setSaidasMesPF] = useState(0)
const [gastoMateriais, setGastoMateriais] = useState(0)
const [gastoMaoObra, setGastoMaoObra] = useState(0)
const [gastoOutros, setGastoOutros] = useState(0)
const [gastoMateriaisAnterior, setGastoMateriaisAnterior] = useState(0)
const [gastoMaoObraAnterior, setGastoMaoObraAnterior] = useState(0)
const [gastoOutrosAnterior, setGastoOutrosAnterior] = useState(0)
```

No `loadDashboard`, após calcular saldos PJ/PF existentes, adicionar:

```tsx
const hoje = new Date()
const mesAtual = hoje.getMonth() + 1
const anoAtual = hoje.getFullYear()
const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

const primeiroDiaMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
const ultimoDiaMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(new Date(anoAtual, mesAtual, 0).getDate()).padStart(2, '0')}`
const primeiroDiaMesAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`
const ultimoDiaMesAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(new Date(anoAnterior, mesAnterior, 0).getDate()).padStart(2, '0')}`

const [fluxoMesRes, fluxoMesAntRes] = await Promise.all([
  supabase
    .from('fluxo_caixa')
    .select('tipo, escopo, origem, valor')
    .eq('user_id', user.id)
    .eq('status', 'realizado')
    .gte('data_competencia', primeiroDiaMes)
    .lte('data_competencia', ultimoDiaMes),
  supabase
    .from('fluxo_caixa')
    .select('tipo, escopo, origem, valor')
    .eq('user_id', user.id)
    .eq('status', 'realizado')
    .gte('data_competencia', primeiroDiaMesAnt)
    .lte('data_competencia', ultimoDiaMesAnt),
])

const fluxoMes = (fluxoMesRes.data ?? []) as FluxoCaixa[]
const fluxoMesAnt = (fluxoMesAntRes.data ?? []) as FluxoCaixa[]

setEntradasMesPJ(fluxoMes.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'entrada').reduce((a,f) => a + f.valor, 0))
setSaidasMesPJ(fluxoMes.filter(f => ['pj_obra','pj_admin'].includes(f.escopo) && f.tipo === 'saida').reduce((a,f) => a + f.valor, 0))
setEntradasMesPF(fluxoMes.filter(f => f.escopo === 'pf' && f.tipo === 'entrada').reduce((a,f) => a + f.valor, 0))
setSaidasMesPF(fluxoMes.filter(f => f.escopo === 'pf' && f.tipo === 'saida').reduce((a,f) => a + f.valor, 0))

setGastoMateriais(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'material').reduce((a,f) => a + f.valor, 0))
setGastoMaoObra(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'mao_de_obra').reduce((a,f) => a + f.valor, 0))
setGastoOutros(fluxoMes.filter(f => f.tipo === 'saida' && f.origem === 'manual').reduce((a,f) => a + f.valor, 0))
setGastoMateriaisAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'material').reduce((a,f) => a + f.valor, 0))
setGastoMaoObraAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'mao_de_obra').reduce((a,f) => a + f.valor, 0))
setGastoOutrosAnterior(fluxoMesAnt.filter(f => f.tipo === 'saida' && f.origem === 'manual').reduce((a,f) => a + f.valor, 0))
```

- [ ] **Step 2: Atualizar `SaldoCard` para mostrar entradas/saídas do mês**

Alterar a interface do componente `SaldoCard`:

```tsx
function SaldoCard({ label, valor, cor, entradasMes, saidasMes }: {
  label: string
  valor: number
  cor: string
  entradasMes: number
  saidasMes: number
}) {
  // ... código existente ...

  // Adicionar dentro do CardContent, após o valor principal:
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--color-muted)] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          <ValorMonetario value={valor} className={`text-2xl font-bold ${colorClass}`} />
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {positivo ? 'Saldo positivo' : 'Saldo negativo'} — lançamentos realizados
        </p>
        <div className="flex gap-3 mt-2 text-xs text-[var(--color-muted)]">
          <span className="text-[var(--color-success)]">↑ <ValorMonetario value={entradasMes} className="inline" /></span>
          <span className="text-[var(--color-danger)]">↓ <ValorMonetario value={saidasMes} className="inline" /></span>
          <span>em {mesAtual}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

Atualizar as chamadas de `SaldoCard` no JSX:

```tsx
<SaldoCard label="Saldo PJ" valor={saldoPJ} cor="var(--color-pj)" entradasMes={entradasMesPJ} saidasMes={saidasMesPJ} />
<SaldoCard label="Saldo PF" valor={saldoPF} cor="var(--color-pf)" entradasMes={entradasMesPF} saidasMes={saidasMesPF} />
```

- [ ] **Step 3: Adicionar componente `GastosMesGrid`**

Após os `SaldoCard`s no JSX do `DashboardPage`, inserir:

```tsx
<section>
  <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">Gastos do mês</h2>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <GastoMesCard label="Materiais" valor={gastoMateriais} valorAnterior={gastoMateriaisAnterior} />
    <GastoMesCard label="Mão de Obra" valor={gastoMaoObra} valorAnterior={gastoMaoObraAnterior} />
    <GastoMesCard label="Outros" valor={gastoOutros} valorAnterior={gastoOutrosAnterior} />
  </div>
</section>
```

Adicionar o sub-componente ao final do arquivo:

```tsx
function GastoMesCard({ label, valor, valorAnterior }: { label: string; valor: number; valorAnterior: number }) {
  const pct = valorAnterior > 0 ? Math.min((valor / valorAnterior) * 100, 100) : 0
  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-[var(--color-muted)]">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ValorMonetario value={valor} className="text-lg font-bold text-[var(--color-text)]" />
        {valorAnterior > 0 && (
          <>
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-[var(--color-muted)]">
              {pct.toFixed(0)}% vs mês anterior
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Testar manualmente**
  - Dashboard deve mostrar entradas/saídas do mês nos cards de saldo
  - 3 cards de gastos devem aparecer abaixo dos saldos

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: dashboard — detalhes do mês nos saldos e gastos por categoria"
```

---

## Task 5: Dashboard — próximos vencimentos e dias restantes nas obras

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `fluxo_caixa` com `status='previsto'` e `data_prevista` nos próximos 15 dias
- Consumes: `obra.data_assinatura`, `obra.prazo_dias` (já carregados em `obras`)

- [ ] **Step 1: Adicionar query de próximos vencimentos no `loadDashboard`**

```tsx
// Adicionar state:
const [proximosVencimentos, setProximosVencimentos] = useState<FluxoCaixaComObra[]>([])

// Dentro de loadDashboard, adicionar ao Promise.all:
const hoje = new Date()
const em15dias = new Date(hoje)
em15dias.setDate(em15dias.getDate() + 15)
const hojeStr = hoje.toISOString().split('T')[0]
const em15diasStr = em15dias.toISOString().split('T')[0]

const vencimentosRes = await supabase
  .from('fluxo_caixa')
  .select('*, obras(nome)')
  .eq('user_id', user.id)
  .eq('status', 'previsto')
  .gte('data_prevista', hojeStr)
  .lte('data_prevista', em15diasStr)
  .order('data_prevista', { ascending: true })
  .limit(5)

setProximosVencimentos((vencimentosRes.data ?? []) as FluxoCaixaComObra[])
```

Adicionar o tipo que a query retorna (se não existir):
```tsx
type FluxoCaixaComObra = FluxoCaixa & { obras: { nome: string } | null }
```

- [ ] **Step 2: Adicionar bloco de próximos vencimentos no JSX**

Após a seção de obras em andamento e antes das medições pendentes:

```tsx
{proximosVencimentos.length > 0 && (
  <section>
    <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Próximos vencimentos</h2>
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {proximosVencimentos.map((v) => {
            const dias = Math.ceil(
              (new Date(v.data_prevista + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000
            )
            const badgeColor = dias > 7
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
              : dias >= 3
              ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
              : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
            return (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-[var(--color-text)] truncate">{v.descricao}</span>
                  {v.obras?.nome && (
                    <span className="text-xs text-[var(--color-muted)]">{v.obras.nome}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <ValorMonetario value={v.valor} className="text-sm font-semibold text-[var(--color-text)]" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                    {dias === 0 ? 'hoje' : `${dias}d`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  </section>
)}
```

- [ ] **Step 3: Adicionar dias restantes no `ObraKpiCard`**

Dentro do componente `ObraKpiCard`, calcular e exibir dias restantes:

```tsx
function ObraKpiCard({ obra }: { obra: ObraComKpis }) {
  const percentual = obra.percentual_executado ?? 0
  const margem = obra.margem_real ?? 0
  const margemPositiva = margem >= 0

  // Calcular dias restantes
  let diasRestantes: number | null = null
  if (obra.data_assinatura && obra.prazo_dias) {
    const dataFim = new Date(obra.data_assinatura + 'T00:00:00')
    dataFim.setDate(dataFim.getDate() + obra.prazo_dias)
    diasRestantes = Math.ceil((dataFim.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
  }

  const prazoBadgeColor = diasRestantes === null
    ? ''
    : diasRestantes > 30
    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
    : diasRestantes > 10
    ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
    : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'

  return (
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-[var(--color-text)] leading-snug line-clamp-2">
            {obra.nome}
          </CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={obra.status} />
            {diasRestantes !== null && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${prazoBadgeColor}`}>
                {diasRestantes < 0 ? 'Prazo vencido' : `${diasRestantes}d prazo`}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-[var(--color-muted)] truncate">{obra.orgao_contratante}</p>
      </CardHeader>
      {/* ... resto do card igual ao atual ... */}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Testar manualmente**
  - Cards de obra devem mostrar badge de dias restantes no prazo
  - Próximos vencimentos devem aparecer se houver lançamentos previstos nos próximos 15 dias

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: dashboard — próximos vencimentos e dias restantes no prazo das obras"
```

---

## Task 6: Materiais — quick-add inline em ObraDetailPage

**Files:**
- Modify: `src/pages/ObraDetailPage.tsx`

**Interfaces:**
- Produces: formulário de entrada rápida de material sem abrir dialog

- [ ] **Step 1: Adicionar schema e state para quick-add**

No topo de `ObraDetailPage.tsx`, adicionar o schema de quick-add:

```tsx
const quickMaterialSchema = z.object({
  fornecedor: z.string().min(1, 'Obrigatório'),
  item: z.string().min(1, 'Obrigatório'),
  valor_total_reais: z.coerce.number().positive('Obrigatório'),
  data_compra: z.string().min(1, 'Obrigatório'),
})
type QuickMaterialValues = z.infer<typeof quickMaterialSchema>
```

- [ ] **Step 2: Adicionar hook de formulário quick-add dentro do componente**

Dentro de `ObraDetailPage` (ou no sub-componente da aba Materiais se existir), adicionar:

```tsx
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
  const { error } = await supabase.from('materiais').insert({
    obra_id: obra.id,
    user_id: user.id,
    fornecedor: data.fornecedor,
    item: data.item,
    categoria: 'outros',
    valor_total: valorCentavos,
    data_compra: data.data_compra,
    forma_pagamento: 'avista',
  })
  if (error) {
    toast({ description: 'Erro ao salvar material.', variant: 'destructive' })
  } else {
    toast({ description: 'Material adicionado!' })
    quickForm.reset({ fornecedor: '', item: '', valor_total_reais: 0, data_compra: todayStr() })
    // recarregar lista de materiais
    await loadMateriais()
  }
  setQuickSaving(false)
}
```

- [ ] **Step 3: Inserir UI de quick-add no topo da aba Materiais**

Localizar onde a lista de materiais é renderizada (aba "Materiais" em `ObraDetailPage`) e adicionar acima da tabela:

```tsx
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
    {/* Campos opcionais */}
    {quickExpanded && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
        {/* categoria, quantidade, unidade, forma_pagamento, observacao */}
        {/* usar os campos do materialSchema existente */}
      </div>
    )}
  </form>
</div>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Testar manualmente**
  - Abrir aba Materiais em uma obra
  - Preencher os 4 campos e clicar "+ Adicionar"
  - Verificar que o material aparece na lista sem recarregar a página
  - Verificar que categoria salva como `outros` e forma_pagamento como `avista`

- [ ] **Step 6: Commit**

```bash
git add src/pages/ObraDetailPage.tsx
git commit -m "feat: quick-add de material inline na aba Materiais da obra"
```

---

## Task 7: Avulso visual + RPA contracheque

**Files:**
- Modify: `src/pages/AvulsoFormPage.tsx`
- Modify: `src/pages/RpaFormPage.tsx`

**Interfaces:**
- Consumes: valores calculados via `useWatch` (já implementado em ambos)

- [ ] **Step 1: Avulso — painel de resumo e sugestões de função**

Em `AvulsoFormPage.tsx`, localizar onde o formulário é renderizado e ajustar o layout para 2 colunas em telas médias+:

Substituir o wrapper do conteúdo principal por:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Coluna esquerda: formulário existente */}
  <div className="space-y-4">
    {/* ... campos existentes ... */}
    
    {/* Campo funcao com sugestões */}
    <div className="space-y-1.5">
      <Label className={labelClass}>Função *</Label>
      <Input
        {...form.register('funcao')}
        list="funcoes-sugeridas"
        placeholder="Ex: Pedreiro"
        className={inputClass}
      />
      <datalist id="funcoes-sugeridas">
        {['Pedreiro', 'Servente', 'Eletricista', 'Encanador', 'Pintor', 'Carpinteiro', 'Armador', 'Mestre de obras'].map(f => (
          <option key={f} value={f} />
        ))}
      </datalist>
      {errors.funcao && <p className="text-xs text-[var(--color-danger)]">{errors.funcao.message}</p>}
    </div>
  </div>

  {/* Coluna direita: resumo em tempo real */}
  <div className="md:sticky md:top-6">
    <Card className="bg-[var(--color-surface-2)] border-[var(--color-border)]">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Resumo do pagamento</p>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-muted)]">Valor diária</span>
          <ValorMonetario value={valorDiariaCalculado} className="text-[var(--color-text)]" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-muted)]">Nº de dias</span>
          <span className="text-[var(--color-text)]">{quantidadeDiasWatch || 0}</span>
        </div>
        <div className="border-t border-[var(--color-border)] pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[var(--color-text)]">Total a pagar</span>
            <ValorMonetario value={totalCalculado} className="text-2xl font-bold text-[var(--color-success)]" />
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-1">Sem retenções (avulso/diarista)</p>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

Os valores `valorDiariaCalculado`, `quantidadeDiasWatch` e `totalCalculado` devem ser derivados via `useWatch`:

```tsx
const valorDiariaStr = useWatch({ control, name: 'valor_diaria_reais' })
const quantidadeDiasWatch = useWatch({ control, name: 'quantidade_dias' })
const valorDiariaCalculado = Math.round((parseFloat(String(valorDiariaStr).replace(/\./g,'').replace(',','.')) || 0) * 100)
const totalCalculado = valorDiariaCalculado * (parseInt(String(quantidadeDiasWatch)) || 0)
```

- [ ] **Step 2: RPA — tabela de retenções estilo contracheque**

Em `RpaFormPage.tsx`, localizar onde as retenções são calculadas e exibidas. Calcular:

```tsx
const valorBrutoCentavos = Math.round((parseFloat(valorBrutoStr?.replace(/\./g,'').replace(',','.') ?? '0') || 0) * 100)

// usar alíquotas do perfil ou da obra
const inssAliq = perfil?.aliquota_inss ?? 11
const issAliq = perfil?.aliquota_iss ?? 2
const irrfAliq = perfil?.aliquota_irrf ?? 1.5

const inss = Math.round(valorBrutoCentavos * inssAliq / 100)
const iss = Math.round(valorBrutoCentavos * issAliq / 100)
const irrf = Math.round(valorBrutoCentavos * irrfAliq / 100)
const totalRetencoes = inss + iss + irrf
const valorLiquido = valorBrutoCentavos - totalRetencoes
```

Substituir a exibição atual de retenções por:

```tsx
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
            <ValorMonetario value={inss} className="" />
          </div>
          <div className="flex justify-between text-[var(--color-danger)]">
            <span>(−) ISS {issAliq}%</span>
            <ValorMonetario value={iss} className="" />
          </div>
          <div className="flex justify-between text-[var(--color-danger)]">
            <span>(−) IRRF {irrfAliq}%</span>
            <ValorMonetario value={irrf} className="" />
          </div>
        </div>
        <div className="border-t border-[var(--color-border)] pt-2 flex justify-between items-center">
          <span className="font-bold text-[var(--color-text)]">Valor líquido a pagar</span>
          <ValorMonetario value={valorLiquido} className="text-xl font-bold text-[var(--color-success)]" />
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Testar manualmente**
  - Avulso: digitar valor diária e nº de dias → total atualiza em tempo real na coluna direita
  - RPA: digitar valor bruto → tabela de retenções aparece com INSS/ISS/IRRF e valor líquido

- [ ] **Step 5: Commit**

```bash
git add src/pages/AvulsoFormPage.tsx src/pages/RpaFormPage.tsx
git commit -m "feat: avulso com painel de resumo visual e RPA com demonstrativo de retenções"
```

---

## Task 8: Fluxo de Caixa — abas PJ/PF, filtro de período e cards de resumo

**Files:**
- Modify: `src/pages/FluxoCaixaPJPage.tsx`
- Modify: `src/pages/FluxoCaixaPFPage.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces: filtro de período via query param `?mes=YYYY-MM`, cards de resumo, abas PJ/PF

- [ ] **Step 1: Adicionar query param de período em FluxoCaixaPJPage**

No topo de `FluxoCaixaPJPage`, importar e usar `useSearchParams`:

```tsx
import { useSearchParams } from 'react-router-dom'

// dentro do componente, substituir os estados mes/ano existentes:
const [searchParams, setSearchParams] = useSearchParams()
const hoje = new Date()
const paramMes = searchParams.get('mes') // formato YYYY-MM
const anoAtivo = paramMes ? parseInt(paramMes.split('-')[0]) : hoje.getFullYear()
const mesAtivo = paramMes ? parseInt(paramMes.split('-')[1]) : hoje.getMonth() + 1

function navegarMes(delta: number) {
  let novoMes = mesAtivo + delta
  let novoAno = anoAtivo
  if (novoMes > 12) { novoMes = 1; novoAno++ }
  if (novoMes < 1) { novoMes = 12; novoAno-- }
  setSearchParams({ mes: `${novoAno}-${String(novoMes).padStart(2, '0')}` })
}
```

- [ ] **Step 2: Adicionar cards de resumo do período**

Calcular a partir dos `lancamentos` carregados:

```tsx
const realizados = lancamentos.filter(l => l.status === 'realizado')
const previstos = lancamentos.filter(l => l.status === 'previsto')

const totalEntradasReal = realizados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0)
const totalSaidasReal = realizados.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0)
const saldoReal = totalEntradasReal - totalSaidasReal
const totalEntradasPrev = previstos.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0)
const totalSaidasPrev = previstos.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0)
```

No JSX, adicionar acima da tabela:

```tsx
{/* Navegação de período */}
<div className="flex items-center gap-3 mb-4">
  <button onClick={() => navegarMes(-1)} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-muted)]">←</button>
  <span className="text-sm font-medium text-[var(--color-text)] capitalize">
    {new Date(anoAtivo, mesAtivo - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
  </span>
  <button onClick={() => navegarMes(1)} className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-muted)]">→</button>
</div>

{/* Cards de resumo */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
    <CardContent className="p-3">
      <p className="text-xs text-[var(--color-muted)]">Entradas realizadas</p>
      <ValorMonetario value={totalEntradasReal} className="text-base font-bold text-[var(--color-success)]" />
    </CardContent>
  </Card>
  <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
    <CardContent className="p-3">
      <p className="text-xs text-[var(--color-muted)]">Saídas realizadas</p>
      <ValorMonetario value={totalSaidasReal} className="text-base font-bold text-[var(--color-danger)]" />
    </CardContent>
  </Card>
  <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
    <CardContent className="p-3">
      <p className="text-xs text-[var(--color-muted)]">Saldo do período</p>
      <ValorMonetario value={saldoReal} className={`text-base font-bold ${saldoReal >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`} />
    </CardContent>
  </Card>
  <Card className="bg-[var(--color-surface-2)] border-[var(--color-border)] border-dashed">
    <CardContent className="p-3">
      <p className="text-xs text-[var(--color-muted)]">Previsão líquida</p>
      <ValorMonetario value={totalEntradasPrev - totalSaidasPrev} className="text-base font-bold text-[var(--color-muted)]" />
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 3: Adicionar abas PJ/PF no topo das páginas**

Em `FluxoCaixaPJPage.tsx`, importar e usar `Link`:

```tsx
import { Link, useLocation, useSearchParams } from 'react-router-dom'
```

No JSX, adicionar acima de tudo (após o `<h1>`):

```tsx
<div className="flex gap-1 mb-6 bg-[var(--color-surface-2)] p-1 rounded-lg w-fit">
  <Link
    to="/fluxo/pj"
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      location.pathname.startsWith('/fluxo/pj')
        ? 'bg-[var(--color-primary)] text-white'
        : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
    }`}
  >
    Fluxo PJ
  </Link>
  <Link
    to="/fluxo/pf"
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      location.pathname.startsWith('/fluxo/pf')
        ? 'bg-[var(--color-primary)] text-white'
        : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
    }`}
  >
    Fluxo PF
  </Link>
</div>
```

Aplicar o mesmo bloco em `FluxoCaixaPFPage.tsx`.

- [ ] **Step 4: Atualizar sidebar — remover item "Fluxo PF" separado**

Em `Sidebar.tsx`, no array `navItems`, remover:

```tsx
{ icon: User, label: 'Fluxo PF', href: '/fluxo/pf' },
```

E renomear o item de Fluxo PJ:

```tsx
{ icon: TrendingUp, label: 'Fluxo de Caixa', href: '/fluxo/pj' },
```

Remover o import de `User` se não for mais usado em outros lugares.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Testar manualmente**
  - Sidebar deve ter apenas "Fluxo de Caixa" levando para `/fluxo/pj`
  - Na página, as abas PJ/PF devem trocar entre as duas páginas
  - Botões ← → devem navegar entre meses e atualizar a URL
  - Cards de resumo devem aparecer com os valores corretos

- [ ] **Step 7: Commit**

```bash
git add src/pages/FluxoCaixaPJPage.tsx src/pages/FluxoCaixaPFPage.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: fluxo de caixa com abas PJ/PF, filtro de período e cards de resumo"
```

---

## Task 9: Fluxo de Caixa — separação visual previsto/realizado e confirmar inline

**Files:**
- Modify: `src/pages/FluxoCaixaPJPage.tsx`
- Modify: `src/pages/FluxoCaixaPFPage.tsx`

**Interfaces:**
- Consumes: `lancamentos` já carregados (separados em `realizados` e `previstos` da Task 8)

- [ ] **Step 1: Separar tabela em duas seções com cabeçalho**

Substituir a tabela/lista plana atual por duas seções:

```tsx
{/* Seção realizados */}
{realizados.length > 0 && (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2 px-1">
      Realizados ({realizados.length})
    </h3>
    <Card className="bg-[var(--color-surface)] border-[var(--color-border)]">
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {realizados.map(l => <LancamentoRow key={l.id} lancamento={l} onConfirm={null} />)}
        </div>
      </CardContent>
    </Card>
  </div>
)}

{/* Seção previstos */}
{previstos.length > 0 && (
  <div>
    <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2 px-1">
      Previstos ({previstos.length})
    </h3>
    <Card className="bg-[var(--color-surface-2)] border-[var(--color-border)] border-dashed">
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {previstos.map(l => <LancamentoRow key={l.id} lancamento={l} onConfirm={handleConfirmarRealizado} />)}
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

- [ ] **Step 2: Criar sub-componente `LancamentoRow` com botão de confirmação**

```tsx
function LancamentoRow({
  lancamento,
  onConfirm,
}: {
  lancamento: FluxoCaixaComObra
  onConfirm: ((id: string, data: string) => Promise<void>) | null
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dataRealizada, setDataRealizada] = useState(todayStr())
  const [confirmando, setConfirmando] = useState(false)

  const isPrevisto = lancamento.status === 'previsto'
  const isEntrada = lancamento.tipo === 'entrada'

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${isPrevisto ? 'opacity-80' : ''}`}>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)] truncate">
            {lancamento.descricao}
          </span>
          {isPrevisto && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-warning)]/10 text-[var(--color-warning)] shrink-0">
              previsto
            </span>
          )}
        </div>
        {lancamento.obras?.nome && (
          <span className="text-xs text-[var(--color-muted)]">{lancamento.obras.nome}</span>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <ValorMonetario
          value={lancamento.valor}
          className={`text-sm font-semibold ${isEntrada ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
        />
        {onConfirm && isPrevisto && (
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-[var(--color-border)] text-[var(--color-success)]"
              onClick={() => setConfirmOpen(!confirmOpen)}
            >
              ✓
            </Button>
            {confirmOpen && (
              <div className="absolute right-0 top-8 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg w-52 space-y-2">
                <p className="text-xs font-medium text-[var(--color-text)]">Confirmar realização</p>
                <Input
                  type="date"
                  value={dataRealizada}
                  onChange={e => setDataRealizada(e.target.value)}
                  className="h-7 text-xs bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-[var(--color-primary)] text-white"
                  disabled={confirmando}
                  onClick={async () => {
                    setConfirmando(true)
                    await onConfirm(lancamento.id, dataRealizada)
                    setConfirmOpen(false)
                    setConfirmando(false)
                  }}
                >
                  {confirmando ? 'Salvando…' : 'Confirmar'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implementar `handleConfirmarRealizado`**

```tsx
async function handleConfirmarRealizado(id: string, dataRealizada: string) {
  const { error } = await supabase
    .from('fluxo_caixa')
    .update({ status: 'realizado', data_competencia: dataRealizada })
    .eq('id', id)
    .eq('user_id', user!.id)
  if (error) {
    toast({ description: 'Erro ao confirmar lançamento.', variant: 'destructive' })
  } else {
    toast({ description: 'Lançamento confirmado!' })
    await loadLancamentos()
  }
}
```

Aplicar os mesmos passos em `FluxoCaixaPFPage.tsx`.

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Testar manualmente**
  - Lançamentos realizados aparecem na seção superior com fundo normal
  - Lançamentos previstos aparecem na seção inferior com borda tracejada e badge "previsto"
  - Botão "✓" em lançamento previsto abre popover com campo de data
  - Confirmar move o lançamento para a seção de realizados sem recarregar a página

- [ ] **Step 6: Commit**

```bash
git add src/pages/FluxoCaixaPJPage.tsx src/pages/FluxoCaixaPFPage.tsx
git commit -m "feat: fluxo de caixa com separação visual previsto/realizado e confirmação inline"
```

---

## Verificação final

- [ ] Rodar `npx tsc --noEmit` sem erros
- [ ] Testar fluxo completo: cadastrar logo → ver na sidebar → gerar PDF com logo
- [ ] Testar dashboard com obras ativas, vencimentos e gastos do mês
- [ ] Testar quick-add de material em uma obra
- [ ] Testar avulso (resumo visual) e RPA (contracheque)
- [ ] Testar fluxo de caixa: filtro de período, cards resumo, confirmar lançamento previsto
