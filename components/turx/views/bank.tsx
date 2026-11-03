'use client'

import { Coins, Gem, PackagePlus, Sparkles, TestTube2 } from 'lucide-react'
import { useState } from 'react'
import { BANK_ITEMS } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const CATEGORIES = [
  { id: 'Potions', label: 'Potions', icon: TestTube2 },
  { id: 'Gems', label: 'Gems & Mats', icon: Gem },
  { id: 'Enchants', label: 'Enchants', icon: Sparkles },
] as const

const LEDGER: { who: string; what: string; time: string }[] = []

export function BankView() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('')

  const openRequest = (item = '') => {
    setPreset(item)
    setOpen(true)
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Guild Bank"
        title="Guild Bankası & Malzeme Talebi"
        description="Raid consumable stokları ve lonca fonu. Talepler Officer ekibi tarafından 24 saat içinde onaylanır."
        action={
          <GoldButton onClick={() => openRequest()}>
            <PackagePlus className="size-4" /> Malzeme Talep Et
          </GoldButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="glow-border flex flex-col justify-between bg-gradient-to-br from-gold/10 to-card">
          <PanelTitle icon={Coins}>Gold Bakiyesi</PanelTitle>
          <p className="font-display text-5xl font-black text-gold tabular-nums text-glow-gold">
            0<span className="ml-1 text-2xl">g</span>
          </p>
          <p className="mt-1 text-sm text-silver">
            0s 0c · henüz hareket yok
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-[#071422] p-3">
              <p className="text-xs text-muted-foreground">Raid Repair Fonu</p>
              <p className="font-semibold text-neon tabular-nums">0g</p>
            </div>
            <div className="rounded-lg border border-border bg-[#071422] p-3">
              <p className="text-xs text-muted-foreground">Consumable Fonu</p>
              <p className="font-semibold text-neon tabular-nums">0g</p>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelTitle>Son Hareketler</PanelTitle>
          <ul className="divide-y divide-border">
            {LEDGER.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">Henüz banka hareketi yok.</li>
            )}
            {LEDGER.map((l) => (
              <li key={l.what} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-silver">{l.who}</span>
                <span className={cn('flex-1 text-right', l.what.startsWith('+') ? 'text-success' : 'text-gold')}>{l.what}</span>
                <span className="w-24 text-right text-xs text-muted-foreground">{l.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <Panel key={cat.id}>
            <PanelTitle icon={cat.icon}>{cat.label}</PanelTitle>
            <ul className="flex flex-col gap-3">
              {BANK_ITEMS.filter((i) => i.category === cat.id).map((item) => {
                const pct = Math.round((item.qty / item.max) * 100)
                const low = pct < 35
                return (
                  <li key={item.name} className="rounded-lg border border-border bg-[#071422] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-pretty">{item.name}</p>
                      <button
                        onClick={() => openRequest(item.name)}
                        className="shrink-0 rounded-md border border-neon/30 px-2 py-0.5 text-[11px] font-medium text-neon hover:bg-neon/10"
                      >
                        Talep
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 rounded-full bg-muted">
                        <span
                          className={cn('block h-full rounded-full', low ? 'bg-destructive' : 'bg-gradient-to-r from-azure to-neon')}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className={cn('text-xs tabular-nums', low ? 'text-destructive' : 'text-silver')}>
                        {item.qty}/{item.max}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Malzeme Talep Et" description="Talebiniz Officer onayına gönderilir.">
        <form
          key={preset}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            setOpen(false)
            toast({ title: 'Malzeme Talebiniz Alındı!', description: `${data.get('qty')}x ${data.get('item')} · Officer onayı bekleniyor.` })
          }}
        >
          <Field label="Malzeme">
            <select name="item" required defaultValue={preset} className={inputClass}>
              <option value="" disabled>
                Seçiniz
              </option>
              {BANK_ITEMS.map((i) => (
                <option key={i.name}>{i.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adet">
              <input name="qty" type="number" min={1} max={50} defaultValue={5} required className={inputClass} />
            </Field>
            <Field label="Raid">
              <select name="raid" className={inputClass}>
                <option>Barrow Deeps</option>
                <option>Hyjal Summit</option>
                <option>Onyxia&apos;s Lair</option>
              </select>
            </Field>
          </div>
          <Field label="Not (opsiyonel)">
            <textarea name="note" rows={2} className={inputClass} placeholder="Örn: Onyxia Fire Resistance seti için" />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setOpen(false)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="submit">Talebi Gönder</GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
