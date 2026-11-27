'use client'

import { Award, BarChart3, ShieldCheck, Sparkles } from 'lucide-react'
import { Panel } from './ui'

export function LootPhilosophyBanner() {
  return (
    <Panel className="relative overflow-hidden border-gold/40 bg-gradient-to-br from-[#0e243a] via-[#091829] to-[#071220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-neon via-gold to-emerald-400" />
      <div className="flex flex-col gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-gold uppercase">
            <Sparkles className="size-4 shrink-0 text-gold" />
            Sistemin Temel Yaklaşımı &amp; Öncelik Metodolojisi
          </p>
          <p className="mt-2 max-w-4xl text-xs leading-relaxed text-silver sm:text-[13px]">
            TURX Loot Sistemi oluşturulurken{' '}
            <strong className="text-foreground">genel matematik kuralları</strong> ve{' '}
            <strong className="text-neon">WoW simülasyonları</strong> çalıştırılarak her bir item parçasının hangi
            sınıf/spec için <strong className="text-gold">en yüksek raid faydasını</strong> sağladığı hesaplanmış ve
            öncelik sıralaması bu objektif veriler ışığında oluşturulmuştur. Amaç bireysel değil, lonca olarak en
            hızlı ve istikrarlı progress&apos;i yakalamaktır.
          </p>
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <div className="rounded-xl border border-neon/25 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-neon">
              <BarChart3 className="size-3.5 shrink-0" />
              Matematik &amp; Simülasyon Temelli
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Stat ağırlıkları, set etkileşimleri ve simülasyon çıktıları baz alınarak her parçanın maksimum verim
              sağladığı sınıf/spec öne alınır.
            </p>
          </div>

          <div className="rounded-xl border border-gold/30 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-gold">
              <Award className="size-3.5 shrink-0" />
              Her Sınıf &amp; Spec İçin 1. Sıra Dengesi
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Tüm kadronun dengeli güçlenmesi adına, her sınıf ve spec&apos;in mutlaka öncelik sıralamasının başında
              olabileceği itemlar bulunmasına özen gösterilmiştir.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-[#071422]/85 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-bold text-emerald-300">
              <ShieldCheck className="size-3.5 shrink-0" />
              Tank &amp; Healer Önceliği
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Boss kesim istikrarı ve raid dayanıklılığı herkesin ortak kazanımıdır; bu sistemde{' '}
              <strong className="text-emerald-200">Tank ve Healerlar</strong> öncelenerek planlama yapılmıştır.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
