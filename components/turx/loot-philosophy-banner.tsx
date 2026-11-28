'use client'

import { Award, BarChart3, ShieldCheck, Sparkles } from 'lucide-react'
import { useSiteCopy } from './site-copy-provider'
import { Panel } from './ui'

export function LootPhilosophyBanner() {
  const { copy } = useSiteCopy()
  return (
    <Panel className="relative overflow-hidden border-gold/40 bg-gradient-to-br from-[#0e243a] via-[#091829] to-[#071220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-neon via-gold to-emerald-400" />
      <div className="flex flex-col gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-gold uppercase">
            <Sparkles className="size-4 shrink-0 text-gold" />
            {copy('philosophy.title')}
          </p>
          <p className="mt-2 max-w-4xl whitespace-pre-line text-xs leading-relaxed text-silver sm:text-[13px]">
            {copy('philosophy.intro')}
          </p>
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <div className="rounded-xl border border-neon/25 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-neon">
              <BarChart3 className="size-3.5 shrink-0" />
              {copy('philosophy.card1.title')}
            </p>
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
              {copy('philosophy.card1.body')}
            </p>
          </div>

          <div className="rounded-xl border border-gold/30 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-gold">
              <Award className="size-3.5 shrink-0" />
              {copy('philosophy.card2.title')}
            </p>
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
              {copy('philosophy.card2.body')}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-emerald-300">
              <ShieldCheck className="size-3.5 shrink-0" />
              {copy('philosophy.card3.title')}
            </p>
            <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
              {copy('philosophy.card3.body')}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
