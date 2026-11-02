import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, characterClass, spec, experience, discord, logs } = body;

    const webhookUrl = process.env.DISCORD_RECRUITMENT_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL tanımlı değil!" }, { status: 500 });
    }

    const embed = {
      title: "⚔️ Yeni TURX Lonca Başvurusu!",
      color: 0x00f2fe, // Neon Cyan
      fields: [
        { name: "Karakter Adı", value: name || "Belirtilmedi", inline: true },
        { name: "Sınıf & Spec", value: `${characterClass || "-"} (${spec || "-"})`, inline: true },
        { name: "Discord / İletişim", value: discord || "Belirtilmedi", inline: true },
        { name: "WoWLogs Profil", value: logs ? `[Profil Linki](${logs})` : "Belirtilmedi", inline: false },
        { name: "Raid Tecrübesi & Notlar", value: experience || "Yok", inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "TURX FOREVER Recruitment System" }
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) throw new Error("Discord isteği reddetti.");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gönderim hatası yaşandı." }, { status: 500 });
  }
}