import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Plane,
  Clock,
  Calendar,
  Building2,
  Armchair,
  ArrowRight,
  ExternalLink,
  Luggage,
} from 'lucide-react'
import type { FlightVoucherData } from '@/types/flight'
import { VoucherDetailModal } from './VoucherDetailModal'

interface FlightCardProps {
  flightData?: FlightVoucherData | null
  pnr?: string
  dates?: string[]
  clientName?: string
  clientCompany?: string
  travelType?: string
  compact?: boolean
  className?: string
  onOpenDetails?: () => void
}

export function FlightCard({
  flightData,
  pnr,
  dates,
  clientName,
  clientCompany,
  travelType,
  compact = false,
  className = '',
  onOpenDetails,
}: FlightCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const effectivePnr = flightData?.pnr || pnr || '---'
  const segments = flightData?.segments || []
  const mainSegment = segments[0]
  const hasMultipleSegments = segments.length > 1

  const handleOpenVoucher = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenDetails) {
      onOpenDetails()
    } else {
      setModalOpen(true)
    }
  }

  // Se não houver nenhum dado relevante de voo e nem PNR
  if (!flightData && (!pnr || pnr === '---') && (!dates || dates.length === 0)) {
    return null
  }

  return (
    <>
      <Card
        className={`bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800/80 shadow-lg hover:border-blue-500/40 transition-all rounded-xl overflow-hidden group ${className}`}
      >
        <CardContent className={compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}>
          {/* Top Bar: Companhia, PNR, Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition">
                <Plane className="h-4 w-4" />
              </span>
              <div>
                <span className="font-semibold text-white text-xs sm:text-sm block leading-tight">
                  {flightData?.airline || mainSegment?.airline || 'Companhia Aérea'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {mainSegment?.flight_number ? mainSegment.flight_number : 'Itinerário Aéreo'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-slate-800/80 text-cyan-300 border-cyan-500/30 font-mono text-[11px] px-2 py-0.5"
              >
                PNR: {effectivePnr}
              </Badge>
              {mainSegment?.status && (
                <Badge
                  variant="outline"
                  className={`text-[10px] hidden sm:inline-flex ${
                    mainSegment.status.toLowerCase().includes('cancel')
                      ? 'border-red-500/40 text-red-400 bg-red-950/20'
                      : 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                  }`}
                >
                  {mainSegment.status}
                </Badge>
              )}
            </div>
          </div>

          {/* Rota Central: Origem -> Destino com Horários e Duração */}
          {mainSegment ? (
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 mb-3">
              <div className="flex items-center justify-between gap-2">
                {/* Origem */}
                <div className="min-w-0">
                  <span className="text-xl sm:text-2xl font-mono font-black text-white block">
                    {mainSegment.origin_iata || '---'}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-400 font-mono block">
                    {mainSegment.departure_time || '--:--'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block max-w-[120px] sm:max-w-[150px]">
                    {mainSegment.origin_city || 'Origem'}
                  </span>
                </div>

                {/* Linha Central */}
                <div className="flex flex-col items-center justify-center px-2 flex-1 max-w-[160px]">
                  <span className="text-[10px] font-semibold text-blue-400 flex items-center gap-1 mb-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {mainSegment.duration || flightData?.total_duration || 'Voo'}
                  </span>
                  <div className="w-full flex items-center justify-center">
                    <div className="h-0.5 w-full bg-slate-700/80 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-0.5 rounded-full bg-slate-900 border border-blue-500/40 text-blue-400">
                        <ArrowRight className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5">
                    {hasMultipleSegments ? `+${segments.length - 1} conexão(ões)` : 'Direto'}
                  </span>
                </div>

                {/* Destino */}
                <div className="text-right min-w-0">
                  <span className="text-xl sm:text-2xl font-mono font-black text-white block">
                    {mainSegment.destination_iata || '---'}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-400 font-mono block">
                    {mainSegment.arrival_time || '--:--'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block max-w-[120px] sm:max-w-[150px]">
                    {mainSegment.destination_city || 'Destino'}
                  </span>
                </div>
              </div>

              {/* Informações rápidas de rodapé do trecho: Assento, Terminal, Data */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-y-1 gap-x-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  {mainSegment.departure_date && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {mainSegment.departure_date}
                    </span>
                  )}
                  {mainSegment.origin_terminal && (
                    <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                      <Building2 className="h-3 w-3 text-amber-400" />
                      {mainSegment.origin_terminal}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {mainSegment.seat && (
                    <span className="flex items-center gap-1 text-emerald-300 font-medium">
                      <Armchair className="h-3 w-3 text-emerald-400" />
                      Assento: <strong>{mainSegment.seat}</strong>
                    </span>
                  )}
                  {mainSegment.cabin_class && (
                    <span className="text-slate-400 hidden sm:inline">
                      {mainSegment.cabin_class}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Fallback resumido caso não tenhamos segmentos detalhados ainda */
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60 mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Datas Identificadas:</span>
                <span className="text-slate-200 font-medium">
                  {dates && dates.length > 0 ? dates.join(', ') : 'Em aberto'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tipo de Viagem:</span>
                <span className="text-blue-300 font-medium">{travelType || 'Aéreo Nacional'}</span>
              </div>
            </div>
          )}

          {/* Botão de Ação: Entrar no Voucher / Detalhes Completos */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              {clientName ? `Passageiro: ${clientName.split(' ')[0]}` : 'Voucher Eletrônico'}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenVoucher}
              className="h-8 px-3 text-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-white border-blue-500/30 hover:border-blue-500 transition-all font-medium flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Entrar no Voucher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Completo do Voucher */}
      <VoucherDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        voucherData={flightData}
        pnr={effectivePnr}
        dates={dates}
        clientName={clientName}
        clientCompany={clientCompany}
        travelType={travelType}
      />
    </>
  )
}
