import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Cadet from '../components/art/Cadet'
import BoardingPass from '../components/BoardingPass'
import FlightStatus from '../components/FlightStatus'
import MissionSheet from '../components/MissionSheet'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { NEW_CADET_KEY, PHASES, formatDate, formatMiles, tracksTitle } from '../game/config'
import { useI18n } from '../i18n/context'

const NODE_X = [28, 70, 34, 72, 30]
const ROW_H = 132
const STATUS_TONE = { upcoming: 'muted', active: 'live', landed: 'live', completed: 'done', left: 'muted' }

function LevelPath() {
  const navigate = useNavigate()
  const { cadet } = useAuth()
  const { t } = useI18n()
  const { phaseStats, isUnlocked, currentPhase } = useGame()
  const height = PHASES.length * ROW_H
  const points = PHASES.map((_, i) => [NODE_X[i], i * ROW_H + ROW_H / 2])
  const d = points
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`
      const [px, py] = points[i - 1]
      const my = (py + y) / 2
      return `C${px} ${my} ${x} ${my} ${x} ${y}`
    })
    .join(' ')
  return (
    <div className="level-path" style={{ height }}>
      <svg className="level-trail" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={d} fill="none" stroke="rgba(160,235,225,0.35)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {PHASES.map((phase, i) => {
        const stats = phaseStats(phase.key)
        const unlocked = isUnlocked(phase.key)
        const current = unlocked && phase.key === currentPhase && !stats.complete
        const state = !unlocked ? 'locked' : stats.complete ? 'complete' : current ? 'current' : 'open'
        return (
          <button key={phase.key} className={'level-node ' + state + (NODE_X[i] > 50 ? ' right' : '')}
            style={{ left: NODE_X[i] + '%', top: i * ROW_H + ROW_H / 2 }} onClick={() => navigate(`/missions/${phase.key}`)}>
            {current && <span className="you-are-here"><Cadet avatar={cadet.avatar} size={40} /></span>}
            <span className="node-disc">
              <span className="node-num">{i + 1}</span>
              <span className="node-icon">{unlocked ? phase.icon : '🔒'}</span>
            </span>
            <span className="node-label">
              <b>{t(`phase.${phase.key}`)}</b>
              <span className="node-count">{unlocked ? t('home.missionsCount', { done: stats.done, total: stats.total }) : t(`phase.${phase.key}.when`)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function CadetCard() {
  const { cadet } = useAuth()
  const { t } = useI18n()
  const r = cadet.rank
  const pct = r.next ? Math.min(1, (cadet.stars - r.floor) / Math.max(1, r.next.stars - r.floor)) : 1
  const needs = r.next
    ? [r.next.stars_needed && t('rank.moreStars', { n: r.next.stars_needed }), r.next.families_needed && t('rank.moreFamilies', { count: r.next.families_needed })].filter(Boolean)
    : []
  return (
    <section className="panel cadet-card">
      <div className="cadet-card-top">
        <div className="cadet-portrait"><Cadet avatar={cadet.avatar} pose="wave" size={92} /></div>
        <div className="cadet-id">
          <div className="eyebrow">{t('home.aviatorId', { id: cadet.aviator_id })}</div>
          <h1>{cadet.cadet_name}</h1>
          <div className="muted">{tracksTitle(cadet.interests, t)} · {t(`band.${cadet.age_band}`)}</div>
        </div>
        <Link to="/settings" className="icon-btn" aria-label={t('settings.title')}>⚙️</Link>
      </div>
      <div className="lifetime-row">
        <div><b className="gold-text">★ {cadet.stars}</b><span>{t('stats.lifetimeStars')}</span></div>
        <div><b>✈ {formatMiles(cadet.lifetime_miles)}</b><span>{t('stats.lifetimeMiles')}</span></div>
        <div><b>🛡️ {r.title}</b><span>{t('home.rankOf', { n: r.index + 1, total: r.ranks.length })}</span></div>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: pct * 100 + '%' }} /></div>
      <small className="muted">
        {r.next
          ? t('home.nextRank', { rank: r.next.title, needs: needs.length ? needs.join(' + ') : t('rank.almost') })
          : t('home.topRank')}
      </small>
    </section>
  )
}

function Journeys({ onLeave }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { flights, flight, selectFlight, checkIn } = useGame()
  const [open, setOpen] = useState(null)
  const others = flights.filter((f) => f.id !== flight?.id)
  if (!others.length) return null
  return (
    <section className="journeys">
      <div className="section-head"><h2>{t('home.journeys')}</h2><span className="muted">{t('home.flightsCount', { count: flights.length })}</span></div>
      {others.map((f) => {
        const resumable = ['active', 'landed'].includes(f.status)
        return (
          <div key={f.id} className="panel journey-row">
            <button className="journey-main" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
              <span className="journey-route"><b>{f.origin_code}</b> ✈ <b>{f.destination_code}</b></span>
              <span className="journey-meta">{f.flight_number} · {formatDate(f.departure_at)}</span>
              <span className={'status-chip ' + (STATUS_TONE[f.status] || 'muted')}>{t(`status.${f.status}`)}</span>
            </button>
            {open === f.id && (
              <div className="journey-detail">
                <span>{f.aircraft_type} · {formatMiles(f.distance_mi)} {t('units.miles')}</span>
                <div className="journey-actions">
                  {resumable && <button className="btn btn-primary btn-sm" onClick={() => { selectFlight(f.id); window.scrollTo(0, 0) }}>{t('home.resume')}</button>}
                  {f.status === 'upcoming' && <button className="btn btn-primary btn-sm" onClick={() => checkIn(f)}>{t('home.checkIn')}</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/journal?flight=${f.id}`)}>{t('home.viewJournal')}</button>
                  {resumable && <button className="link-btn" onClick={() => onLeave(f)}>{t('home.leave')}</button>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

export default function MissionMap() {
  const navigate = useNavigate()
  const { cadet } = useAuth()
  const { t } = useI18n()
  const { flight, missions, nextMission, currentPhase, leaveFlight } = useGame()
  const touchdown = missions.find((m) => m.kind === 'land')
  const [sheet, setSheet] = useState(null)
  const [leaving, setLeaving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [intro, setIntro] = useState(() => {
    try {
      return sessionStorage.getItem(NEW_CADET_KEY) === '1'
    } catch {
      return false
    }
  })
  const closeIntro = (go) => {
    try {
      sessionStorage.removeItem(NEW_CADET_KEY)
    } catch {
      /* storage unavailable */
    }
    setIntro(false)
    if (go) navigate('/scan')
  }

  const confirmLeave = async () => {
    setBusy(true)
    try {
      await leaveFlight(leaving)
      setLeaving(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="map-page">
      <section className="hub-hero">
        <CadetCard />

        {flight ? (
          <div className="current-flight">
            <div className="section-head tight">
              <h2>{t('home.currentMission')}</h2>
              <span className="status-chip live">{flight.status === 'landed' ? t('home.landedIn', { city: flight.destination_name }) : t('home.inProgress')}</span>
            </div>
            <FlightStatus onTouchdown={() => touchdown && setSheet(touchdown)} />
            <BoardingPass flight={flight} cadetName={cadet.cadet_name} />
            <button className="btn btn-primary btn-wide hub-cta" onClick={() => (nextMission ? setSheet(nextMission) : navigate(`/missions/${currentPhase}`))}>
              <span>
                {t('home.continue')}
                {nextMission && <small>{nextMission.icon} {nextMission.title}</small>}
              </span>
              <span className="btn-arrow">➜</span>
            </button>
            <button className="link-btn leave-btn" onClick={() => setLeaving(flight)}>{t('home.leave')}</button>
          </div>
        ) : (
          <button className="panel start-flight" onClick={() => navigate('/scan')}>
            <span className="start-icon">🎫</span>
            <span>
              <b>{t('home.startFlight')}</b>
              <small>{t('home.startFlightNote')}</small>
            </span>
            <span className="btn-arrow">➜</span>
          </button>
        )}
        {flight && (
          <button className="btn btn-ghost btn-wide" onClick={() => navigate('/scan')}>🎫 {t('home.startFlight')}</button>
        )}
        <Link to="/fun-facts" className="panel fun-facts-link">
          <span className="ffl-icon">💡</span>
          <span><b>{t('funFacts.title')}</b><small>{t('funFacts.homeNote')}</small></span>
          <span className="btn-arrow">➜</span>
        </Link>
        <Journeys onLeave={setLeaving} />
      </section>

      <section className="map-section">
        <div className="section-head">
          <h2>{t('home.missionMap')}</h2>
          <span className="muted">{flight ? `${flight.flight_number} · ${flight.origin_code} → ${flight.destination_code}` : t('home.scanToUnlock')}</span>
        </div>
        <LevelPath />
      </section>

      {sheet && <MissionSheet mission={sheet} onClose={() => setSheet(null)} />}

      {leaving && (
        <div className="sheet-backdrop intro" onClick={() => setLeaving(null)}>
          <div className="intro-card" role="dialog" aria-modal="true" aria-label={t('home.leave')} onClick={(e) => e.stopPropagation()}>
            <div className="big-emoji">🛑</div>
            <h2>{t('home.leaveTitle', { flight: leaving.flight_number })}</h2>
            <p className="muted">{t('home.leaveBody')}</p>
            <button className="btn btn-danger" onClick={confirmLeave} disabled={busy}>{t('home.leave')}</button>
            <button className="btn btn-ghost" onClick={() => setLeaving(null)}>{t('home.keepGoing')}</button>
          </div>
        </div>
      )}

      {intro && (
        <div className="sheet-backdrop intro">
          <div className="intro-card">
            <div className="eyebrow">{t('home.welcome', { name: cadet.cadet_name })}</div>
            <h2>{t('home.passportReady')}</h2>
            <Cadet avatar={cadet.avatar} pose="cheer" size={130} />
            <p className="muted">{t('home.introBody')}</p>
            <button className="btn btn-primary btn-wide" onClick={() => closeIntro(true)}>{t('home.scanPass')} <span className="btn-arrow">➜</span></button>
            <button className="btn btn-ghost" onClick={() => closeIntro(false)}>{t('home.exploreFirst')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
