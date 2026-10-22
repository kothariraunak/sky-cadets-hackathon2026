// Paper boarding-pass ticket; optional glowing scan frame like the welcome mockup.
function QrBlock({ seed = 'SC' }) {
  // Deterministic faux-QR pattern so each flight gets its own look.
  const cells = []
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  for (let i = 0; i < 81; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    const r = Math.floor(i / 9)
    const c = i % 9
    const corner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)
    cells.push(corner ? (r % 2 === 0 || c % 2 === 0 ? 1 : 0) : (h >> 16) & 1)
  }
  return (
    <div className="qr">
      {cells.map((on, i) => (
        <span key={i} className={on ? 'on' : ''} />
      ))}
    </div>
  )
}

import { formatDate, formatTime } from '../game/config'
import { useI18n } from '../i18n/context'

export default function BoardingPass({ flight, cadetName, scanning = false, compact = false }) {
  const { t } = useI18n()
  if (!flight) return null
  const ticket = (
    <div className={'boarding-pass' + (compact ? ' compact' : '')}>
      <div className="bp-main">
        <div className="bp-brand">✈ {t('pass.brand')}</div>
        <div className="bp-name">{(cadetName || t('common.cadet')).toUpperCase()}</div>
        <div className="bp-route">
          <div>
            <div className="bp-code">{flight.origin_code}</div>
            <div className="bp-city">{flight.origin_name}</div>
          </div>
          <div className="bp-plane">✈</div>
          <div>
            <div className="bp-code">{flight.destination_code}</div>
            <div className="bp-city">{flight.destination_name}</div>
          </div>
        </div>
        <div className="bp-meta">
          <div>
            <span>{t('pass.flight')}</span>
            {flight.flight_number}
          </div>
          <div>
            <span>{t('pass.date')}</span>
            {formatDate(flight.departure_at, { day: 'numeric', month: 'short', timeZone: flight.origin_tz })} · {formatTime(flight.departure_at, flight.origin_tz)}
          </div>
          {flight.gate && (
            <div>
              <span>{t('stage.gate')}</span>
              {flight.gate}
            </div>
          )}
          <div>
            <span>{t('pass.aircraft')}</span>
            {flight.aircraft_type}
          </div>
          {flight.seat && (
            <div>
              <span>{t('pass.seat')}</span>
              {flight.seat}
            </div>
          )}
        </div>
      </div>
      <div className="bp-stub">
        <QrBlock seed={flight.flight_number + flight.destination_code} />
        <div className="bp-stub-label">{t('pass.class')}</div>
      </div>
    </div>
  )

  if (!scanning) return ticket
  return (
    <div className="scan-frame">
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {ticket}
      <div className="scan-line" />
    </div>
  )
}
