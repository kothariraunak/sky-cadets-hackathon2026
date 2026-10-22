import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Crest from '../components/art/Crest'
import BoardingPass from '../components/BoardingPass'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { formatDate, formatMiles, formatTime } from '../game/config'
import { useI18n } from '../i18n/context'
import { parseBoardingPass } from '../utils/bcbp'

const DEMO_PASS = { flight_number: 'CX251', seat: '32A' }

function Scanner({ onPass, onError }) {
  const videoRef = useRef(null)
  useEffect(() => {
    let controls
    let stopped = false
    ;(async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'), import('@zxing/library'),
        ])
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.AZTEC, BarcodeFormat.QR_CODE]]])
        const reader = new BrowserMultiFormatReader(hints)
        controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, (result) => {
          if (!result || stopped) return
          const pass = parseBoardingPass(result.getText())
          if (pass) {
            stopped = true
            controls?.stop()
            onPass(pass)
          }
        })
        if (stopped) controls.stop()
      } catch {
        onError('scan.cameraError')
      }
    })()
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onPass, onError])
  return (
    <div className="scan-frame camera">
      <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      <video ref={videoRef} muted playsInline />
      <div className="scan-line" />
    </div>
  )
}

export default function Scan() {
  const navigate = useNavigate()
  const { cadet } = useAuth()
  const { scanFlight } = useGame()
  const { t } = useI18n()
  const [mode, setMode] = useState('choose') // choose | camera | type | confirm
  const [number, setNumber] = useState('')
  const [seat, setSeat] = useState('')
  const [found, setFound] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const lookup = useCallback(async (pass) => {
    setError('')
    setBusy(true)
    try {
      const { data } = await client.get('/flights/lookup/', { params: { number: pass.flight_number, day: pass.day } })
      setFound({ ...data, seat: pass.seat || '', day: pass.day })
      setMode('confirm')
    } catch {
      setError(t('scan.notFound', { flight: pass.flight_number }))
      setMode('type')
    } finally {
      setBusy(false)
    }
  }, [t])
  const onCamError = useCallback((key) => {
    setError(t(key))
    setMode('type')
  }, [t])

  const checkIn = async () => {
    setBusy(true)
    try {
      await scanFlight({ flight_number: found.flight_number, seat: found.seat, day: found.day })
      navigate('/missions/mission_prep')
    } catch {
      setError(t('scan.checkInError'))
      setBusy(false)
    }
  }

  return (
    <div className="immersive">
      <header className="immersive-top">
        <button className="icon-btn" onClick={() => (mode === 'choose' ? navigate('/map') : setMode('choose'))} aria-label={t('common.back')}>←</button>
        <Crest size={110} />
        <span className="icon-spacer" />
      </header>

      <div className="scan-page">
        <h1 className="auth-title">{mode === 'confirm' ? t('scan.confirmTitle') : t('scan.title')}</h1>

        {mode === 'choose' && (
          <div className="scan-options">
            <button className="panel scan-option" onClick={() => setMode('camera')}>
              <span className="big-emoji">📷</span><b>{t('scan.camera')}</b><small>{t('scan.cameraNote')}</small>
            </button>
            <button className="panel scan-option" onClick={() => setMode('type')}>
              <span className="big-emoji">⌨️</span><b>{t('scan.type')}</b><small>{t('scan.typeNote')}</small>
            </button>
            <button className="panel scan-option demo" onClick={() => lookup(DEMO_PASS)} disabled={busy}>
              <span className="big-emoji">🎫</span><b>{t('scan.demo')}</b><small>{t('scan.demoNote')}</small>
            </button>
          </div>
        )}

        {mode === 'camera' && (
          <>
            <Scanner onPass={lookup} onError={onCamError} />
            <p className="muted center">{t('scan.hold')}</p>
          </>
        )}

        {mode === 'type' && (
          <form className="panel form-panel scan-type" onSubmit={(e) => { e.preventDefault(); lookup({ flight_number: number, seat }) }}>
            <label className="field-label" htmlFor="fn">{t('scan.flightNumber')}</label>
            <input id="fn" className="field" placeholder="CX251" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} required autoFocus />
            <label className="field-label" htmlFor="seat">{t('scan.seat')}</label>
            <input id="seat" className="field" placeholder="32A" value={seat} onChange={(e) => setSeat(e.target.value.toUpperCase())} maxLength={4} />
            <button className="btn btn-primary btn-wide" disabled={busy}>{t('scan.find')} <span className="btn-arrow">➜</span></button>
          </form>
        )}

        {mode === 'confirm' && found && (
          <div className="scan-confirm">
            <BoardingPass flight={found} cadetName={cadet.cadet_name} scanning />
            <div className="panel scan-live">
              <span className={'status-chip ' + (found.source === 'hkia' ? 'live' : 'muted')}>
                {found.source === 'hkia' ? `📡 ${t('scan.liveHkia')}` : `🗓️ ${t('scan.timetable')}`}
              </span>
              <span>
                {t('scan.departs', { date: formatDate(found.departure_at, { weekday: 'short', day: 'numeric', month: 'short', timeZone: found.origin_tz }), time: formatTime(found.departure_at, found.origin_tz) })}
                {found.gate && ` · ${t('stage.gate')} ${found.gate}`}
                {found.live_status && ` · ${found.live_status}`}
              </span>
            </div>
            <div className="panel scan-facts">
              <div><b>{found.aircraft_type}</b><span>{t('scan.todaysAircraft')}</span></div>
              <div><b>{formatMiles(found.distance_mi)} {t('units.mi')}</b><span>{t('scan.toFly')}</span></div>
              <div><b>{t('scan.hours', { n: found.duration_h })}</b><span>{t('scan.inAir')}</span></div>
            </div>
            <button className="btn btn-primary btn-wide btn-xl" onClick={checkIn} disabled={busy}>
              {busy ? t('scan.checkingIn') : t('scan.checkIn')} <span className="btn-arrow">➜</span>
            </button>
          </div>
        )}
        {error && <p className="error-text center">{error}</p>}
      </div>
    </div>
  )
}
