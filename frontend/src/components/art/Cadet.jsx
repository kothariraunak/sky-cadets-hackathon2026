// Chibi pilot mascot. `avatar` is boy_pilot | girl_pilot; `pose` is idle | wave | thumbs | cheer.
const SKIN = '#ffd9b8'
const SKIN_SHADE = '#f2bf98'
const TEAL = '#0f4a4a'
const TEAL_DARK = '#082b2a'
const GOLD = '#e0b04a'

function Hand({ x, y, thumb }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />
      {thumb && <rect x={x - 4} y={y - 22} width="8" height="16" rx="4" fill={SKIN} stroke={SKIN_SHADE} strokeWidth="1.5" />}
    </g>
  )
}

function ArmDown({ side }) {
  const s = side === 'left' ? -1 : 1
  const sx = 100 + s * 44
  return (
    <g>
      <path d={`M${sx} 188 Q${sx + s * 14} 206 ${sx + s * 12} 228`} stroke="#ffffff" strokeWidth="20" strokeLinecap="round" fill="none" />
      <Hand x={sx + s * 12} y={232} />
    </g>
  )
}

function ArmUp({ side, pose }) {
  const s = side === 'left' ? -1 : 1
  const sx = 100 + s * 44
  const hx = sx + s * 30
  const hy = pose === 'thumbs' ? 168 : 132
  return (
    <g className={pose === 'wave' ? 'cadet-wave' : undefined} style={{ transformOrigin: `${sx}px 188px` }}>
      <path d={`M${sx} 190 Q${sx + s * 30} ${hy + 40} ${hx} ${hy + 12}`} stroke="#ffffff" strokeWidth="20" strokeLinecap="round" fill="none" />
      <Hand x={hx} y={hy} thumb={pose === 'thumbs'} />
      {pose === 'cheer' && <circle cx={hx} cy={hy} r="11" fill={SKIN_SHADE} opacity="0.35" />}
    </g>
  )
}

export default function Cadet({ avatar = 'boy_pilot', pose = 'idle', size = 160, className = '' }) {
  const girl = avatar === 'girl_pilot'
  const hair = girl ? '#8a4b22' : '#1f1a1a'
  const hairHi = girl ? '#a8622f' : '#3a3030'
  const leftUp = pose === 'cheer'
  const rightUp = pose !== 'idle'

  return (
    <svg className={'cadet ' + className} width={size} height={size * 1.25} viewBox="0 0 200 250" role="img" aria-label={girl ? 'Girl cadet' : 'Boy cadet'}>
      {/* Back hair / ponytail */}
      {girl && (
        <g>
          <path d="M150 96 C182 104 188 150 170 178 C166 160 160 140 146 128 Z" fill={hair} />
          <path d="M44 100 C34 130 40 160 52 172 L60 120 Z" fill={hair} />
          <path d="M156 100 C166 130 160 160 148 172 L140 120 Z" fill={hair} />
        </g>
      )}

      {/* Arms behind torso */}
      {leftUp ? <ArmUp side="left" pose={pose} /> : <ArmDown side="left" />}
      {rightUp ? <ArmUp side="right" pose={pose} /> : <ArmDown side="right" />}

      {/* Torso */}
      <path d="M56 250 C54 206 66 182 100 180 C134 182 146 206 144 250 Z" fill="#ffffff" stroke="#d9e3e4" strokeWidth="2" />
      {girl && <path d="M62 236 L138 236 L146 250 L54 250 Z" fill={TEAL} />}
      {!girl && <rect x="58" y="238" width="84" height="12" fill={TEAL_DARK} />}
      {!girl && <rect x="93" y="238" width="14" height="10" rx="2" fill={GOLD} />}
      {/* Collar + tie */}
      <path d="M86 182 L100 198 L114 182" fill="#ffffff" stroke="#d0dbdc" strokeWidth="2" />
      <path d="M95 196 L105 196 L109 228 L100 238 L91 228 Z" fill={TEAL} />
      <rect x="94" y="193" width="12" height="7" rx="2" fill={TEAL_DARK} />
      {/* Epaulettes */}
      <rect x="60" y="184" width="22" height="8" rx="3" fill={TEAL_DARK} transform="rotate(-18 71 188)" />
      <rect x="118" y="184" width="22" height="8" rx="3" fill={TEAL_DARK} transform="rotate(18 129 188)" />
      <path d="M64 190 L78 185 M120 185 L134 190" stroke={GOLD} strokeWidth="2" />
      {/* Wing pin */}
      <path d="M118 208 q8 -6 16 0 q-8 2 -16 0z M118 208 q-8 -6 -14 1 q7 1 14 -1z" fill={GOLD} />

      {/* Neck + head */}
      <rect x="90" y="160" width="20" height="24" rx="6" fill={SKIN_SHADE} />
      <circle cx="44" cy="120" r="11" fill={SKIN} />
      <circle cx="156" cy="120" r="11" fill={SKIN} />
      <circle cx="100" cy="114" r="56" fill={SKIN} />

      {/* Front hair under the cap */}
      {girl ? (
        <path d="M46 98 C52 120 64 112 72 102 C80 116 96 112 102 100 C112 114 132 116 140 102 C146 112 152 116 156 100 L150 86 L50 86 Z" fill={hair} />
      ) : (
        <path d="M46 96 L56 116 L64 100 L74 116 L84 100 L94 114 L102 98 L112 112 L120 98 L130 112 L138 98 L146 114 L154 96 L150 84 L50 84 Z" fill={hair} />
      )}
      <path d="M70 100 L80 106" stroke={hairHi} strokeWidth="3" strokeLinecap="round" />

      {/* Face */}
      <ellipse cx="78" cy="124" rx="10" ry="12.5" fill="#2b1b12" />
      <ellipse cx="122" cy="124" rx="10" ry="12.5" fill="#2b1b12" />
      <ellipse cx="78" cy="125" rx="5.5" ry="7" fill={girl ? '#2f7f86' : '#5a3a22'} />
      <ellipse cx="122" cy="125" rx="5.5" ry="7" fill={girl ? '#2f7f86' : '#5a3a22'} />
      <circle cx="81" cy="119" r="4" fill="#ffffff" />
      <circle cx="125" cy="119" r="4" fill="#ffffff" />
      <circle cx="75" cy="129" r="1.8" fill="#ffffff" />
      <circle cx="119" cy="129" r="1.8" fill="#ffffff" />
      {girl && (
        <path d="M66 112 l-5 -4 M70 109 l-3 -5 M134 112 l5 -4 M130 109 l3 -5" stroke="#2b1b12" strokeWidth="2" strokeLinecap="round" />
      )}
      <path d="M68 106 Q78 100 88 105 M112 105 Q122 100 132 106" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="64" cy="142" rx="9" ry="5.5" fill="#f59d93" opacity="0.55" />
      <ellipse cx="136" cy="142" rx="9" ry="5.5" fill="#f59d93" opacity="0.55" />
      <path d="M97 134 Q100 137 103 134" stroke={SKIN_SHADE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M84 144 Q100 166 116 144 Z" fill="#7a2a28" />
      <path d="M90 154 Q100 160 110 154 Q104 162 100 162 Q96 162 90 154Z" fill="#f07c7c" />
      <path d="M86 145 L114 145 L112 149 L88 149 Z" fill="#ffffff" />

      {/* Pilot cap */}
      <path d="M40 92 C34 52 70 34 104 36 C140 38 170 56 160 92 Z" fill={TEAL} />
      <path d="M58 60 C70 46 92 42 110 43" stroke="#1b6664" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="40" y="82" width="120" height="14" rx="6" fill={TEAL_DARK} />
      <path d="M46 92 Q100 104 154 92" stroke={GOLD} strokeWidth="3" fill="none" />
      <path d="M44 96 Q100 118 156 96 L154 104 Q100 126 46 104 Z" fill="#061f1e" />
      {/* Cap badge */}
      <path d="M100 66 q14 -10 30 -2 q-14 4 -30 6z M100 66 q-14 -10 -30 -2 q14 4 30 6z" fill={GOLD} />
      <circle cx="100" cy="66" r="9" fill={GOLD} stroke="#a77816" strokeWidth="2" />
      <circle cx="100" cy="66" r="4" fill="#fff3c4" />
    </svg>
  )
}
