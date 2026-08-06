export const COMMERCIAL_BASE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NO/NE', label: 'NO/NE' },
  { value: 'CO', label: 'CO' },
  { value: 'RJ/ES/MG', label: 'RJ/ES/MG' },
  { value: 'SAO', label: 'SAO' },
  { value: 'SPI', label: 'SPI' },
  { value: 'SUL', label: 'SUL' },
  { value: 'LOT', label: 'LOT' },
  { value: 'INSIDE SALES', label: 'INSIDE SALES' },
]

export const COMMERCIAL_BASE_VALUES = COMMERCIAL_BASE_OPTIONS.map((o) => o.value)

export function getBaseLabel(value: string): string {
  return COMMERCIAL_BASE_OPTIONS.find((o) => o.value === value)?.label ?? value
}
