import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import MissionSheet from '../components/MissionSheet'
import StarMeter from '../components/StarMeter'
import { useGame } from '../context/GameContext'
import { AFTER_LANDING, PHASES, phaseByKey } from '../game/config'
import { useI18n } from '../i18n/context'

const KIND_ICON = { activity: '🎮', photo: '📸', land: '🛬', complete: '🏁', auto: '✨' }

export default function Phase() {
  const { phaseKey } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { flight, missionsIn, progressFor, phaseStats, isUnlocked } = useGame()
  const [sheet, setSheet] = useState(null)
  const phase = phaseByKey(phaseKey)
  if (!phase) return <Navigate to="/map" replace />

  const index = PHASES.findIndex((p) => p.key === phaseKey)
  const unlocked = isUnlocked(phaseKey)
  const stats = phaseStats(phaseKey)
  const missions = missionsIn(phaseKey)
  const nextPhase = PHASES[index + 1]

  return (
    <div className="phase-page">
      <Link to="/map" className="back-link">← {t('nav.missions')}</Link>

      <section className={'phase-hero' + (unlocked ? '' : ' locked')}>
        <div className="phase-badge">
          <span className="phase-level">{t('phase.chapter', { n: index + 1 })}</span>
          <span className="phase-icon">{unlocked ? phase.icon : '🔒'}</span>
        </div>
        <div className="phase-hero-text">
          <div className="eyebrow">{t(`phase.${phaseKey}.when`)}</div>
          <h1>{t(`phase.${phaseKey}`)}</h1>
          <p className="muted">{t(`phase.${phaseKey}.blurb`)}</p>
          <StarMeter filled={stats.done} total={stats.total} label={t('phase.progress')} />
        </div>
      </section>

      {!unlocked ? (
        <div className="panel locked-panel">
          <div className="big-emoji">{flight ? '🛬' : '🎫'}</div>
          <h3>{flight ? t('phase.opensAfterTouchdown') : t('phase.checkInToUnlock')}</h3>
          <p className="muted">{flight ? t('phase.touchdownNote') : t('phase.scanNote')}</p>
          {!flight && (
            <button className="btn btn-primary" onClick={() => navigate('/scan')}>
              {t('home.startFlight')} <span className="btn-arrow">➜</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mission-list">
          {missions.map((m) => {
            const done = progressFor(m.id)?.completed
            return (
              <button key={m.id} className={'mission-card' + (done ? ' done' : '') + (m.kind === 'land' ? ' landing' : '')} onClick={() => setSheet(m)}>
                <span className="mission-tile">{m.icon}</span>
                <span className="mission-body">
                  <b>{m.title}</b>
                  <span>{m.description}</span>
                  <span className="mission-tags">
                    <em>{KIND_ICON[m.kind] || '🎮'} {t(`kind.${m.kind}`)}</em>
                    {m.track && <em className="track">⭐ {t('phase.trackTag', { track: t(`track.${m.track}`) })}</em>}
                    <em className="gold">+{m.stars_reward} ★</em>
                  </span>
                </span>
                <span className="mission-state">{done ? '✓' : '▶'}</span>
              </button>
            )
          })}
        </div>
      )}

      {unlocked && stats.complete && nextPhase && (
        <div className="panel phase-complete">
          <div className="big-emoji">🏁</div>
          <h3>{t('phase.complete')}</h3>
          {AFTER_LANDING.includes(nextPhase.key) && !isUnlocked(nextPhase.key) ? (
            <p className="muted">{t('phase.destinationAfterTouchdown')}</p>
          ) : (
            <Link className="btn btn-primary" to={`/missions/${nextPhase.key}`}>
              {t('phase.next', { phase: t(`phase.${nextPhase.key}`) })} <span className="btn-arrow">➜</span>
            </Link>
          )}
        </div>
      )}

      {sheet && <MissionSheet mission={sheet} onClose={() => setSheet(null)} />}
    </div>
  )
}
