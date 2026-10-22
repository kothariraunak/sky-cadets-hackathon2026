import { useCallback, useEffect, useMemo, useState } from 'react'
import en from './locales/en.json'
import { getLanguage, saveLanguage } from './languages'
import { I18nContext } from './context'

const loaders = import.meta.glob('./locales/*.json', { import: 'default' })

function interpolate(text, vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : text
}

export default function I18nProvider({ children }) {
  const [lang] = useState(getLanguage)
  const [dict, setDict] = useState(lang === 'en' ? en : null)

  useEffect(() => {
    document.documentElement.lang = lang
    if (lang === 'en') return
    let live = true
    loaders[`./locales/${lang}.json`]?.().then((d) => live && setDict(d)).catch(() => live && setDict(en))
    return () => {
      live = false
    }
  }, [lang])

  // t(key, { name: 'Kai', count: 2 }) — falls back to English, then to the key. `_one` variants for count === 1.
  const t = useCallback(
    (key, vars) => {
      const d = dict || en
      const k = vars?.count === 1 && (d[`${key}_one`] || en[`${key}_one`]) ? `${key}_one` : key
      return interpolate(d[k] ?? en[k] ?? key, vars)
    },
    [dict]
  )

  // Switching language reloads the app so game content also comes back from the server in the new language.
  const setLanguage = useCallback((code) => {
    if (code === lang) return
    saveLanguage(code)
    window.location.reload()
  }, [lang])

  const value = useMemo(() => ({ lang, t, setLanguage }), [lang, t, setLanguage])
  if (!dict) return null
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
