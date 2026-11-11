# 🦁 TURX Guild Dashboard — Geliştirici Rehberi & Proje Özeti

Aramıza geliştirici olarak hoş geldin! Projenin mimarisi, şu ana kadar yaptıklarımız ve birlikte çalışırken çakışma yaşamamak için izleyeceğimiz kurallar aşağıdadır.

## 🛠️ Teknoloji Yığını (Tech Stack)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Stil & UI:** Tailwind CSS v4, Lucide Icons, özel TURX altın/karanlık tema bileşenleri
- **Paket Yöneticisi:** `pnpm` (Lütfen paket kurarken `npm` veya `yarn` yerine `pnpm` kullan)
- **Veri Katmanı:** Upstash Redis (birincil canlı veri) + Vercel Blob (yedekleme & kalıcılık) + Yerel JSON Fallback (geliştirme ortamı için)
- **E-Posta Servisi:** Resend (`noreply@turxforever.com`)

## 📁 Proje Klasör Yapısı ve Neler Yaptık?
1. **`app/page.tsx` & `components/turx/dashboard-shell.tsx`**:
   - Uygulamanın ana kabuğu. Giriş yapmayanlar için karşılama ekranı (`hero-landing.tsx`) ve başvuru formu; giriş yapan üyeler için sekme tabanlı Dashboard çalışır.
2. **`components/turx/views/` (Sayfa Görünümleri)**:
   - `overview.tsx`: Guild genel bakışı, canlı Twitch yayınları, oylamalar/anketler ve duyurular.
   - `roster.tsx`: Üye kadrosu, rütbeler (`Guild Master`, `Görevli`, `Turx`, `Alt`, `Sosyal`), karakter sınıfları ve görevli rolleri.
   - `raids.tsx`: Raid takvimi, yoklama (attendance) ve kadro planlaması.
   - `bank.tsx`: Guild bankası ve katkılar.
   - `profile.tsx`: Kullanıcı profili, Battle.net (WoW Armory karakter çekme), Discord ve Twitch OAuth hesap bağlama işlemleri.
   - `recruit.tsx` & `feedback.tsx`: Guild başvuru yönetimi ve anonim geri bildirim kutusu.
   - `admin.tsx`: Sadece `Guild Master` ve `Görevli` rütbelerinin erişebildiği yönetim paneli (başvuru onaylama, rütbe/yetki atama, sistem durumu).
3. **`lib/` (Çekirdek Mantık ve Veri Yönetimi)**:
   - `turx-store.ts`: Tüm veritabanı okuma/yazma işlemleri buradan geçer. Canlıda Redis + Vercel Blob senkronizasyonu yapar. Yerel bilgisayarda çalışırken `.env` şifrelerine ihtiyaç duymadan otomatik yerel modda çalışır.
   - `turx-identity.ts`: Rütbe tanımları ve yetki kontrolleri.
   - `wow-armory.ts`, `oauth.ts`, `twitch-streams.ts`: Battle.net karakter senkronizasyonu, Discord/Twitch bağlantıları ve canlı yayın takibi.
4. **`app/api/`**:
   - Kimlik doğrulama (`/api/auth/*`), OAuth bağlantıları (`/api/oauth/*`), kadro, raid, banka, anket ve otomatik günlük yedekleme (`/api/admin/backup`) endpoint'leri.

## 🚀 Yerel Kurulum (Local Setup)
1. Projeyi klonla:
   ```bash
   git clone <repo-adresi>
   cd turx-guild-dashboard-design
   ```
2. Bağımlılıkları kur:
   ```bash
   pnpm install
   ```
3. `.env.example` dosyasını `.env.local` adıyla kopyala:
   ```bash
   cp .env.example .env.local
   ```
   *(Not: Canlı API anahtarları olmadan da yerel geliştirme modunda sorunsuz çalışır; OAuth veya dış API testi gerekirse birlikte ayarlarız).*
4. Geliştirme sunucusunu başlat ve `http://localhost:3000` adresini aç:
   ```bash
   pnpm dev
   ```

## 🤝 Birlikte Çalışma (Git) Kurallarımız
Kodların birbirine girmemesi (conflict olmaması) için:
1. **Doğrudan `main` dalına (branch) push yapmıyoruz.** `main` dalı doğrudan canlı siteyi (`turxforever.com`) günceller.
2. Yeni bir özellik veya düzeltme yapacağın zaman önce güncel `main`'i çekip yeni bir branch aç:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/yaptigin-ozellik-adi
   ```
3. İşin bittiğinde kendi branch'ini GitHub'a gönder (`git push origin feat/yaptigin-ozellik-adi`) ve GitHub üzerinden **Pull Request (PR)** aç.
4. Üzerinde çalışacağımız sayfaları (`components/turx/views/` altındaki dosyaları) önceden haberleşerek paylaşırsak çakışma yaşamayız.
