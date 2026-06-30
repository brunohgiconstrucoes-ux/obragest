/** Parses a pt-BR formatted currency string ("1.234,56") into centavos (integer). */
export function parseCentavos(str: string): number {
  return Math.round(parseFloat(str.replace(/\./g, '').replace(',', '.')) * 100)
}

/** Returns today's date as YYYY-MM-DD in local time. */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}
