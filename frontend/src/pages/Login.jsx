import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cadet from '../components/art/Cadet'
import Crest from '../components/art/Crest'
import LanguagePicker from '../components/LanguagePicker'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/context'

// The login wall: the only screen visitors see until they sign in. Accounts are invite-only.
export default function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim().toLowerCase(), password)
      navigate('/map')
    } catch {
      setError(t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="welcome">
      <header className="welcome-top">
        <span className="icon-spacer" />
        <Crest size={180} />
        <LanguagePicker />
      </header>

      <h1 className="welcome-title">
        {t('login.title')}
      </h1>

      <div className="welcome-stage">
        <Cadet avatar="boy_pilot" pose="thumbs" size={230} className="welcome-cadet left" />
        <form className="welcome-center login-panel panel" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="login-email">{t('login.email')}</label>
          <input id="login-email" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <label className="field-label" htmlFor="login-pass">{t('login.password')}</label>
          <input id="login-pass" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>
            {busy ? t('login.boarding') : t('login.start')} <span className="btn-arrow">➜</span>
          </button>
          <p className="muted login-note">{t('login.note')}</p>
        </form>
        <Cadet avatar="girl_pilot" pose="wave" size={230} className="welcome-cadet right" />
      </div>
    </div>
  )
}
