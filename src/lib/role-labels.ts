import { UserRole } from '@/types/service_record'

export const ROLE_LABELS: Record<UserRole, string> = {
  Gerente: 'Gerente',
  Supervisor: 'Supervisor',
  Líder: 'Líder',
  Consultor: 'Consultor',
  'Executivo de Contas': 'Executivo de Contas',
  Master: 'Master',
  'Gestor Comercial': 'Gestor Comercial',
}

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = (
  Object.keys(ROLE_LABELS) as UserRole[]
).map((value) => ({ value, label: ROLE_LABELS[value] }))

export function getRoleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] || role
}
