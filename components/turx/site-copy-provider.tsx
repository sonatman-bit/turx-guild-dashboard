'use client'

import { Check, Pencil, RotateCcw, Search, Sparkles } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/client-session'
import {
  getPageCopyDef,
  normalizeSiteCopy,
  resolveSiteCopy,
  type EditablePageId,
  type SiteCopyField,
} from '@/lib/site-copy'
import { isGuildMasterEmail, isGuildMasterRole } from '@/lib/turx-identity'
import { cn } from '@/lib/utils'
import { useAuth } from './auth-provider'
import { useToast } from './toast'
import { Badge, GhostButton, GoldButton, inputClass, Modal } from './ui'

const CACHE_KEY = 'turx_site_copy_v1'

type SiteCopyContextValue = {
  overrides: Record<string, string>
  copy: (key: string) => string
  isGm: boolean
  openEditorForPage: (pageId: EditablePageId) => void
  pageOverrideCount: (pageId: EditablePageId) => number
}

const SiteCopyContext = createContext<SiteCopyContextValue>({
  overrides: {},
  copy: (key) => resolveSiteCopy({}, key),
  isGm: false,
  openEditorForPage: () => undefined,
  pageOverrideCount: () => 0,
})

export function useSiteCopy() {
  return useContext(SiteCopyContext)
}

export function SiteCopyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editingPageId, setEditingPageId] = useState<EditablePageId | null>(null)
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const isGm = Boolean(user && (isGuildMasterEmail(user.email) || isGuildMasterRole(user.role)))

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        setOverrides(normalizeSiteCopy(JSON.parse(cached)))
      }
    } catch {
      // ignore invalid cache
    }

    let cancelled = false
    fetch('/api/site-copy', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return
        const json = (await res.json().catch(() => ({}))) as { siteCopy?: Record<string, string> }
        if (cancelled || !json.siteCopy) return
        const clean = normalizeSiteCopy(json.siteCopy)
        setOverrides(clean)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(clean))
        } catch {
          // ignore storage quota
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  const copy = useCallback((key: string) => resolveSiteCopy(overrides, key), [overrides])

  const pageOverrideCount = useCallback(
    (pageId: EditablePageId) => {
      const def = getPageCopyDef(pageId)
      if (!def) return 0
      return def.fields.filter((f) => Boolean(overrides[f.key])).length
    },
    [overrides],
  )

  const openEditorForPage = useCallback(
    (pageId: EditablePageId) => {
      if (!isGm) return
      const def = getPageCopyDef(pageId)
      if (!def) return
      const initial: Record<string, string> = {}
      for (const f of def.fields) {
        initial[f.key] = resolveSiteCopy(overrides, f.key)
      }
      setDraftValues(initial)
      setSearchQuery('')
      setEditingPageId(pageId)
    },
    [isGm, overrides],
  )

  const activePageDef = editingPageId ? getPageCopyDef(editingPageId) : undefined

  const groupedFields = useMemo(() => {
    if (!activePageDef) return []
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? activePageDef.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.group.toLowerCase().includes(q) ||
            (draftValues[f.key] || '').toLowerCase().includes(q) ||
            f.defaultValue.toLowerCase().includes(q),
        )
      : activePageDef.fields

    const groups: { name: string; fields: SiteCopyField[] }[] = []
    for (const field of filtered) {
      let existing = groups.find((g) => g.name === field.group)
      if (!existing) {
        existing = { name: field.group, fields: [] }
        groups.push(existing)
      }
      existing.fields.push(field)
    }
    return groups
  }, [activePageDef, draftValues, searchQuery])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPageId || !activePageDef) return
    setSaving(true)
    try {
      const res = await fetch('/api/site-copy', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          action: 'save_page',
          pageId: editingPageId,
          values: draftValues,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        siteCopy?: Record<string, string>
        error?: string
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Metinler kaydedilemedi.')
      }
      const clean = normalizeSiteCopy(json.siteCopy)
      setOverrides(clean)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(clean))
      } catch {
        // ignore
      }
      toast({
        title: 'Metinler Güncellendi',
        description: `${activePageDef.pageTitle} sayfasındaki başlık ve içerikler anında canlıya alındı.`,
      })
      setEditingPageId(null)
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Kayıt Başarısız',
        description: err instanceof Error ? err.message : 'Bir hata oluştu.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetPage = async () => {
    if (!editingPageId || !activePageDef) return
    const ok = window.confirm(
      `"${activePageDef.pageTitle}" sayfasında özelleştirdiğiniz tüm başlık ve metinleri varsayılana sıfırlamak istiyor musunuz?`,
    )
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch('/api/site-copy', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action: 'reset_page', pageId: editingPageId }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        siteCopy?: Record<string, string>
        error?: string
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Sıfırlama başarısız.')
      }
      const clean = normalizeSiteCopy(json.siteCopy)
      setOverrides(clean)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(clean))
      } catch {
        // ignore
      }
      const resetDraft: Record<string, string> = {}
      for (const f of activePageDef.fields) {
        resetDraft[f.key] = f.defaultValue
      }
      setDraftValues(resetDraft)
      toast({
        title: 'Varsayılana Sıfırlandı',
        description: `${activePageDef.pageTitle} metinleri orijinal haline döndürüldü.`,
      })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Sıfırlanamadı',
        description: err instanceof Error ? err.message : 'Bir hata oluştu.',
      })
    } finally {
      setSaving(false)
    }
  }

  const draftModifiedCount = useMemo(() => {
    if (!activePageDef) return 0
    return activePageDef.fields.filter((f) => (draftValues[f.key] ?? '').trim() !== f.defaultValue).length
  }, [activePageDef, draftValues])

  const value = useMemo(
    () => ({ overrides, copy, isGm, openEditorForPage, pageOverrideCount }),
    [overrides, copy, isGm, openEditorForPage, pageOverrideCount],
  )

  return (
    <SiteCopyContext.Provider value={value}>
      {children}

      {isGm && activePageDef && (
        <Modal
          open={Boolean(editingPageId)}
          onClose={() => setEditingPageId(null)}
          className="max-w-3xl"
          title={`${activePageDef.pageTitle} — Metin & Başlık Editörü`}
          description="Sadece GM'e özel canlı içerik düzenleyici. Sistem işleyişini etkilemeden yalnızca başlık ve metinleri anında güncelleyebilirsiniz."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-silver">
                <Sparkles className="size-4 shrink-0 text-gold" />
                <span>
                  Toplam <strong className="text-foreground">{activePageDef.fields.length}</strong> düzenlenebilir alan ·{' '}
                  <strong className="text-gold">{draftModifiedCount}</strong> özelleştirilmiş
                </span>
              </div>
              {activePageDef.fields.length > 8 && (
                <div className="relative min-w-[210px] flex-1 sm:max-w-[260px]">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Alan veya metin ara..."
                    className={cn(inputClass, 'h-8 py-1 pr-2.5 pl-8 text-xs')}
                  />
                </div>
              )}
            </div>

            <div className="max-h-[56vh] space-y-5 overflow-y-auto pr-1">
              {groupedFields.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Aramanızla eşleşen metin alanı bulunamadı.
                </p>
              ) : (
                groupedFields.map((group) => (
                  <div
                    key={group.name}
                    className="space-y-3 rounded-xl border border-border/70 bg-[#071422]/85 p-4"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <h3 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-gold uppercase">
                        <Pencil className="size-3.5" />
                        {group.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">{group.fields.length} alan</span>
                    </div>

                    <div className="space-y-3">
                      {group.fields.map((field) => {
                        const val = draftValues[field.key] ?? field.defaultValue
                        const isModified = val.trim() !== field.defaultValue
                        return (
                          <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-silver">
                                <span>{field.label}</span>
                                {isModified && (
                                  <Badge className="border-gold/45 bg-gold/15 px-1.5 py-0 text-[9px] text-gold">
                                    Özel
                                  </Badge>
                                )}
                              </label>
                              {isModified && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraftValues((prev) => ({
                                      ...prev,
                                      [field.key]: field.defaultValue,
                                    }))
                                  }
                                  className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium text-muted-foreground transition hover:text-neon"
                                  title="Bu alanı varsayılan metne geri döndür"
                                >
                                  <RotateCcw className="size-2.5" />
                                  Varsayılan
                                </button>
                              )}
                            </div>

                            {field.multiline ? (
                              <textarea
                                rows={3}
                                maxLength={field.maxLength ?? 600}
                                value={val}
                                onChange={(e) =>
                                  setDraftValues((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={cn(
                                  inputClass,
                                  'min-h-[76px] resize-y py-2 text-xs leading-relaxed',
                                  isModified && 'border-gold/50',
                                )}
                              />
                            ) : (
                              <input
                                type="text"
                                maxLength={field.maxLength ?? 200}
                                value={val}
                                onChange={(e) =>
                                  setDraftValues((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={cn(inputClass, 'py-1.5 text-xs', isModified && 'border-gold/50')}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <GhostButton
                type="button"
                disabled={saving || pageOverrideCount(editingPageId!) === 0}
                onClick={() => void handleResetPage()}
                className="border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
              >
                <RotateCcw className="size-3.5" />
                Sayfayı Varsayılana Sıfırla
              </GhostButton>
              <div className="flex items-center gap-2">
                <GhostButton type="button" onClick={() => setEditingPageId(null)}>
                  Vazgeç
                </GhostButton>
                <GoldButton type="submit" disabled={saving}>
                  <Check className="size-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet & Canlıya Al'}
                </GoldButton>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </SiteCopyContext.Provider>
  )
}
