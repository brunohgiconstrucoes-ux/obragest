import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/toaster'
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
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        Carregando...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
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
