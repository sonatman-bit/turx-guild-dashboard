'use client'

import { Check, Copy, KeyRound, Puzzle, Skull } from 'lucide-react'
import { useState } from 'react'
import { ADDONS, ATTUNEMENTS, BOSS_TACTICS, WEAKAURAS } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, Panel, PanelTitle, SectionHeader } from '../ui'

function CopyBox({ title, type, code }: { title: string; type: string; code: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({ title: `${type} Kopyalandı!`, description: title })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Kopyalanamadı', description: 'Tarayıcı panoya erişimi engelledi.', variant: 'error' })
    }
  }
  return (
    <div className="rounded-lg border border-border bg-[#071422]">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className={type === 'WeakAura' ? 'border-neon/40 text-neon' : 'border-gold/40 text-gold'}>{type}</Badge>
          <span className="truncate text-sm font-medium">{title}</span>
        </div>
        <button
          onClick={copy}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition',
            copied ? 'border-success/50 text-success' : 'border-neon/30 text-neon hover:bg-neon/10',
          )}
          aria-label={`${title} kodunu kopyala`}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-silver/90">{code}</pre>
    </div>
  )
}

export function StrategyView() {
  const [active, setActive] = useState(0)
  const boss = BOSS_TACTICS[active]

  return (
    <div>
      <SectionHeader
        eyebrow="Strategy Hub"
        title="Strateji, Attunement & WeakAura Merkezi"
        description="WoW: Forever boss taktikleri, Attunement durumu ve zorunlu Addon / WeakAura paketleri."
      />

      <Panel>
        <PanelTitle icon={Skull}>Boss Taktikleri</PanelTitle>
        <div role="tablist" aria-label="Raid seçimi" className="flex gap-2 overflow-x-auto pb-1">
          {BOSS_TACTICS.map((b, i) => (
            <button
              key={b.raid}
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={cn(
                'shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition',
                active === i ? 'border-gold bg-gold/10 text-gold' : 'border-border text-silver hover:border-neon/40',
              )}
            >
              {b.raid}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div>
            <h3 className="font-display text-lg font-bold text-neon">{boss.boss}</h3>
            <p className="mt-2 text-sm leading-relaxed text-pretty text-silver">{boss.summary}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {boss.tips.map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-lg border border-border bg-[#071422] px-3 py-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelTitle icon={KeyRound}>Attunement Tracker</PanelTitle>
          <ul className="flex flex-col gap-4">
            {ATTUNEMENTS.map((a) => {
              const pct = Math.round((a.done / a.total) * 100)
              return (
                <li key={a.name}>
                  <div className="mb-1.5 flex justify-between gap-2 text-sm">
                    <span className="text-silver">{a.name}</span>
                    <span className="text-neon tabular-nums">
                      {a.done}/{a.total} Raider
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={a.name}>
                    <div className="h-full rounded-full bg-gradient-to-r from-gold to-neon" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
        <Panel>
          <PanelTitle icon={Puzzle}>Zorunlu Addon Listesi</PanelTitle>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ADDONS.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-[#071422] px-3 py-2 text-sm">
                <span>{a.name}</span>
                <Badge className={a.required ? 'border-gold/50 text-gold' : 'border-border text-muted-foreground'}>
                  {a.required ? 'Zorunlu' : 'Önerilen'}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6">
        <PanelTitle icon={Copy}>WeakAura & Macro Paketleri</PanelTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {WEAKAURAS.map((w) => (
            <CopyBox key={w.title} {...w} />
          ))}
        </div>
      </Panel>
    </div>
  )
}
