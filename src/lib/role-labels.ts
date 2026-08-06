import { UserRole } from '@/types/service_record'

export const ROLE_LABELS: Record<UserRole, string> = {
  Gerentes: 'Gerente',
  Supervisores: 'Supervisor',
  Líderes: 'Líder',
  Consultores: 'Consultor',
  'Executivo de contas': 'Executivo de contas',
  Master: 'Master',
  'Gestor Comercial': 'Gestor Comercial',
}

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = (
  Object.keys(ROLE_LABELS) as UserRole[]
).map((value) => ({ value, label: ROLE_LABELS[value] }))

export function getRoleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] || role
}
