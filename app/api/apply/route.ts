import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { characterName, discordName, characterClass, spec, logs, motivation } = body;

    const webhookUrl = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("DISCORD_RECRUITMENT_WEBHOOK_URL is not configured.");
      return NextResponse.json({ error: "Webhook URL missing" }, { status: 500 });
    }

    const embed = {
      title: "⚔️ Yeni TURX Raid Başvurusu",
      color: 3899638,
      fields: [
        { name: "Karakter Adı", value: characterName || "Belirtilmedi", inline: true },
        { name: "Discord", value: discordName || "Belirtilmedi", inline: true },
        { name: "Class / Spec", value: `${characterClass || '-'} / ${spec || '-'}`, inline: true },
        { name: "WoWLogs Linki", value: logs && logs.trim() !== "" ? logs : "Belirtilmedi", inline: false },
        { name: "Tecrübe & Motivasyon", value: motivation || "Belirtilmedi", inline: false }
      ],
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