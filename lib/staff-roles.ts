export const STAFF_ROLES = [
  {
    id: 'web-dev',
    title: 'Web Geliştirici',
    slots: 1,
    blurb: 'Lonca sitesi, panel ve duyuru altyapısı',
  },
  {
    id: 'raid-leader',
    title: 'Raid Lider',
    slots: 1,
    blurb: 'Kadroyu kurar, pull ve stratejiyi yönetir',
  },
  {
    id: 'recruiter',
    title: 'Guild Alım Sorumlusu',
    slots: 3,
    blurb: 'Başvuruları inceler, adaylarla konuşur',
  },
  {
    id: 'profession-org',
    title: 'Meslek Organizatörü',
    slots: 2,
    blurb: 'Craft, farm ve lonca bankasını koordine eder',
  },
  {
    id: 'loot-master',
    title: 'Loot Master',
    slots: 2,
    blurb: 'Raid loot dağıtımını adil ve net tutar',
  },
] as const

export type StaffRoleId = (typeof STAFF_ROLES)[number]['id']

const ROLE_IDS = new Set<string>(STAFF_ROLES.map((role) => role.id))

export function isStaffRoleId(value: string): value is StaffRoleId {
  return ROLE_IDS.has(value)
}

export function sanitizeStaffInterests(values: unknown): StaffRoleId[] {
  if (!Array.isArray(values)) return []
  const unique = new Set<StaffRoleId>()
  for (const value of values) {
    if (typeof value === 'string' && isStaffRoleId(value)) unique.add(value)
  }
  return STAFF_ROLES.map((role) => role.id).filter((id) => unique.has(id))
}

export function staffRoleById(id: string) {
  return STAFF_ROLES.find((role) => role.id === id)
}

export function openPositionsLabel(slots: number) {
  return `${slots} Açık pozisyon`
}
