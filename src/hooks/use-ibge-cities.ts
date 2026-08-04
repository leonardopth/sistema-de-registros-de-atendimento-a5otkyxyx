import { useState, useEffect } from 'react'

interface IbgeMunicipio {
  id: number
  nome: string
}

export interface CityOption {
  value: string
  label: string
}

export function useIbgeCities(uf: string) {
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!uf) {
      setCities([])
      setError(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cities')
        return res.json()
      })
      .then((data: IbgeMunicipio[]) => {
        if (cancelled) return
        setCities(
          data
            .map((m) => ({ value: m.nome, label: m.nome }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        )
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCities([])
        setError(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [uf])

  return { cities, loading, error }
}
