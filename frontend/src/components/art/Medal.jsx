// Winged medal with an emoji at its centre. `tier` 0-3 = locked / bronze / silver / gold (Pokémon GO style).
const TIERS = {
  1: { hi: '#ffd7b0', mid: '#cd7f45', lo: '#7a4520', edge: '#5e3415', ring: '#ffd0a6' },
  2: { hi: '#ffffff', mid: '#c7d2d8', lo: '#7d8b93', edge: '#56626a', ring: '#f2f6f8' },
  3: { hi: '#fff0b0', mid: '#f2c34a', lo: '#b47a12', edge: '#8a5c0c', ring: '#ffe7a0' },
}

export default function Medal({ icon = '⭐', size = 140, tier = 3, locked = false, rays = false, className = '' }) {
  const isLocked = locked || tier === 0
  const c = TIERS[isLocked ? 2 : tier] || TIERS[3]
  const id = `m${tier}${isLocked ? 'l' : ''}`
  return (
    <div className={'medal-art ' + (isLocked ? 'locked ' : '') + `tier-${isLocked ? 0 : tier} ` + className} style={{ width: size, height: size }}>
      {rays && <div className="medal-rays" />}
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={id + 'g'} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={c.hi} />
            <stop offset="0.45" stopColor={c.mid} />
            <stop offset="1" stopColor={c.lo} />
          </radialGradient>
          <radialGradient id={id + 'c'} cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#1e6e69" />
            <stop offset="1" stopColor="#082e2d" />
          </radialGradient>
        </defs>
        <g fill={`url(#${id}g)`} stroke={c.edge} strokeWidth="2">
          <path d="M40 92 C18 84 8 70 4 56 C22 62 34 64 46 74 Z" />
          <path d="M42 112 C16 110 4 98 0 86 C18 90 32 92 44 98 Z" />
          <path d="M160 92 C182 84 192 70 196 56 C178 62 166 64 154 74 Z" />
          <path d="M158 112 C184 110 196 98 200 86 C182 90 168 92 156 98 Z" />
        </g>
        <circle cx="100" cy="100" r="66" fill={`url(#${id}g)`} stroke={c.edge} strokeWidth="3" />
        <circle cx="100" cy="100" r="54" fill={`url(#${id}c)`} stroke={c.ring} strokeWidth="3" />
        <circle cx="100" cy="100" r="60" fill="none" stroke={c.edge} strokeWidth="1.5" strokeDasharray="3 5" />
        {!isLocked && tier >= 2 && <path d="M100 158 l6 12 13 2 -9.5 9 2.3 13 -11.8 -6.3 -11.8 6.3 2.3 -13 -9.5 -9 13 -2z" fill={c.hi} stroke={c.edge} strokeWidth="1.5" />}
      </svg>
      <span className="medal-icon" style={{ fontSize: size * 0.32 }}>{icon}</span>
    </div>
  )
}
