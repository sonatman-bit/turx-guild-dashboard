import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları / Terms of Service — TURX Forever',
  description: 'TURX Forever guild dashboard terms of service.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-12 text-sm leading-relaxed text-silver">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">TURX FOREVER</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Kullanım Koşulları / Terms of Service
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Son güncelleme / Last updated: 24.11.2026</p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold transition hover:bg-gold/20"
        >
          ← Ana Sayfa
        </Link>
      </div>

      <div className="space-y-8 rounded-2xl border border-border bg-[#0b1b2d]/90 p-6 sm:p-8">
        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">1. Hizmet Tanımı / Scope of Service</h2>
          <p>
            <strong>TURX Forever</strong> (<code>https://turxforever.com</code>), World of Warcraft: Forever topluluğu
            için ücretsiz olarak sunulan bir lonca yönetim, raid takvimi, kadro ve şeffaf loot takip platformudur.
            Blizzard Entertainment ile resmi bir bağı bulunmayan topluluk projesidir.
          </p>
          <p className="text-muted-foreground">
            <strong>English Summary:</strong> TURX Forever is a free community guild dashboard for World of Warcraft:
            Forever players to coordinate raids, rosters, and loot distribution. It is an independent fan/guild tool and
            is not affiliated with Blizzard Entertainment.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">2. Hesap ve Topluluk Kuralları / Accounts &amp; Conduct</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Kullanıcılar doğru oyun içi karakter bilgilerini girmekten sorumludur.</li>
            <li>Başka bir üyenin hesabına yetkisiz erişim, spam, taciz veya kötüye kullanım yasaktır.</li>
            <li>Lonca yönetimi (Guild Master / Officer), kurallara uymayan hesapların lonca erişimini kısıtlayabilir.</li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">3. Üçüncü Taraf Giriş / Third-Party Sign-In</h2>
          <p>
            İsteğe bağlı Google OAuth girişi yalnızca kullanıcı kimliğini doğrulamak için kullanılır. Verilerinin nasıl
            işlendiğine ilişkin ayrıntılar için{' '}
            <Link href="/privacy" className="text-neon underline underline-offset-4">
              Gizlilik Politikası
            </Link>{' '}
            sayfasını inceleyebilirsin.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">4. İletişim / Contact</h2>
          <p>
            Soruların veya destek taleplerin için:{' '}
            <a href="mailto:sonatman@gmail.com" className="text-neon underline underline-offset-4">
              sonatman@gmail.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Ana Sayfa
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-foreground">
          Gizlilik Politikası / Privacy Policy
        </Link>
      </div>
    </main>
  )
}
