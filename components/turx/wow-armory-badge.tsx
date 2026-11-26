'use client'

import { cn } from '@/lib/utils'

/**
 * Stylized WoW Forever Armory crest emblem (inline SVG, zero external asset failure risk).
 */
export function WowArmoryLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#f5c451]/60 bg-gradient-to-br from-[#0e2d52] via-[#133b6d] to-[#08192e] shadow-[0_0_16px_rgba(245,196,81,0.3)]',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="size-6" fill="none">
        <defs>
          <linearGradient id="wowArmoryGold" x1="4" y1="3" x2="32" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff2b2" />
            <stop offset="50%" stopColor="#e5b842" />
            <stop offset="100%" stopColor="#9c6f16" />
          </linearGradient>
          <linearGradient id="wowArmoryBlue" x1="8" y1="7" x2="28" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2680eb" />
            <stop offset="100%" stopColor="#0a294d" />
          </linearGradient>
        </defs>
        {/* Outer Shield Crest */}
        <path
          d="M18 2.5L30.5 7.2V17.4C30.5 24.7 25.1 30.6 18 33.5C10.9 30.6 5.5 24.7 5.5 17.4V7.2L18 2.5Z"
          fill="url(#wowArmoryBlue)"
          stroke="url(#wowArmoryGold)"
          strokeWidth="2.2"
        />
        {/* Inner Ring */}
        <circle cx="18" cy="17.5" r="8.2" stroke="url(#wowArmoryGold)" strokeWidth="1.5" fill="rgba(7,20,36,0.45)" />
        {/* Stylized W */}
        <path
          d="M11.6 13.4L14.2 22.2L18 15.8L21.8 22.2L24.4 13.4"
          stroke="#fff2b2"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
