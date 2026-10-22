// Sky Cadets winged-shield crest. Original artwork (no airline brand marks).
function Wing({ flip }) {
  const feathers = [
    'M118 70 C96 58 62 54 18 60 C40 70 70 76 112 80 Z',
    'M116 82 C94 74 66 74 30 80 C52 88 78 92 112 92 Z',
    'M114 94 C96 90 74 92 46 98 C64 104 86 106 112 104 Z',
  ]
  return (
    <g transform={flip ? 'translate(240 0) scale(-1 1)' : undefined}>
      {feathers.map((d, i) => (
        <path key={i} d={d} fill={i === 0 ? '#f4f7f7' : i === 1 ? '#dbe5e6' : '#c3d2d4'} stroke="#0b3a39" strokeWidth="2.5" strokeLinejoin="round" />
      ))}
      <path d="M118 70 C96 58 62 54 18 60" fill="none" stroke="#d9ac47" strokeWidth="2" />
    </g>
  )
}

export default function Crest({ size = 160, className = '' }) {
  return (
    <svg className={'crest ' + className} width={size} height={size * 0.68} viewBox="0 0 240 164" role="img" aria-label="Sky Cadets">
      <defs>
        <linearGradient id="crestShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a7a74" />
          <stop offset="1" stopColor="#0a3b3a" />
        </linearGradient>
        <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#d39a22" />
        </linearGradient>
      </defs>
      <Wing />
      <Wing flip />
      {/* Shield */}
      <path d="M120 18 L162 32 L160 96 C158 124 140 142 120 152 C100 142 82 124 80 96 L78 32 Z" fill="url(#crestShield)" stroke="url(#crestGold)" strokeWidth="5" strokeLinejoin="round" />
      {/* Cap on the shield */}
      <path d="M96 52 C96 36 144 36 144 52 Z" fill="#0b3a39" stroke="#d9ac47" strokeWidth="2" />
      <path d="M94 52 Q120 62 146 52 L144 57 Q120 67 96 57 Z" fill="#072827" />
      <circle cx="120" cy="45" r="5" fill="url(#crestGold)" />
      {/* Banner */}
      <path d="M58 76 L182 76 L190 90 L182 104 L58 104 L50 90 Z" fill="#0b3a39" stroke="url(#crestGold)" strokeWidth="3" strokeLinejoin="round" />
      <text x="120" y="97" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill="#ffffff" letterSpacing="0.5">
        SKY CADETS
      </text>
      {/* Stars */}
      <path d="M120 112 l4.4 9 9.9 1.4 -7.2 7 1.7 9.8 -8.8 -4.6 -8.8 4.6 1.7 -9.8 -7.2 -7 9.9 -1.4z" fill="url(#crestGold)" />
      <path d="M120 4 l2.6 5.4 5.9 0.8 -4.3 4.2 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.2 5.9 -0.8z" fill="url(#crestGold)" />
    </svg>
  )
}
