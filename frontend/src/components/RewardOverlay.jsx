import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { useI18n } from '../i18n/context'
import Cadet from './art/Cadet'
import Crest from './art/Crest'
import Medal from './art/Medal'

const CONFETTI_COLORS = ['#3fe0d0', '#f5c443', '#9b6cff', '#ff7aa8', '#ffffff']

// Deterministic scatter so pieces don't jump between renders.
const CONFETTI = Array.from({ length: 44 }).map((_, i) => {
  const r = (n) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    left: r(1) * 100,
    delay: r(2) * 1.6,
    dur: 2.6 + r(3) * 2,
    rot: r(4) * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }
})

function Confetti() {
  const pieces = CONFETTI
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: p.left + '%',
            background: p.color,
            animationDelay: p.delay + 's',
            animationDuration: p.dur + 's',
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function RankLadder({ rank, rankUp }) {
  const { t } = useI18n()
  const titles = rank.ranks
  const prev = titles[rank.index - 1]
  const next = rank.next
  return (
    <div className="rank-ladder">
      {prev ? (
        <div className="rung past">
          <div className="rung-name">{prev}</div>
          <div className="rung-stars">★★★</div>
        </div>
      ) : (
        <div className="rung spacer" />
      )}
      <div className={'rung-link' + (prev ? ' done' : ' hidden')} />
      <div className={'rung current' + (rankUp ? ' fresh' : '')}>
        <div className="rung-shield">🛡️</div>
        <div className="rung-name">{rank.title}</div>
        {rankUp && <div className="rung-new">{t('reward.newRank')}</div>}
      </div>
      <div className="rung-link" />
      {next ? (
        <div className="rung locked">
          <div className="rung-name">{next.title}</div>
          <div className="rung-stars">
            🔒 {next.stars_needed || next.families_needed
              ? t('rank.toGo', { need: [next.stars_needed && `${next.stars_needed}★`, next.families_needed && t('rank.families', { count: next.families_needed })].filter(Boolean).join(' + ') })
              : t('rank.almost')}
          </div>
        </div>
      ) : (
        <div className="rung spacer" />
      )}
    </div>
  )
}

export default function RewardOverlay() {
  const { cadet } = useAuth()
  const { celebrations, dismissCelebration } = useGame()
  const { t } = useI18n()
  const c = celebrations[0]
  if (!c || !cadet) return null

  const heading = c.title

  return (
    <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label={heading}>
      <Confetti />
      <div className="reward-card" key={c.id}>
        <button className="icon-btn reward-close" onClick={dismissCelebration} aria-label={t('common.close')}>✕</button>
        <div className="reward-head">
          <Crest size={110} className="reward-crest" />
          <div>
            <h2 className="reward-title">
              <span className="laurel">❦</span> {heading} <span className="laurel flip">❦</span>
            </h2>
            {c.rankUp ? (
              <div className="reward-sub">{t('reward.levelUp', { rank: c.rankUp.to })}</div>
            ) : (
              <div className="reward-sub">{c.subtitle}</div>
            )}
          </div>
        </div>

        <div className="reward-body">
          <Cadet avatar={cadet.avatar} pose="cheer" size={150} className="reward-cadet" />
          <div className="reward-center">
            <Medal icon={c.icon} size={170} tier={c.tier || 3} rays />
            <button className="btn btn-primary" onClick={dismissCelebration}>
              {t('reward.continue')} <span className="btn-arrow">➜</span>
            </button>
          </div>
          <div className="reward-info panel">
            <div className="reward-info-title">
              <span>{c.icon}</span> {c.subtitle}
            </div>
            {c.message && <p>{c.message}</p>}
            {c.stars > 0 && <div className="reward-stars">+{c.stars} <span>★</span></div>}
            {c.badges?.length > 0 && (
              <div className="reward-badges">
                {c.badges.map((b) => (
                  <span key={b.name} className={'reward-badge t' + b.tier}>
                    {b.icon} {b.tier > 1 ? t('reward.badgeTier', { badge: b.name, tier: b.tier_name }) : t('reward.badgeNew', { badge: b.name })}
                  </span>
                ))}
              </div>
            )}
            <div className="reward-cheer">{t('reward.greatJob')}</div>
          </div>
        </div>

        <RankLadder rank={cadet.rank} rankUp={c.rankUp} />
      </div>
    </div>
  )
}
