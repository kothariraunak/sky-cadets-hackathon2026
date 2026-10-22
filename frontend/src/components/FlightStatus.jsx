import { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { STAGES, formatDuration, formatTime } from '../game/config'
import { useI18n } from '../i18n/context'

// Re-render every minute so countdowns stay current between live-status polls.
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// Where the cadet is on the journey (getting ready → at the airport → on board → landed), from HKIA's live
// departure time and the estimated landing. Shown on the home screen above the mission button.
export default function FlightStatus({ onTouchdown }) {
  const { t } = useI18n()
  const { flight, stage } = useGame()
  const now = useNow()
  if (!flight || !stage) return null
  const index = STAGES.findIndex((s) => s.key === stage)
  const dep = new Date(flight.departure_at).getTime()
  const arr = flight.arrival_at ? new Date(flight.arrival_at).getTime() : null
  const toDeparture = (dep - now) / 60000
  const toLanding = arr ? (arr - now) / 60000 : null

  let headline
  if (stage === 'getting_ready') headline = t('stage.getting_ready.note', { time: formatDuration(toDeparture - 120, t) })
  else if (stage === 'at_airport') headline = t('stage.at_airport.note', { time: formatDuration(toDeparture, t) })
  else if (stage === 'on_board') headline = toLanding > 0 ? t('stage.on_board.note', { time: formatDuration(toLanding, t) }) : t('stage.on_board.soon')
  else headline = t('stage.landed.note', { city: flight.destination_name })
  const awaitingTouchdown = stage === 'landed' && flight.status === 'active'

  return (
    <section className={'panel flight-status stage-' + stage} aria-label={t('stage.title')}>
      <div className="fs-head">
        <span className="fs-icon">{STAGES[index].icon}</span>
        <div>
          <div className="eyebrow">{t('stage.title')}{flight.stage_override ? ` · ${t('stage.demo')}` : ''}</div>
          <b className="fs-stage">{t(`stage.${stage}`)}</b>
          <small className="muted">{headline}</small>
        </div>
      </div>

      <ol className="fs-steps">
        {STAGES.map((s, i) => (
          <li key={s.key} className={i < index ? 'done' : i === index ? 'now' : ''}>
            <span>{s.icon}</span>
            <small>{t(`stage.${s.key}.short`)}</small>
          </li>
        ))}
      </ol>

      <div className="fs-facts">
        <div><span>{t('stage.departs')}</span><b>{formatTime(flight.departure_at, flight.origin_tz)}</b><small>{flight.origin_code}</small></div>
        {flight.arrival_at && <div><span>{t('stage.lands')}</span><b>{formatTime(flight.arrival_at, flight.destination_tz)}</b><small>{flight.destination_code} · {t('stage.estimated')}</small></div>}
        {flight.gate && <div><span>{t('stage.gate')}</span><b>{flight.gate}</b><small>{flight.terminal}</small></div>}
        {flight.live_status && <div><span>{t('stage.airportSays')}</span><b className="fs-live">{flight.live_status}</b><small>HKIA</small></div>}
      </div>

      {awaitingTouchdown && (
        <button className="btn btn-gold btn-wide" onClick={onTouchdown}>
          <span>{t('stage.touchdownCta')}<small>{t('stage.touchdownNote')}</small></span>
          <span className="btn-arrow">➜</span>
        </button>
      )}
    </section>
  )
}
