'use client'

import { CheckCircle2, Clock, ExternalLink, FlaskConical, HeartPulse, Shield, Swords, XCircle } from 'lucide-react'
import { useState } from 'react'
import { CLASS_COLORS, CONSUMABLES, MEMBERS, RAIDS, type Raid, type Role } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

type Status = 'Confirmed' | 'Pending' | 'Declined'

const STATUS_STYLES: Record<Status, string> = {
  Confirmed: 'border-success/50 bg-success/10 text-success',
  Pending: 'border-gold/50 bg-gold/10 text-gold',
  Declined: 'border-destructive/50 bg-destructive/10 text-destructive',
}
const STATUS_LABEL: Record<Status, string> = { Confirmed: 'Confirmed', Pending: 'Pending', Declined: 'Declined' }

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = { Tank: Shield, Healer: HeartPulse, DPS: Swords }

const seededStatus = (i: number): Status => (i % 5 === 3 ? 'Pending' : i % 7 === 6 ? 'Declined' : 'Confirmed')

function RaidCard({ raid }: { raid: Raid }) {
  const toast = useToast()
  const [role, setRole] = useState<Role | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const [myStatus, setMyStatus] = useState<Status>('Pending')
  const [excuseOpen, setExcuseOpen] = useState(false)
  const stage = signedUp ? 2 : 1

  const roster = MEMBERS.filter((m) => m.type === 'Main').slice(0, Math.min(raid.size, 8))

  return (
    <Panel className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-gold">{raid.name}</h2>
          <p className="text-sm text-muted-foreground">
            {raid.size}-Man · Açılış {raid.unlock} @ {raid.time}
          </p>
        </div>
        <Badge className="border-neon/40 bg-neon/10 text-neon">Phase 1</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            ['Tank', raid.tanks],
            ['Healer', raid.healers],
            ['DPS', raid.dps],
          ] as const
        ).map(([r, n]) => {
          const Icon = ROLE_ICONS[r]
          return (
            <div key={r} className="rounded-lg border border-border bg-[#071422] py-2">
              <Icon className="mx-auto size-4 text-neon" />
              <p className="mt-1 font-display text-lg font-bold tabular-nums">{n}</p>
              <p className="text-[11px] text-muted-foreground">{r}</p>
            </div>
          )
        })}
      </div>

      <ol className="flex items-center gap-2 text-xs" aria-label="Kayıt aşamaları">
        {['Pre-Signup', 'Kadro Onayı'].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border font-bold',
                stage > i ? 'border-neon bg-neon/20 text-neon' : 'border-border text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <span className={stage > i ? 'text-foreground' : 'text-muted-foreground'}>{s}</span>
            {i === 0 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {!signedUp ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-silver">Rolünü seç ve ön kayıt oluştur:</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Rol seçimi">
            {(['Tank', 'Healer', 'DPS'] as Role[]).map((r) => {
              const Icon = ROLE_ICONS[r]
              return (
                <button
                  key={r}
                  role="radio"
                  aria-checked={role === r}
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border py-3 text-sm font-medium transition',
                    role === r ? 'border-gold bg-gold/10 text-gold' : 'border-border text-silver hover:border-neon/40',
                  )}
                >
                  <Icon className="size-5" />
                  {r}
                </button>
              )
            })}
          </div>
          <GoldButton
            disabled={!role}
            onClick={() => {
              setSignedUp(true)
              toast({ title: 'Raid Kaydınız Alındı!', description: `${raid.name} · ${role}` })
            }}
          >
            Ön Kayıt Oluştur
          </GoldButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[#071422] p-3">
            <p className="text-sm">
              Kadro yayınlandı · Rolün: <span className="font-semibold text-gold">{role}</span>
            </p>
            <Badge className={STATUS_STYLES[myStatus]}>{STATUS_LABEL[myStatus]}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <GoldButton
              onClick={() => {
                setMyStatus('Confirmed')
                toast({ title: 'Katılımınız Onaylandı!', description: `${raid.name} · ${raid.unlock} ${raid.time}` })
              }}
            >
              <CheckCircle2 className="size-4" /> Kadro Katılımımı Onaylıyorum
            </GoldButton>
            <GhostButton onClick={() => setExcuseOpen(true)}>
              <XCircle className="size-4" /> Mazeret Bildir
            </GhostButton>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Yayınlanan Kadro</p>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {roster.map((m, i) => {
            const s = seededStatus(i)
            const Icon = ROLE_ICONS[m.role]
            return (
              <li key={m.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Icon className="size-4 text-muted-foreground" aria-label={m.role} />
                <span className="flex-1 truncate font-medium" style={{ color: CLASS_COLORS[m.wowClass] }}>
                  {m.name}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{m.spec}</span>
                <Badge className={STATUS_STYLES[s]}>{s}</Badge>
              </li>
            )
          })}
        </ul>
      </div>

      <Modal open={excuseOpen} onClose={() => setExcuseOpen(false)} title="Mazeret Bildir" description={`${raid.name} · ${raid.unlock} ${raid.time}`}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setMyStatus('Declined')
            setExcuseOpen(false)
            toast({ title: 'Mazeretiniz İletildi', description: 'Officer ekibi bilgilendirildi. Bench listesine alındınız.', variant: 'info' })
          }}
        >
          <Field label="Mazeret Türü">
            <select required className={inputClass} defaultValue="">
              <option value="" disabled>
                Seçiniz
              </option>
              <option>İş / Okul</option>
              <option>Sağlık</option>
              <option>Geç katılacağım</option>
              <option>Diğer</option>
            </select>
          </Field>
          <Field label="Açıklama">
            <textarea required rows={3} className={inputClass} placeholder="Kısa bir açıklama yazın..." />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setExcuseOpen(false)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="submit">Gönder</GoldButton>
          </div>
        </form>
      </Modal>
    </Panel>
  )
}

const LOGS = [
  { name: 'Barrow Deeps — PTR Testi', date: '28 Ekim 2026' },
  { name: 'Onyxia — Beta Pull Analizi', date: '21 Ekim 2026' },
  { name: 'Hyjal Summit — Beta Clear', date: '14 Ekim 2026' },
]

export function RaidsView() {
  return (
    <div>
      <SectionHeader
        eyebrow="Raid Takvimi · 21:00 TR"
        title="PvE Raid Takvimi & Kadro Onay Sistemi"
        description="Önce rolünle Pre-Signup yap, Officer ekibi kadroyu yayınladığında katılımını onayla veya mazeret bildir."
        action={
          <Badge className="border-gold/40 bg-gold/10 text-gold">
            <Clock className="size-3" /> Tüm Raid’ler 21:00’da başlar
          </Badge>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {RAIDS.map((r) => (
          <RaidCard key={r.id} raid={r} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelTitle icon={FlaskConical}>Zorunlu Raid Consumable Listesi</PanelTitle>
          <ul className="flex flex-col gap-2">
            {CONSUMABLES.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[#071422] px-3 py-2.5 text-sm">
                <span className="text-silver">{c.name}</span>
                <Badge className={c.required ? 'border-gold/50 text-gold' : 'border-border text-muted-foreground'}>
                  {c.required ? 'Zorunlu' : 'Önerilen'}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelTitle icon={ExternalLink}>WoWLogs Raporları</PanelTitle>
          <ul className="flex flex-col gap-2">
            {LOGS.map((l) => (
              <li key={l.name}>
                <a
                  href="https://www.warcraftlogs.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[#071422] px-3 py-2.5 text-sm transition hover:border-neon/50"
                >
                  <span>
                    <span className="block font-medium">{l.name}</span>
                    <span className="text-xs text-muted-foreground">{l.date}</span>
                  </span>
                  <ExternalLink className="size-4 text-neon" aria-hidden />
                  <span className="sr-only">(yeni sekmede açılır)</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
