import { Code2, Gem, Swords, UserPlus, Wrench, type LucideIcon } from 'lucide-react'
import type { StaffRoleId } from '@/lib/staff-roles'
import { cn } from '@/lib/utils'

const ICONS: Record<StaffRoleId, LucideIcon> = {
  'web-dev': Code2,
  'raid-leader': Swords,
  recruiter: UserPlus,
  'profession-org': Wrench,
  'loot-master': Gem,
}

const TONES: Record<StaffRoleId, string> = {
  'web-dev': 'text-neon border-neon/40 bg-neon/10',
  'raid-leader': 'text-gold border-gold/40 bg-gold/10',
  recruiter: 'text-azure border-azure/40 bg-azure/10',
  'profession-org': 'text-success border-success/40 bg-success/10',
  'loot-master': 'text-[#c084fc] border-purple-400/40 bg-purple-500/10',
}

export function StaffRoleIcon({
  id,
  className,
}: {
  id: StaffRoleId
  className?: string
}) {
  const Icon = ICONS[id]
  return <Icon className={cn('size-4', className)} aria-hidden />
}

export function StaffRoleBadge({ id }: { id: StaffRoleId }) {
  return (
    <span className={cn('inline-flex size-9 items-center justify-center rounded-xl border', TONES[id])}>
      <StaffRoleIcon id={id} className="size-4" />
    </span>
  )
}
