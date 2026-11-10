import { useId } from 'react'

export function TurxLogo({ className, withMotto = false }: { className?: string; withMotto?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox={withMotto ? '0 0 120 160' : '0 0 120 140'}
      className={className}
      role="img"
      aria-label="TURX FOREVER Alliance lonca arması"
    >
      <defs>
        <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4b8" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#855b10" />
        </linearGradient>
        <linearGradient id={`gold-light-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fff2a8" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <linearGradient id={`gold-dark-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="60%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id={`steel-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`steel-cyan-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="40%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id={`cyan-ribbon-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
        <linearGradient id={`field-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f2e52" />
          <stop offset="50%" stopColor="#091b30" />
          <stop offset="100%" stopColor="#040a14" />
        </linearGradient>
        <filter id={`glow-cyan-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`glow-gold-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. ALLIANCE SHIELD FRAME */}
      <path
        d="M60 4 L114 18 V64 C114 100 90 124 60 138 C30 124 6 100 6 64 V18 Z"
        fill={`url(#field-${id})`}
        stroke={`url(#gold-${id})`}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Inner fine engraved line */}
      <path
        d="M60 12 L107 24 V64 C107 95 86 116 60 129 C34 116 13 95 13 64 V24 Z"
        fill="none"
        stroke={`url(#gold-${id})`}
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      {/* Vertical center crease */}
      <path d="M60 12 V129" stroke={`url(#gold-${id})`} strokeOpacity="0.15" strokeWidth="1" />

      {/* 2. CROSSED SWORDS (Behind the 'T') */}
      {/* Sword 1: Top-Left to Bottom-Right */}
      <g>
        <circle cx="21" cy="21" r="3.2" fill={`url(#gold-${id})`} stroke="#855b10" strokeWidth="0.8" />
        <line x1="23" y1="23" x2="30" y2="30" stroke={`url(#gold-${id})`} strokeWidth="3" strokeLinecap="round" />
        <path d="M22 36 L36 22" stroke={`url(#gold-${id})`} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="22" cy="36" r="1.5" fill="#fde047" />
        <circle cx="36" cy="22" r="1.5" fill="#fde047" />
        <polygon points="29,31 59,61 95,97 59,59" fill={`url(#steel-${id})`} />
        <polygon points="31,29 61,59 97,95 59,59" fill={`url(#steel-cyan-${id})`} />
        <line x1="33" y1="33" x2="84" y2="84" stroke="#00f2fe" strokeWidth="1" opacity="0.85" filter={`url(#glow-cyan-${id})`} />
      </g>

      {/* Sword 2: Top-Right to Bottom-Left */}
      <g>
        <circle cx="99" cy="21" r="3.2" fill={`url(#gold-${id})`} stroke="#855b10" strokeWidth="0.8" />
        <line x1="97" y1="23" x2="90" y2="30" stroke={`url(#gold-${id})`} strokeWidth="3" strokeLinecap="round" />
        <path d="M98 36 L84 22" stroke={`url(#gold-${id})`} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="98" cy="36" r="1.5" fill="#fde047" />
        <circle cx="84" cy="22" r="1.5" fill="#fde047" />
        <polygon points="91,31 61,61 25,97 61,59" fill={`url(#steel-${id})`} />
        <polygon points="89,29 59,59 23,95 61,59" fill={`url(#steel-cyan-${id})`} />
        <line x1="87" y1="33" x2="36" y2="84" stroke="#00f2fe" strokeWidth="1" opacity="0.85" filter={`url(#glow-cyan-${id})`} />
      </g>

      {/* 3. THE GRAND 'T' (Heroic Chiseled Gold Monogram) */}
      <g>
        {/* Drop shadow backing for 'T' */}
        <path
          d="M26 36 L32 34 L60 30 L88 34 L94 36 L94 48 L86 46 L69 46 L68 90 L60 98 L52 90 L51 46 L34 46 L26 48 Z"
          fill="#020617"
          opacity="0.6"
          transform="translate(0, 2)"
        />

        {/* Left Chisel Facet (Light Gold) */}
        <path
          d="M26 36 L32 34 L60 30 L60 98 L52 90 L51 46 L34 46 L26 48 Z"
          fill={`url(#gold-light-${id})`}
          stroke={`url(#gold-${id})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Right Chisel Facet (Darker Gold) */}
        <path
          d="M60 30 L88 34 L94 36 L94 48 L86 46 L69 46 L68 90 L60 98 Z"
          fill={`url(#gold-dark-${id})`}
          stroke={`url(#gold-${id})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Center Ridge Highlight Line */}
        <line x1="60" y1="30" x2="60" y2="98" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

        {/* Decorative Filigree Accent Lines on Top Bar */}
        <path d="M38 40 L54 40" stroke="#855b10" strokeWidth="1" opacity="0.5" />
        <path d="M66 40 L82 40" stroke="#451a03" strokeWidth="1" opacity="0.5" />

        {/* Inset Runic Diamond Gem at T-Cross (Cyan Glow) */}
        <polygon
          points="60,36 65,41 60,46 55,41"
          fill="#00f2fe"
          stroke="#ffffff"
          strokeWidth="0.8"
          filter={`url(#glow-cyan-${id})`}
        />
      </g>

      {/* 4. WOW FOREVER INFINITY SYMBOL (Curving at Shield Bottom) */}
      <g>
        {/* Glowing Cyan Aura */}
        <path
          d="M60 108 C48 95 28 95 28 108 C28 121 48 121 60 108 C72 95 92 95 92 108 C92 121 72 121 60 108 Z"
          fill="none"
          stroke="#00f2fe"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
          filter={`url(#glow-cyan-${id})`}
        />
        {/* Mid Ribbon Cyan Gradient */}
        <path
          d="M60 108 C48 95 28 95 28 108 C28 121 48 121 60 108 C72 95 92 95 92 108 C92 121 72 121 60 108 Z"
          fill="none"
          stroke={`url(#steel-cyan-${id})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Core Specular Highlight */}
        <path
          d="M60 108 C48 95 28 95 28 108 C28 121 48 121 60 108 C72 95 92 95 92 108 C92 121 72 121 60 108 Z"
          fill="none"
          stroke={`url(#cyan-ribbon-${id})`}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Over-Weave Segment (Mobius 3D Depth) */}
        <path
          d="M54 114 C57 111 60 108 63 105"
          fill="none"
          stroke="#e0f2fe"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Lateral Gold Accent Studs */}
        <circle cx="28" cy="108" r="1.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.8" />
        <circle cx="92" cy="108" r="1.8" fill="#fde047" stroke="#ca8a04" strokeWidth="0.8" />
      </g>

      {/* 5. OPTIONAL MOTTO BANNER */}
      {withMotto && (
        <g>
          <path d="M6 140 L18 134 H102 L114 140 L102 156 H18 Z" fill="#0a2540" stroke={`url(#gold-${id})`} strokeWidth="2" />
          <text
            x="60"
            y="149.5"
            textAnchor="middle"
            fontFamily="var(--font-cinzel), serif"
            fontWeight="900"
            fontSize="10"
            letterSpacing="1.5"
            fill="#d4af37"
          >
            TURX FOREVER
          </text>
        </g>
      )}
    </svg>
  )
}
