'use client'

import { ArrowRight, Headphones, LogIn, Shield, UserCheck, Users, Volume2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { DISCORD_INVITE_URL } from '@/lib/guild-presence'
import { openTurxAuthModal, useAuth } from './auth-provider'
import { TurxLogo } from './logo'
import type { TabId } from './navigation'
import type { DiscordOfficer, DiscordVoiceChannel, DiscordWidgetResponse } from '@/app/api/discord-widget/route'

const FALLBACK_DATA: DiscordWidgetResponse = {
  guildName: 'TURX',
  presenceCount: 51,
  voiceCount: 4,
  totalMembers: 416,
  instantInvite: DISCORD_INVITE_URL,
  voiceChannels: [
    {
      id: 'chan-1',
      name: 'Ses kanalı',
      memberCount: 3,
      members: [
        { id: 'u1', username: 'Waffle (GM)', avatarUrl: '/images/avatar.png', status: 'online' },
        { id: 'u2', username: 'PaladinTR', avatarUrl: '/placeholder-user.jpg', status: 'online' },
        { id: 'u3', username: 'IronforgeHero', avatarUrl: '/placeholder-user.jpg', status: 'dnd' },
      ],
    },
    {
      id: 'chan-2',
      name: 'Ses kanalı',
      memberCount: 1,
      members: [
        { id: 'u4', username: 'SkybornMage', avatarUrl: '/placeholder-user.jpg', status: 'idle' },
      ],
    },
  ],
  officers: [
    { id: 'o1', name: 'Waffle | Sonat', role: 'Guild Master', status: 'online', avatarUrl: '/images/avatar.png' },
    { id: 'o2', name: 'Asassın | Abdullah', role: 'Görevli', status: 'online', avatarUrl: '/placeholder-user.jpg' },
    { id: 'o3', name: 'Esiona | Oğuz', role: 'Görevli', status: 'idle', avatarUrl: '/placeholder-user.jpg' },
    { id: 'o4', name: 'Jux | Yücel', role: 'Görevli', status: 'online', avatarUrl: '/placeholder-user.jpg' },
  ],
  source: 'fallback',
}

function StatusDot({ status }: { status: 'online' | 'idle' | 'dnd' | 'offline' | 'unknown' }) {
  if (status === 'online') {
    return <span className="inline-block size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
  }
  if (status === 'idle') {
    return <span className="inline-block size-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
  }
  if (status === 'dnd') {
    return <span className="inline-block size-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
  }
  return <span className="inline-block size-2 rounded-full bg-zinc-500" />
}

export function HeroLanding({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user } = useAuth()
  const [discordData, setDiscordData] = useState<DiscordWidgetResponse>(FALLBACK_DATA)

  useEffect(() => {
    let active = true

    const fetchWidget = async () => {
      try {
        const res = await fetch('/api/discord-widget', { cache: 'no-store' })
        if (res.ok && active) {
          const json = (await res.json()) as DiscordWidgetResponse
          setDiscordData(json)
        }
      } catch {
        // keep fallback
      }
    }

    fetchWidget()
    const timer = setInterval(fetchWidget, 35000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <section className="relative overflow-hidden rounded-3xl border border-gold/30 bg-[#071220] shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
      {/* Background Hero Banner */}
      <div className="absolute inset-0 select-none">
        <Image
          src="/images/hero.png"
          alt="TURX Alliance Hero"
          fill
          priority
          sizes="100vw"
          className="object-cover object-left opacity-35 filter brightness-75 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06101c] via-[#06101c]/90 to-[#071220]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,242,254,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(212,175,55,0.08),transparent_50%)]" />
      </div>

      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-center lg:gap-8 xl:p-10">
        {/* Left Column: Hero & Guild Introduction */}
        <div className="flex flex-col justify-center lg:col-span-7 xl:col-span-7">
          {/* Alliance Crest & Tagline */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1 text-xs font-semibold tracking-[0.2em] text-gold uppercase shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Shield className="size-3.5 text-gold" />
              <span>WOW: FOREVER · EU · PVE · NORMAL · ALLIANCE</span>
            </div>
          </div>

          {/* TURX Brand Artwork Title */}
          <div className="mt-5 flex items-center gap-4">
            <div className="relative shrink-0 size-20 sm:size-24 rounded-2xl overflow-hidden border-2 border-gold/60 bg-black/60 shadow-[0_0_25px_rgba(0,242,254,0.35)]">
              <Image
                src="/images/crests/crest-option-1.jpg"
                alt="TURX Guild Crest"
                width={96}
                height={96}
                priority
                className="size-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display text-4xl font-black tracking-widest text-transparent sm:text-5xl lg:text-6xl bg-clip-text bg-gradient-to-b from-[#fff2b3] via-[#d4af37] to-[#8a6d1c] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                TURX
              </h1>
              <p className="font-display text-xs font-bold tracking-[0.35em] text-cyan-400/90 sm:text-sm">
                TURKISH ALLIANCE GUILD
              </p>
            </div>
          </div>

          {/* Guild Description Manifesto */}
          <p className="mt-5 max-w-xl text-base leading-relaxed text-silver/95 text-pretty sm:text-lg">
            Azeroth &amp; Kalimdor raid gecelerinde birlikte keyifli vakit geçiren bir Türk Topluluğu.
            Düzenli kadro, başarı odaklı raidler ve herkes için yuva olabilecek sıcak bir ortam.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="group relative inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d779] to-[#b38e22] px-7 py-3.5 font-display text-sm font-extrabold tracking-wider text-[#08121e] uppercase shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] active:scale-95"
            >
              <span>BAŞVURU YAP</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-gold/40 bg-[#081524]/80 px-6 py-3.5 text-sm font-semibold text-gold backdrop-blur transition-all hover:border-gold hover:bg-gold/15"
              >
                <UserCheck className="size-4 text-emerald-400" />
                <span>Hoş geldin, {user.username}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openTurxAuthModal}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/20 bg-[#0a1829]/70 px-6 py-3.5 text-sm font-semibold tracking-wider text-silver backdrop-blur transition-all hover:border-gold/60 hover:bg-gold/10 hover:text-gold uppercase"
              >
                <LogIn className="size-4" />
                <span>ÜYE GİRİŞİ</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Widget Card */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-[#0b1420]/95 p-5 shadow-2xl backdrop-blur-xl">
            {/* Discord Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative size-11 rounded-xl border border-gold/50 overflow-hidden bg-black shadow-[0_0_12px_rgba(212,175,55,0.25)]">
                  <Image
                    src="/images/crests/crest-option-1.jpg"
                    alt="TURX"
                    width={44}
                    height={44}
                    className="size-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-display text-base font-black tracking-wider text-foreground">
                    {discordData.guildName || 'TURX'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Discord sunucusu</p>
                </div>
              </div>

              {/* Official Discord SVG Icon */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[#5865F2]">
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>
            </div>

            {/* Metrics Row (ONLINE / VOICE / KULLANICI) */}
            <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10 py-3 text-center">
              <div>
                <p className="flex items-center justify-center gap-1.5 font-display text-lg font-black text-foreground">
                  <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span>{discordData.presenceCount}</span>
                </p>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">ONLINE</p>
              </div>

              <div>
                <p className="flex items-center justify-center gap-1.5 font-display text-lg font-black text-cyan-400">
                  <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span>{discordData.voiceCount}</span>
                </p>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">VOICE</p>
              </div>

              <div>
                <p className="font-display text-lg font-black text-gold">
                  {discordData.totalMembers}
                </p>
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">KULLANICI</p>
              </div>
            </div>

            {/* Active Voice Channels */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-silver/80 uppercase">
                <Headphones className="size-3.5 text-cyan-400" />
                <span>SESLİ KANALLAR</span>
              </div>

              <div className="flex flex-col gap-2">
                {discordData.voiceChannels.slice(0, 2).map((channel) => (
                  <div
                    key={channel.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#06101c]/90 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-silver">
                        <Volume2 className="size-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {channel.memberCount}
                      </span>
                    </div>

                    {/* Member avatars in channel */}
                    {channel.members.length > 0 && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {channel.members.slice(0, 5).map((m) => (
                            <div key={m.id} className="relative size-6 rounded-full border border-[#06101c] bg-zinc-800" title={m.username}>
                              <Image
                                src={m.avatarUrl}
                                alt={m.username}
                                width={24}
                                height={24}
                                className="size-full rounded-full object-cover"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={m.status} />
                              </span>
                            </div>
                          ))}
                        </div>
                        {channel.memberCount > 5 && (
                          <span className="text-[10px] text-muted-foreground">+{channel.memberCount - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Officer List Section */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-rose-400 uppercase">
                <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                <span>GÖREVLİ &amp; YÖNETİM — {discordData.officers.length}</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {discordData.officers.map((officer) => (
                  <div
                    key={officer.id}
                    className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-[#06101c]/70 px-2.5 py-1.5"
                  >
                    <div className="relative size-7 shrink-0 rounded-full bg-zinc-800">
                      <Image
                        src={officer.avatarUrl}
                        alt={officer.name}
                        width={28}
                        height={28}
                        className="size-full rounded-full object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <StatusDot status={officer.status} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {officer.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {officer.role === 'Guild Master' ? (
                          <span className="font-bold text-gold">Guild Master</span>
                        ) : (
                          <span className="font-semibold text-neon">Görevli</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Join Discord CTA Button */}
            <div className="mt-5">
              <a
                href={discordData.instantInvite || DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#5865F2] px-4 py-3 text-center text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(88,101,242,0.4)] transition-all hover:bg-[#4752C4] hover:shadow-[0_4px_24px_rgba(88,101,242,0.6)] active:scale-[0.98]"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>SUNUCUYA KATIL</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
