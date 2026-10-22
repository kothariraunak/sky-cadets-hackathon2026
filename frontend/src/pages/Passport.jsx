import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Cadet from '../components/art/Cadet'
import Medal from '../components/art/Medal'
import WorldMap from '../components/WorldMap'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { formatDate, formatMiles, tracksTitle } from '../game/config'
import { useI18n } from '../i18n/context'

const TIER_KEYS = ['tier.bronze', 'tier.silver', 'tier.gold']

function BadgeSlot({ b, onOpen }) {
  const { t } = useI18n()
  const target = b.next_target
  const prevTarget = b.tier ? b.tiers[b.tier - 1] : 0
  const pct = target ? Math.min(1, (b.value - prevTarget) / Math.max(1, target - prevTarget)) : 1
  return (
    <button className={'badge-slot tier-' + b.tier} onClick={() => onOpen(b)}>
      <Medal icon={b.icon} size={84} tier={b.tier} />
      <b>{b.name}</b>
      <span className={'tier-chip t' + b.tier}>{b.tier ? b.tier_name : t('tier.locked')}</span>
      {target ? (
        <>
          <div className="bar slim"><div className="bar-fill" style={{ width: pct * 100 + '%' }} /></div>
          <small>{t('passport.toTier', { value: b.value, target, tier: t(TIER_KEYS[b.tier]) })}</small>
        </>
      ) : (
        <small className="gold-text">{t('passport.fullyUpgraded')}</small>
      )}
    </button>
  )
}

export default function Passport() {
  const { cadet } = useAuth()
  const { stamps, badges, stats } = useGame()
  const { t } = useI18n()
  const [open, setOpen] = useState(null)

  const families = useMemo(() => {
    const out = {}
    badges.forEach((b) => (out[b.family_name] = out[b.family_name] || []).push(b))
    return Object.entries(out)
  }, [badges])
  // Like Pokémon GO: always show the medals that are closest to their next tier.
  const almost = useMemo(
    () => badges.filter((b) => b.next_target).map((b) => ({ ...b, gap: b.next_target - b.value })).sort((a, z) => a.gap - z.gap || z.value - a.value).slice(0, 3),
    [badges]
  )
  const unlocked = badges.filter((b) => b.tier > 0).length

  return (
    <div className="passport-page">
      <section className="passport-book">
        <div className="passport-photo">
          <Cadet avatar={cadet.avatar} pose="thumbs" size={120} />
        </div>
        <div className="passport-id">
          <div className="eyebrow">{t('passport.eyebrow', { id: cadet.aviator_id })}</div>
          <h1>{cadet.cadet_name}</h1>
          <div className="muted">{tracksTitle(cadet.interests, t)} · {t(`band.${cadet.age_band}`)} · {t('passport.home', { code: cadet.home_airport })}</div>
          <div className="rank-pill">🛡️ {cadet.rank.title} · {t('home.rankOf', { n: cadet.rank.index + 1, total: cadet.rank.ranks.length })}</div>
        </div>
      </section>

      <div className="stat-strip">
        <div><b className="gold-text">★ {cadet.stars}</b><span>{t('stats.lifetimeStars')}</span></div>
        <div><b>{formatMiles(stats?.lifetime_miles)}</b><span>{t('stats.lifetimeMiles')}</span></div>
        <div><b>{stats?.flights_flown ?? 0}</b><span>{t('stats.flights')}</span></div>
        <div><b>{stats?.countries ?? 0}</b><span>{t('stats.countries')}</span></div>
        <div><b>{unlocked}/{badges.length}</b><span>{t('stats.badges')}</span></div>
      </div>

      <div className="section-head"><h2>{t('passport.stamps')}</h2><span className="muted">{t('passport.stampsNote')}</span></div>
      <div className="stamp-page">
        {stamps.map((s, i) => (
          <div className="ink-stamp" key={s.id} style={{ '--tilt': ((i * 37) % 24) - 12 + 'deg' }}>
            <span className="ink-icon">{s.flag || s.stamp_icon}</span>
            <b>{s.airport_code}</b>
            <small>{s.city_name}</small>
            <small className="ink-date">{formatDate(s.earned_at, { day: '2-digit', month: 'short', year: '2-digit' })}</small>
          </div>
        ))}
        {stamps.length === 0 && <p className="muted stamp-empty">{t('passport.noStamps')}</p>}
      </div>

      <div className="section-head"><h2>{t('passport.cabinet')}</h2><span className="muted">{t('passport.cabinetNote', { n: unlocked, total: badges.length })}</span></div>
      {almost.length > 0 && (
        <div className="panel almost">
          <div className="eyebrow">{t('passport.almost')}</div>
          <div className="almost-row">
            {almost.map((b) => (
              <button key={b.code} className="almost-item" onClick={() => setOpen(b)}>
                <Medal icon={b.icon} size={56} tier={b.tier} />
                <span><b>{b.name}</b><small>{t('passport.moreFor', { n: b.gap, tier: t(TIER_KEYS[b.tier]) })}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {families.map(([family, list]) => (
        <div key={family} className="badge-family">
          <h3>{family}</h3>
          <div className="badge-cabinet">
            {list.map((b) => <BadgeSlot key={b.code} b={b} onOpen={setOpen} />)}
          </div>
        </div>
      ))}

      <div className="section-head"><h2>{t('passport.routeMap')}</h2><span className="muted">{t('passport.routeMapNote', { city: stats?.home?.city || '' })}</span></div>
      <div className="panel map-panel">
        <WorldMap routes={stats?.routes || []} home={stats?.home} />
        {stats?.routes?.length > 0 ? (
          <div className="map-legend">
            <span><i className="legend-line planned" /> {t('passport.legendPlanned')}</span>
            <span><i className="legend-line flown" /> {t('passport.legendFlown')}</span>
          </div>
        ) : (
          <p className="muted center">{t('passport.noRoutes')}</p>
        )}
      </div>

      <div className="section-head"><h2>{t('passport.aircraft')}</h2><span className="muted">{t('passport.aircraftNote')}</span></div>
      <div className="aircraft-grid">
        {(stats?.aircraft || []).map((a) => (
          <div key={a.type} className="panel aircraft-card">
            <div className="aircraft-type">✈️ {a.type}</div>
            <div className="muted">{a.maker} · {a.body} · {t('passport.engines', { n: a.engines })} · {t('passport.seats', { n: a.seats })}</div>
            <div className="aircraft-flights">{a.count}× · {a.flights.join(', ')}</div>
          </div>
        ))}
        {!stats?.aircraft?.length && <p className="muted">{t('passport.noAircraft')}</p>}
      </div>

      <Link to="/settings" className="btn btn-ghost btn-wide settings-link">⚙️ {t('passport.settingsLink')}</Link>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)}>
          <div className="sheet badge-sheet" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <button className="icon-btn sheet-close" onClick={() => setOpen(null)} aria-label={t('common.close')}>✕</button>
            <Medal icon={open.icon} size={150} tier={open.tier} rays={open.tier > 0} />
            <div className="eyebrow">{t('passport.familyBadge', { family: open.family_name })}</div>
            <h2>{open.name}</h2>
            <p className="muted">{open.description}</p>
            <div className="tier-steps">
              {open.tiers.map((n, i) => (
                <div key={i} className={'tier-step t' + (i + 1) + (open.tier > i ? ' got' : '')}>
                  <b>{t(TIER_KEYS[i])}</b><small>{open.code.startsWith('first_') || open.code === 'homeward_bound' ? n : t('passport.missionsN', { n })}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
