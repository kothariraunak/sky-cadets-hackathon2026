import { createContext, useContext } from 'react'

export const I18nContext = createContext({ lang: 'en', t: (k) => k, setLanguage: () => {} })
export const useI18n = () => useContext(I18nContext)
