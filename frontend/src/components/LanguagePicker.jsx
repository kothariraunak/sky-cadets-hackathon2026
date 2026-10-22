import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/context'
import { LANGUAGES } from '../i18n/languages'

// Compact language menu (native names), used on the login screen and in Settings.
export default function LanguagePicker({ className = '' }) {
  const { lang, setLanguage, t } = useI18n()
  const { cadet } = useAuth()
  const choose = async (code) => {
    // Remember it on the account too, so the cadet's other devices follow.
    if (cadet) await client.patch('/me/', { settings: { language: code } }).catch(() => {})
    setLanguage(code)
  }
  return (
    <label className={'lang-picker ' + className}>
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">{t('settings.language')}</span>
      <select value={lang} onChange={(e) => choose(e.target.value)} aria-label={t('settings.language')}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  )
}
