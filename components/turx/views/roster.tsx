'use client'

import { BarChart3, Crown, MessageCircle, Search, UserCheck, Users, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLASS_COLORS, MEMBERS, type Rank, type Role, type WowClass } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const RANK_STYLES: Record<Rank, string> = {
  'Guild Master': 'border-gold/60 bg-gold/15 text-gold',
  Officer: 'border-neon/50 bg-neon/10 text-neon',
  Raider: 'border-azure/40 bg-azure/10 text-azure',
  Social: 'border-border text-muted-foreground',
}

function parseColor(p: number) {
  if (p >= 95) return '#e5cc80'
  if (p >= 75) return '#a335ee'
  if (p >= 50) return '#0070ff'
  if (p >= 25) return '#1eff00'
  return '#9d9d9d'
}

function attendanceColor(a: number) {
  if (a >= 90) return 'border-success/50 bg-success/10 text-success'
  if (a >= 75) return 'border-gold/50 bg-gold/10 text-gold'
  return 'border-destructive/40 bg-destructive/10 text-destructive'
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string }) {
  return (
    <Panel className="flex items-start gap-4 self-start">
      <span className="rounded-lg bg-neon/10 p-2.5 text-neon">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-3xl font-black text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-silver/80">{sub}</p>
      </div>
    </Panel>
  )
}

function ClassBreakdown() {
  const counts = Object.keys(CLASS_COLORS).map((c) => ({
    wowClass: c as WowClass,
    count: MEMBERS.filter((m) => m.wowClass === c).length,
  }))
  const max = Math.max(...counts.map((c) => c.count))
  return (
    <Panel>
      <PanelTitle icon={BarChart3}>Class Breakdown</PanelTitle>
      <ul className="flex flex-col gap-2">
        {counts.map((c) => (
          <li key={c.wowClass} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0" style={{ color: CLASS_COLORS[c.wowClass] }}>
              {c.wowClass}
            </span>
            <span className="h-2 flex-1 rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(c.count / max) * 100}%`, backgroundColor: CLASS_COLORS[c.wowClass] }}
              />
            </span>
            <span className="w-4 text-right text-silver tabular-nums">{c.count}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function RosterView() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [cls, setCls] = useState<WowClass | 'all'>('all')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [rank, setRank] = useState<Rank | 'all'>('all')
  const [contact, setContact] = useState<Record<string, boolean>>({ Aslanyürek: true, Işıkkalkan: true })

  const players = new Set(MEMBERS.map((m) => m.player)).size
  const maxLevel = MEMBERS.filter((m) => m.level === 60).length

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return MEMBERS.filter(
      (m) =>
        (cls === 'all' || m.wowClass === cls) &&
        (role === 'all' || m.role === role) &&
        (rank === 'all' || m.rank === rank) &&
        (!q || [m.name, m.wowClass, m.role, m.rank, m.spec].some((v) => v.toLocaleLowerCase('tr-TR').includes(q))),
    )
  }, [query, cls, role, rank])

  return (
    <div>
      <SectionHeader
        eyebrow="Live Roster"
        title="Detaylı Lonca Kadrosu & Üye Analitiği"
        description="Main ve Alt karakterler, Raid katılım skorları ve WoWLogs Parse verileri tek ekranda."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Toplam Bireysel Oyuncu" value={players} sub="Discord doğrulamalı" />
        <MetricCard icon={UserCheck} label="Aktif Karakter Sayısı" value={MEMBERS.length} sub={`${MEMBERS.filter((m) => m.type === 'Main').length} Main · ${MEMBERS.filter((m) => m.type === 'Alt').length} Alt`} />
        <MetricCard icon={Zap} label="Max Level Oyuncu Sayısı" value={maxLevel} sub="Level 60" />
        <ClassBreakdown />
      </div>

      <Panel className="mt-6 p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Karakter ara</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Karakter, Class, Role veya Rank ara..."
              className={cn(inputClass, 'pl-9')}
            />
          </label>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <select aria-label="Class filtresi" value={cls} onChange={(e) => setCls(e.target.value as WowClass | 'all')} className={inputClass}>
              <option value="all">Tüm Class</option>
              {Object.keys(CLASS_COLORS).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Role filtresi" value={role} onChange={(e) => setRole(e.target.value as Role | 'all')} className={inputClass}>
              <option value="all">Tüm Role</option>
              <option>Tank</option>
              <option>Healer</option>
              <option>DPS</option>
            </select>
            <select aria-label="Rank filtresi" value={rank} onChange={(e) => setRank(e.target.value as Rank | 'all')} className={inputClass}>
              <option value="all">Tüm Rank</option>
              <option>Guild Master</option>
              <option>Officer</option>
              <option>Raider</option>
              <option>Social</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <caption className="sr-only">Lonca üye listesi</caption>
            <thead className="text-xs tracking-wider text-muted-foreground uppercase">
              <tr className="border-b border-border">
                {['Karakter', 'Level', 'Race', 'Class / Spec', 'Guild Rank', 'Katılım', 'Main/Alt', 'Meslekler', 'Parse', 'İletişim'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.name} className="transition hover:bg-neon/[0.03]">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-semibold" style={{ color: CLASS_COLORS[m.wowClass] }}>
                      {m.rank === 'Guild Master' && <Crown className="size-3.5 text-gold" aria-label="Guild Master" />}
                      {m.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.player}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m.level}</td>
                  <td className="px-4 py-3 text-silver">{m.race}</td>
                  <td className="px-4 py-3">
                    <span style={{ color: CLASS_COLORS[m.wowClass] }}>{m.wowClass}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.spec} · {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={RANK_STYLES[m.rank]}>{m.rank}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('tabular-nums', attendanceColor(m.attendance))}>%{m.attendance}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={m.type === 'Main' ? 'border-gold/40 text-gold' : 'border-border text-silver'}>{m.type}</Badge>
                    {m.mainOf && <span className="mt-1 block text-[11px] text-muted-foreground">↳ {m.mainOf}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-silver">{m.professions.join(', ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex min-w-10 justify-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums"
                      style={{ color: parseColor(m.parse), borderColor: `${parseColor(m.parse)}66`, backgroundColor: `${parseColor(m.parse)}14` }}
                    >
                      {m.parse}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      role="switch"
                      aria-checked={!!contact[m.name]}
                      aria-label={`${m.name} ile iletişim`}
                      onClick={() => {
                        const next = !contact[m.name]
                        setContact((c) => ({ ...c, [m.name]: next }))
                        toast({ title: next ? 'İletişim Açıldı' : 'İletişim Kapatıldı', description: `${m.name} için Discord DM tercihi güncellendi.`, variant: 'info' })
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full border transition',
                        contact[m.name] ? 'border-neon/60 bg-neon/25' : 'border-border bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 items-center justify-center rounded-full transition',
                          contact[m.name] ? 'translate-x-6 bg-neon text-[#08121e]' : 'translate-x-1 bg-silver/60',
                        )}
                      >
                        <MessageCircle className="size-2.5" aria-hidden />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                    Aramanızla eşleşen karakter bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {filtered.length} / {MEMBERS.length} karakter gösteriliyor
        </p>
      </Panel>
    </div>
  )
}
