import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, TrendingUp, User, Package, Settings, LogOut, Moon, Sun, Warehouse, Wrench, Bell, BarChart2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useAlertas } from '@/hooks/useAlertas'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Building2, label: 'Obras', href: '/obras' },
  { icon: TrendingUp, label: 'Fluxo PJ', href: '/fluxo/pj' },
  { icon: User, label: 'Fluxo PF', href: '/fluxo/pf' },
  { icon: Warehouse, label: 'Almoxarifado', href: '/almoxarifado' },
  { icon: Wrench, label: 'Equipamentos', href: '/equipamentos' },
  { icon: Bell, label: 'Alertas', href: '/alertas', badge: true },
  { icon: BarChart2, label: 'DRE', href: '/dre' },
  { icon: Package, label: 'Contador', href: '/contador' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
]

export function Sidebar() {
  const { perfil, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const { alertas } = useAlertas()
  const totalAlertas = alertas.length
  const temCritico = alertas.some(a => a.severidade === 'critico')

  const displayName = perfil?.razao_social ?? perfil?.nome_completo ?? 'Usuário'

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
          <span className="font-bold text-lg text-[var(--color-text)] tracking-tight">ObraGest</span>
        </div>
      </div>

      <Separator className="bg-[var(--color-border)]" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ icon: Icon, label, href, badge }) => {
          const active = location.pathname === href || (href !== '/' && location.pathname.startsWith(href))
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {badge && totalAlertas > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                  temCritico ? 'bg-[var(--color-danger)] text-white' : 'bg-[var(--color-warning)] text-black'
                }`}>
                  {totalAlertas}
                </span>
              )}
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
            <p className="text-xs text-[var(--color-muted)] truncate">{perfil?.cnpj ?? perfil?.cpf ?? ''}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-text)]"
            title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-[var(--color-muted)] hover:text-[var(--color-danger)] gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
