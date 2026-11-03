import { NextResponse } from 'next/server';

// Class'a göre dinamik sol çizgi rengi (Hex Decimal)
const CLASS_COLORS: Record<string, number> = {
  'Warrior': 12882200,      // #C69B6D (Kahverengi)
  'Paladin': 16024474,      // #F48CBA (Pembe)
  'Hunter': 11003713,       // #A7FD31 (Yeşil)
  'Rogue': 16776006,        // #FFF468 (Sarı)
  'Priest': 16777215,       // #FFFFFF (Beyaz)
  'Death Knight': 12852277, // #C41E3A (Kırmızı)
  'Shaman': 28882,          // #0070DD (Mavi)
  'Mage': 41724,            // #3FC7EB (Açık Mavi)
  'Warlock': 8871618,       // #8788EE (Mor)
  'Druid': 16743680         // #FF7C0A (Turuncu)
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const characterName = body.characterName || body.charName || body.name;
    const discordName = body.discordName || body.discordHandle || body.discord;
    const characterClass = body.characterClass || body.class || body.className;
    const spec = body.spec || body.specialization;
    const logs = body.logs || body.warcraftlogs || body.logsUrl;
    const motivation = body.motivation || body.experience || body.notes;

    const webhookUrl = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("DISCORD_RECRUITMENT_WEBHOOK_URL is not configured.");
      return NextResponse.json({ error: "Webhook URL missing" }, { status: 500 });
    }

    // Seçilen Class'ın rengini al, yoksa varsayılan TURX Gold (#D4AF37) kullan
    const embedColor = CLASS_COLORS[characterClass] || 13938487;

    const embed = {
      title: "⚔️ GUILD BAŞVURUSU",
      color: embedColor,
      fields: [
        {
          name: "👤 Karakter & Oyuncu Bilgisi",
          value: `> **Karakter Adı:** \`${characterName || 'Belirtilmedi'}\`\n> **Discord:** \`${discordName || 'Belirtilmedi'}\``,
          inline: false
        },
        {
          name: "🛡️ Sınıf & Uzmanlık (Class / Spec)",
          value: `> **${characterClass || '-'}** — ${spec || '-'}`,
          inline: false
        },
        {
          name: "📊 WarcraftLogs Profil Linki",
          value: logs && logs.trim() !== "" ? logs : "*Belirtilmedi*",
          inline: false
        },
        {
          name: "📜 Raid Tecrübesi & Motivasyon",
          value: `\`\`\`text\n${motivation || 'Belirtilmedi'}\n\`\`\``,
          inline: false
        }
      ],
      footer: {
        text: "TURX Guild Dashboard Entegrasyonu"
      },
      timestamp: new Date().toISOString()
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Discord API Error:", errorText);
      return NextResponse.json({ error: "Discord webhook failed", details: errorText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API Route Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}