import { SearchableSelect } from '@/components/SearchableSelect'
import { STATE_OPTIONS, normalizeStateValue } from '@/lib/brazilian-states'
import { useIbgeCities } from '@/hooks/use-ibge-cities'
import { Label } from '@/components/ui/label'

interface StateCitySelectProps {
  stateValue: string
  cityValue: string
  onStateChange: (value: string) => void
  onCityChange: (value: string) => void
  compact?: boolean
}

export function StateCitySelect({
  stateValue,
  cityValue,
  onStateChange,
  onCityChange,
  compact = false,
}: StateCitySelectProps) {
  const normalizedState = normalizeStateValue(stateValue)
  const { cities, loading, error } = useIbgeCities(normalizedState)

  const handleStateChange = (value: string) => {
    onStateChange(value)
    onCityChange('')
  }

  const labelClass = compact ? 'text-xs font-semibold text-slate-600' : 'text-xs'
  const selectClass = compact ? 'h-9 text-xs' : undefined
  const spacingClass = compact ? 'space-y-1' : 'space-y-1.5'

  const cityPlaceholder = !normalizedState
    ? 'Selecione um estado primeiro'
    : loading
      ? 'Carregando cidades...'
      : 'Selecione a cidade'

  return (
    <>
      <div className={spacingClass}>
        <Label className={labelClass}>Cidade</Label>
        <SearchableSelect
          options={cities}
          value={cityValue}
          onValueChange={onCityChange}
          placeholder={cityPlaceholder}
          emptyText="Nenhuma cidade encontrada."
          className={selectClass}
          disabled={!normalizedState || loading}
        />
        {error && (
          <p className="text-xs text-red-500">Erro ao carregar cidades. Tente novamente.</p>
        )}
      </div>
      <div className={spacingClass}>
        <Label className={labelClass}>Estado</Label>
        <SearchableSelect
          options={STATE_OPTIONS}
          value={normalizedState}
          onValueChange={handleStateChange}
          placeholder="Selecione o estado"
          emptyText="Nenhum estado encontrado."
          className={selectClass}
        />
      </div>
    </>
  )
}
