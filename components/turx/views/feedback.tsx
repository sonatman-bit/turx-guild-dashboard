'use client'

import { EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../toast'
import { Field, GoldButton, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const MAX = 1000

export function FeedbackView() {
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const message = ((formData.get('message') as string) || '').trim()
    if (message.length < 8) {
      toast({ title: 'Mesaj çok kısa', description: 'En az 8 karakter yaz.' })
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.get('to'),
          topic: formData.get('topic'),
          message,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; email?: boolean; discord?: boolean }
      if (!response.ok) {
        throw new Error(data.error || 'Mesaj gönderilemedi.')
      }
      form.reset()
      setText('')
      toast({
        title: 'Mesajınız anonim olarak iletildi',
        description: data.email
          ? 'Guild Master e-postasına gönderildi. Hotmail spam klasörünü de kontrol et.'
          : 'E-posta yerine Discord yedeği ile iletildi.',
      })
    } catch (err) {
      toast({
        title: 'Gönderilemedi',
        description: err instanceof Error ? err.message : 'Lütfen tekrar dene.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Gizli Kanal"
        title="Anonim GM & Görevli Mesaj Kutusu"
        description="Öneri, şikayet veya hassas konuları kimliğiniz paylaşılmadan doğrudan Guild Master ve Görevli ekibine iletin."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel className="glow-border">
          <PanelTitle icon={Lock}>Gizli Mesaj</PanelTitle>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Alıcı">
                <select name="to" className={inputClass}>
                  <option>Guild Master + Görevliler</option>
                  <option>Sadece Guild Master</option>
                </select>
              </Field>
              <Field label="Konu">
                <select name="topic" className={inputClass}>
                  <option>Raid Yönetimi</option>
                  <option>Loot Dağıtımı</option>
                  <option>Üye Davranışı</option>
                  <option>Öneri</option>
                  <option>Diğer</option>
                </select>
              </Field>
            </div>
            <Field label="Mesajınız">
              <textarea
                name="message"
                required
                rows={7}
                maxLength={MAX}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={inputClass}
                placeholder="Mesajınızı buraya yazın..."
              />
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground tabular-nums">
                {text.length}/{MAX}
              </span>
              <GoldButton type="submit" disabled={!text.trim() || busy}>
                <EyeOff className="size-4" /> {busy ? 'Gönderiliyor…' : 'Anonim Gönder'}
              </GoldButton>
            </div>
          </form>
        </Panel>
        <Panel>
          <PanelTitle icon={ShieldCheck}>Gizlilik Güvencesi</PanelTitle>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-silver">
            <li>Karakter adınız, Discord hesabınız ve IP bilginiz mesajla birlikte saklanmaz.</li>
            <li>Mesajlar yalnızca GM ve Görevli ekibi tarafından görüntülenebilir.</li>
            <li>Kötüye kullanım tespit edilirse mesaj silinir; kimlik takibi yapılmaz.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
