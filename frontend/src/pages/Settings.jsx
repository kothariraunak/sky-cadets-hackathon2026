import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Cadet from '../components/art/Cadet'
import LanguagePicker from '../components/LanguagePicker'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { AGE_BANDS, AVATARS, INTERESTS, STAGES, TEXT_SIZES } from '../game/config'
import { useI18n } from '../i18n/context'

// A simple "grown-up check" before the parent zone, as many children's apps do.
function ParentGate({ onPass }) {
  const { t } = useI18n()
  const [[a, b]] = useState(() => [6 + Math.floor(Math.random() * 4), 4 + Math.floor(Math.random() * 5)])
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  return (
    <form className="parent-gate" onSubmit={(e) => { e.preventDefault(); if (Number(answer) === a * b) onPass(); else setWrong(true) }}>
      <p>{t('settings.gate', { a, b })}</p>
      <div className="gate-row">
        <input className="field" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label={t('settings.answer')} />
        <button className="btn btn-primary">{t('settings.open')}</button>
      </div>
      {wrong && <p className="error-text">{t('settings.gateWrong')}</p>}
    </form>
  )
}

// For testers and demos: pretend the current flight is at a stage instead of waiting for the real clock.
function DemoStage() {
  const { t } = useI18n()
  const { flight, setDemoStage } = useGame()
  const [busy, setBusy] = useState(false)
  if (!flight) return <p className="muted">{t('settings.demoNoFlight')}</p>
  const pick = async (key) => {
    setBusy(true)
    try {
      await setDemoStage(key)
    } finally {
      setBusy(false)
    }
  }
  const current = flight.stage_override || 'auto'
  return (
    <div className="demo-stage">
      <b>🧪 {t('settings.demoStage', { flight: flight.flight_number })}</b>
      <small className="muted">{t('settings.demoStageHint')}</small>
      <div className="chip-row">
        <button className={'chip' + (current === 'auto' ? ' on' : '')} onClick={() => pick('auto')} disabled={busy}>🕰️ {t('settings.demoAuto')}</button>
        {STAGES.map((s) => (
          <button key={s.key} className={'chip' + (current === s.key ? ' on' : '')} onClick={() => pick(s.key)} disabled={busy}>{s.icon} {t(`stage.${s.key}`)}</button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, hint, on, onChange }) {
  return (
    <button type="button" className={'toggle-row' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span><b>{label}</b><small>{hint}</small></span>
      <span className="toggle"><i /></span>
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { cadet, updateMe, logout } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState(cadet.cadet_name)
  const [saved, setSaved] = useState('')
  const [parentOpen, setParentOpen] = useState(false)
  const settings = cadet.settings || {}
  const scale = settings.text_scale || 1
  const tracks = cadet.interests || []

  const save = async (patch, msg = t('settings.saved')) => {
    await updateMe(patch)
    setSaved(msg)
    setTimeout(() => setSaved(''), 1500)
  }
  const toggleTrack = (v) => {
    const next = tracks.includes(v) ? tracks.filter((x) => x !== v) : [...tracks, v].slice(-2)
    if (next.length) save({ interests: next }, t('settings.tracksSaved'))
  }

  return (
    <div className="settings-page">
      <div className="section-head"><h1>{t('settings.title')}</h1>{saved && <span className="saved-chip">✓ {saved}</span>}</div>

      <section className="panel settings-block">
        <h2>{t('settings.language')}</h2>
        <LanguagePicker className="wide" />
      </section>

      <section className="panel settings-block">
        <h2>{t('settings.textSize')}</h2>
        <div className="size-row" role="radiogroup" aria-label={t('settings.textSize')}>
          {TEXT_SIZES.map((s) => (
            <button key={s.value} role="radio" aria-checked={scale === s.value} className={'size-opt' + (scale === s.value ? ' on' : '')}
              onClick={() => save({ settings: { text_scale: s.value } }, t('settings.textSaved'))} style={{ fontSize: 16 * s.value }}>
              <span>Aa</span><small>{t(s.key)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-block">
        <h2>{t('settings.myCadet')}</h2>
        <div className="avatar-pick small">
          {AVATARS.map((a) => (
            <button key={a.value} className={'avatar-card' + (cadet.avatar === a.value ? ' on' : '')} onClick={() => save({ avatar: a.value })}>
              <Cadet avatar={a.value} size={80} /><b>{t(a.labelKey)}</b>
            </button>
          ))}
        </div>
        <form className="gate-row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save({ cadet_name: name.trim() }, t('settings.nameSaved')) }}>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label={t('onboarding.name')} />
          <button className="btn btn-ghost">{t('common.save')}</button>
        </form>
      </section>

      <section className="panel settings-block">
        <h2>{t('settings.ageGroup')}</h2>
        <p className="muted">{t('settings.ageNote')}</p>
        <div className="band-grid">
          {AGE_BANDS.map((b) => (
            <button key={b.value} className={'pick tall' + (cadet.age_band === b.value ? ' on' : '')} onClick={() => save({ age_band: b.value }, t('settings.ageSaved'))}>
              <b>{t(`band.${b.value}`)}</b><small>{t('settings.ages', { ages: b.ages })}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-block">
        <h2>{t('settings.tracks')} <small className="muted">{t('settings.upToTwo')}</small></h2>
        <p className="muted">{t('settings.tracksNote')}</p>
        <div className="pick-grid three">
          {INTERESTS.map((i) => (
            <button key={i.value} className={'pick tall' + (tracks.includes(i.value) ? ' on' : '')} onClick={() => toggleTrack(i.value)} aria-pressed={tracks.includes(i.value)}>
              <span className="pick-emoji">{i.emoji}</span>{t(`track.${i.value}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-block">
        <h2>👨‍👩‍👧 {t('settings.parentZone')}</h2>
        {!parentOpen ? (
          <ParentGate onPass={() => setParentOpen(true)} />
        ) : (
          <div className="parent-body">
            <Toggle label={t('settings.allowContest')} hint={t('settings.allowContestHint')}
              on={Boolean(settings.parent_contest)} onChange={(v) => save({ settings: { parent_contest: v } })} />
            <Toggle label={t('settings.allowSharing')} hint={t('settings.allowSharingHint')}
              on={Boolean(settings.parent_sharing)} onChange={(v) => save({ settings: { parent_sharing: v } })} />
            <DemoStage />
            <p><span className="muted">{t('settings.account')}</span><br />{cadet.email}</p>
            <p className="muted small-note">{t('settings.privacyNote')}</p>
            <button className="btn btn-danger" onClick={() => { logout(); navigate('/') }}>{t('common.logout')}</button>
          </div>
        )}
      </section>

      <Link to="/map" className="btn btn-ghost btn-wide">← {t('settings.back')}</Link>
    </div>
  )
}
