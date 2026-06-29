import type { ObraStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<ObraStatus, { label: string; className: string }> = {
  em_andamento: {
    label: 'Em andamento',
    className: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/40',
  },
  paralisada: {
    label: 'Paralisada',
    className: 'bg-[var(--color-muted)]/20 text-[var(--color-muted)] border-[var(--color-muted)]/40',
  },
  concluida: {
    label: 'Concluída',
    className: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/40',
  },
}

export function StatusBadge({ status }: { status: ObraStatus }) {
  const cfg = statusConfig[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', cfg.className)}>
      {cfg.label}
    </Badge>
  )
}
