import { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, PlusCircle, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientRecord } from '@/types/service_record'
import { createClient } from '@/services/clients'
import { useToast } from '@/hooks/use-toast'

export interface ClientAutocompleteProps {
  clients: ClientRecord[]
  selectedClientId: string
  onSelectClient: (clientId: string, client?: ClientRecord) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  hasError?: boolean
}

function normalizeSearch(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function ClientAutocompleteCombobox({
  clients,
  selectedClientId,
  onSelectClient,
  placeholder = 'Selecione ou busque uma agência/cliente...',
  disabled = false,
  className,
  hasError = false,
}: ClientAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  // Deduplica e ordena a lista de clientes para exibição única por empresa/nome
  const clientOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; client: ClientRecord }>()
    for (const c of clients) {
      const displayName = (c.company?.trim() || c.name?.trim() || '').trim()
      if (!displayName) continue
      const norm = normalizeSearch(displayName)
      if (!map.has(norm)) {
        map.set(norm, { id: c.id, name: displayName, client: c })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [clients])

  const selectedItem = useMemo(() => {
    if (!selectedClientId) return null
    return (
      clientOptions.find((o) => o.id === selectedClientId) ||
      clients.find((c) => c.id === selectedClientId)
    )
  }, [clientOptions, clients, selectedClientId])

  const selectedLabel = selectedItem
    ? 'company' in selectedItem
      ? selectedItem.company || selectedItem.name
      : selectedItem.name
    : ''

  // Verifica se o texto digitado coincide com algum existente
  const trimmedSearch = search.trim()
  const normalizedSearch = normalizeSearch(trimmedSearch)

  const exactMatchExists = useMemo(() => {
    if (!normalizedSearch) return true
    return clientOptions.some((o) => normalizeSearch(o.name) === normalizedSearch)
  }, [clientOptions, normalizedSearch])

  // Filtragem customizada com suporte a ignorar acentos e caixa
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return clientOptions
    return clientOptions.filter((o) => normalizeSearch(o.name).includes(normalizedSearch))
  }, [clientOptions, normalizedSearch])

  const handleCreateNewClient = async (companyName: string) => {
    const cleanName = companyName.trim()
    if (!cleanName) return

    setCreating(true)
    try {
      const newClient = await createClient({
        name: cleanName,
        company: cleanName,
      })
      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `"${cleanName}" agora está disponível.`,
      })
      onSelectClient(newClient.id, newClient)
      setSearch('')
      setOpen(false)
    } catch (err) {
      console.error('Erro ao cadastrar novo cliente via autocomplete:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar cliente',
        description: 'Não foi possível cadastrar o cliente automaticamente. Tente novamente.',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-left h-9 text-xs',
            hasError && 'border-red-500 ring-1 ring-red-500',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <span
            className={cn(
              'truncate flex items-center gap-2',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 z-50 w-[var(--radix-popover-trigger-width)] min-w-[280px]"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar ou cadastrar..."
            value={search}
            onValueChange={setSearch}
            className="h-9 text-xs"
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filteredOptions.length === 0 && exactMatchExists && (
              <CommandEmpty className="py-3 text-xs text-center text-slate-500">
                Nenhum cliente encontrado.
              </CommandEmpty>
            )}

            {filteredOptions.length > 0 && (
              <CommandGroup heading="Clientes cadastrados">
                {filteredOptions.map((option) => {
                  const isSelected = selectedClientId === option.id
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => {
                        onSelectClient(option.id, option.client)
                        setSearch('')
                        setOpen(false)
                      }}
                      className="text-xs cursor-pointer flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Check
                          className={cn(
                            'h-3.5 w-3.5 text-indigo-600',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate font-medium text-slate-800">{option.name}</span>
                      </div>
                      {option.client.city && option.client.state && (
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {option.client.city}/{option.client.state}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {/* Fallback controlado: cadastrar novo cliente se o texto digitado não coincidir exatamente */}
            {trimmedSearch.length > 1 && !exactMatchExists && (
              <>
                {filteredOptions.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Novo cadastro">
                  <CommandItem
                    value={`__create_${trimmedSearch}__`}
                    onSelect={() => handleCreateNewClient(trimmedSearch)}
                    disabled={creating}
                    className="text-xs text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-semibold cursor-pointer py-2.5 flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      Cadastrar novo cliente: &ldquo;
                      <strong className="text-indigo-900">{trimmedSearch}</strong>&rdquo;
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
