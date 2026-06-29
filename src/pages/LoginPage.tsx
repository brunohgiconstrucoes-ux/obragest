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
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Lado esquerdo — marca */}
      <div className="hidden lg:flex flex-col justify-center px-16 bg-[var(--color-surface)] w-1/2 border-r border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-10 h-10 text-[var(--color-primary)]" />
          <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">ObraGest</span>
        </div>
        <p className="text-xl text-[var(--color-text)] font-semibold leading-snug">
          Do contrato à medição,<br />sem planilha.
        </p>
        <p className="mt-4 text-[var(--color-muted)] text-sm max-w-xs">
          Gestão completa para construtoras de licitação pública. Medições, materiais, mão de obra e pacote do contador em um só lugar.
        </p>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-sm bg-[var(--color-surface)] border-[var(--color-border)]">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
              <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
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
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white font-semibold"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <p className="text-center text-sm text-[var(--color-muted)]">
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
