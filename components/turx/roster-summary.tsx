'use client'

import { BarChart3, Cross, Shield, Swords, UserCheck, Users } from 'lucide-react'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { classIconUrl } from '@/lib/wow-armory'
import { Panel, PanelTitle } from './ui'

export type RosterSummaryStats = {
  totalPlayers: number
  totalCharacters: number
  mainCount: number
  altCount: number
  mainRoles: {
    tank: number
    healer: number
    dps: number
  }
  mainClasses: Record<WowClass, number>
  altClasses: Record<WowClass, number>
}

export function emptyRosterSummary(): RosterSummaryStats {
  const wowClasses = Object.keys(CLASS_COLORS) as WowClass[]
  return {
    totalPlayers: 0,
    totalCharacters: 0,
    mainCount: 0,
    altCount: 0,
    mainRoles: { tank: 0, healer: 0, dps: 0 },
    mainClasses: Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>,
    altClasses: Object.fromEntries(wowClasses.map((c) => [c, 0])) as Record<WowClass, number>,
  }
}

function ClassBreakdownCard({
  countsByClass,
  total,
  title,
  emptyHint,
}: {
  countsByClass: Record<WowClass, number>
  total: number
  title: string
  emptyHint: string
}) {
  const counts = (Object.keys(CLASS_COLORS) as WowClass[]).map((wowClass) => ({
    wowClass,
    count: countsByClass[wowClass] || 0,
  }))
  const max = Math.max(...counts.map((item) => item.count), 1)

  return (
    <Panel>
      <PanelTitle
        icon={BarChart3}
        action={<span className="text-xs tabular-nums text-muted-foreground">{total} karakter</span>}
      >
        {title}
      </PanelTitle>
      {total === 0 && <p className="mb-3 text-xs text-muted-foreground">{emptyHint}</p>}
      <ul className="flex flex-col gap-2">
        {counts.map((item) => {
          const percent = total === 0 ? 0 : Math.round((item.count / total) * 100)
          return (
            <li key={item.wowClass} className="flex items-center gap-2 text-xs">
              <img
                src={classIconUrl(item.wowClass)}
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0 rounded-sm border border-black/40"
              />
              <span className="w-[4.5rem] shrink-0 font-semibold" style={{ color: CLASS_COLORS[item.wowClass] }}>
                {item.wowClass}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full border border-black/20"
                  style={{
                    width: item.count === 0 ? '0%' : `${(item.count / max) * 100}%`,
                    backgroundColor: CLASS_COLORS[item.wowClass],
                  }}
                />
              </span>
              <span className="w-16 shrink-0 text-right tabular-nums text-silver">
                {item.count} <span className="text-muted-foreground">({percent}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function MainRoleBreakdownCard({
  total,
  tank,
  healer,
  dps,
}: {
  total: number
  tank: number
  healer: number
  dps: number
}) {
  const roles = [
    { id: 'tank', label: 'Tank', count: tank, color: '#4facfe', icon: Shield },
    { id: 'healer', label: 'Healer', count: healer, color: '#3ee07f', icon: Cross },
    { id: 'dps', label: 'DPS', count: dps, color: '#d4af37', icon: Swords },
  ] as const

  return (
    <Panel>
      <PanelTitle
        icon={Shield}
        action={<span className="text-xs tabular-nums text-muted-foreground">{total} Main</span>}
      >
        Main Rol Dağılımı
      </PanelTitle>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Main karakter kaydı gelince Tank / Healer / DPS oranı burada durur.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div
              className="flex h-5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Tank ${tank}, Healer ${healer}, DPS ${dps}`}
            >
              {roles.map((role) =>
                role.count === 0 ? null : (
                  <span
                    key={role.id}
                    className="h-full"
                    style={{ width: `${(role.count / total) * 100}%`, backgroundColor: role.color }}
                    title={`${role.label}: ${role.count}`}
                  />
                ),
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Melee ve Ranged DPS olarak birleşir. Sadece Main karakterler sayılır.
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {roles.map((role) => {
              const Icon = role.icon
              const percent = Math.round((role.count / total) * 100)
              return (
                <li
                  key={role.id}
                  className="min-w-0 rounded-lg border border-border bg-muted/30 px-2 py-2 text-center"
                >
                  <p
                    className="flex items-center justify-center gap-1 text-[11px] font-semibold"
                    style={{ color: role.color }}
                  >
                    <Icon className="size-3.5" />
                    {role.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-black tabular-nums text-foreground">
                    {role.count}
                  </p>
                  <p className="text-[11px] text-muted-foreground">%{percent}</p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export function RosterSummarySection({ stats }: { stats: RosterSummaryStats }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel className="flex items-start gap-4">
          <span className="rounded-lg bg-neon/10 p-2.5 text-neon">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Toplam Oyuncu</p>
            <p className="font-display text-3xl font-black text-foreground tabular-nums">
              {stats.totalPlayers}
            </p>
            <p className="text-xs text-silver/80">Discord onaylı</p>
          </div>
        </Panel>
        <Panel className="flex items-start gap-4">
          <span className="rounded-lg bg-gold/10 p-2.5 text-gold">
            <UserCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Karakter Havuzu</p>
            <p className="font-display text-3xl font-black text-foreground tabular-nums">
              {stats.totalCharacters}
            </p>
            <p className="text-xs text-silver/80">
              {stats.mainCount} Main · {stats.altCount} Alt
            </p>
          </div>
        </Panel>
      </div>

      <MainRoleBreakdown
        total={stats.mainCount}
        tank={stats.mainRoles.tank}
        healer={stats.mainRoles.healer}
        dps={stats.mainRoles.dps}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ClassBreakdownCard
          countsByClass={stats.mainClasses}
          total={stats.mainCount}
          title="Main Class Dağılımı"
          emptyHint="Main karakterler kaydedilince sınıf çubukları burada durur."
        />
        <ClassBreakdownCard
          countsByClass={stats.altClasses}
          total={stats.altCount}
          title="Alt Class Dağılımı"
          emptyHint="Alt karakterler kaydedilince sınıf çubukları burada durur."
        />
      </div>
    </div>
  )
}

function MainRoleBreakdown(props: { total: number; tank: number; healer: number; dps: number }) {
  return <MainRoleBreakdownCard {...props} />
}
