export const LAUNCH_MEETING_EVENT_CONFIG = {
  raidId: 'guild-meeting',
  raidName: 'TURX Guild Toplantısı & Yeni Sistem Sunumu',
  size: 40 as const,
  /** 2 Aralık 2026, 22:30 (TR UTC+3) */
  scheduledAt: '2026-12-02T22:30:00+03:00',
  /** 1 Aralık 2026, 22:30 (TR UTC+3) — İmza kapanışı */
  signupDeadline: '2026-12-01T22:30:00+03:00',
  /** 2 Aralık 2026, 20:30 (TR UTC+3) — Konfirmasyon kapanışı (toplantıdan 2 saat önce) */
  confirmDeadline: '2026-12-02T20:30:00+03:00',
  notes:
    'Officer ekibimiz yeni TURX Raid, Loot ve Puanlama sistemini canlı sunumla son kez aktaracak. Bu toplantı raid takibi kurallarıyla (İmza +1p, Konfirmasyon +1p, Tam Katılım +4p) işler ve ilk puanlarınız bu demo ile başlar! Tüm seviyeler katılabilir.',
}

export const LAUNCH_CAMPAIGN_TITLE =
  'TURX Yeni Sistem Yayında! Kullanıcı Rehberi & 2 Aralık 22:30 Guild Toplantısı'

export const LAUNCH_CAMPAIGN_ICON = '🚀'
export const LAUNCH_CAMPAIGN_CATEGORY = 'ONEMLI' as const

export const LAUNCH_CAMPAIGN_CONTENT = `Merhaba {karakter},

TURX Guild olarak büyük bir adım attık ve **yeni TURX Raid, Loot & Devam Takibi Sistemimizi** yayına aldık!

🎯 **Hedefimiz Net:**
Birlikte disiplinli, şeffaf, adil ve keyifli bir ortam kurarak **server'ın en iyi, en başarılı ve en huzurlu Türk guildi** olmak. Yeni panelimiz; hak edene hakkını veren, kimsenin aklında soru işareti bırakmayan bir düzen kurmak için hazırlandı.

---

✅ **Hemen Yapman Gerekenler (Kısa To-Do List & Kullanıcı Rehberi):**

**1. Profilini Eksiksiz Doldurduğundan Emin Ol**
• **Profilim** sekmesine girerek ana karakter bilgilerinin (isim, sınıf, spec, rol), WoW Armory doğrulamanın, mesleklerinin ve haftalık **Raid Müsaitlik** saatlerinin eksiksiz ve güncel olduğundan emin ol.

**2. 2 Aralık Saat 22:30 — TURX Guild Toplantısı'na İmza At (İlk Puanların Başlıyor!)**
• **2 Aralık Çarşamba saat 22:30**'da Officer ekibimizle birlikte yeni sistemi canlı bir sunumla son kez anlatacağımız büyük **Guild Toplantısı** düzenliyoruz.
• Bu toplantıyı **Raid Kayıt** ekranında tıpkı gerçek bir raid etkinliği gibi açtık! İmza atma (**+1 puan**), roster yayınlandığında katılım konfirmasyonu (**+1 puan**) ve toplantıya tam katılım (**+4 puan**) dahil tüm raid kuralları aynen işleyecek.
• Böylece hem yeni sistemi canlı canlı deneyimleyecek hem de **ilk devam puanlarını** bu toplantı demosu ile kazanmaya başlayacaksın. *(Tüm seviyeler toplantıya imza atabilir!)*

**3. Yeni Modüllere Göz At**
• **Road Map:** Guild vizyonumuz, 1 Ocak 2027 40-Man hedefimiz ve loot felsefemiz.
• **Raid Kayıt:** Tek havuz imza, roster grupları ve konfirmasyon takibi.
• **Loot Sistemi:** İsimsiz 10/20/40-Man raid şablonları ve boss bazlı şeffaf öncelik sıraları.
• **Devam Takibi & Guild Bank:** Şeffaf faz puanları ve lonca banka malzeme talepleri.

**4. Soru, Görüş ve Önerilerin İçin Anonim Mesaj Kutusu**
• Sistemle, kurallarla veya guild işleyişiyle ilgili aklına takılan her türlü soru, fikir veya yapıcı öneri için sol menüdeki **Anonim Mesaj Kutusu**'nu rahatlıkla kullanabilirsin. Gönderilen mesajlarda kimlik ve karakter bilgisi kesinlikle saklanmaz.

---

2 Aralık saat **22:30**'da toplantıda görüşmek üzere! Aşağıdaki hızlı bağlantılardan hemen **Raid Kayıt** sayfasına geçip toplantı imzanı atabilirsin.

**For the Alliance — TURX Yönetimi** 🛡️`

export function buildLaunchCampaignAttachments(origin = 'https://turxforever.com') {
  const base = origin.replace(/\/$/, '')
  return [
    {
      name: '📅 2 Aralık 22:30 Guild Toplantısına İmza At (Raid Kayıt)',
      url: `${base}/?tab=raid-signup`,
      type: 'file' as const,
    },
    {
      name: '👤 Profilimi & Bilgilerimi Kontrol Et',
      url: `${base}/?tab=profile`,
      type: 'file' as const,
    },
    {
      name: '✉️ Anonim Mesaj Kutusu (Soru & Öneri Gönder)',
      url: `${base}/?tab=anonymous`,
      type: 'file' as const,
    },
    {
      name: '🗺️ Road Map & Yeni Sistemi İncele',
      url: `${base}/?tab=roadmap`,
      type: 'file' as const,
    },
  ]
}
