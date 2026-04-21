function Sparkle({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <g
      style={{
        animation: `wwTwinkle 2.2s ease-in-out ${delay}s infinite`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      <path
        d={`M ${x} ${y - 6} L ${x + 2} ${y} L ${x + 6} ${y} L ${x + 2} ${y + 2} L ${x} ${y + 6} L ${x - 2} ${y + 2} L ${x - 6} ${y} L ${x - 2} ${y} Z`}
        fill="#e8b547"
      />
    </g>
  );
}

/**
 * Abstract waltzing-ribbon hero. Default hero variant from the design
 * handoff (window.wwState.heroVariant === 'ribbon').
 */
export function HeroRibbon() {
  return (
    <svg viewBox="0 0 600 520" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ww-rib1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1b2a4e" />
          <stop offset="100%" stopColor="#475679" />
        </linearGradient>
        <linearGradient id="ww-rib2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e8b547" />
          <stop offset="100%" stopColor="#f2c96a" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx="300"
          cy="260"
          r={60 + i * 45}
          fill="none"
          stroke="#1b2a4e"
          strokeWidth="0.8"
          opacity={0.08 - i * 0.012}
        />
      ))}
      <path
        d="M 40 260 C 160 120, 240 420, 360 260 S 540 100, 560 260"
        stroke="url(#ww-rib1)"
        strokeWidth="36"
        fill="none"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M 40 300 C 160 160, 240 460, 360 300 S 540 140, 560 300"
        stroke="url(#ww-rib2)"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dasharray"
          values="0 800;800 0"
          dur="4s"
          repeatCount="indefinite"
        />
      </path>
      {(
        [
          [90, 230, '9:00'],
          [220, 320, '11:30'],
          [320, 220, '1:15'],
          [430, 320, '3:00'],
          [520, 230, '6:45'],
        ] as const
      ).map(([x, y, t], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="#faf6ef" stroke="#1b2a4e" strokeWidth="2" />
          <circle cx={x} cy={y} r="3" fill="#e8b547" />
          <rect x={x - 24} y={y - 40} width="48" height="20" rx="10" fill="#fff" stroke="#e5ddd0" />
          <text
            x={x}
            y={y - 27}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--ww-font-mono)"
            fill="#1b2a4e"
            fontWeight="600"
          >
            {t}
          </text>
        </g>
      ))}
      <Sparkle x={100} y={130} delay={0.2} />
      <Sparkle x={500} y={400} delay={1.2} />
      <Sparkle x={300} y={80} delay={2} />
    </svg>
  );
}
