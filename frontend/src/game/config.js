import { getLanguage } from '../i18n/languages'

// Session flag set after onboarding so the Mission Map can show its welcome once.
export const NEW_CADET_KEY = 'sc_new_cadet'
// The journey the cadet chose to resume (several can be in progress).
export const CURRENT_FLIGHT_KEY = 'sc_current_flight'
// Text size is remembered on the device too, so the login screen uses it.
export const TEXT_SCALE_KEY = 'sc_text_scale'

// Labels live in the translation files: phase.<key>, phase.<key>.blurb, phase.<key>.when
export const PHASES = [
  { key: 'mission_prep', icon: '🎒' },
  { key: 'airport_explorer', icon: '🗼' },
  { key: 'flight_academy', icon: '✈️' },
  { key: 'destination_discovery', icon: '🗺️' },
  { key: 'journey_home', icon: '🏡' },
]
export const phaseByKey = (key) => PHASES.find((p) => p.key === key)
// Destination chapters open once the flight has landed.
export const AFTER_LANDING = ['destination_discovery', 'journey_home']

// Where the cadet is on the journey, worked out by the server from HKIA's live departure time and the
// estimated landing: at the airport from 2 h before departure, on board from 30 min before.
// Labels: stage.<key>, stage.<key>.note. `phase` is the chapter whose games are featured right now.
export const STAGES = [
  { key: 'getting_ready', icon: '🎒', phase: 'mission_prep', journal: 'pre_flight' },
  { key: 'at_airport', icon: '🛄', phase: 'airport_explorer', journal: 'pre_flight' },
  { key: 'on_board', icon: '✈️', phase: 'flight_academy', journal: 'in_flight' },
  { key: 'landed', icon: '🛬', phase: 'destination_discovery', journal: 'post_flight' },
]
export const stageByKey = (key) => STAGES.find((s) => s.key === key)
// Journal sections, in journey order. Labels: journalStage.<key>
export const JOURNAL_STAGES = [
  { key: 'pre_flight', icon: '🧳' },
  { key: 'in_flight', icon: '☁️' },
  { key: 'post_flight', icon: '🗺️' },
]

export const AVATARS = [
  { value: 'boy_pilot', labelKey: 'avatar.boy' },
  { value: 'girl_pilot', labelKey: 'avatar.girl' },
]

export const INTERESTS = [
  { value: 'pilot', emoji: '🧑‍✈️' },
  { value: 'engineer', emoji: '🔧' },
  { value: 'cabin_crew', emoji: '🛎️' },
  { value: 'airport_ops', emoji: '🗼' },
  { value: 'meteorologist', emoji: '🌦️' },
  { value: 'photographer', emoji: '📸' },
]
export const tracksTitle = (list = [], t) =>
  list.length ? t('tracks.future', { tracks: list.map((v) => t(`track.${v}`)).join(' & ') }) : t('tracks.none')

export const AGE_BANDS = [
  { value: 'junior', ages: '5–8' },
  { value: 'explorer', ages: '9–12' },
  { value: 'senior', ages: '13–17' },
]
export const bandForAge = (age) => (age <= 8 ? 'junior' : age <= 12 ? 'explorer' : 'senior')

export const TIER_COLORS = ['locked', 'bronze', 'silver', 'gold']

export const TEXT_SIZES = [
  { value: 0.9, key: 'textSize.small' },
  { value: 1, key: 'textSize.normal' },
  { value: 1.15, key: 'textSize.large' },
  { value: 1.3, key: 'textSize.xl' },
]

// Values are sent to the server in English; labels come from contest.<index>.
export const CONTEST_CATEGORIES = ['Most Creative', 'Best Aviation Observation', 'Best Cultural Discovery', 'Best Sustainability Story', 'Best Drawing']

// Values match the server's activity categories; labels come from category.<value>.
export const ARCADE_CATEGORIES = ['All', 'Airport', 'Aviation', 'Geography', 'Culture', 'Creative', 'Sustainability']

export const formatMiles = (n) => Number(n || 0).toLocaleString(getLanguage())
export const formatDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(d).toLocaleDateString(getLanguage(), opts)
// Flight times are shown in the airport's own time zone, like on the departure boards.
export const formatTime = (d, timeZone) =>
  new Date(d).toLocaleTimeString(getLanguage(), { hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) })
// "2 h 15 min" style durations; `t` provides the units.
export const formatDuration = (minutes, t) => {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  return h ? t('units.hMin', { h, m: m % 60 }) : t('units.min', { m })
}
