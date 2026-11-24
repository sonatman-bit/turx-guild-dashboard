import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası / Privacy Policy — TURX Forever',
  description: 'TURX Forever guild dashboard privacy policy and Google OAuth data usage disclosure.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-12 text-sm leading-relaxed text-silver">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">TURX FOREVER</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Gizlilik Politikası / Privacy Policy
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
          <h2 className="font-display text-lg font-bold text-gold">1. Uygulama Amacı / Purpose of Application</h2>
          <p>
            <strong>TURX Forever</strong> (<code>https://turxforever.com</code>), World of Warcraft: Forever (EU Alliance
            PvE) oyuncularının oluşturduğu <strong>TURX</strong> loncası için hazırlanmış resmi topluluk ve raid
            koordinasyon panelidir. Uygulama; lonca üyelerinin raid kayıtlarını, kadro planlamasını, şeffaf loot
            dağıtımını, katılım takibini ve lonca duyurularını yönetmesini sağlar.
          </p>
          <p className="text-muted-foreground">
            <strong>English Summary:</strong> TURX Forever is a World of Warcraft: Forever (EU Alliance PvE) guild
            management and raid coordination web application used by guild members to sign up for raids, track
            attendance, organize transparent loot distribution, and view guild rosters and strategies.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">
            2. Toplanan Veriler ve Google OAuth Kullanımı / Data Collected &amp; Google OAuth
          </h2>
          <p>
            Kullanıcılar e-posta/şifre ile veya isteğe bağlı olarak <strong>Google ile Giriş Yap (Google OAuth 2.0)</strong>{' '}
            seçeneğiyle hesap oluşturabilir. Google ile giriş sırasında yalnızca aşağıdaki temel kimlik bilgileri talep
            edilir (<code>openid</code>, <code>email</code>, <code>profile</code>):
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Doğrulanmış e-posta adresi (hesap eşleştirme ve oturum açma için)</li>
            <li>Ad / görünen isim (profil başlangıcını kolaylaştırmak için)</li>
          </ul>
          <p className="text-muted-foreground">
            <strong>Google API Services User Data Policy Compliance:</strong> TURX Forever only requests basic{' '}
            <code>openid</code>, <code>email</code>, and <code>profile</code> scopes strictly for user authentication.
            Google user data is never sold, rented, shared with third-party advertisers, or used to train AI/ML models or
            generate synthetic media. Our use of information received from Google APIs adheres strictly to the Google API
            Services User Data Policy, including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">3. Veri Saklama ve Güvenlik / Data Storage &amp; Security</h2>
          <p>
            Hesap bilgileri, oyun içi karakter profilleri ve raid katılım kayıtları HTTPS şifrelemesi altında güvenli
            sunucu depolamasında saklanır. Oturumlar <code>HttpOnly</code> ve <code>Secure</code> çerezler ile korunur.
            Google erişim belirteçleri (access token) kalıcı olarak saklanmaz; yalnızca giriş anında kimlik doğrulaması
            için kullanılır.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-bold text-gold">4. Veri Silme ve İletişim / Data Deletion &amp; Contact</h2>
          <p>
            Hesabının ve ilişkili tüm verilerinin silinmesini istediğin zaman aşağıdaki iletişim adresinden talep
            edebilirsin. Talepler en geç 7 gün içinde işleme alınır.
          </p>
          <p>
            İletişim / Contact:{' '}
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
        <Link href="/terms" className="hover:text-foreground">
          Kullanım Koşulları / Terms of Service
        </Link>
      </div>
    </main>
  )
}
