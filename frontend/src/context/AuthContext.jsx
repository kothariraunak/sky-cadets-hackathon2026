import { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'
import { TEXT_SCALE_KEY } from '../game/config'
import { getLanguage, saveLanguage } from '../i18n/languages'
import { applyTextScale } from '../utils/textScale'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [cadet, setCadet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const scale = cadet?.settings?.text_scale
    if (!scale) return
    applyTextScale(scale)
    try {
      localStorage.setItem(TEXT_SCALE_KEY, String(scale))
    } catch {
      /* storage unavailable */
    }
  }, [cadet?.settings?.text_scale])

  const refreshMe = async () => {
    try {
      const { data } = await client.get('/me/')
      // The account's language wins over this device's, so a cadet sees the same language everywhere.
      const accountLang = data.settings?.language
      if (accountLang && accountLang !== getLanguage()) {
        saveLanguage(accountLang)
        window.location.reload()
        return
      }
      setCadet(data)
    } catch {
      setCadet(null)
    }
  }

  useEffect(() => {
    const access = localStorage.getItem('sc_access')
    if (access) {
      refreshMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Onboarding: invite-only accounts start without a cadet name/avatar.
  const updateMe = async (payload) => {
    const { data } = await client.patch('/me/', payload)
    setCadet(data)
    return data
  }

  const login = async (email, password) => {
    const { data } = await client.post('/auth/login/', { username: email, password })
    localStorage.setItem('sc_access', data.access)
    localStorage.setItem('sc_refresh', data.refresh)
    await refreshMe()
  }

  const logout = () => {
    localStorage.removeItem('sc_access')
    localStorage.removeItem('sc_refresh')
    setCadet(null)
  }

  return (
    <AuthContext.Provider value={{ cadet, setCadet, loading, login, logout, refreshMe, updateMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
