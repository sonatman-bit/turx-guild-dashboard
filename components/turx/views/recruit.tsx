'use client'

import { Gavel, Grid3x3, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { CLASS_COLORS, RECRUITMENT, type WowClass } from '@/lib/guild-data'
import { cn } from '@/lib/utils'
import { useToast } from '../toast'
import { Badge, Field, GhostButton, GoldButton, Modal, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const NEED_STYLES: Record<string, string> = {
  Yüksek: 'border-success/50 bg-success/10 text-success',
  Orta: 'border-gold/50 bg-gold/10 text-gold',
  Düşük: 'border-azure/40 bg-azure/10 text-azure',
  Kapalı: 'border-border text-muted-foreground',
}

const LOOT_RULES = [
  { id: 'lc', name: 'Loot Council', active: true, text: 'GM + 3 Officer + 1 Raider temsilcisi. Öncelik: Attendance > Progress katkısı > BIS listesi > Parse.' },
  { id: 'epgp', name: 'EPGP', active: false, text: 'Her Raid saatinde EP kazanılır, item aldıkça GP eklenir. PR = EP / GP. Haftalık %10 decay.' },
  { id: 'dkp', name: 'DKP', active: false, text: 'Zero-sum DKP. Boss kill başına 10 DKP, on-time bonus 5 DKP. Minimum bid 10.' },
]

export function RecruitView() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [rule, setRule] = useState('lc')
  const [presetClass, setPresetClass] = useState<WowClass | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const payload = {
      name: formData.get('char'),
      discord: formData.get('discord'),
      characterClass: formData.get('class'),
      spec: formData.get('spec'),
      logs: formData.get('logs'),
      experience: formData.get('exp'),
    }

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setOpen(false)
        toast({
          title: 'Başvurunuz Alındı!',
          description: `${payload.name} (${payload.characterClass}) · Başvuru Discord’a iletildi.`,
        })
      } else {
        toast({
          title: 'Hata!',
          description: 'Başvuru gönderilirken bir sorun oluştu.',
        })
      }
    } catch (error) {
      toast({
        title: 'Hata!',
        description: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Recruitment · Alliance PvE (EU)"
        title="Başvuru & Recruitment"
        description="TURX, WoW: Forever’da Phase 1’den itibaren progress odaklı Raid kadrosunu genişletiyor."
        action={
          <GoldButton onClick={() => setOpen(true)}>
            <UserPlus className="size-4" /> Başvuru Yap
          </GoldButton>
        }
      />

      <Panel>
        <PanelTitle icon={Grid3x3}>Class / Spec İhtiyaç Matrisi</PanelTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {RECRUITMENT.map((r) => (
            <div key={r.wowClass} className="rounded-lg border border-border bg-[#071422] p-4" style={{ borderTopColor: CLASS_COLORS[r.wowClass], borderTopWidth: 2 }}>
              <p className="font-display font-bold" style={{ color: CLASS_COLORS[r.wowClass] }}>
                {r.wowClass}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {r.specs.map((s) => (
                  <li key={s.spec} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-silver">{s.spec}</span>
                    <Badge className={NEED_STYLES[s.need]}>{s.need}</Badge>
                  </li>
                ))}
              </ul>
              {r.specs.some((s) => s.need !== 'Kapalı') && (
                <button
                  onClick={() => {
                    setPresetClass(r.wowClass)
                    setOpen(true)
                  }}
                  className="mt-3 text-xs font-medium text-neon hover:underline"
                >
                  {r.wowClass} olarak başvur →
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6">
        <PanelTitle icon={Gavel}>Loot Kuralları Rehberi</PanelTitle>
        <div role="tablist" aria-label="Loot sistemi" className="flex flex-wrap gap-2">
          {LOOT_RULES.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={rule === l.id}
              onClick={() => setRule(l.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition',
                rule === l.id ? 'border-gold bg-gold/10 text-gold' : 'border-border text-silver hover:border-neon/40',
              )}
            >
              {l.name}
              {l.active && <span className="rounded bg-success/20 px-1.5 text-[10px] font-bold text-success">AKTİF</span>}
            </button>
          ))}
        </div>
        <p role="tabpanel" className="mt-4 rounded-lg border border-border bg-[#071422] p-4 text-sm leading-relaxed text-pretty text-silver">
          {LOOT_RULES.find((l) => l.id === rule)?.text}
        </p>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Başvuru Formu" description="TURX · Alliance PvE (EU) Raid kadrosu başvurusu">
        <form key={presetClass} className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Karakter Adı">
              <input name="char" required className={inputClass} placeholder="Örn: Aslanyürek" />
            </Field>
            <Field label="Discord Kullanıcı Adı">
              <input name="discord" required className={inputClass} placeholder="kullanici#0000" />
            </Field>
            <Field label="Class">
              <select name="class" required defaultValue={presetClass} className={inputClass}>
                <option value="" disabled>
                  Seçiniz
                </option>
                {Object.keys(CLASS_COLORS).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Spec">
              <input name="spec" required className={inputClass} placeholder="Örn: Holy" />
            </Field>
          </div>
          <Field label="WoWLogs Profil Linki" hint="Önceki Classic / SoD loglarınız">
            <input name="logs" type="url" className={inputClass} placeholder="https://www.warcraftlogs.com/character/..." />
          </Field>
          <Field label="Raid Tecrübesi & Motivasyon">
            <textarea name="exp" required rows={3} className={inputClass} placeholder="Daha önce hangi Raid’lerde progress yaptınız?" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-silver">
            <input type="checkbox" required className="mt-1 accent-[#d4af37]" />
            Çarşamba & Pazar 21:00 Raid saatlerine katılabileceğimi ve Loot kurallarını kabul ediyorum.
          </label>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setOpen(false)}>
              Vazgeç
            </GhostButton>
            <GoldButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}