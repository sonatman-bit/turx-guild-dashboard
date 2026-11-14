import { NextResponse } from 'next/server'
import { CLASS_COLORS, type WowClass } from '@/lib/guild-data'
import { blobConfigured, mutateGuildStore, type StoredApplication } from '@/lib/turx-store'

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

    // Ensure any application sent to Discord is also persisted in the guild store
    if (blobConfigured() && characterName && discordName) {
      try {
        const rawFirst = typeof body.charFirstName === 'string' ? body.charFirstName.trim() : ''
        const rawSurname = typeof body.charSurname === 'string' ? body.charSurname.trim() : ''
        const nameParts = String(characterName).trim().split(/\s+/)
        const charFirst = rawFirst || nameParts[0] || String(characterName).trim()
        const charLast = rawSurname || nameParts.slice(1).join(' ')
        const appId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : Date.now().toString()

        await mutateGuildStore((store) => {
          const exists = store.applications.some(
            (a) =>
              a.id === appId ||
              (a.discord.toLowerCase() === String(discordName).trim().toLowerCase() &&
                `${a.charName} ${a.charSurname}`.trim().toLowerCase() === String(characterName).trim().toLowerCase()),
          )
          if (!exists) {
            const fallbackApp: StoredApplication = {
              id: appId,
              accountName: typeof body.accountName === 'string' ? body.accountName.trim() : '',
              charName: charFirst,
              charSurname: charLast,
              discord: String(discordName).trim(),
              race: typeof body.race === 'string' ? body.race : '',
              characterClass: typeof characterClass === 'string' && characterClass ? characterClass : 'Warrior',
              spec: typeof spec === 'string' ? spec : '',
              logs: typeof logs === 'string' && logs.trim() ? logs.trim() : 'Belirtilmemiş',
              experience: typeof motivation === 'string' ? motivation : '',
              previousGuilds: '',
              status: 'PENDING',
              date:
                typeof body.date === 'string' && body.date.trim()
                  ? body.date.trim()
                  : new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
            }
            store.applications.unshift(fallbackApp)
          }
        })
      } catch (storeErr) {
        console.warn('apply fallback store save warning:', storeErr)
      }
    }

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