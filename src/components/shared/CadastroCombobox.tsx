import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )

  const exactMatch = items.some(i => i.label.toLowerCase() === query.toLowerCase())

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
            !value && 'text-[var(--color-muted)]',
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 bg-[var(--color-surface)] border-[var(--color-border)]"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar..."
            value={query}
            onValueChange={setQuery}
            className="text-[var(--color-text)]"
          />
          <CommandList>
            <CommandEmpty>
              {!query.trim() && (
                <p className="py-3 text-center text-xs text-[var(--color-muted)]">Nenhum resultado.</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(item => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.label)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="text-[var(--color-text)] aria-selected:bg-[var(--color-surface-2)]"
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', value === item.label ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{item.label}</span>
                  {item.sub && (
                    <span className="ml-2 text-xs text-[var(--color-muted)] shrink-0">{item.sub}</span>
                  )}
                </CommandItem>
              ))}
              {query.trim() && !exactMatch && (
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={handleCreate}
                  className="text-[var(--color-primary)] aria-selected:bg-[var(--color-surface-2)]"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  {creating ? 'Cadastrando...' : `Cadastrar "${query.trim()}"`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
