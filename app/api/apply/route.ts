import { NextResponse } from 'next/server'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'

const TURX_GOLD = 0xd4af37

function discordColorForClass(characterClass: unknown): number {
  if (typeof characterClass !== 'string' || !(characterClass in CLASS_COLORS)) {
    return TURX_GOLD
  }
  return parseInt(CLASS_COLORS[characterClass as WowClass].slice(1), 16)
}

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

    const embedColor = discordColorForClass(characterClass)

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
  } catch (err) {
    console.error("API Route Error:", err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}