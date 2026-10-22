import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Cadet from '../components/art/Cadet'
import Crest from '../components/art/Crest'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/context'
import { AVATARS, INTERESTS, NEW_CADET_KEY, bandForAge } from '../game/config'

const STEPS = ['onboarding.step1', 'onboarding.step2', 'onboarding.step3']
const AGES = Array.from({ length: 13 }, (_, i) => i + 5)

// First login only: invite-only accounts are created without a cadet, so build one here.
export default function Onboarding() {
  const { cadet, loading, updateMe, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ cadet_name: '', avatar: 'boy_pilot', age: null, interests: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!cadet) return <Navigate to="/" replace />
  if (cadet.cadet_name) return <Navigate to="/map" replace />

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const toggleTrack = (v) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter((t) => t !== v) : [...f.interests, v].slice(-2),
    }))
  const band = form.age ? bandForAge(form.age) : null
  const canNext = step === 0 || (step === 1 && form.cadet_name.trim() && form.age) || (step === 2 && form.interests.length)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canNext) return
    if (step < 2) return setStep(step + 1)
    setError('')
    setBusy(true)
    try {
      try {
        sessionStorage.setItem(NEW_CADET_KEY, '1')
      } catch {
        /* storage unavailable — the welcome is optional */
      }
      await updateMe({ cadet_name: form.cadet_name.trim(), avatar: form.avatar, age_band: band, interests: form.interests })
      navigate('/map')
    } catch {
      setError(t('onboarding.error'))
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    if (step > 0) return setStep(step - 1)
    logout()
    navigate('/')
  }

  return (
    <div className="auth-screen">
      <header className="auth-top">
        <button className="icon-btn" type="button" onClick={back} aria-label={step > 0 ? t('common.back') : t('common.logout')}>←</button>
        <Crest size={120} />
        <span className="icon-spacer" />
      </header>

      <div className="step-dots" aria-label={t('onboarding.stepOf', { n: step + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}
      </div>
      <h1 className="auth-title">{t(STEPS[step])}</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        {step === 0 && (
          <div className="avatar-pick">
            {AVATARS.map((a) => (
              <button key={a.value} type="button" className={'avatar-card' + (form.avatar === a.value ? ' on' : '')}
                onClick={() => update('avatar', a.value)} aria-pressed={form.avatar === a.value}>
                <Cadet avatar={a.value} pose={form.avatar === a.value ? 'wave' : 'idle'} size={130} />
                <b>{t(a.labelKey)}</b>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="panel form-panel">
            <div className="name-row">
              <Cadet avatar={form.avatar} pose="thumbs" size={90} />
              <div className="name-field">
                <label className="field-label" htmlFor="cadet-name">{t('onboarding.name')}</label>
                <input id="cadet-name" className="field" placeholder={t('onboarding.namePlaceholder')} value={form.cadet_name}
                  onChange={(e) => update('cadet_name', e.target.value)} required maxLength={60} autoFocus />
              </div>
            </div>
            <div className="field-label">{t('onboarding.age')}</div>
            <div className="age-grid">
              {AGES.map((a) => (
                <button key={a} type="button" className={'age-chip' + (form.age === a ? ' on' : '')} onClick={() => update('age', a)}>{a}</button>
              ))}
            </div>
            {band && (
              <p className="band-note">
                {t('onboarding.bandNote', { band: t(`band.${band}`), blurb: t(`band.${band}.blurb`) })}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="panel form-panel">
            <p className="muted">{t('onboarding.tracksNote')}</p>
            <div className="pick-grid three">
              {INTERESTS.map((i) => (
                <button key={i.value} type="button" className={'pick tall' + (form.interests.includes(i.value) ? ' on' : '')}
                  onClick={() => toggleTrack(i.value)} aria-pressed={form.interests.includes(i.value)}>
                  <span className="pick-emoji">{i.emoji}</span>{t(`track.${i.value}`)}
                </button>
              ))}
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
        )}

        <button className="btn btn-primary btn-wide" type="submit" disabled={busy || !canNext}>
          {step < 2 ? t('common.next') : busy ? t('onboarding.creating') : t('onboarding.create')} <span className="btn-arrow">➜</span>
        </button>
      </form>
    </div>
  )
}
