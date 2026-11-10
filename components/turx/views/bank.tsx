'use client'

import { Coins, Gem, PackagePlus, Sparkles, TestTube2, Check, X, ShieldAlert } from 'lucide-react'
import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/client-session'
import { BANK_ITEMS } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth-provider'
import { useToast } from '../toast'
import { Badge, Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const CATEGORIES = [
  { id: 'Potions', label: 'Potions', icon: TestTube2 },
  { id: 'Gems', label: 'Gems & Mats', icon: Gem },
  { id: 'Enchants', label: 'Enchants', icon: Sparkles },
] as const

interface BankRequestDto {
  id: string
  username: string
  item: string
  qty: number
  raid?: string
  note?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

interface BankLedgerDto {
  id: string
  who: string
  what: string
  time: string
}

export function BankView() {
  const toast = useToast()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ledger, setLedger] = useState<BankLedgerDto[]>([])
  const [requests, setRequests] = useState<BankRequestDto[]>([])

  const isOfficerOrGm = user?.role === 'Guild Master' || user?.role === 'Görevli' || user?.role === 'Officer'

  const loadBankData = () => {
    fetch('/api/bank')
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          requests?: BankRequestDto[]
          ledger?: BankLedgerDto[]
        }
        if (res.ok) {
          if (Array.isArray(data.ledger)) setLedger(data.ledger)
          if (Array.isArray(data.requests)) setRequests(data.requests)
        }
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    loadBankData()
  }, [])

  const openRequest = (item = '') => {
    setPreset(item)
    setOpen(true)
  }

  const handleRequestAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/bank', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        toast({
          title: status === 'APPROVED' ? 'Talep Onaylandı' : 'Talep Reddedildi',
          description: `İşlem başarıyla banka defterine kaydedildi.`,
        })
        loadBankData()
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({ title: 'İşlem Başarısız', description: data.error || 'Talep güncellenemedi.' })
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Giriş Yapmalısınız', description: 'Malzeme talep etmek için oturum açmalısınız.' })
      return
    }

    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const item = String(formData.get('item') || '')
    const qty = parseInt(String(formData.get('qty') || '1'), 10)
    const raid = String(formData.get('raid') || '')
    const note = String(formData.get('note') || '')

    try {
      const res = await fetch('/api/bank', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, qty, raid, note }),
      })

      if (res.ok) {
        setOpen(false)
        toast({
          title: 'Malzeme Talebiniz Alındı! 📦',
          description: `${qty}x ${item} talebi subay heyetine ve Discord kanalına iletildi.`,
        })
        loadBankData()
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast({ title: 'Talep Gönderilemedi', description: data.error || 'Lütfen tekrar deneyin.' })
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya ulaşılamadı.' })
    } finally {
      setSubmitting(false)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING')

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Guild Bank"
        title="Guild Bankası & Malzeme Talebi"
        description="Raid consumable stokları ve lonca fonu. Talepler Görevli ekibi tarafından 24 saat içinde onaylanır."
        action={
          <GoldButton onClick={() => openRequest()}>
            <PackagePlus className="size-4" /> Malzeme Talep Et
          </GoldButton>
        }
      />

      {isOfficerOrGm && pendingRequests.length > 0 && (
        <Panel className="border-gold/40 bg-gold/5">
          <PanelTitle icon={ShieldAlert} action={<Badge className="border-gold/50 text-gold">{pendingRequests.length} Bekleyen</Badge>}>
            Subay Onay Havuzu (Bekleyen Malzeme Talepleri)
          </PanelTitle>
          <ul className="mt-3 divide-y divide-border/60">
            {pendingRequests.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-silver">{req.username}</span>
                    <Badge className="border-border bg-background text-[11px] text-neon">{req.raid || 'Genel'}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground">
                    <span className="font-semibold text-gold">{req.qty}x</span> {req.item}
                    {req.note && <span className="ml-2 text-muted-foreground italic">({req.note})</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <GoldButton
                    onClick={() => handleRequestAction(req.id, 'APPROVED')}
                    className="h-8 px-3 text-xs"
                  >
                    <Check className="size-3.5 mr-1" /> Onayla
                  </GoldButton>
                  <GhostButton
                    onClick={() => handleRequestAction(req.id, 'REJECTED')}
                    className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                  >
                    <X className="size-3.5 mr-1" /> Reddet
                  </GhostButton>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="glow-border flex flex-col justify-between bg-gradient-to-br from-gold/10 to-card">
          <PanelTitle icon={Coins}>Gold Bakiyesi</PanelTitle>
          <p className="font-display text-5xl font-black text-gold tabular-nums text-glow-gold">
            0<span className="ml-1 text-2xl">g</span>
          </p>
          <p className="mt-1 text-sm text-silver">
            0s 0c · lonca kasası aktif
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
          <PanelTitle>Son Hareketler & Banka Defteri</PanelTitle>
          <ul className="divide-y divide-border">
            {ledger.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">Henüz banka hareketi yok.</li>
            )}
            {ledger.map((l) => (
              <li key={l.id || l.what} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-silver">{l.who}</span>
                <span className={cn('flex-1 text-right', l.what.startsWith('Onay') ? 'text-success' : l.what.startsWith('Red') ? 'text-destructive' : 'text-gold')}>{l.what}</span>
                <span className="w-24 text-right text-xs text-muted-foreground">{l.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-2 grid gap-6 lg:grid-cols-3">
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

      <Modal open={open} onClose={() => setOpen(false)} title="Malzeme Talep Et" description="Talebiniz Görevli onayına ve Discord'a iletilir.">
        <form
          key={preset}
          className="flex flex-col gap-4"
          onSubmit={handleFormSubmit}
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
                <option>Genel Consumable</option>
              </select>
            </Field>
          </div>
          <Field label="Not (opsiyonel)">
            <textarea name="note" rows={2} className={inputClass} placeholder="Örn: Onyxia Fire Resistance seti veya raid hazırlığı için" />
          </Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setOpen(false)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="submit" disabled={submitting}>
              {submitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}

