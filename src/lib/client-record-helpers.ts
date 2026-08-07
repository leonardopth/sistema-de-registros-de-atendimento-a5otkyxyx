import { ServiceRecord, ClientRecord, AgentRecord } from '@/types/service_record'

/**
 * Checks if a service record belongs to a specific client/company.
 */
export function isRecordForClient(
  r: ServiceRecord,
  client?: ClientRecord | null,
  clientId?: string,
  companyName?: string,
): boolean {
  if (!r) return false

  const targetClientId = clientId || client?.id
  const targetCompany = (companyName || client?.company || '').trim().toLowerCase()
  const targetClientName = (client?.name || '').trim().toLowerCase()
  const targetClientEmail = (client?.email || '').trim().toLowerCase()

  // 1. Direct relation match
  if (targetClientId) {
    if (r.client === targetClientId || r.expand?.client?.id === targetClientId) {
      return true
    }
  }

  // 2. Company name match
  if (targetCompany && r.client_company) {
    if (r.client_company.trim().toLowerCase() === targetCompany) {
      return true
    }
  }

  // 3. Client contact name / email match (for fallback)
  if (targetClientName && r.client_name) {
    if (r.client_name.trim().toLowerCase() === targetClientName) {
      return true
    }
  }

  if (targetClientEmail && r.client_email) {
    if (r.client_email.trim().toLowerCase() === targetClientEmail) {
      return true
    }
  }

  return false
}

/**
 * Checks if a service record belongs to a specific agent.
 */
export function isRecordForAgent(r: ServiceRecord, agent: AgentRecord): boolean {
  if (!r || !agent) return false

  // 1. Direct relation match by agent ID
  if (r.agent === agent.id || r.expand?.agent?.id === agent.id) {
    return true
  }

  // 2. Match by assigned_agent string name
  if (r.assigned_agent && agent.name) {
    if (r.assigned_agent.trim().toLowerCase() === agent.name.trim().toLowerCase()) {
      return true
    }
  }

  return false
}
