# Bloco 1 — Fundação (ConfiguracoesPage → Login/Layout → Obras → Planilha)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffoldar o app React do zero e implementar os 4 módulos do Bloco 1: Configurações, Login + Layout, Obras (form + listagem) e Planilha de Serviços — com Supabase real e tipagem completa via `Database`.

**Architecture:** Vite + React + TypeScript com Tailwind e shadcn/ui. Roteamento via React Router v6. Todas as queries usam `createClient<Database>()` com RLS por `auth.uid()`. Estado global mínimo via React Context (auth + perfil). Nenhum mock — dados reais do Supabase desde o Task 1.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3 (darkMode: 'class'), shadcn/ui, React Router v6, Supabase JS v2, React Hook Form, Zod, date-fns, JetBrains Mono (Google Fonts)

## Global Constraints

- Todas as queries Supabase: `createClient<Database>()` importado de `src/lib/supabase.ts`
- RLS por `auth.uid()` — nunca omitir `.eq('user_id', user.id)` nas queries manuais
- Dark mode como padrão; toggle persiste em `localStorage('theme')`; `class="dark"` no `<html>`
- PJ e PF **nunca** somados ou exibidos juntos
- Todo lançamento nasce como `status: 'previsto'`
- Valores monetários exibidos com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Fontes: Inter (UI), JetBrains Mono (valores financeiros/tabelas)
- Paleta de cores definida em `tailwind.config.ts` como CSS custom properties (ver TELAS_SPEC.md Design System)
- Componentes base shadcn/ui: Button, Card, Input, Select, Table, Tabs, Badge, Dialog, Toast, Separator
- Formulários: React Hook Form + Zod
- Datas: date-fns, armazenar ISO string no banco
- Arquivos de componentes: PascalCase, extensão `.tsx`
- Hooks customizados: prefixo `use`, ex: `useObra`, useMedicao`

---

## PRÉ-REQUISITO MANUAL (fazer antes de rodar qualquer task)

**Execute o SCHEMA.sql no Supabase Dashboard:**
1. Acesse seu projeto Supabase → SQL Editor
2. Cole o conteúdo de `C:\Users\rfpau\Downloads\SCHEMA.sql` e execute
3. Crie as variáveis de ambiente (ver Task 1, Step 2)

---

### Task 0: Criar o projeto Vite + instalar dependências

**Files:**
- Create: `package.json` (gerado pelo Vite)
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `tsconfig.json`
- Create: `.env.local`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Criar projeto Vite**

No diretório `C:\Users\rfpau\projetos-code\Sistema de Gestão Construtora`, execute:

```bash
npm create vite@latest . -- --template react-ts
```

Responda "y" se perguntar sobre arquivos existentes (overwrite). O CLAUDE.md e Docs/ não serão afetados.

- [ ] **Step 2: Instalar todas as dependências de uma vez**

```bash
npm install @supabase/supabase-js react-router-dom react-hook-form zod @hookform/resolvers date-fns lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-progress @radix-ui/react-badge jspdf jspdf-autotable
```

```bash
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p --ts
```

- [ ] **Step 3: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
```

Quando perguntar:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

Depois instalar os componentes necessários:

```bash
npx shadcn@latest add button card input select table tabs badge dialog toast separator label checkbox progress
```

- [ ] **Step 4: Configurar Tailwind com paleta e fontes**

Substitua o conteúdo de `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-dim': 'var(--color-primary-dim)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        'color-text': 'var(--color-text)',
        muted: 'var(--color-muted)',
        pj: 'var(--color-pj)',
        pf: 'var(--color-pf)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Criar variáveis CSS e importar fontes em `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Dark mode (padrão) */
  --color-bg:          #0F1117;
  --color-surface:     #1A1D27;
  --color-surface-2:   #242838;
  --color-border:      #2E3348;
  --color-primary:     #F59E0B;
  --color-primary-dim: #B45309;
  --color-success:     #10B981;
  --color-danger:      #EF4444;
  --color-warning:     #F59E0B;
  --color-text:        #E5E7EB;
  --color-muted:       #6B7280;
  --color-pj:          #60A5FA;
  --color-pf:          #A78BFA;
}

html.light {
  --color-bg:          #F8F9FB;
  --color-surface:     #FFFFFF;
  --color-surface-2:   #F1F3F7;
  --color-border:      #E2E6EF;
  --color-primary:     #D97706;
  --color-primary-dim: #B45309;
  --color-success:     #059669;
  --color-danger:      #DC2626;
  --color-warning:     #D97706;
  --color-text:        #111827;
  --color-muted:       #6B7280;
  --color-pj:          #2563EB;
  --color-pf:          #7C3AED;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 6: Criar `.env.local` com credenciais Supabase**

```
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> **ATENÇÃO:** Preencha com os valores reais do seu projeto Supabase (Settings → API).

- [ ] **Step 7: Limpar arquivos do template Vite**

Apague `src/App.css` e o conteúdo de `src/App.tsx` (será substituído em Tasks posteriores).

- [ ] **Step 8: Aplicar dark mode por padrão no `index.html`**

No `<html>` tag de `index.html`, adicione a classe `dark`:

```html
<!doctype html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObraGest — Gestão de Construtora</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Verificar que o app sobe sem erro**

```bash
npm run dev
```

Esperado: Vite server rodando em http://localhost:5173 sem erros no console.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + shadcn/ui + Supabase deps"
```

---

### Task 1: Fundação — tipos, cliente Supabase e contexto de Auth

**Files:**
- Create: `src/types/index.ts` (copiar de Downloads/types.ts)
- Create: `src/lib/supabase.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/hooks/useAuth.ts`

**Interfaces:**
- Produces: `supabase` (SupabaseClient<Database>), `useAuth()` → `{ user, perfil, loading, signOut }`

- [ ] **Step 1: Criar `src/types/index.ts`**

Crie o arquivo com exatamente o conteúdo de `C:\Users\rfpau\Downloads\types.ts` (já lido no início desta sessão). Cole o conteúdo completo:

```typescript
// ============================================================
// types.ts — Tipos TypeScript derivados do SCHEMA.sql
// ... (conteúdo completo do arquivo types.ts)
```

> O arquivo tem 517 linhas incluindo Database, Perfil, Obra, Medicao, etc. Use o arquivo de downloads como fonte da verdade.

- [ ] **Step 2: Criar `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Criar `src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Perfil } from '@/types'

interface AuthContextValue {
  user: User | null
  perfil: Perfil | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user.id)
      else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadPerfil(userId: string) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 4: Criar `src/hooks/useAuth.ts`**

```typescript
export { useAuthContext as useAuth } from '@/contexts/AuthContext'
```

- [ ] **Step 5: Configurar path alias `@/` no `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

E no `tsconfig.json` dentro de `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 6: Atualizar `src/main.tsx` com o AuthProvider**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/contexts/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 7: Verificar que TypeScript compila sem erros**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add types, supabase client and auth context"
```

---

### Task 2: AppLayout + Sidebar + tema dark/light

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/hooks/useTheme.ts`
- Create: `src/App.tsx` (roteamento principal)

**Interfaces:**
- Produces: `<AppLayout>` (wrapper com sidebar), `<Sidebar>` (nav + toggle de tema + sign out)
- Consumes: `useAuth()` → `{ perfil, signOut }`

- [ ] **Step 1: Criar `src/hooks/useTheme.ts`**

```typescript
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'dark'
  })

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggleTheme }
}
```

- [ ] **Step 2: Criar `src/components/layout/Sidebar.tsx`**

```tsx
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, TrendingUp, User, Package, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Building2, label: 'Obras', href: '/obras' },
  { icon: TrendingUp, label: 'Fluxo PJ', href: '/fluxo/pj' },
  { icon: User, label: 'Fluxo PF', href: '/fluxo/pf' },
  { icon: Package, label: 'Contador', href: '/contador' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
]

export function Sidebar() {
  const { perfil, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const displayName = perfil?.razao_social ?? perfil?.nome_completo ?? 'Usuário'

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-surface border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg text-[var(--color-text)] tracking-tight">ObraGest</span>
        </div>
      </div>

      <Separator className="bg-[var(--color-border)]" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = location.pathname === href || (href !== '/' && location.pathname.startsWith(href))
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-[var(--color-border)]" />

      {/* Rodapé */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{displayName}</p>
            <p className="text-xs text-muted truncate">{perfil?.cnpj ?? perfil?.cpf ?? ''}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="shrink-0 text-muted hover:text-[var(--color-text)]"
            title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-muted hover:text-danger gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Criar `src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Criar `src/App.tsx` com roteamento completo**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ObrasPage } from '@/pages/ObrasPage'
import { ObraFormPage } from '@/pages/ObraFormPage'
import { ObraDetailPage } from '@/pages/ObraDetailPage'
import { PlanilhaServicosPage } from '@/pages/PlanilhaServicosPage'
import { MedicoesPage } from '@/pages/MedicoesPage'
import { MedicaoFormPage } from '@/pages/MedicaoFormPage'
import { MedicaoDetailPage } from '@/pages/MedicaoDetailPage'
import { MateriaisPage } from '@/pages/MateriaisPage'
import { MaoDeObraPage } from '@/pages/MaoDeObraPage'
import { RpaFormPage } from '@/pages/RpaFormPage'
import { AvulsoFormPage } from '@/pages/AvulsoFormPage'
import { FluxoCaixaObraPage } from '@/pages/FluxoCaixaObraPage'
import { FluxoCaixaPJPage } from '@/pages/FluxoCaixaPJPage'
import { FluxoCaixaPFPage } from '@/pages/FluxoCaixaPFPage'
import { ContadorPage } from '@/pages/ContadorPage'
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-bg text-[var(--color-text)]">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/obras" element={<ObrasPage />} />
          <Route path="/obras/nova" element={<ObraFormPage />} />
          <Route path="/obras/:id" element={<ObraDetailPage />} />
          <Route path="/obras/:id/editar" element={<ObraFormPage />} />
          <Route path="/obras/:id/planilha" element={<PlanilhaServicosPage />} />
          <Route path="/obras/:id/medicoes" element={<MedicoesPage />} />
          <Route path="/obras/:id/medicoes/nova" element={<MedicaoFormPage />} />
          <Route path="/obras/:id/medicoes/:mid" element={<MedicaoDetailPage />} />
          <Route path="/obras/:id/materiais" element={<MateriaisPage />} />
          <Route path="/obras/:id/mao-de-obra" element={<MaoDeObraPage />} />
          <Route path="/obras/:id/mao-de-obra/rpa/novo" element={<RpaFormPage />} />
          <Route path="/obras/:id/mao-de-obra/avulso/novo" element={<AvulsoFormPage />} />
          <Route path="/obras/:id/fluxo" element={<FluxoCaixaObraPage />} />
          <Route path="/fluxo/pj" element={<FluxoCaixaPJPage />} />
          <Route path="/fluxo/pf" element={<FluxoCaixaPFPage />} />
          <Route path="/contador" element={<ContadorPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Criar stubs para todas as páginas ainda não implementadas**

Crie `src/pages/DashboardPage.tsx`:
```tsx
export function DashboardPage() {
  return <div className="text-[var(--color-text)]"><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-muted mt-2">Em construção...</p></div>
}
```

Repita o padrão para: `MedicoesPage`, `MedicaoFormPage`, `MedicaoDetailPage`, `MateriaisPage`, `MaoDeObraPage`, `RpaFormPage`, `AvulsoFormPage`, `FluxoCaixaObraPage`, `FluxoCaixaPJPage`, `FluxoCaixaPFPage`, `ContadorPage`, `ObraDetailPage`.

Cada um exporta uma função com o nome da página e retorna um `<div>` com o título da tela. Exemplo para `MedicoesPage.tsx`:
```tsx
export function MedicoesPage() {
  return <div className="text-[var(--color-text)]"><h1 className="text-2xl font-bold">Medições</h1><p className="text-muted mt-2">Em construção...</p></div>
}
```

- [ ] **Step 6: Verificar compilação**

```bash
npx tsc --noEmit && npm run dev
```

Esperado: zero erros TS, app carrega no browser.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add AppLayout, Sidebar with theme toggle and all route stubs"
```

---

### Task 3: LoginPage

**Files:**
- Create: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `supabase.auth.signInWithPassword()`
- Produces: redireciona para `/` após login bem-sucedido

- [ ] **Step 1: Criar `src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Lado esquerdo — marca */}
      <div className="hidden lg:flex flex-col justify-center px-16 bg-surface w-1/2 border-r border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-10 h-10 text-primary" />
          <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">ObraGest</span>
        </div>
        <p className="text-xl text-[var(--color-text)] font-semibold leading-snug">
          Do contrato à medição,<br />sem planilha.
        </p>
        <p className="mt-4 text-muted text-sm max-w-xs">
          Gestão completa para construtoras de licitação pública. Medições, materiais, mão de obra e pacote do contador em um só lugar.
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-sm bg-surface border-[var(--color-border)]">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-[var(--color-text)]">ObraGest</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Entrar na sua conta</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[var(--color-text)]">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  required
                  className="bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[var(--color-text)]">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--color-text)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[var(--color-primary-dim)] text-white font-semibold"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <p className="text-center text-sm text-muted">
                <span
                  className="cursor-not-allowed"
                  title="Em breve"
                >
                  Esqueci minha senha
                </span>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Testar manualmente no browser**

1. Acesse http://localhost:5173/login
2. Tente login com credenciais erradas → deve exibir mensagem de erro em vermelho
3. Faça login com credenciais reais → deve redirecionar para `/` e mostrar sidebar

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: add LoginPage with Supabase Auth"
```

---

### Task 4: ConfiguracoesPage

**Files:**
- Create: `src/pages/ConfiguracoesPage.tsx`
- Create: `src/components/shared/ValorMonetario.tsx`

**Interfaces:**
- Consumes: `supabase.from('perfis')`, `useAuth()` → `{ perfil, user }`
- Produces: `<ValorMonetario value={number} />` (usado por Tasks futuras)

- [ ] **Step 1: Criar `src/components/shared/ValorMonetario.tsx`**

```tsx
interface ValorMonetarioProps {
  value: number
  className?: string
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ValorMonetario({ value, className = '' }: ValorMonetarioProps) {
  return (
    <span className={`font-mono ${className}`}>
      {fmt.format(value)}
    </span>
  )
}
```

- [ ] **Step 2: Criar `src/pages/ConfiguracoesPage.tsx`**

```tsx
import { useEffect } from 'react'
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
import type { PerfilFormData, RegimeTributario } from '@/types'

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

function useToastSimples() {
  function toast(msg: string, tipo: 'sucesso' | 'erro') {
    // Usando alert provisório — será substituído pelo Sonner/shadcn toast em Task futura
    alert(`${tipo === 'sucesso' ? '✓' : '✗'} ${msg}`)
  }
  return toast
}

export function ConfiguracoesPage() {
  const { user, perfil } = useAuth()
  const toast = useToastSimples()

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
    if (error) toast('Erro ao salvar dados PJ.', 'erro')
    else toast('Dados PJ salvos com sucesso!', 'sucesso')
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
    if (error) toast('Erro ao salvar dados PF.', 'erro')
    else toast('Dados pessoais salvos!', 'sucesso')
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
    if (error) toast('Erro ao salvar alíquotas.', 'erro')
    else toast('Alíquotas padrão salvas!', 'sucesso')
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
        </TabsList>

        {/* Aba PJ */}
        <TabsContent value="pj">
          <Card className="bg-surface border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Dados da Empresa (PJ)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={pjForm.handleSubmit(salvarPJ)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Razão Social *</Label>
                  <Input {...pjForm.register('razao_social')} className={inputClass} />
                  {pjForm.formState.errors.razao_social && (
                    <p className="text-xs text-danger">{pjForm.formState.errors.razao_social.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>CNPJ *</Label>
                  <Input {...pjForm.register('cnpj')} placeholder="00.000.000/0000-00" className={inputClass} />
                  {pjForm.formState.errors.cnpj && (
                    <p className="text-xs text-danger">{pjForm.formState.errors.cnpj.message}</p>
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
                    <SelectContent className="bg-surface border-[var(--color-border)]">
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

                <Button type="submit" className="bg-primary hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar dados PJ
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba PF */}
        <TabsContent value="pf">
          <Card className="bg-surface border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Dados Pessoais do Dono</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={pfForm.handleSubmit(salvarPF)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Nome Completo *</Label>
                  <Input {...pfForm.register('nome_completo')} className={inputClass} />
                  {pfForm.formState.errors.nome_completo && (
                    <p className="text-xs text-danger">{pfForm.formState.errors.nome_completo.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>CPF *</Label>
                  <Input {...pfForm.register('cpf')} placeholder="000.000.000-00" className={inputClass} />
                  {pfForm.formState.errors.cpf && (
                    <p className="text-xs text-danger">{pfForm.formState.errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Endereço Pessoal</Label>
                  <Input {...pfForm.register('endereco_pf')} className={inputClass} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>E-mail de acesso</Label>
                  <Input value={user?.email ?? ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                  <p className="text-xs text-muted">Para alterar o e-mail, use as configurações do Supabase.</p>
                </div>

                <Button type="submit" className="bg-primary hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar dados pessoais
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Alíquotas */}
        <TabsContent value="aliquotas">
          <Card className="bg-surface border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text)] text-base">Alíquotas Padrão</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={aliquotasForm.handleSubmit(salvarAliquotas)} className="space-y-4">
                <p className="text-sm text-muted">
                  Esses valores serão pré-preenchidos em cada nova obra. Você pode alterar por obra se necessário.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'aliquota_caucao', label: 'Caução %' },
                    { name: 'aliquota_iss', label: 'ISS %' },
                    { name: 'aliquota_inss', label: 'INSS %' },
                    { name: 'aliquota_irrf', label: 'IRRF %' },
                  ].map(({ name, label }) => (
                    <div key={name} className="space-y-1.5">
                      <Label className={labelClass}>{label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...aliquotasForm.register(name as keyof AliquotasFormValues)}
                        className={inputClass}
                      />
                      {aliquotasForm.formState.errors[name as keyof AliquotasFormValues] && (
                        <p className="text-xs text-danger">Valor deve ser entre 0 e 100</p>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="bg-primary hover:bg-[var(--color-primary-dim)] text-white">
                  Salvar alíquotas
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: Testar manualmente**

1. Faça login e acesse `/configuracoes`
2. Preencha Razão Social + CNPJ na aba PJ e clique "Salvar" → alert de sucesso
3. Abra o Supabase Table Editor → tabela `perfis` → confirmar que os dados foram gravados
4. Recarregue a página → os campos devem estar pré-preenchidos

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ConfiguracoesPage with PJ/PF/aliquotas tabs and Supabase persistence"
```

---

### Task 5: ObrasPage + ObraFormPage

**Files:**
- Create: `src/pages/ObrasPage.tsx`
- Create: `src/pages/ObraFormPage.tsx`
- Create: `src/components/shared/StatusBadge.tsx`
- Modify: `src/pages/ObraDetailPage.tsx` (placeholder mínimo com link para sub-rotas)

**Interfaces:**
- Consumes: `supabase.from('perfis')` (para pré-preencher alíquotas), `supabase.from('obras')`
- Produces: lista de obras tipada como `Obra[]`

- [ ] **Step 1: Criar `src/components/shared/StatusBadge.tsx`**

```tsx
import type { ObraStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<ObraStatus, { label: string; className: string }> = {
  em_andamento: { label: 'Em andamento', className: 'bg-warning/20 text-warning border-warning/40' },
  paralisada: { label: 'Paralisada', className: 'bg-muted/20 text-muted border-muted/40' },
  concluida: { label: 'Concluída', className: 'bg-success/20 text-success border-success/40' },
}

export function StatusBadge({ status }: { status: ObraStatus }) {
  const cfg = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', cfg.className)}>
      {cfg.label}
    </Badge>
  )
}
```

- [ ] **Step 2: Criar `src/pages/ObrasPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { Obra, ObraStatus } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ObrasPage() {
  const { user } = useAuth()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<ObraStatus | 'todas'>('todas')

  useEffect(() => {
    if (!user) return
    loadObras()
  }, [user])

  async function loadObras() {
    setLoading(true)
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    if (!error && data) setObras(data)
    setLoading(false)
  }

  const obrasFiltradas = obras.filter(o => {
    const matchStatus = filtroStatus === 'todas' || o.status === filtroStatus
    const matchBusca = busca === '' ||
      o.nome.toLowerCase().includes(busca.toLowerCase()) ||
      o.orgao_contratante.toLowerCase().includes(busca.toLowerCase()) ||
      (o.numero_licitacao ?? '').toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Obras</h1>
        <Button asChild className="bg-primary hover:bg-[var(--color-primary-dim)] text-white">
          <Link to="/obras/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova obra
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
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
          <SelectContent className="bg-surface border-[var(--color-border)]">
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
          {[1,2,3].map(i => (
            <div key={i} className="h-28 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
      ) : obrasFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-[var(--color-text)] font-medium">Nenhuma obra encontrada.</p>
          <p className="text-muted text-sm mt-1">
            {obras.length === 0
              ? 'Cadastre sua primeira obra para começar.'
              : 'Tente ajustar os filtros.'}
          </p>
          {obras.length === 0 && (
            <Button asChild className="mt-4 bg-primary hover:bg-[var(--color-primary-dim)] text-white">
              <Link to="/obras/nova">Nova obra</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {obrasFiltradas.map(obra => (
            <Card key={obra.id} className="bg-surface border-[var(--color-border)] hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-[var(--color-text)] truncate">{obra.nome}</h2>
                      <StatusBadge status={obra.status} />
                    </div>
                    <p className="text-sm text-muted truncate">{obra.orgao_contratante}</p>
                    {obra.numero_licitacao && (
                      <p className="text-xs text-muted mt-0.5">Licitação: {obra.numero_licitacao}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <ValorMonetario value={obra.valor_total} className="text-lg font-semibold text-[var(--color-text)]" />
                    {obra.prazo_termino && (
                      <p className="text-xs text-muted mt-0.5">
                        Prazo: {format(new Date(obra.prazo_termino + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
                    <Link to={`/obras/${obra.id}`}>Ver obra</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
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
```

- [ ] **Step 3: Criar `src/pages/ObraFormPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { ObraStatus } from '@/types'

const obraSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  numero_licitacao: z.string(),
  orgao_contratante: z.string().min(1, 'Obrigatório'),
  objeto: z.string(),
  art_rrt: z.string(),
  data_assinatura: z.string().min(1, 'Obrigatório'),
  prazo_termino: z.string(),
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    if (isEditing) loadObra()
    else if (perfil) {
      form.setValue('aliquota_caucao', perfil.aliquota_caucao)
      form.setValue('aliquota_iss', perfil.aliquota_iss)
      form.setValue('aliquota_inss', perfil.aliquota_inss)
      form.setValue('aliquota_irrf', perfil.aliquota_irrf)
    }
  }, [perfil, isEditing])

  async function loadObra() {
    const { data } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id!)
      .eq('user_id', user!.id)
      .single()
    if (data) {
      form.reset({
        nome: data.nome,
        numero_licitacao: data.numero_licitacao ?? '',
        orgao_contratante: data.orgao_contratante,
        objeto: data.objeto ?? '',
        art_rrt: data.art_rrt ?? '',
        data_assinatura: data.data_assinatura ?? '',
        prazo_termino: data.prazo_termino ?? '',
        valor_total: data.valor_total,
        endereco: data.endereco ?? '',
        status: data.status,
        aliquota_caucao: data.aliquota_caucao,
        aliquota_iss: data.aliquota_iss,
        aliquota_inss: data.aliquota_inss,
        aliquota_irrf: data.aliquota_irrf,
      })
    }
  }

  async function onSubmit(data: ObraFormValues) {
    if (!user) return
    setSubmitting(true)
    setError('')

    const payload = {
      user_id: user.id,
      nome: data.nome,
      numero_licitacao: data.numero_licitacao || null,
      orgao_contratante: data.orgao_contratante,
      objeto: data.objeto || null,
      art_rrt: data.art_rrt || null,
      data_assinatura: data.data_assinatura || null,
      prazo_termino: data.prazo_termino || null,
      valor_total: data.valor_total,
      endereco: data.endereco || null,
      status: data.status,
      aliquota_caucao: data.aliquota_caucao,
      aliquota_iss: data.aliquota_iss,
      aliquota_inss: data.aliquota_inss,
      aliquota_irrf: data.aliquota_irrf,
    }

    let err
    if (isEditing) {
      const { error } = await supabase.from('obras').update(payload).eq('id', id!).eq('user_id', user.id)
      err = error
    } else {
      const { error } = await supabase.from('obras').insert(payload)
      err = error
    }

    setSubmitting(false)
    if (err) {
      setError('Erro ao salvar obra. Tente novamente.')
    } else {
      navigate('/obras')
    }
  }

  const inputClass = 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]'
  const labelClass = 'text-[var(--color-text)] text-sm font-medium'
  const errorClass = 'text-xs text-danger mt-1'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/obras')}
          className="text-muted hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isEditing ? 'Editar obra' : 'Nova obra'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seção 1: Dados do Contrato */}
        <Card className="bg-surface border-[var(--color-border)]">
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
                  <SelectContent className="bg-surface border-[var(--color-border)]">
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
              {form.formState.errors.orgao_contratante && <p className={errorClass}>{form.formState.errors.orgao_contratante.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Objeto do contrato</Label>
              <textarea
                {...form.register('objeto')}
                rows={3}
                className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary ${inputClass}`}
                placeholder="Descrição do objeto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={labelClass}>Data de assinatura *</Label>
                <Input type="date" {...form.register('data_assinatura')} className={inputClass} />
                {form.formState.errors.data_assinatura && <p className={errorClass}>{form.formState.errors.data_assinatura.message}</p>}
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
                {form.formState.errors.valor_total && <p className={errorClass}>{form.formState.errors.valor_total.message}</p>}
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
        <Card className="bg-surface border-[var(--color-border)]">
          <CardHeader>
            <CardTitle className="text-base text-[var(--color-text)]">Retenções e Impostos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Valores pré-preenchidos conforme configurações. Altere só se este contrato tiver alíquotas diferentes.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'aliquota_caucao', label: 'Caução %' },
                { name: 'aliquota_iss', label: 'ISS %' },
                { name: 'aliquota_inss', label: 'INSS %' },
                { name: 'aliquota_irrf', label: 'IRRF %' },
              ].map(({ name, label }) => (
                <div key={name} className="space-y-1.5">
                  <Label className={labelClass}>{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...form.register(name as keyof ObraFormValues)}
                    className={inputClass}
                  />
                  {form.formState.errors[name as keyof ObraFormValues] && (
                    <p className={errorClass}>Valor entre 0 e 100</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-[var(--color-primary-dim)] text-white"
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
```

- [ ] **Step 4: Criar `src/pages/ObraDetailPage.tsx` mínimo com abas**

```tsx
import { Link, useParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ObraDetailPage() {
  const { id } = useParams()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Detalhe da Obra</h1>
      <p className="text-muted text-sm">ID: {id}</p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/obras/${id}/planilha`} className="text-pj underline text-sm">Planilha</Link>
        <Link to={`/obras/${id}/medicoes`} className="text-pj underline text-sm">Medições</Link>
        <Link to={`/obras/${id}/materiais`} className="text-pj underline text-sm">Materiais</Link>
        <Link to={`/obras/${id}/mao-de-obra`} className="text-pj underline text-sm">Mão de obra</Link>
        <Link to={`/obras/${id}/fluxo`} className="text-pj underline text-sm">Fluxo</Link>
        <Link to={`/obras/${id}/editar`} className="text-primary underline text-sm">Editar obra</Link>
      </div>
      <p className="text-muted text-xs">(Detalhe completo com abas — implementado no Bloco 2)</p>
    </div>
  )
}
```

- [ ] **Step 5: Testar fluxo completo no browser**

1. Acesse `/obras` → estado vazio com CTA "Nova obra"
2. Clique "Nova obra" → `/obras/nova` → preencha todos os campos obrigatórios
3. Clique "Salvar" → redireciona para `/obras` com a obra na lista
4. Clique "Editar" → campos pré-preenchidos → altere o status → "Salvar" → confirma no Supabase

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ObrasPage, ObraFormPage, StatusBadge with Supabase CRUD"
```

---

### Task 6: PlanilhaServicosPage

**Files:**
- Create: `src/pages/PlanilhaServicosPage.tsx`

**Interfaces:**
- Consumes: `supabase.from('planilha_itens')`, `supabase.from('obras')`, `supabase.from('vw_planilha_saldo')`
- Produces: planilha com itens editáveis inline; bloqueia medição se vazia

- [ ] **Step 1: Criar `src/pages/PlanilhaServicosPage.tsx`**

```tsx
import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, AlertTriangle, ClipboardPaste, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { PlanilhaItem, Obra, VwPlanilhaSaldo } from '@/types'

const fmt3 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

type ItemComSaldo = PlanilhaItem & Partial<VwPlanilhaSaldo>

export function PlanilhaServicosPage() {
  const { id: obraId } = useParams()
  const { user } = useAuth()
  const [obra, setObra] = useState<Obra | null>(null)
  const [itens, setItens] = useState<ItemComSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PlanilhaItem>>({})
  const [pastaTexto, setPastaTexto] = useState('')
  const [previewLinhas, setPreviewLinhas] = useState<string[][]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !obraId) return
    loadData()
  }, [user, obraId])

  async function loadData() {
    setLoading(true)
    const [obraRes, itensRes, saldoRes] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId!).eq('user_id', user!.id).single(),
      supabase.from('planilha_itens').select('*').eq('obra_id', obraId!).eq('user_id', user!.id).order('ordem'),
      supabase.from('vw_planilha_saldo').select('*').eq('obra_id', obraId!).eq('user_id', user!.id),
    ])
    if (obraRes.data) setObra(obraRes.data)
    if (itensRes.data) {
      const saldoMap = new Map((saldoRes.data ?? []).map(s => [s.planilha_item_id, s]))
      setItens(itensRes.data.map(item => ({ ...item, ...saldoMap.get(item.id) })))
    }
    setLoading(false)
  }

  const somaItens = itens.reduce((acc, i) => acc + i.valor_total, 0)
  const divergente = obra && Math.abs(somaItens - obra.valor_total) > 0.01

  function startEdit(item: PlanilhaItem) {
    setEditingId(item.id)
    setEditValues({
      codigo: item.codigo ?? '',
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade_contratada: item.quantidade_contratada,
      valor_unitario: item.valor_unitario,
      ordem: item.ordem,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  async function saveEdit(itemId: string) {
    setSaving(true)
    const { error } = await supabase
      .from('planilha_itens')
      .update({
        codigo: editValues.codigo || null,
        descricao: editValues.descricao!,
        unidade: editValues.unidade!,
        quantidade_contratada: Number(editValues.quantidade_contratada),
        valor_unitario: Number(editValues.valor_unitario),
        ordem: Number(editValues.ordem),
      })
      .eq('id', itemId)
      .eq('user_id', user!.id)
    setSaving(false)
    if (!error) {
      setEditingId(null)
      loadData()
    }
  }

  async function addItem() {
    const nextOrdem = itens.length > 0 ? Math.max(...itens.map(i => i.ordem)) + 1 : 1
    const { data, error } = await supabase
      .from('planilha_itens')
      .insert({
        obra_id: obraId!,
        user_id: user!.id,
        descricao: 'Novo item',
        unidade: 'un',
        quantidade_contratada: 1,
        valor_unitario: 0,
        ordem: nextOrdem,
      })
      .select()
      .single()
    if (data && !error) {
      await loadData()
      startEdit(data)
    }
  }

  async function deleteItem(itemId: string) {
    // Verificar se há medição para este item
    const { count } = await supabase
      .from('medicao_itens')
      .select('*', { count: 'exact', head: true })
      .eq('planilha_item_id', itemId)
    if ((count ?? 0) > 0) {
      alert('Não é possível excluir um item que já possui medição registrada.')
      return
    }
    if (!confirm('Excluir este item da planilha?')) return
    await supabase.from('planilha_itens').delete().eq('id', itemId).eq('user_id', user!.id)
    loadData()
  }

  function parsePasta(texto: string) {
    const linhas = texto.trim().split('\n').map(l =>
      l.split('\t').map(c => c.trim())
    ).filter(l => l.length >= 2)
    setPreviewLinhas(linhas)
  }

  async function importarLinhas() {
    if (previewLinhas.length === 0) return
    setSaving(true)
    const nextOrdem = itens.length > 0 ? Math.max(...itens.map(i => i.ordem)) + 1 : 1
    const inserts = previewLinhas.map((cols, idx) => ({
      obra_id: obraId!,
      user_id: user!.id,
      codigo: cols[0] || null,
      descricao: cols[1] || 'Item importado',
      unidade: cols[2] || 'un',
      quantidade_contratada: Number(cols[3]?.replace(',', '.') || 0),
      valor_unitario: Number(cols[4]?.replace(',', '.') || 0),
      ordem: nextOrdem + idx,
    }))
    await supabase.from('planilha_itens').insert(inserts)
    setSaving(false)
    setDialogOpen(false)
    setPastaTexto('')
    setPreviewLinhas([])
    loadData()
  }

  const thClass = 'text-left text-xs font-medium text-muted py-3 px-4'
  const tdClass = 'py-3 px-4 text-sm text-[var(--color-text)]'
  const inputClass = 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] h-8 text-xs'

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted">
        <Link to="/obras" className="hover:text-[var(--color-text)]">Obras</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/obras/${obraId}`} className="hover:text-[var(--color-text)]">{obra?.nome ?? 'Obra'}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--color-text)]">Planilha de Serviços</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Planilha de Serviços</h1>
        <div className="flex gap-2">
          {/* Modal Colar do Excel */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] gap-2">
                <ClipboardPaste className="w-4 h-4" />
                Colar do Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-[var(--color-border)] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[var(--color-text)]">Importar do Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  Copie as colunas do Excel na ordem: <strong className="text-[var(--color-text)]">Código, Descrição, Unidade, Quantidade, Valor Unitário</strong>. Cole aqui:
                </p>
                <textarea
                  value={pastaTexto}
                  onChange={e => { setPastaTexto(e.target.value); parsePasta(e.target.value) }}
                  rows={8}
                  className="w-full rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Cole aqui os dados copiados do Excel..."
                />
                {previewLinhas.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-2">{previewLinhas.length} linha(s) detectada(s):</p>
                    <div className="max-h-40 overflow-auto rounded border border-[var(--color-border)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--color-surface-2)]">
                          <tr>
                            {['Código','Descrição','Unid.','Qtd','Valor Unit.'].map(h => (
                              <th key={h} className="px-2 py-1 text-left text-muted font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewLinhas.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-t border-[var(--color-border)]">
                              {row.map((col, j) => (
                                <td key={j} className="px-2 py-1 text-[var(--color-text)]">{col}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[var(--color-border)] text-[var(--color-text)]">
                    Cancelar
                  </Button>
                  <Button
                    onClick={importarLinhas}
                    disabled={previewLinhas.length === 0 || saving}
                    className="bg-primary hover:bg-[var(--color-primary-dim)] text-white"
                  >
                    {saving ? 'Importando...' : `Importar ${previewLinhas.length} linha(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={addItem} className="bg-primary hover:bg-[var(--color-primary-dim)] text-white gap-2">
            <Plus className="w-4 h-4" />
            Adicionar item
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {itens.length === 0 && !loading && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            Sem planilha cadastrada — medições não podem ser abertas. Adicione itens acima.
          </p>
        </div>
      )}
      {divergente && (
        <div className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">
            Soma dos itens (<ValorMonetario value={somaItens} className="font-semibold" />) difere do valor contratado (
            <ValorMonetario value={obra?.valor_total ?? 0} className="font-semibold" />). Revise antes de gerar medição.
          </p>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface-2)]">
              <tr>
                <th className={thClass}>Código</th>
                <th className={thClass}>Descrição</th>
                <th className={thClass}>Unid.</th>
                <th className={`${thClass} text-right`}>Qtd Contratada</th>
                <th className={`${thClass} text-right`}>Valor Unit.</th>
                <th className={`${thClass} text-right`}>Valor Total</th>
                <th className={`${thClass} text-right`}>Medido</th>
                <th className={`${thClass} text-right`}>Restante</th>
                <th className={`${thClass} text-center`}>% Exec</th>
                <th className={`${thClass} text-center`}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted text-sm">Carregando...</td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted text-sm">Nenhum item cadastrado.</td>
                </tr>
              ) : itens.map(item => (
                editingId === item.id ? (
                  <tr key={item.id} className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={editValues.codigo ?? ''} onChange={e => setEditValues(v => ({...v, codigo: e.target.value}))} className={inputClass} placeholder="Cód." /></td>
                    <td className={tdClass}><Input value={editValues.descricao ?? ''} onChange={e => setEditValues(v => ({...v, descricao: e.target.value}))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editValues.unidade ?? ''} onChange={e => setEditValues(v => ({...v, unidade: e.target.value}))} className={`${inputClass} w-16`} /></td>
                    <td className={tdClass}><Input type="number" step="0.001" value={editValues.quantidade_contratada ?? 0} onChange={e => setEditValues(v => ({...v, quantidade_contratada: Number(e.target.value)}))} className={`${inputClass} text-right w-24`} /></td>
                    <td className={tdClass}><Input type="number" step="0.01" value={editValues.valor_unitario ?? 0} onChange={e => setEditValues(v => ({...v, valor_unitario: Number(e.target.value)}))} className={`${inputClass} text-right w-28`} /></td>
                    <td className={`${tdClass} text-right font-mono`}><ValorMonetario value={(editValues.quantidade_contratada ?? 0) * (editValues.valor_unitario ?? 0)} /></td>
                    <td className={`${tdClass} text-right font-mono text-muted`}>—</td>
                    <td className={`${tdClass} text-right font-mono text-muted`}>—</td>
                    <td className="text-center" />
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={() => saveEdit(item.id)} disabled={saving} className="h-7 text-xs bg-success hover:bg-success/80 text-white">
                          {saving ? '...' : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs text-muted">
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className={`${tdClass} text-muted`}>{item.codigo ?? '—'}</td>
                    <td className={tdClass}>{item.descricao}</td>
                    <td className={`${tdClass} text-muted`}>{item.unidade}</td>
                    <td className={`${tdClass} text-right font-mono`}>{fmt3.format(item.quantidade_contratada)}</td>
                    <td className={`${tdClass} text-right font-mono`}><ValorMonetario value={item.valor_unitario} /></td>
                    <td className={`${tdClass} text-right font-mono font-medium`}><ValorMonetario value={item.valor_total} /></td>
                    <td className={`${tdClass} text-right font-mono text-muted`}>{fmt3.format(item.quantidade_medida ?? 0)}</td>
                    <td className={`${tdClass} text-right font-mono text-muted`}>{fmt3.format(item.quantidade_restante ?? item.quantidade_contratada)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-1.5 min-w-[40px]">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(item.percentual_executado ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted w-10 text-right">
                          {(item.percentual_executado ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(item)} className="h-7 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} className="h-7 text-xs text-danger hover:bg-danger/10">
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>

            {/* Rodapé com totais */}
            {itens.length > 0 && (
              <tfoot className="bg-[var(--color-surface-2)] border-t-2 border-[var(--color-border)]">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
                    Total ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[var(--color-text)]">
                    <ValorMonetario value={somaItens} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">
                    {fmt3.format(itens.reduce((acc, i) => acc + (i.quantidade_medida ?? 0), 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Testar fluxo completo no browser**

1. Acesse `/obras/:id/planilha` para uma obra existente
2. Clique "Adicionar item" → nova linha aparece em modo edição
3. Preencha descrição, unidade, quantidade e valor → "Salvar"
4. Confirme no Supabase Table Editor que o item foi inserido em `planilha_itens`
5. Clique "Editar" em uma linha → altere valores → "Salvar" → dados atualizados
6. Clique "Colar do Excel" → cole 3 linhas de dados tabulados → preview aparece → "Importar"
7. Tente excluir um item sem medições → deve funcionar; com medições → deve bloquear

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add PlanilhaServicosPage with inline edit, bulk paste and saldo via view"
```

---

## Self-Review

### Cobertura da spec

- [x] TELAS_SPEC.md Tela 1 (Login): LoginPage com split layout, toggle senha, erro inline ✓
- [x] TELAS_SPEC.md Tela 5 (ObraForm): Seção contrato + retenções, pré-preenchimento de alíquotas ✓
- [x] TELAS_SPEC.md Tela 3 (Obras): filtros, busca, badge de status, barra de progresso (ausente — add no Bloco 2 quando KPIs estiverem disponíveis) ⚠️
- [x] TELAS_SPEC.md Tela 6 (Planilha): tabela inline, alerta divergência, modal colar Excel ✓
- [x] TELAS_SPEC.md Tela 18 (Configurações): 3 abas PJ/PF/alíquotas ✓
- [x] Dark/light toggle persistido em localStorage ✓
- [x] `createClient<Database>()` em todas as queries ✓
- [x] RLS: todas queries filtram por `user_id` ou `id` = `user.id` ✓
- [x] ValorMonetario em JetBrains Mono ✓

### Gaps / TODO Bloco 2
- `ObraDetailPage` completo com abas (Bloco 2)
- Barra de progresso nos cards de obras (requer `vw_obra_kpis` — Bloco 2)
- Toast de sucesso real (shadcn Toaster) em vez de `alert()` — substitua no início do Bloco 2
