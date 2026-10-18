import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Settings2, Check, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { WaiverConfigRecord } from '@/types/waiver'
import { updateWaiverConfig } from '@/services/waivers'

interface WaiverSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: WaiverConfigRecord | null
  onConfigUpdated: () => void
}

export function WaiverSettingsModal({
  open,
  onOpenChange,
  config,
  onConfigUpdated,
}: WaiverSettingsModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // Estados locais para edição das listas
  const [units, setUnits] = useState<string[]>(() => config?.units || [])
  const [approversLatam, setApproversLatam] = useState<string[]>(
    () => config?.approvers_latam || [],
  )
  const [approversAfkl, setApproversAfkl] = useState<string[]>(() => config?.approvers_afkl || [])
  const [approversAssistencia, setApproversAssistencia] = useState<string[]>(
    () => config?.approvers_assistencia || [],
  )
  const [approversGol, setApproversGol] = useState<string[]>(() => config?.approvers_gol || [])
  const [approversAa, setApproversAa] = useState<string[]>(() => config?.approvers_aa || [])
  const [approversLatam2, setApproversLatam2] = useState<string[]>(
    () => config?.approvers_latam2 || [],
  )
  const [approversDefault, setApproversDefault] = useState<string[]>(
    () => config?.approvers_default || [],
  )

  // Inputs temporários para adicionar novos itens
  const [newUnit, setNewUnit] = useState('')
  const [newLatam, setNewLatam] = useState('')
  const [newAfkl, setNewAfkl] = useState('')
  const [newAssistencia, setNewAssistencia] = useState('')
  const [newGol, setNewGol] = useState('')
  const [newAa, setNewAa] = useState('')
  const [newLatam2, setNewLatam2] = useState('')
  const [newDefault, setNewDefault] = useState('')

  // Sincroniza quando abrir
  React.useEffect(() => {
    if (config && open) {
      setUnits(config.units || [])
      setApproversLatam(config.approvers_latam || [])
      setApproversAfkl(config.approvers_afkl || [])
      setApproversAssistencia(config.approvers_assistencia || [])
      setApproversGol(config.approvers_gol || [])
      setApproversAa(config.approvers_aa || [])
      setApproversLatam2(config.approvers_latam2 || [])
      setApproversDefault(config.approvers_default || [])
    }
  }, [config, open])

  const handleAddItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    setVal: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (list.includes(trimmed)) {
      toast({
        title: 'Item já cadastrado',
        description: 'Esse item já está presente na lista.',
        variant: 'destructive',
      })
      return
    }
    setList((prev) => [...prev, trimmed])
    setVal('')
  }

  const handleRemoveItem = (
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setList((prev) => prev.filter((i) => i !== item))
  }

  const handleSave = async () => {
    if (!config?.id) return
    setSaving(true)
    try {
      await updateWaiverConfig(config.id, {
        units,
        approvers_latam: approversLatam,
        approvers_afkl: approversAfkl,
        approvers_assistencia: approversAssistencia,
        approvers_gol: approversGol,
        approvers_aa: approversAa,
        approvers_latam2: approversLatam2,
        approvers_default: approversDefault,
      })

      toast({
        title: 'Parâmetros atualizados',
        description: 'As listas de Unidades e Aprovadores foram salvas com sucesso.',
      })
      onConfigUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar parâmetros',
        description: 'Não foi possível gravar as alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const renderTagManager = (
    title: string,
    description: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    newItem: string,
    setNewItem: React.Dispatch<React.SetStateAction<string>>,
    placeholder: string,
  ) => (
    <div className="space-y-3 pt-2">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newItem}
          placeholder={placeholder}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddItem(list, setList, newItem, setNewItem)
            }
          }}
          className="text-sm"
        />
        <Button
          type="button"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          onClick={() => handleAddItem(list, setList, newItem, setNewItem)}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[90px] max-h-[220px] overflow-y-auto">
        {list.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Nenhum item cadastrado.</span>
        ) : (
          list.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="text-xs py-1 px-2.5 bg-white border border-slate-300 text-slate-700 flex items-center gap-1.5 shadow-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(setList, item)}
                className="text-slate-400 hover:text-red-600 transition-colors"
                title="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <p className="text-[11px] text-slate-400">Total: {list.length} itens configurados</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Parâmetros de Waivers & Favors
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gerencie as opções do dropdown de Unidades e Aprovadores para cada companhia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="units" className="w-full mt-2">
          <TabsList className="grid grid-cols-7 w-full text-xs">
            <TabsTrigger value="units">Unidades</TabsTrigger>
            <TabsTrigger value="gol">GOL</TabsTrigger>
            <TabsTrigger value="aa">American</TabsTrigger>
            <TabsTrigger value="latam2">LATAM Descontos</TabsTrigger>
            <TabsTrigger value="latam">LATAM Isenções</TabsTrigger>
            <TabsTrigger value="afkl">AF / KL</TabsTrigger>
            <TabsTrigger value="assistencia">Aeroportos</TabsTrigger>
          </TabsList>

          <TabsContent value="units">
            {renderTagManager(
              'Unidades / Núcleos de Atendimento',
              'Lista de unidades disponíveis no dropdown UNIDADE de todos os formulários.',
              units,
              setUnits,
              newUnit,
              setNewUnit,
              'Nome da unidade (ex: Concierge, SAO, SUL)',
            )}
          </TabsContent>

          <TabsContent value="latam">
            {renderTagManager(
              'Aprovadores — LATAM',
              'Gestores e responsáveis que aparecem no campo APROVADOR para solicitações LATAM.',
              approversLatam,
              setApproversLatam,
              newLatam,
              setNewLatam,
              'Nome do aprovador (ex: Katia Vieira, Ruana Recio)',
            )}
          </TabsContent>

          <TabsContent value="afkl">
            {renderTagManager(
              'Aprovadores — Air France / KLM',
              'Gestores e responsáveis que aparecem no campo APROVADOR para solicitações AF/KL.',
              approversAfkl,
              setApproversAfkl,
              newAfkl,
              setNewAfkl,
              'Nome do aprovador (ex: Anderson Salva, Paulo Lobao)',
            )}
          </TabsContent>

          <TabsContent value="gol">
            {renderTagManager(
              'Aprovadores — Cota Valorada GOL',
              'Gestores e responsáveis que aparecem no campo APROVADOR para solicitações GOL.',
              approversGol,
              setApproversGol,
              newGol,
              setNewGol,
              'Nome do aprovador (ex: Supervisão GOL, Coordenação)',
            )}
          </TabsContent>

          <TabsContent value="aa">
            {renderTagManager(
              'Aprovadores — American Airlines',
              'Gestores e responsáveis que aparecem no campo APROVADOR para solicitações American Airlines.',
              approversAa,
              setApproversAa,
              newAa,
              setNewAa,
              'Nome do aprovador (ex: Supervisão American, Gerência)',
            )}
          </TabsContent>

          <TabsContent value="latam2">
            {renderTagManager(
              'Aprovadores — Descontos Manuais LATAM',
              'Gestores e responsáveis que aparecem no campo APROVADOR para Descontos Manuais LATAM.',
              approversLatam2,
              setApproversLatam2,
              newLatam2,
              setNewLatam2,
              'Nome do aprovador (ex: Katia Vieira, Ruana Recio, Gestor)',
            )}
          </TabsContent>

          <TabsContent value="assistencia">
            {renderTagManager(
              'Aprovadores — Assistência Aeroporto',
              'Gestores e responsáveis pelo despacho ou suporte das solicitações de aeroporto.',
              approversAssistencia,
              setApproversAssistencia,
              newAssistencia,
              setNewAssistencia,
              'Nome do aprovador (ex: Plantão CCO, Coordenação)',
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
