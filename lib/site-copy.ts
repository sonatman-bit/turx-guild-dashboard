export type EditablePageId =
  | 'overview'
  | 'roadmap'
  | 'roster'
  | 'applications'
  | 'strategy'
  | 'anonymous'
  | 'raid-signup'
  | 'loot'
  | 'attendance'
  | 'bank'
  | 'admin'

export type SiteCopyField = {
  key: string
  label: string
  group: string
  defaultValue: string
  multiline?: boolean
  maxLength?: number
}

export type SiteCopyPageDef = {
  pageId: EditablePageId
  pageTitle: string
  fields: SiteCopyField[]
}

export const SITE_COPY_PAGES: SiteCopyPageDef[] = [
  {
    pageId: 'overview',
    pageTitle: 'Genel Bakış',
    fields: [
      { key: 'nav.overview.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Genel Bakış', maxLength: 40 },
      { key: 'nav.overview.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Dashboard', maxLength: 60 },
      {
        key: 'overview.hero.badge',
        label: 'Üst Rozet Metni',
        group: 'Ana Banner (Hero)',
        defaultValue: 'WOW: FOREVER · EU · PVE · NORMAL · ALLIANCE',
        maxLength: 100,
      },
      { key: 'overview.hero.title', label: 'Ana Marka Başlığı', group: 'Ana Banner (Hero)', defaultValue: 'TURX', maxLength: 40 },
      {
        key: 'overview.hero.subtitle',
        label: 'Alt Marka Başlığı',
        group: 'Ana Banner (Hero)',
        defaultValue: 'TURKISH ALLIANCE GUILD',
        maxLength: 80,
      },
      {
        key: 'overview.hero.manifesto',
        label: 'Tanıtım Paragrafı',
        group: 'Ana Banner (Hero)',
        multiline: true,
        defaultValue:
          'Azeroth & Kalimdor raid gecelerinde birlikte keyifli vakit geçiren bir Türk Topluluğu. Düzenli kadro, başarı odaklı raidler ve herkes için yuva olabilecek sıcak bir ortam.',
        maxLength: 500,
      },
      { key: 'overview.hero.ctaApply', label: 'Başvuru Buton Yazısı', group: 'Ana Banner (Hero)', defaultValue: 'BAŞVURU YAP', maxLength: 40 },
      { key: 'overview.roadmap.title', label: 'Faz Takvimi Panel Başlığı', group: 'Ana Sayfa Panelleri', defaultValue: 'WoW: Forever Phase Roadmap', maxLength: 80 },
      { key: 'overview.nextRaid.title', label: 'Sıradaki Raid Panel Başlığı', group: 'Ana Sayfa Panelleri', defaultValue: 'Sıradaki Raid', maxLength: 60 },
      { key: 'overview.nextRaid.heading', label: 'Sıradaki Raid Başlığı', group: 'Ana Sayfa Panelleri', defaultValue: 'Phase 1 Açılışı', maxLength: 80 },
      { key: 'overview.nextRaid.dateLabel', label: 'Sıradaki Raid Tarih Yazısı', group: 'Ana Sayfa Panelleri', defaultValue: '9 Aralık 2026 · 21:00 (TR)', maxLength: 80 },
      { key: 'overview.progress.title', label: 'Progress Tracker Başlığı', group: 'Ana Sayfa Panelleri', defaultValue: 'TURX Progress Tracker', maxLength: 80 },
      { key: 'overview.stream.title', label: 'Stream Radar Başlığı', group: 'Ana Sayfa Panelleri', defaultValue: 'Stream Radar', maxLength: 60 },
      {
        key: 'overview.stream.empty',
        label: 'Stream Radar Boş Durum Metni',
        group: 'Ana Sayfa Panelleri',
        defaultValue: 'Kayıtlı kanal yok. Profiline Twitch, Kick veya YouTube kanal adını yaz.',
        maxLength: 200,
      },
      {
        key: 'overview.timezoneNote',
        label: 'Alt Saat Dilimi Notu',
        group: 'Ana Sayfa Panelleri',
        defaultValue: 'Tüm saatler Türkiye saatine (UTC+3) göredir.',
        maxLength: 160,
      },
    ],
  },
  {
    pageId: 'roadmap',
    pageTitle: 'Road Map',
    fields: [
      { key: 'nav.roadmap.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Road Map', maxLength: 40 },
      { key: 'nav.roadmap.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Sistem Sunumu & Rehber', maxLength: 60 },
      { key: 'roadmap.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'TURX FOREVER · OYUNCU REHBERİ & SUNUM', maxLength: 90 },
      { key: 'roadmap.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Road Map: Yeni Raid & Loot Sistemi', maxLength: 120 },
      {
        key: 'roadmap.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue:
          'Canlıya geçmeden önce tüm lonca üyelerinin yeni sistemi 3 dakikada kavraması için hazırlanan interaktif sunum. Discord toplantıları için Slayt Moduna geçebilirsiniz.',
        maxLength: 500,
      },
      {
        key: 'philosophy.title',
        label: 'Temel Yaklaşım Banner Başlığı',
        group: 'Öncelik Metodolojisi Bannerı (Ortak)',
        defaultValue: 'Sistemin Temel Yaklaşımı & Öncelik Metodolojisi',
        maxLength: 120,
      },
      {
        key: 'philosophy.intro',
        label: 'Temel Yaklaşım Paragrafı',
        group: 'Öncelik Metodolojisi Bannerı (Ortak)',
        multiline: true,
        defaultValue:
          "TURX Loot Sistemi oluşturulurken genel matematik kuralları ve WoW simülasyonları çalıştırılarak her bir item parçasının hangi sınıf/spec için en yüksek raid faydasını sağladığı hesaplanmış ve öncelik sıralaması bu objektif veriler ışığında oluşturulmuştur. Amaç bireysel değil, lonca olarak en hızlı ve istikrarlı progress'i yakalamaktır.",
        maxLength: 700,
      },
      { key: 'philosophy.card1.title', label: 'Kart 1 Başlığı', group: 'Öncelik Metodolojisi Bannerı (Ortak)', defaultValue: 'Matematik & Simülasyon Temelli', maxLength: 80 },
      {
        key: 'philosophy.card1.body',
        label: 'Kart 1 Açıklaması',
        group: 'Öncelik Metodolojisi Bannerı (Ortak)',
        multiline: true,
        defaultValue:
          'Stat ağırlıkları, set etkileşimleri ve simülasyon çıktıları baz alınarak her parçanın maksimum verim sağladığı sınıf/spec öne alınır.',
        maxLength: 350,
      },
      { key: 'philosophy.card2.title', label: 'Kart 2 Başlığı', group: 'Öncelik Metodolojisi Bannerı (Ortak)', defaultValue: 'Her Sınıf & Spec İçin 1. Sıra Dengesi', maxLength: 80 },
      {
        key: 'philosophy.card2.body',
        label: 'Kart 2 Açıklaması',
        group: 'Öncelik Metodolojisi Bannerı (Ortak)',
        multiline: true,
        defaultValue:
          "Tüm kadronun dengeli güçlenmesi adına, her sınıf ve spec'in mutlaka öncelik sıralamasının başında olabileceği itemlar bulunmasına özen gösterilmiştir.",
        maxLength: 350,
      },
      { key: 'philosophy.card3.title', label: 'Kart 3 Başlığı', group: 'Öncelik Metodolojisi Bannerı (Ortak)', defaultValue: 'Tank & Healer Önceliği', maxLength: 80 },
      {
        key: 'philosophy.card3.body',
        label: 'Kart 3 Açıklaması',
        group: 'Öncelik Metodolojisi Bannerı (Ortak)',
        multiline: true,
        defaultValue:
          'Boss kesim istikrarı ve raid dayanıklılığı herkesin ortak kazanımıdır; bu sistemde Tank ve Healerlar öncelenerek planlama yapılmıştır.',
        maxLength: 350,
      },
      { key: 'roadmap.s0.title', label: '1. Bölüm Başlığı', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: '1. Büyük Resim: Fazlar & 1 Ocak 2027 Hedefi', maxLength: 120 },
      {
        key: 'roadmap.s0.intro',
        label: '1. Bölüm Giriş Metni',
        group: '1. Vizyon & Zaman Çizelgesi',
        multiline: true,
        defaultValue:
          'TURX FOREVER loncasında torpilsiz, %100 şeffaf ve disiplin ödüllendiren yeni Raid & Loot sistemine geçiyoruz. Tüm puanlar, devam kayıtları ve loot sıralamaları 7/24 web sitemizde tüm oyunculara açık takip edilir.',
        maxLength: 500,
      },
      { key: 'roadmap.s0.c1.badge', label: 'Kart 1 Rozet', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: '2 Aralık Demo → 9 Aralık Phase 1', maxLength: 60 },
      { key: 'roadmap.s0.c1.title', label: 'Kart 1 Başlık', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: 'Phase 1 & Puan Yarışı', maxLength: 80 },
      {
        key: 'roadmap.s0.c1.body',
        label: 'Kart 1 Açıklama',
        group: '1. Vizyon & Zaman Çizelgesi',
        multiline: true,
        defaultValue:
          "İlk bonus puanlar 2 Aralık Guild Toplantısı ile (seviyeden bağımsız) başlar. 9 Aralık'ta Barrow Deeps (10m), Hyjal Summit (20m) ve Onyxia's Lair (40m) açılır ve tüm LvL 60 Main karakterler TURX rütbesiyle eşit şartlarda puan biriktirir.",
        maxLength: 500,
      },
      { key: 'roadmap.s0.c2.badge', label: 'Kart 2 Rozet', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: '1 Ocak 2027', maxLength: 60 },
      { key: 'roadmap.s0.c2.title', label: 'Kart 2 Başlık', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: 'Roster Şablonu & İlk 50 Raider', maxLength: 80 },
      {
        key: 'roadmap.s0.c2.body',
        label: 'Kart 2 Açıklama',
        group: '1. Vizyon & Zaman Çizelgesi',
        multiline: true,
        defaultValue:
          '10-20 ve 40-man rosterlar isimsiz class/spec şablonu olarak yayınlanır. 40-Man çekirdek kadro + yedek rotasyonu için en yüksek devam puanına sahip ilk 50 oyuncu 1 Ocak 2027 tarihinde RAIDER rütbesine yükseltilir.',
        maxLength: 500,
      },
      { key: 'roadmap.s0.c3.badge', label: 'Kart 3 Rozet', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: 'Yeni Fazlar', maxLength: 60 },
      { key: 'roadmap.s0.c3.title', label: 'Kart 3 Başlık', group: '1. Vizyon & Zaman Çizelgesi', defaultValue: 'Yeni Faz, Taze Rekabet', maxLength: 80 },
      {
        key: 'roadmap.s0.c3.body',
        label: 'Kart 3 Açıklama',
        group: '1. Vizyon & Zaman Çizelgesi',
        multiline: true,
        defaultValue:
          'Blizzard her yeni faz raid paketi eklediğinde, yeni faza ait item listesi ve öncelik sıralaması ayrıca hazırlanır ve takip edilir.',
        maxLength: 500,
      },
      { key: 'roadmap.s1.title', label: '2. Bölüm Başlığı', group: '2. Haftalık Raid Döngüsü', defaultValue: '2. Bir Haftalık Raid Döngüsü', maxLength: 100 },
      { key: 'roadmap.s2.title', label: '3. Bölüm Başlığı', group: '3. Loot Kuralları & BoE/BoP', defaultValue: '3. Şeffaf Loot Öncelik Rotasyonu (Canlı Demo!)', maxLength: 120 },
      { key: 'roadmap.s2.rule1.title', label: 'Kural Kartı 1 Başlık', group: '3. Loot Kuralları & BoE/BoP', defaultValue: 'Faz Başı İtiraz & Liste Kilidi', maxLength: 80 },
      {
        key: 'roadmap.s2.rule1.body',
        label: 'Kural Kartı 1 Metin',
        group: '3. Loot Kuralları & BoE/BoP',
        multiline: true,
        defaultValue:
          'Öncelik listesi her faz başlamadan 5–7 gün önce tüm loncaya açılır ve öneriler değerlendirilir. Faz açılışında liste kilitlenir ve sonraki faza kadar tartışmaya kapatılır.',
        maxLength: 500,
      },
      { key: 'roadmap.s2.rule2.title', label: 'Kural Kartı 2 Başlık', group: '3. Loot Kuralları & BoE/BoP', defaultValue: 'RCLootCouncil (Gönüllü Dayanışma)', maxLength: 80 },
      {
        key: 'roadmap.s2.rule2.body',
        label: 'Kural Kartı 2 Metin',
        group: '3. Loot Kuralları & BoE/BoP',
        multiline: true,
        defaultValue:
          'Oyun içi talep toplamak (BIS / Major / Minor / OS / Pass) için kullanılır; nihai karar sitedeki Öncelik Sırası + Puan listesidir. Muadili olan oyuncu gönüllü Minor Update seçip sırayı verirse kendi önceliği Bekleyen Öncelik olarak korunur.',
        maxLength: 500,
      },
      { key: 'roadmap.s2.rule3.title', label: 'Kural Kartı 3 Başlık', group: '3. Loot Kuralları & BoE/BoP', defaultValue: 'Ortak Liste & Varsayılan Kota (10m:1 · 20m:2 · 40m:4)', maxLength: 90 },
      {
        key: 'roadmap.s2.rule3.body',
        label: 'Kural Kartı 3 Metin',
        group: '3. Loot Kuralları & BoE/BoP',
        multiline: true,
        defaultValue:
          "Tüm raid grupları tek ortak listeyi kullanır: her öncelik sırası varsayılan olarak 10-man'de 1, 20-man'de 2, 40-man'de 4 kota (item bazında özelleştirilebilir ve birden fazla spec eşit paylaşabilir) ile döner. Aynı oyuncu kendi isteğiyle üst üste en fazla 2 kez benche yazılabilir; 3. kez üst üste gönüllü bench yazılamaz (Officer kararı hariç).",
        maxLength: 600,
      },
      { key: 'roadmap.s2.boe.title', label: 'BoE Kart Başlığı', group: '3. Loot Kuralları & BoE/BoP', defaultValue: 'BoE Eşyalar → Guild Banka', maxLength: 80 },
      {
        key: 'roadmap.s2.boe.body',
        label: 'BoE Kart Metni',
        group: '3. Loot Kuralları & BoE/BoP',
        multiline: true,
        defaultValue:
          'Raidlerde düşen tüm BoE itemlar istisnasız Guild Bankasına gelir amaçlı alınır ve sitede şeffaf olarak listelenir.',
        maxLength: 400,
      },
      { key: 'roadmap.s2.bop.title', label: 'BoP Kart Başlığı', group: '3. Loot Kuralları & BoE/BoP', defaultValue: 'BoP Tarifler → Meslek Sorumlusu & Min 300 Roll', maxLength: 90 },
      {
        key: 'roadmap.s2.bop.body',
        label: 'BoP Kart Metni',
        group: '3. Loot Kuralları & BoE/BoP',
        multiline: true,
        defaultValue:
          'Tüm BoP tarifler ilk düşüşte guildin belirlediği Meslek Sorumlusuna verilir. Aynı tarif tekrar düşerse o meslekte min 300 olanlar anında öğrenmek şartıyla rollar.',
        maxLength: 400,
      },
      { key: 'roadmap.s3.faqTitle', label: '4. Bölüm SSS Başlığı', group: '4. SSS & Onay', defaultValue: '4. Sıkça Sorulan Sorular (SSS)', maxLength: 90 },
      {
        key: 'roadmap.faq.0.q',
        label: 'SSS 1 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'Officer kararıyla Bench (Yedek) kalırsam puan kaybeder miyim? Gönüllü bench sınırı var mı?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.0.a',
        label: 'SSS 1 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          "Hayır! Officer kararıyla veya kendi kararınızla Bench bekleyen ve raid saatinde oyunda/Discord'da hazır bulunan oyuncular +6p yedek puanı (imza +1 ve onay +1 ile toplam +8p) alır. Suistimali önlemek adına aynı oyuncu kendi isteğiyle üst üste en fazla 2 kez benche yazılabilir; 3. kez üst üste gönüllü bench yazılamaz (Officer kararıyla yapılan rotasyon bu sınıra dahil değildir). Raid saatinde çağrıldığında ulaşılamayan yedek oyunculara ceza puanı uygulanır.",
        maxLength: 800,
      },
      {
        key: 'roadmap.faq.1.q',
        label: 'SSS 2 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'Raide imza attım ama işim çıktı, -6 ceza yer miyim?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.1.a',
        label: 'SSS 2 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Konfirmasyon kapanış süresinden (raidten 24 saat öncesinden) ÖNCE sistemden "Mazeretli İptal" bildirirseniz ceza puanı (net 0p) uygulanmaz. Net -6 puan cezası yalnızca konfirmasyon verip gelmeyen veya haber vermeden kaybolan (No-Show) oyunculara uygulanır.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.2.q',
        label: 'SSS 3 — Soru',
        group: '4. SSS & Onay',
        defaultValue: '2 Aralık Guild Toplantısı puanları nasıl işlenir? Level 60 olmayanlar da puan alır mı?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.2.a',
        label: 'SSS 3 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Evet! 2 Aralık 22:30 Guild Toplantısı yeni sistemi canlı deneyimlemek ve katılımcılara bonus ödül vermek amacıyla tüm seviyelere açıktır. Toplantıdan kazanılan puanlar seviyeden bağımsız olarak doğrudan oyuncuların Phase 1 devam puanlarına ve 1 Ocak 2027 sıralamasına işlenir.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.3.q',
        label: 'SSS 4 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'Loot sırasında benim sınıfım var ama ben o gün raidde değildim, hakkım yanar mı?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.3.a',
        label: 'SSS 4 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Hayır, öncelik rotasyonu mantığımız sayesinde hakkınız yanmaz! O gün sıradaki sınıf raidde yoksa bir sonraki sınıf kendi sırasını doldurur; sizin sıranız "Bekleyen Öncelik" olarak açık kalır ve bir sonraki düşüşte öncelik tekrar size gelir.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.4.q',
        label: 'SSS 5 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'RCLootCouncil addonu nasıl kullanılır? Gönüllü "Minor Update" seçersem öncelik hakkım yanar mı?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.4.a',
        label: 'SSS 5 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'RCLootCouncil yalnızca boss sonrası oyun içinde hızlı talep toplamak (BIS / Major Update / Minor Update / OS / Pass) için kullanılır; nihai karar her zaman sitedeki Öncelik Sırası + Devam Puanınındır. Hiçbir oyuncu pas geçmek zorunda değildir — elinde muadil eşya olsa bile BIS basarsa ve sıra kendisindeyse itemı alır. Takım arkadaşına büyük upgrade olması için gönüllü olarak "Minor Update" seçip sırayı verirse, alan kişinin sırası dolar ve gönüllü öncelik veren oyuncunun sırası AÇIK (Bekleyen Öncelik) olarak korunur.',
        maxLength: 800,
      },
      {
        key: 'roadmap.faq.5.q',
        label: 'SSS 6 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'Faz içindeki Loot Öncelik Listesine itiraz edebilir miyiz?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.5.a',
        label: 'SSS 6 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Her faz başlamadan 5–7 gün önce taslak öncelik listesi tüm loncaya sunulur ve tüm itiraz/öneriler değerlendirilip güncellenir. Faz açılış gününde liste kilitlenir ve sonraki faza kadar tartışmaya kapatılır; böylece raid sırasında sıfır tartışma ile hızlı ve şeffaf dağıtım yapılır.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.6.q',
        label: 'SSS 7 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'Aynı gün ve saate 30 kişi 10-man Barrow Deeps için imza atarsa ne olur?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.6.a',
        label: 'SSS 7 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Her raid için tek imza havuzu açılır. Officerlar gelen imza sayısına göre aynı etkinlik içinde Grup 1, Grup 2, Grup 3 ve Bench şeklinde birden fazla roster yayınlayabilir.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.7.q',
        label: 'SSS 8 — Soru',
        group: '4. SSS & Onay',
        defaultValue: 'BoE itemlar ve BoP tarifler nasıl dağıtılır?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.7.a',
        label: 'SSS 8 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          'Tüm BoE itemlar istisnasız Guild Bankasına gelir amaçlı alınır. Tüm BoP tarifler ilk düşüşte guildin belirlediği Meslek Sorumlusuna verilir; aynı tarif tekrar düşerse min 300 mesleğe sahip olanlar anında öğrenmek şartıyla rollar.',
        maxLength: 700,
      },
      {
        key: 'roadmap.faq.8.q',
        label: 'SSS 9 — Soru',
        group: '4. SSS & Onay',
        defaultValue: '1 Ocak 2027 tarihinde Raider rütbesi nasıl verilecek?',
        maxLength: 200,
      },
      {
        key: 'roadmap.faq.8.a',
        label: 'SSS 9 — Cevap',
        group: '4. SSS & Onay',
        multiline: true,
        defaultValue:
          "1 Ocak 2027'ye kadar tüm LvL 60 Main karakterler TURX rütbesiyle puan biriktirir. En yüksek devam puanına sahip ilk 50 oyuncu 1 Ocak 2027 tarihinde RAIDER rütbesine yükseltilir.",
        maxLength: 700,
      },
      {
        key: 'roadmap.ack.title',
        label: 'Onay Kutusu Başlığı',
        group: '4. SSS & Onay',
        defaultValue: 'Sistemi İnceledin mi? Onayını Kaydet!',
        maxLength: 100,
      },
    ],
  },
  {
    pageId: 'roster',
    pageTitle: 'Guild Kadrosu',
    fields: [
      { key: 'nav.roster.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Guild Kadrosu', maxLength: 40 },
      { key: 'nav.roster.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Roster & Analitik', maxLength: 60 },
      { key: 'roster.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Phase 1 Hazırlıkları', maxLength: 90 },
      { key: 'roster.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Guild Kadrosu & Roster Yönetimi', maxLength: 120 },
      {
        key: 'roster.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue:
          'WoW: Forever Alliance lonca kadrosu — Main karakterler ve Alt karakterler ayrı listeler halinde takip edilir',
        maxLength: 400,
      },
    ],
  },
  {
    pageId: 'applications',
    pageTitle: 'Guild Başvuru',
    fields: [
      { key: 'nav.applications.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Guild Başvuru', maxLength: 40 },
      { key: 'nav.applications.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Recruitment', maxLength: 60 },
      { key: 'applications.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Recruitment · Alliance PvE (EU)', maxLength: 90 },
      { key: 'applications.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Başvuru & Recruitment', maxLength: 120 },
      {
        key: 'applications.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue: 'TURX, WoW: Forever’da Phase 1’den itibaren progress odaklı Raid kadrosunu genişletiyor.',
        maxLength: 400,
      },
      { key: 'applications.banner.title', label: 'Başvuru Banner Başlığı', group: 'Başvuru Bannerı', defaultValue: 'TURX RAİD KADROSUNA KATIL', maxLength: 90 },
      {
        key: 'applications.banner.body',
        label: 'Başvuru Banner Metni',
        group: 'Başvuru Bannerı',
        multiline: true,
        defaultValue:
          'Bizler sadece boss kesmek için değil; adaletli loot sistemi, samimi ortam ve yüksek raid disipliniyle kalıcı bir miras bırakmak için bir araya geldik. Alliance bayrağı altında Forever evreninde yerini al!',
        maxLength: 500,
      },
      { key: 'applications.matrix.title', label: 'İhtiyaç Matrisi Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Class / Spec İhtiyaç Matrisi', maxLength: 80 },
      { key: 'applications.rules.title', label: 'Kurallar Özeti Başlığı', group: 'Raid & Loot Kuralları Özeti', defaultValue: 'TURX Raid & Loot Kuralları Özeti', maxLength: 100 },
      {
        key: 'applications.rules.intro',
        label: 'Kurallar Özeti Giriş Paragrafı',
        group: 'Raid & Loot Kuralları Özeti',
        multiline: true,
        defaultValue:
          'Başvurmadan önce sistemimizi 30 saniyede tanıyın: TURX’ta torpilsiz, %100 şeffaf ve disiplin ödüllendiren hibrit Öncelik Rotasyonu + Şeffaf Devam Puanı sistemi uygulanır.',
        maxLength: 450,
      },
      { key: 'applications.rules.c1.title', label: 'Özet Kart 1 Başlık', group: 'Raid & Loot Kuralları Özeti', defaultValue: 'Faz Başı Kilitli Liste', maxLength: 80 },
      {
        key: 'applications.rules.c1.body',
        label: 'Özet Kart 1 Metin',
        group: 'Raid & Loot Kuralları Özeti',
        multiline: true,
        defaultValue: 'Öncelik sırası fazdan önce lonca onayına açılır, faz başlayınca kilitlenir.',
        maxLength: 300,
      },
      { key: 'applications.rules.c2.title', label: 'Özet Kart 2 Başlık', group: 'Raid & Loot Kuralları Özeti', defaultValue: 'Öncelik Rotasyonu & Puan', maxLength: 80 },
      {
        key: 'applications.rules.c2.body',
        label: 'Özet Kart 2 Metin',
        group: 'Raid & Loot Kuralları Özeti',
        multiline: true,
        defaultValue: 'Öncelik sıraları sırayla loot alır; aynı öncelik kutusunda yüksek devam puanı (eşitse zar) kazanır.',
        maxLength: 300,
      },
      { key: 'applications.rules.c3.title', label: 'Özet Kart 3 Başlık', group: 'Raid & Loot Kuralları Özeti', defaultValue: 'RCLootCouncil Dayanışma', maxLength: 80 },
      {
        key: 'applications.rules.c3.body',
        label: 'Özet Kart 3 Metin',
        group: 'Raid & Loot Kuralları Özeti',
        multiline: true,
        defaultValue: 'Gönüllü Minor Update ile sıra veren oyuncunun hakkı Bekleyen Öncelik olarak korunur.',
        maxLength: 300,
      },
      { key: 'applications.rules.c4.title', label: 'Özet Kart 4 Başlık', group: 'Raid & Loot Kuralları Özeti', defaultValue: 'Bench, BoE & BoP Netliği', maxLength: 80 },
      {
        key: 'applications.rules.c4.body',
        label: 'Özet Kart 4 Metin',
        group: 'Raid & Loot Kuralları Özeti',
        multiline: true,
        defaultValue: 'Hazır Bench +6p (net +8p) kazanır; BoE’ler Guild Bankasına, ilk BoP tarifler Meslek Sorumlusuna gider.',
        maxLength: 300,
      },
      {
        key: 'applications.tab.rotation.summary',
        label: 'Sekme 1 (Öncelik Rotasyonu) Özeti',
        group: 'Detay Sekmeleri',
        multiline: true,
        defaultValue:
          'TURX’ta kapalı kapılar ardında karar verilen klasik Loot Council veya puan yakmalı DKP/EPGP yoktur. Her eşyanın faz başında belirlenip kilitlenen şeffaf bir Spec Öncelik Sırası vardır.',
        maxLength: 500,
      },
      {
        key: 'applications.tab.attendance.summary',
        label: 'Sekme 2 (Devam Puanı & Bench) Özeti',
        group: 'Detay Sekmeleri',
        multiline: true,
        defaultValue:
          'Sert yüzde uçurumları yerine tüm raid boyutlarında eşit katılım puanı (+4p), zamanında imza/onay ödülü ve yedek (bench) teşvikiyle şeffaf puan birikir. 2 Aralık toplantı demo puanları seviyeden bağımsız bonus olarak işlenir.',
        maxLength: 500,
      },
      {
        key: 'applications.tab.addon.summary',
        label: 'Sekme 3 (RCLootCouncil) Özeti',
        group: 'Detay Sekmeleri',
        multiline: true,
        defaultValue:
          'Boss kesildikten sonra oyun içinde hızlı talep toplamak için RCLootCouncil addonu kullanılır; ancak nihai otorite her zaman sitedeki Öncelik Sırası + Devam Puanıdır.',
        maxLength: 500,
      },
      {
        key: 'applications.tab.boe.summary',
        label: 'Sekme 4 (BoE & BoP) Özeti',
        group: 'Detay Sekmeleri',
        multiline: true,
        defaultValue:
          'Lonca kaynakları tüm ekibin ortak progress gücü için yönetilir ve her hareket web sitemizde lonca üyelerine 7/24 açık şekilde kayıt altına alınır.',
        maxLength: 500,
      },
    ],
  },
  {
    pageId: 'strategy',
    pageTitle: 'Strateji Merkezi',
    fields: [
      { key: 'nav.strategy.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Strateji Merkezi', maxLength: 40 },
      { key: 'nav.strategy.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Attunement & WeakAura', maxLength: 60 },
      { key: 'strategy.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Strategy Hub', maxLength: 90 },
      { key: 'strategy.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Strateji, Attunement & WeakAura Merkezi', maxLength: 120 },
      {
        key: 'strategy.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue: 'WoW: Forever boss taktikleri, Attunement durumu ve zorunlu Addon / WeakAura paketleri.',
        maxLength: 400,
      },
      { key: 'strategy.tactics.title', label: 'Boss Taktikleri Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Boss Taktikleri', maxLength: 80 },
      { key: 'strategy.attunement.title', label: 'Attunement Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Attunement Tracker (Phase 1)', maxLength: 80 },
      {
        key: 'strategy.attunement.note1',
        label: 'Attunement Not 1',
        group: 'Sayfa Panelleri',
        defaultValue: 'Barrow Deeps (10-Man): Attunement gerektirmez (Level 60 yeterli).',
        maxLength: 200,
      },
      {
        key: 'strategy.attunement.note2',
        label: 'Attunement Not 2',
        group: 'Sayfa Panelleri',
        defaultValue: 'Hyjal Summit (20-Man): Attunement gerektirmez (Level 60 yeterli).',
        maxLength: 200,
      },
      { key: 'strategy.addons.title', label: 'Addon Listesi Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Zorunlu Addon Listesi', maxLength: 80 },
      { key: 'strategy.weakaura.title', label: 'WeakAura Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'WeakAura & Macro Paketleri', maxLength: 80 },
    ],
  },
  {
    pageId: 'anonymous',
    pageTitle: 'Anonim Mesaj Kutusu',
    fields: [
      { key: 'nav.anonymous.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Anonim Mesaj Kutusu', maxLength: 40 },
      { key: 'nav.anonymous.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'GM & Görevli', maxLength: 60 },
      { key: 'anonymous.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Gizli Kanal', maxLength: 90 },
      { key: 'anonymous.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Anonim GM & Görevli Mesaj Kutusu', maxLength: 120 },
      {
        key: 'anonymous.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue: 'Öneri, şikayet veya hassas konuları kimliğiniz paylaşılmadan doğrudan Guild Master ve Görevli ekibine iletin.',
        maxLength: 400,
      },
      { key: 'anonymous.form.title', label: 'Form Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Gizli Mesaj', maxLength: 80 },
      { key: 'anonymous.privacy.title', label: 'Gizlilik Panel Başlığı', group: 'Gizlilik Güvencesi', defaultValue: 'Gizlilik Güvencesi', maxLength: 80 },
      {
        key: 'anonymous.privacy.b1',
        label: 'Gizlilik Maddesi 1',
        group: 'Gizlilik Güvencesi',
        multiline: true,
        defaultValue: 'Karakter adınız, Discord hesabınız ve IP bilginiz mesajla birlikte saklanmaz.',
        maxLength: 250,
      },
      {
        key: 'anonymous.privacy.b2',
        label: 'Gizlilik Maddesi 2',
        group: 'Gizlilik Güvencesi',
        multiline: true,
        defaultValue: 'Mesajlar yalnızca GM ve Görevli ekibi tarafından görüntülenebilir.',
        maxLength: 250,
      },
      {
        key: 'anonymous.privacy.b3',
        label: 'Gizlilik Maddesi 3',
        group: 'Gizlilik Güvencesi',
        multiline: true,
        defaultValue: 'Kötüye kullanım tespit edilirse mesaj silinir; kimlik takibi yapılmaz.',
        maxLength: 250,
      },
    ],
  },
  {
    pageId: 'raid-signup',
    pageTitle: 'Raid Kayıt',
    fields: [
      { key: 'nav.raid-signup.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Raid Kayıt', maxLength: 40 },
      { key: 'nav.raid-signup.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Takvim & 4 Rol Panosu', maxLength: 60 },
      { key: 'raid-signup.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'TURX RAID TAKVİMİ · PAZARTESİ BAŞLANGIÇLI', maxLength: 90 },
      { key: 'raid-signup.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Raid Kayıt & 4 Rol Panosu', maxLength: 120 },
      {
        key: 'raid-signup.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue:
          'Gelecek raidler takvimde yeşil ışıklı, geçmiş ve arşivlenen raidler kırmızı flu görünür. Bir etkinliğe tıklayıp 4 rol sütunlu kadroyu inceleyebilir, imza ve konfirmasyon verebilirsiniz.',
        maxLength: 500,
      },
      { key: 'raid-signup.cycle.title', label: 'Haftalık Döngü Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Bir Haftalık Raid Döngüsü', maxLength: 90 },
      { key: 'raid-signup.empty.title', label: 'Etkinlik Yok Başlığı', group: 'Boş Durum', defaultValue: 'Takvimde henüz etkinlik yok', maxLength: 90 },
      {
        key: 'raid-signup.empty.member',
        label: 'Etkinlik Yok Açıklaması (Üyeler)',
        group: 'Boş Durum',
        multiline: true,
        defaultValue: 'Officerlar yeni haftanın raidlerini açtığında takvimde yeşil ışıklı olarak görünecektir.',
        maxLength: 250,
      },
    ],
  },
  {
    pageId: 'loot',
    pageTitle: 'Loot Sistemi',
    fields: [
      { key: 'nav.loot.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Loot Sistemi', maxLength: 40 },
      { key: 'nav.loot.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Öncelik & BoE/BoP', maxLength: 60 },
      { key: 'loot.eyebrowSuffix', label: 'Üst Başlık Eki (Faz Adından Sonra)', group: 'Sayfa Başlığı', defaultValue: 'ORTAK LOOT LİSTESİ', maxLength: 80 },
      { key: 'loot.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Loot Sistemi & Öncelik Rotasyonu', maxLength: 120 },
      {
        key: 'loot.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue:
          "Tüm lonca ve tüm raid grupları tek ortak öncelik listesiyle takip edilir. Varsayılan kota: 10-man 1 · 20-man 2 · 40-man 4 (item bazında özelleştirilebilir). Aynı öncelikte eşit paylaşımlı spec'ler Devam Puanı (eşitse zar) ile belirlenir.",
        maxLength: 500,
      },
      {
        key: 'philosophy.title',
        label: 'Temel Yaklaşım Banner Başlığı (Road Map ile Ortak)',
        group: 'Öncelik Metodolojisi Bannerı',
        defaultValue: 'Sistemin Temel Yaklaşımı & Öncelik Metodolojisi',
        maxLength: 120,
      },
      {
        key: 'philosophy.intro',
        label: 'Temel Yaklaşım Paragrafı (Road Map ile Ortak)',
        group: 'Öncelik Metodolojisi Bannerı',
        multiline: true,
        defaultValue:
          "TURX Loot Sistemi oluşturulurken genel matematik kuralları ve WoW simülasyonları çalıştırılarak her bir item parçasının hangi sınıf/spec için en yüksek raid faydasını sağladığı hesaplanmış ve öncelik sıralaması bu objektif veriler ışığında oluşturulmuştur. Amaç bireysel değil, lonca olarak en hızlı ve istikrarlı progress'i yakalamaktır.",
        maxLength: 700,
      },
    ],
  },
  {
    pageId: 'attendance',
    pageTitle: 'Devam Takibi',
    fields: [
      { key: 'nav.attendance.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Devam Takibi', maxLength: 40 },
      { key: 'nav.attendance.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Puan & İlk 50 Raider', maxLength: 60 },
      { key: 'attendance.eyebrowSuffix', label: 'Üst Başlık Eki (Faz Adından Sonra)', group: 'Sayfa Başlığı', defaultValue: 'ŞEFFAF PUAN TAKİBİ', maxLength: 80 },
      { key: 'attendance.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Devam Takibi & 1 Ocak 2027 İlk 50 Raider Sıralaması', maxLength: 120 },
      {
        key: 'attendance.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue:
          'Faz bazlı raid puanları, hazır bekleyen bench puanları, 2 Aralık toplantı bonus puanları (seviyeden bağımsız) ve ceza kayıtları tarihsel detaylarıyla 7/24 online takip edilir.',
        maxLength: 500,
      },
      { key: 'attendance.rule.signup', label: 'İmza Kartı Alt Açıklaması', group: 'Puan Özet Kartları', defaultValue: 'Zamanında raid kaydı', maxLength: 120 },
      { key: 'attendance.rule.confirm', label: 'Konfirmasyon Kartı Alt Açıklaması', group: 'Puan Özet Kartları', defaultValue: 'Kilit öncesi katılım onayı', maxLength: 120 },
      { key: 'attendance.rule.raid', label: 'Tam Katılım Kartı Alt Açıklaması', group: 'Puan Özet Kartları', defaultValue: 'Tüm raidler eşit (10 / 20 / 40-man)', maxLength: 140 },
      {
        key: 'attendance.rule.bench',
        label: 'Bench Kartı Alt Açıklaması',
        group: 'Puan Özet Kartları',
        defaultValue: 'Raid boyunca hazır bekleme (gönüllü maks. 2 üst üste)',
        maxLength: 160,
      },
      { key: 'attendance.rule.late', label: 'Geç Kalma Kartı Alt Açıklaması', group: 'Puan Özet Kartları', defaultValue: 'Raid saatinden sonra katılım', maxLength: 120 },
      {
        key: 'attendance.rule.missingPrep',
        label: 'Eksik Hazırlık Kartı Alt Açıklaması',
        group: 'Puan Özet Kartları',
        defaultValue: 'Boss savaşlarında zorunlu flask/elixir/buff kullanımı min. %75 (WarcraftLogs)',
        maxLength: 200,
      },
    ],
  },
  {
    pageId: 'bank',
    pageTitle: 'Guild Bank',
    fields: [
      { key: 'nav.bank.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'Guild Bank', maxLength: 40 },
      { key: 'nav.bank.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Malzeme Talebi', maxLength: 60 },
      { key: 'bank.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Guild Bank', maxLength: 90 },
      { key: 'bank.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'Guild Bankası & Malzeme Talebi', maxLength: 120 },
      {
        key: 'bank.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue: 'Raid consumable stokları ve lonca fonu. Talepler Görevli ekibi tarafından 24 saat içinde onaylanır.',
        maxLength: 400,
      },
      { key: 'bank.pending.title', label: 'Onay Havuzu Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Subay Onay Havuzu (Bekleyen Malzeme Talepleri)', maxLength: 100 },
      { key: 'bank.gold.title', label: 'Gold Bakiyesi Panel Başlığı', group: 'Sayfa Panelleri', defaultValue: 'Gold Bakiyesi', maxLength: 80 },
    ],
  },
  {
    pageId: 'admin',
    pageTitle: 'GM Yönetim Paneli',
    fields: [
      { key: 'nav.admin.label', label: 'Menü Başlığı', group: 'Sol Menü', defaultValue: 'GM Yönetim Paneli', maxLength: 40 },
      { key: 'nav.admin.short', label: 'Menü Alt Yazısı', group: 'Sol Menü', defaultValue: 'Yetkili Kontrolü', maxLength: 60 },
      { key: 'admin.eyebrow', label: 'Üst Küçük Başlık (Eyebrow)', group: 'Sayfa Başlığı', defaultValue: 'Yetkili Yönetim Paneli', maxLength: 90 },
      { key: 'admin.title', label: 'Ana Sayfa Başlığı', group: 'Sayfa Başlığı', defaultValue: 'GM & Görevli Kontrol Merkezi', maxLength: 120 },
      {
        key: 'admin.description',
        label: 'Sayfa Açıklaması',
        group: 'Sayfa Başlığı',
        multiline: true,
        defaultValue: 'Hesap bazlı rütbe yönetimi yapın ve detaylı guild başvuru bilgilerini denetleyin.',
        maxLength: 400,
      },
    ],
  },
]

export const SITE_COPY_FIELD_MAP: Record<string, SiteCopyField> = {}
export const SITE_COPY_DEFAULTS: Record<string, string> = {}

for (const page of SITE_COPY_PAGES) {
  for (const field of page.fields) {
    SITE_COPY_FIELD_MAP[field.key] = field
    SITE_COPY_DEFAULTS[field.key] = field.defaultValue
  }
}

export function getPageCopyDef(pageId: EditablePageId): SiteCopyPageDef | undefined {
  return SITE_COPY_PAGES.find((p) => p.pageId === pageId)
}

export function isEditablePageId(value: string): value is EditablePageId {
  return SITE_COPY_PAGES.some((p) => p.pageId === value)
}

/** Keeps only known keys whose values differ from defaults, clamped to maxLength */
export function normalizeSiteCopy(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const def = SITE_COPY_FIELD_MAP[k]
    if (!def || typeof v !== 'string') continue
    const maxLen = def.maxLength ?? 500
    const cleaned = v.trim().slice(0, maxLen)
    if (cleaned && cleaned !== def.defaultValue) {
      out[k] = cleaned
    }
  }
  return out
}

export function resolveSiteCopy(overrides: Record<string, string>, key: string): string {
  const custom = overrides[key]
  if (typeof custom === 'string' && custom.trim().length > 0) return custom
  return SITE_COPY_DEFAULTS[key] ?? ''
}
