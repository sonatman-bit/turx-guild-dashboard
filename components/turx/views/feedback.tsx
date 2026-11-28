'use client'

import { EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useSiteCopy } from '../site-copy-provider'
import { useToast } from '../toast'
import { Field, GoldButton, Panel, PanelTitle, SectionHeader, inputClass } from '../ui'

const MAX = 1000

export function FeedbackView() {
  const toast = useToast()
  const { copy } = useSiteCopy()
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
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        stored?: boolean
        email?: boolean
        discord?: boolean
      }
      if (!response.ok) {
        throw new Error(data.error || 'Mesaj gönderilemedi.')
      }
      form.reset()
      setText('')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('turx:anonymous-messages-updated'))
        window.dispatchEvent(new CustomEvent('turx:admin-tasks-updated'))
      }
      toast({
        title: 'Mesajınız anonim olarak iletildi',
        description: data.stored
          ? data.email
            ? 'GM Kontrol Paneline okunmamış bildirim olarak düştü ve Guild Master e-postasına iletildi.'
            : 'GM Kontrol Paneline okunmamış mesaj olarak iletildi.'
          : data.email
            ? 'Guild Master e-postasına gönderildi.'
            : 'Discord yedeği ile iletildi.',
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
        eyebrow={copy('anonymous.eyebrow')}
        title={copy('anonymous.title')}
        description={copy('anonymous.description')}
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel className="glow-border">
          <PanelTitle icon={Lock}>{copy('anonymous.form.title')}</PanelTitle>
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
          <PanelTitle icon={ShieldCheck}>{copy('anonymous.privacy.title')}</PanelTitle>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-silver">
            <li>{copy('anonymous.privacy.b1')}</li>
            <li>{copy('anonymous.privacy.b2')}</li>
            <li>{copy('anonymous.privacy.b3')}</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
