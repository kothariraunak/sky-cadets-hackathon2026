// Supported languages. `code` is sent to the server (X-Language) and used for number/date formatting.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '中文（普通话）' },
  { code: 'zh-HK', label: '廣東話（香港）' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'it', label: 'Italiano' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
]
export const LANG_KEY = 'sc_lang'
const CODES = LANGUAGES.map((l) => l.code)

// Best match for the browser's languages (Hong Kong / Macau / Taiwan Chinese -> Cantonese, other Chinese -> Mandarin).
export function detectLanguage() {
  const wanted = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || []
  for (const raw of wanted) {
    const code = String(raw)
    if (CODES.includes(code)) return code
    const lower = code.toLowerCase()
    if (lower.startsWith('zh')) return /hk|mo|tw|hant/.test(lower) ? 'zh-HK' : 'zh-Hans'
    if (lower.startsWith('yue')) return 'zh-HK'
    const base = lower.split('-')[0]
    if (CODES.includes(base)) return base
  }
  return 'en'
}

export function getLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && CODES.includes(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return detectLanguage()
}

export function saveLanguage(code) {
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    /* storage unavailable */
  }
}
