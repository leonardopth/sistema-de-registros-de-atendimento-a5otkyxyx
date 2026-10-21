export interface FlightSegment {
  airline?: string
  airline_code?: string
  flight_number?: string
  origin_iata?: string
  origin_city?: string
  origin_terminal?: string
  origin_gate?: string
  destination_iata?: string
  destination_city?: string
  destination_terminal?: string
  destination_gate?: string
  departure_date?: string
  departure_time?: string
  arrival_date?: string
  arrival_time?: string
  duration?: string
  duration_minutes?: number
  cabin_class?: string
  fare_type?: string
  seat?: string
  status?: string
  stops?: number
  baggage?: string
  aircraft?: string
}

export interface FlightPassenger {
  name: string
  type?: string
  ticket_number?: string
  seat?: string
  frequent_flyer?: string
}

export interface FlightVoucherData {
  pnr?: string
  airline?: string
  airline_code?: string
  ticket_number?: string
  segments?: FlightSegment[]
  passengers?: FlightPassenger[]
  total_duration?: string
  status?: string
  notes?: string
  issued_at?: string
  issuing_agent?: string
}
