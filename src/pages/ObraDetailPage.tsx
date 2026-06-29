import { Link, useParams } from 'react-router-dom'

export function ObraDetailPage() {
  const { id } = useParams()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Detalhe da Obra</h1>
      <p className="text-[var(--color-muted)] text-sm">ID: {id}</p>
      <div className="flex flex-wrap gap-2">
        <Link to={`/obras/${id}/planilha`} className="text-[var(--color-pj)] underline text-sm">
          Planilha
        </Link>
        <Link to={`/obras/${id}/medicoes`} className="text-[var(--color-pj)] underline text-sm">
          Medições
        </Link>
        <Link to={`/obras/${id}/materiais`} className="text-[var(--color-pj)] underline text-sm">
          Materiais
        </Link>
        <Link to={`/obras/${id}/mao-de-obra`} className="text-[var(--color-pj)] underline text-sm">
          Mão de obra
        </Link>
        <Link to={`/obras/${id}/fluxo`} className="text-[var(--color-pj)] underline text-sm">
          Fluxo
        </Link>
        <Link to={`/obras/${id}/editar`} className="text-[var(--color-primary)] underline text-sm">
          Editar obra
        </Link>
      </div>
      <p className="text-[var(--color-muted)] text-xs">(Detalhe completo com abas — implementado em tarefa futura)</p>
    </div>
  )
}
