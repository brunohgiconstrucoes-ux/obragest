import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { value: string; label: string; sub?: string }

type CadastroComboboxProps = {
  items: Item[]
  value: string
  onChange: (value: string) => void
  onCreateNew: (text: string) => Promise<void>
  placeholder?: string
  className?: string
}

export function CadastroCombobox({
  items,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Selecionar...',
  className,
}: CadastroComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )
  const exactMatch = items.some(i => i.label.toLowerCase() === query.toLowerCase())

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  async function handleCreate() {
    if (!query.trim() || creating) return
    setCreating(true)
    await onCreateNew(query.trim())
    onChange(query.trim())
    setCreating(false)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex justify-between items-center px-3 py-2 rounded-md border text-sm',
          'bg-[var(--color-surface-2)] border-[var(--color-border)]',
          value ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-[200] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center px-3 py-2 border-b border-[var(--color-border)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && !query.trim() && (
              <li className="py-3 text-center text-xs text-[var(--color-muted)]">
                Nenhum resultado.
              </li>
            )}
            {filtered.map(item => (
              <li
                key={item.value}
                onMouseDown={e => {
                  e.preventDefault()
                  onChange(item.label)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-2)] text-[var(--color-text)]"
              >
                <Check
                  className={cn('mr-2 h-4 w-4 shrink-0', value === item.label ? 'opacity-100' : 'opacity-0')}
                />
                <span className="truncate">{item.label}</span>
                {item.sub && (
                  <span className="ml-2 text-xs text-[var(--color-muted)] shrink-0">{item.sub}</span>
                )}
              </li>
            ))}
            {query.trim() && !exactMatch && (
              <li
                onMouseDown={e => {
                  e.preventDefault()
                  handleCreate()
                }}
                className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-2)] text-[var(--color-primary)]"
              >
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                {creating ? 'Cadastrando...' : `Cadastrar "${query.trim()}"`}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
