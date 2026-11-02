import { useId } from 'react'

const mane = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 - Math.PI / 2
  const b = a + Math.PI / 14
  const outer = [60 + Math.cos(a) * 27, 50 + Math.sin(a) * 27]
  const inner = [60 + Math.cos(b) * 18, 50 + Math.sin(b) * 18]
  return `${outer[0].toFixed(1)},${outer[1].toFixed(1)} ${inner[0].toFixed(1)},${inner[1].toFixed(1)}`
}).join(' ')

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
          <stop offset="0" stopColor="#f3d779" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1c" />
        </linearGradient>
        <linearGradient id={`field-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f3a63" />
          <stop offset="1" stopColor="#06111d" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M60 4 L112 18 V62 C112 97 90 121 60 136 C30 121 8 97 8 62 V18 Z"
        fill={`url(#field-${id})`}
        stroke={`url(#gold-${id})`}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M60 13 L104 25 V62 C104 92 85 112 60 126 C35 112 16 92 16 62 V25 Z"
        fill="none"
        stroke="#c0c8d4"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <path d="M60 13 V126" stroke="#d4af37" strokeOpacity="0.15" strokeWidth="1" />

      <polygon points={mane} fill={`url(#gold-${id})`} />
      <path
        d="M60 32 C70 32 76 40 76 49 C76 58 70 66 60 70 C50 66 44 58 44 49 C44 40 50 32 60 32 Z"
        fill="#0b2744"
        stroke={`url(#gold-${id})`}
        strokeWidth="2"
      />
      <path d="M49 34 L46 27 L53 31 Z M71 34 L74 27 L67 31 Z" fill={`url(#gold-${id})`} />
      <path d="M50 46 L57 48 L50 49 Z M70 46 L63 48 L70 49 Z" fill="#00f2fe" filter={`url(#glow-${id})`} />
      <path d="M60 50 L56 58 H64 Z" fill={`url(#gold-${id})`} />
      <path d="M54 62 Q60 66 66 62" fill="none" stroke="#d4af37" strokeWidth="1.6" strokeLinecap="round" />

      <path
        d="M38 95 C38 84 52 84 60 95 C68 106 82 106 82 95 C82 84 68 84 60 95 C52 106 38 106 38 95 Z"
        fill="none"
        stroke="#00f2fe"
        strokeWidth="4"
        strokeLinejoin="round"
        filter={`url(#glow-${id})`}
      />
      <path
        d="M38 95 C38 84 52 84 60 95 C68 106 82 106 82 95 C82 84 68 84 60 95 C52 106 38 106 38 95 Z"
        fill="none"
        stroke="#e8feff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

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
