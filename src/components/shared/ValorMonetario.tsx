interface ValorMonetarioProps {
  /** Valor em centavos (integer) */
  value: number
  className?: string
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Exibe um valor monetário armazenado em centavos (integer) no banco,
 * formatado como moeda BRL (R$ 1.234,56).
 */
export function ValorMonetario({ value, className = '' }: ValorMonetarioProps) {
  return (
    <span className={`font-mono ${className}`}>
      {fmt.format(value / 100)}
    </span>
  )
}
