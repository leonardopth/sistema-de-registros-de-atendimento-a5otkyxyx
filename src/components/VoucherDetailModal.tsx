import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Plane,
  Clock,
  Calendar,
  Luggage,
  Armchair,
  MapPin,
  Building2,
  Users,
  Ticket,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useState } from 'react'
import type { FlightVoucherData } from '@/types/flight'
import { useToast } from '@/hooks/use-toast'

interface VoucherDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherData?: FlightVoucherData | null
  pnr?: string
  dates?: string[]
  clientName?: string
  clientCompany?: string
  travelType?: string
}

export function VoucherDetailModal({
  open,
  onOpenChange,
  voucherData,
  pnr,
  dates,
  clientName,
  clientCompany,
  travelType,
}: VoucherDetailModalProps) {
  const { toast } = useToast()
  const [copiedPnr, setCopiedPnr] = useState(false)
  const [copiedTicket, setCopiedTicket] = useState(false)

  const effectivePnr = voucherData?.pnr || pnr || 'NÃO INFORMADO'
  const segments = voucherData?.segments || []
  const passengers = voucherData?.passengers || []
  const mainSegment = segments[0]

  const handleCopyPnr = () => {
    if (!effectivePnr || effectivePnr === 'NÃO INFORMADO') return
    navigator.clipboard.writeText(effectivePnr)
    setCopiedPnr(true)
    toast({
      title: 'Localizador copiado!',
      description: `Código PNR ${effectivePnr} copiado para a área de transferência.`,
    })
    setTimeout(() => setCopiedPnr(false), 2000)
  }

  const handleCopyTicket = (ticketNo?: string) => {
    if (!ticketNo) return
    navigator.clipboard.writeText(ticketNo)
    setCopiedTicket(true)
    toast({
      title: 'Bilhete copiado!',
      description: `Bilhete ${ticketNo} copiado.`,
    })
    setTimeout(() => setCopiedTicket(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl p-0">
        {/* Cabeçalho estilo Bilhete / Voucher Aéreo */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Plane className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
                  Voucher & Detalhes do Bilhete Aéreo
                </span>
                {travelType && (
                  <Badge variant="outline" className="border-blue-500/40 text-blue-300 text-[10px]">
                    {travelType}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                {voucherData?.airline || mainSegment?.airline || 'Companhia Aérea Corporativa'}
                {mainSegment?.flight_number && (
                  <span className="text-sm font-mono font-medium px-2 py-0.5 rounded bg-slate-800/80 text-blue-300 border border-slate-700">
                    {mainSegment.flight_number}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                {clientName && `Passageiro / Solicitante: ${clientName}`}
                {clientCompany && ` • ${clientCompany}`}
              </DialogDescription>
            </div>

            {/* Caixa PNR Destacada */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 border border-blue-500/30 rounded-xl px-4 py-2.5 shadow-inner">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                  Localizador (PNR)
                </span>
                <span className="text-xl font-mono font-black text-cyan-400 tracking-wider">
                  {effectivePnr}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyPnr}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
                title="Copiar PNR"
              >
                {copiedPnr ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Corpo com Itinerário, Horários, Assentos, Terminal */}
        <div className="p-6 space-y-6">
          {/* Se houver segmentos de voo */}
          {segments.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-blue-400" />
                  Itinerário de Voos ({segments.length}{' '}
                  {segments.length === 1 ? 'trecho' : 'trechos'})
                </h3>
                {voucherData?.total_duration && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Tempo total estimado:{' '}
                    <strong className="text-slate-200">{voucherData.total_duration}</strong>
                  </span>
                )}
              </div>

              {segments.map((seg, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition hover:border-slate-700"
                >
                  {/* Segment Bar */}
                  <div className="bg-slate-800/40 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {seg.airline || 'Companhia Aérea'}
                      </span>
                      {seg.flight_number && (
                        <span className="font-mono text-slate-400">({seg.flight_number})</span>
                      )}
                      {seg.aircraft && (
                        <span className="text-slate-500 hidden sm:inline">• {seg.aircraft}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {seg.status && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            seg.status.toLowerCase().includes('cancel') ||
                            seg.status.toLowerCase().includes('risco')
                              ? 'border-red-500/40 text-red-400 bg-red-950/20'
                              : 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                          }`}
                        >
                          {seg.status}
                        </Badge>
                      )}
                      {seg.cabin_class && (
                        <span className="text-[11px] text-blue-300 font-medium">
                          {seg.cabin_class}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalhes Origem / Destino com Horários e Terminais */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Origem */}
                      <div className="md:col-span-5 space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-mono font-black text-white tracking-wider">
                            {seg.origin_iata || '---'}
                          </span>
                          <span className="text-xl font-bold text-cyan-300 font-mono">
                            {seg.departure_time || '--:--'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          {seg.origin_city || 'Origem não informada'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-amber-300/90">
                            <Building2 className="h-3 w-3" />
                            {seg.origin_terminal || 'Terminal a confirmar'}
                          </span>
                          {seg.origin_gate && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {seg.origin_gate}
                            </span>
                          )}
                          {seg.departure_date && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {seg.departure_date}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha Central: Duração e Conexões */}
                      <div className="md:col-span-2 flex flex-col items-center justify-center py-2 md:py-0">
                        <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3" />
                          {seg.duration || 'Direto'}
                        </span>
                        <div className="w-full flex items-center justify-center">
                          <div className="h-0.5 w-full bg-slate-700 relative">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-900 border border-blue-500/40 text-blue-400">
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">
                          {seg.stops && seg.stops > 0
                            ? `${seg.stops} parada(s)`
                            : 'Voo sem escalas'}
                        </span>
                      </div>

                      {/* Destino */}
                      <div className="md:col-span-5 space-y-1 text-left md:text-right">
                        <div className="flex md:justify-end items-baseline gap-2">
                          <span className="text-xl font-bold text-cyan-300 font-mono">
                            {seg.arrival_time || '--:--'}
                          </span>
                          <span className="text-3xl font-mono font-black text-white tracking-wider">
                            {seg.destination_iata || '---'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          {seg.destination_city || 'Destino não informado'}
                        </p>
                        <div className="flex flex-wrap md:justify-end items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1 text-amber-300/90">
                            <Building2 className="h-3 w-3" />
                            {seg.destination_terminal || 'Terminal a confirmar'}
                          </span>
                          {seg.destination_gate && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {seg.destination_gate}
                            </span>
                          )}
                          {seg.arrival_date && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {seg.arrival_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra de Atributos Secundários: Assento, Bagagem, Tarifa */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                        <Armchair className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Assento
                          </span>
                          <span className="text-sm font-mono font-bold text-emerald-300">
                            {seg.seat || 'A definir'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                        <Luggage className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Franquia Bagagem
                          </span>
                          <span className="text-xs text-slate-300 line-clamp-1">
                            {seg.baggage || 'Padrão da cia'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                        <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Tarifa
                          </span>
                          <span className="text-xs text-slate-300">
                            {seg.fare_type || 'Corporativa'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                        <Building2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Terminal Embarque
                          </span>
                          <span className="text-xs font-medium text-amber-200">
                            {seg.origin_terminal || 'Terminal Principal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback elegante quando não houver segmentos completos cadastrados */
            <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
              <Info className="h-8 w-8 text-blue-400 mx-auto" />
              <div>
                <h4 className="text-base font-semibold text-white">
                  Informações Básicas de Reserva
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Os detalhes completos de trechos e horários ainda não foram sincronizados para
                  este PNR. Abaixo estão os dados capturados da conversa.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Localizador</span>
                  <span className="text-lg font-mono font-bold text-cyan-400">{effectivePnr}</span>
                </div>
                {dates && dates.length > 0 && (
                  <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">
                      Datas Identificadas
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{dates.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Passageiros do Voucher */}
          {passengers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Passageiros Confirmados ({passengers.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passengers.map((p, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-white text-sm block">{p.name}</span>
                        {p.type && <span className="text-[11px] text-slate-400">{p.type}</span>}
                      </div>
                      {p.seat && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-300 text-xs"
                        >
                          Assento {p.seat}
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                      {p.ticket_number && (
                        <div className="flex items-center gap-1.5">
                          <Ticket className="h-3 w-3 text-slate-500" />
                          <span className="font-mono text-slate-300 text-[11px]">
                            {p.ticket_number}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyTicket(p.ticket_number)}
                            className="h-5 w-5 text-slate-500 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {p.frequent_flyer && (
                        <span className="text-[11px] text-blue-300/80">{p.frequent_flyer}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bilhete Eletrônico / ETKT e Observações */}
          {voucherData?.ticket_number && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Número do Bilhete Eletrônico (ETKT Principal)
                </span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {voucherData.ticket_number}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyTicket(voucherData.ticket_number)}
                className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200"
              >
                {copiedTicket ? (
                  <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                )}
                Copiar e-Ticket
              </Button>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-slate-900/80 border-t border-slate-800 p-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Dados validados e sincronizados pelo HUB AI Engine
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Fechar Voucher
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
