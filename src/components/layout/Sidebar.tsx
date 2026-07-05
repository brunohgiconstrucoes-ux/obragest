import { Link, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Building2, Users, Wallet, Warehouse, Wrench, Bell,
  BarChart3, FileText, Settings, LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAlertas } from '@/hooks/useAlertas'
import { cn } from '@/lib/utils'

const navItems = [
  { num: '01', icon: LayoutGrid, label: 'Dashboard',     href: '/' },
  { num: '02', icon: Building2,  label: 'Obras',         href: '/obras' },
  { num: '03', icon: Users,      label: 'Cadastros',     href: '/cadastros' },
  { num: '04', icon: Wallet,     label: 'Fluxo de Caixa',href: '/fluxo/pj' },
  { num: '05', icon: Warehouse,  label: 'Almoxarifado',  href: '/almoxarifado' },
  { num: '06', icon: Wrench,     label: 'Equipamentos',  href: '/equipamentos' },
  { num: '07', icon: Bell,       label: 'Alertas',       href: '/alertas', badge: true },
  { num: '08', icon: BarChart3,  label: 'DRE',           href: '/dre' },
  { num: '09', icon: FileText,   label: 'Contador',      href: '/contador' },
  { num: '10', icon: Settings,   label: 'Configurações', href: '/configuracoes' },
]

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export function Sidebar() {
  const { perfil, signOut } = useAuth()
  const location = useLocation()
  const { alertas } = useAlertas()
  const totalAlertas = alertas.length
  const temCritico = alertas.some(a => a.severidade === 'critico')

  const companyName = perfil?.razao_social ?? 'HGI Construções'
  const companyInitials = initials(companyName)
  const userName = perfil?.nome_completo ?? perfil?.razao_social ?? 'Usuário'
  const userInitials = initials(userName)

  return (
    <aside
      className="w-[200px] min-h-screen flex flex-col shrink-0"
      style={{ background: 'var(--blueprint-deep)', borderRight: '1px solid var(--cyan-dim)' }}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--cyan-dim)' }}>
        {perfil?.logo_url ? (
          <img src={perfil.logo_url} alt="Logo" className="h-10 object-contain w-full" />
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-sm shrink-0"
              style={{ background: 'var(--cyan-dim)', border: '1px solid var(--cyan-line)' }}
            >
              <span className="font-mono-bp text-xs font-500 text-[var(--cyan-line)]">
                {companyInitials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-display font-600 text-xs text-white uppercase tracking-wider leading-tight truncate">
                {companyName}
              </p>
              <p className="bp-label mt-0.5">Controladoria · V1</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 py-3">
        {navItems.map(({ num, icon: Icon, label, href, badge }) => {
          const active = location.pathname === href ||
            (href !== '/' && location.pathname.startsWith(href))
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 text-xs transition-all relative group',
                active
                  ? 'text-white'
                  : 'text-[var(--ink-muted)] hover:text-white'
              )}
              style={active ? {
                background: 'rgba(125, 211, 252, 0.08)',
                borderLeft: '2px solid var(--cyan-line)',
              } : {
                borderLeft: '2px solid transparent',
              }}
            >
              <span
                className="font-mono-bp shrink-0"
                style={{ fontSize: '0.6rem', color: active ? 'var(--cyan-line)' : 'inherit' }}
              >
                {num}
              </span>
              <Icon
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: active ? 'var(--cyan-line)' : 'inherit' }}
              />
              <span className="font-body flex-1 truncate" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                {label}
              </span>
              {badge && totalAlertas > 0 && (
                <span
                  className="font-mono-bp text-[0.55rem] font-500 px-1 py-px rounded-sm min-w-[1.1rem] text-center"
                  style={{
                    background: temCritico ? 'var(--negative)' : 'var(--amber)',
                    color: '#000',
                  }}
                >
                  {totalAlertas}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User profile ──────────────────────────────────── */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--cyan-dim)' }}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: 'rgba(125, 211, 252, 0.12)', border: '1px solid var(--cyan-dim)' }}
          >
            <span className="font-mono-bp text-[0.6rem] font-500 text-[var(--cyan-line)]">
              {userInitials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white truncate" style={{ fontSize: '0.7rem', fontWeight: 500 }}>
              {userName}
            </p>
            <p className="bp-label mt-0.5 truncate">
              {perfil?.cnpj ?? perfil?.cpf ?? 'Diretor'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 w-full transition-colors"
          style={{ color: 'var(--ink-muted)', fontSize: '0.65rem' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
        >
          <LogOut className="w-3 h-3" />
          <span className="font-mono-bp tracking-wider uppercase">Sair</span>
        </button>
      </div>
    </aside>
  )
}
