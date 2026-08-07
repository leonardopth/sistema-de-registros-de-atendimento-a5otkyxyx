import { ServiceRecord, ClientRecord, AgentRecord } from '@/types/service_record'

function cleanStr(str?: string | null): string {
  if (!str) return ''
  return str.trim().toLowerCase()
}

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
  const targetCompanyName = cleanStr(companyName || client?.company || client?.name)

  // 1. Direct relation match on client field or expanded client
  if (targetClientId) {
    if (r.client && r.client === targetClientId) return true
    if (r.expand?.client?.id && r.expand.client.id === targetClientId) return true
  }

  // 2. Relation match on agent's client_id if expanded
  if (targetClientId && r.expand?.agent?.client_id === targetClientId) {
    return true
  }

  // 3. Match against targetCompanyName
  if (targetCompanyName) {
    const recCompany = cleanStr(r.client_company)
    const recName = cleanStr(r.client_name)
    const expCompany = cleanStr(r.expand?.client?.company)
    const expName = cleanStr(r.expand?.client?.name)

    if (recCompany && recCompany === targetCompanyName) return true
    if (recName && recName === targetCompanyName) return true
    if (expCompany && expCompany === targetCompanyName) return true
    if (expName && expName === targetCompanyName) return true
  }

  // 4. If client object provided, match client's name or company against record
  if (client) {
    const cName = cleanStr(client.name)
    const cComp = cleanStr(client.company)
    const recCompany = cleanStr(r.client_company)
    const recName = cleanStr(r.client_name)

    if (cName && (recCompany === cName || recName === cName)) return true
    if (cComp && (recCompany === cComp || recName === cComp)) return true
  }

  return false
}

/**
 * Checks if a service record belongs to a specific agent.
 */
export function isRecordForAgent(r: ServiceRecord, agent: AgentRecord): boolean {
  if (!r || !agent) return false

  // 1. Direct relation match on agent field or expanded agent
  if (r.agent && r.agent === agent.id) return true
  if (r.expand?.agent?.id && r.expand.agent.id === agent.id) return true

  // 2. Match on assigned_agent field when it contains agent ID
  if (r.assigned_agent && r.assigned_agent === agent.id) return true

  // 3. Match on agent name against assigned_agent or expand.agent.name
  const agentName = cleanStr(agent.name)
  if (agentName) {
    const assignedAgent = cleanStr(r.assigned_agent)
    const expandedAgentName = cleanStr(r.expand?.agent?.name)

    if (assignedAgent && assignedAgent === agentName) return true
    if (expandedAgentName && expandedAgentName === agentName) return true
  }

  return false
}
