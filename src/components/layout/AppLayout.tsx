import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen blueprint-bg" style={{ background: 'var(--blueprint)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
