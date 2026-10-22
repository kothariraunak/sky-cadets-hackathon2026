import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { CONTEST_CATEGORIES, JOURNAL_STAGES, formatDate, formatDuration, formatTime, stageByKey } from '../game/config'
import { useI18n } from '../i18n/context'
import { photoUrl, resizeImage, saveJournalEntry } from '../utils/media'

function Photo({ path, alt }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let live = true
    photoUrl(path).then((u) => live && setSrc(u)).catch(() => {})
    return () => {
      live = false
    }
  }, [path])
  return src ? <img src={src} alt={alt} /> : <span className="photo-loading">📷</span>
}

const KIND_ICON = { photo: '📸', drawing: '🎨', story: '📖', note: '📝', meal: '🍽️', mood: '💭' }
const TYPES = [
  { key: 'photo', icon: '📸' },
  { key: 'story', icon: '✏️' },
  { key: 'meal', icon: '🍽️' },
  { key: 'mood', icon: '😊' },
]
const MOODS = ['😄', '🤩', '😮', '🥹', '😴', '🤔', '😬']
const PROMPTS_PER_STAGE = 5
// A mission's focus decides which kind of entry it needs.
const FOCUS_TYPE = { photo: 'photo', meal: 'meal', contest: 'story' }

// "At the airport · Gate 63 · 1 h 40 min before take-off" — where the cadet was when they wrote it.
function contextLine(ctx, t) {
  if (!ctx?.journey_stage) return ''
  const parts = [t(`stage.${ctx.journey_stage}`)]
  if (ctx.gate) parts.push(`${t('stage.gate')} ${ctx.gate}`)
  if (ctx.minutes_to_departure > 0) parts.push(t('journal.ctx.beforeTakeoff', { time: formatDuration(ctx.minutes_to_departure, t) }))
  if (ctx.journey_stage === 'on_board') {
    if (ctx.altitude_ft) parts.push(t('journal.ctx.altitude', { ft: ctx.altitude_ft.toLocaleString() }))
    if (ctx.minutes_to_landing > 0) parts.push(t('journal.ctx.toLanding', { time: formatDuration(ctx.minutes_to_landing, t) }))
  }
  if (ctx.city) parts.push(t('journal.ctx.inCity', { city: ctx.city }))
  return parts.join(' · ')
}

function StageBanner({ flight, stage }) {
  const { t } = useI18n()
  if (!flight || !stage) {
    return (
      <div className="journal-stage none">
        <span className="js-icon">📔</span>
        <div><b>{t('journal.everyday')}</b><small>{t('journal.everydayNote')}</small></div>
      </div>
    )
  }
  const s = stageByKey(stage)
  const minsTo = (iso) => (new Date(iso).getTime() - Date.now()) / 60000
  let detail = ''
  if (stage === 'getting_ready' || stage === 'at_airport') {
    detail = t('journal.ctx.beforeTakeoff', { time: formatDuration(minsTo(flight.departure_at), t) })
    if (flight.gate) detail = `${t('stage.gate')} ${flight.gate} · ${detail}`
  } else if (stage === 'on_board') {
    detail = flight.arrival_at && minsTo(flight.arrival_at) > 0
      ? t('journal.ctx.toLandingIn', { time: formatDuration(minsTo(flight.arrival_at), t), city: flight.destination_name })
      : t('journal.ctx.altitude', { ft: flight.cruising_altitude_ft.toLocaleString() })
  } else {
    detail = t('journal.ctx.inCity', { city: flight.destination_name })
  }
  return (
    <div className={'journal-stage ' + s.journal}>
      <span className="js-icon">{s.icon}</span>
      <div>
        <div className="eyebrow">{t(`journalStage.${s.journal}`)} · {t('journal.autoDetected')}</div>
        <b>{t(`stage.${stage}`)}</b>
        <small>{flight.flight_number} · {flight.origin_code} → {flight.destination_code} · {detail}</small>
      </div>
    </div>
  )
}

function EntryCard({ entry, onDelete }) {
  const { t } = useI18n()
  const [confirm, setConfirm] = useState(false)
  const ctx = contextLine(entry.context, t)
  return (
    <article className={'memory-card kind-' + entry.kind + (entry.photo_url ? ' with-photo' : '')}>
      {entry.photo_url && (
        <div className="memory-photo"><Photo path={entry.photo_url} alt={entry.photo_caption || t('journal.photoAlt')} /></div>
      )}
      <div className="memory-body">
        <div className="memory-top">
          <span className="memory-kind">{KIND_ICON[entry.kind] || entry.photo_emoji}</span>
          <span className="memory-time">{formatDate(entry.created_at, { day: 'numeric', month: 'short' })} · {formatTime(entry.created_at)}</span>
          {entry.mood && <span className="memory-mood" title={t('journal.mood')}>{entry.mood}</span>}
        </div>
        {entry.photo_caption && <b className="memory-title">{entry.photo_caption}</b>}
        {entry.prompt && <q className="memory-prompt">{entry.prompt}</q>}
        {entry.note && <p className="memory-note">{entry.note}</p>}
        {entry.meal_description && (
          <span className="memory-meal">🍽️ {entry.meal_description} {entry.meal_rating ? <i className="gold-text">{'★'.repeat(entry.meal_rating)}</i> : null}</span>
        )}
        {entry.contest_category && <span className="contest-chip">🏆 {t(`contest.${CONTEST_CATEGORIES.indexOf(entry.contest_category)}`)}</span>}
        {ctx && <small className="memory-context">📍 {ctx}</small>}
      </div>
      {confirm ? (
        <div className="delete-row">
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(entry)}>{t('journal.delete')}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>{t('journal.keep')}</button>
        </div>
      ) : (
        <button className="delete-x" onClick={() => setConfirm(true)} aria-label={t('journal.deleteMemory')}>🗑</button>
      )}
    </article>
  )
}

export default function Journal() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { cadet } = useAuth()
  const { flight, flights, missions, stage, advanceMission } = useGame()
  const { t } = useI18n()
  const missionId = params.get('mission')
  const focus = params.get('focus') || 'photo'
  const mission = missions.find((m) => String(m.id) === missionId)
  const viewFlightId = params.get('flight')

  const cameraRef = useRef(null)
  const libraryRef = useRef(null)
  const [type, setType] = useState(mission ? FOCUS_TYPE[focus] || 'photo' : 'photo')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [meal, setMeal] = useState('')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [mood, setMood] = useState('')
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState([])
  const [tripFilter, setTripFilter] = useState(viewFlightId || 'all')
  const contestAllowed = Boolean(cadet.settings?.parent_contest)

  useEffect(() => {
    client.get('/journal/').then(({ data }) => setEntries(data))
  }, [])

  const journalStage = stageByKey(stage)?.journal || ''
  const prompts = journalStage
    ? Array.from({ length: PROMPTS_PER_STAGE }, (_, i) => t(`journalPrompt.${journalStage}.${i}`))
    : Array.from({ length: 3 }, (_, i) => t(`journalPrompt.everyday.${i}`))

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const blob = await resizeImage(file)
      setImage(blob)
      setPreview(URL.createObjectURL(blob))
    } catch {
      setError(t('journal.readError'))
    }
  }

  const missionReady = focus === 'meal' ? Boolean(meal.trim() && rating) : focus === 'contest' ? Boolean((image || note.trim()) && category) : Boolean(image)
  const typeReady = { photo: Boolean(image), story: Boolean(note.trim()), meal: Boolean(meal.trim()), mood: Boolean(mood) }[type]
  const canSave = mission ? missionReady : typeReady

  const reset = () => {
    setImage(null)
    setPreview(null)
    setCaption('')
    setMeal('')
    setRating(0)
    setNote('')
    setMood('')
    setPrompt('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const entry = await saveJournalEntry({
        flight: flight?.id, kind: image && type !== 'meal' ? 'photo' : type, photo_caption: caption,
        meal_description: type === 'meal' ? meal : '', meal_rating: type === 'meal' && rating ? rating : '', note, mood, prompt,
        contest_category: focus === 'contest' ? category : '',
      }, image)
      setEntries((prev) => [entry, ...prev])
      reset()
      if (mission) {
        await advanceMission(mission)
        navigate(`/missions/${mission.phase}`)
      }
    } catch (err) {
      setError(err.response?.data?.contest_category?.[0] || t('journal.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (entry) => {
    await client.delete(`/journal/${entry.id}/`)
    setEntries((prev) => prev.filter((x) => x.id !== entry.id))
  }

  // Memories grouped by trip, then by before / during / after the flight.
  const trips = useMemo(() => {
    const byFlight = new Map()
    entries.forEach((e) => {
      const key = e.flight ? String(e.flight) : 'none'
      if (!byFlight.has(key)) byFlight.set(key, [])
      byFlight.get(key).push(e)
    })
    return [...byFlight.entries()].map(([key, list]) => ({
      key,
      flight: flights.find((f) => String(f.id) === key) || null,
      list,
      sections: [...JOURNAL_STAGES, { key: '', icon: '📝' }]
        .map((s) => ({ ...s, list: list.filter((e) => (e.stage || '') === s.key) }))
        .filter((s) => s.list.length),
    }))
  }, [entries, flights])
  const filter = trips.some((trip) => trip.key === tripFilter) ? tripFilter : 'all'
  const shown = trips.filter((trip) => filter === 'all' || trip.key === filter)
  const count = (fn) => entries.filter(fn).length

  const showPhoto = type === 'photo' || type === 'meal' || focus === 'contest'
  const showNote = type !== 'meal' || !mission

  return (
    <div className="journal-page">
      <div className="section-head">
        <h1>{t('journal.title')}</h1>
        <span className="muted">{t('journal.subtitle')}</span>
      </div>

      <StageBanner flight={flight} stage={stage} />

      {mission && (
        <div className="mission-banner">
          <span>{mission.icon}</span>
          <div>
            <b>{t('journal.missionPrefix', { title: mission.title })}</b>
            <small>{t(`journal.focus.${focus}`)} · +{mission.stars_reward} ★</small>
          </div>
        </div>
      )}

      <form className="panel journal-composer rich" onSubmit={save}>
        {!mission && (
          <div className="type-tabs" role="tablist" aria-label={t('journal.newMemory')}>
            {TYPES.map((x) => (
              <button key={x.key} type="button" role="tab" aria-selected={type === x.key} className={'type-tab' + (type === x.key ? ' on' : '')} onClick={() => setType(x.key)}>
                <span>{x.icon}</span>{t(`journal.type.${x.key}`)}
              </button>
            ))}
          </div>
        )}

        <div className="composer-grid">
          {showPhoto && (
            <div className="polaroid">
              <div className={'polaroid-photo' + (preview ? ' has-photo' : '')}>
                {preview ? <img src={preview} alt={t('journal.newPhoto')} /> : <span>{type === 'meal' ? '🍽️' : '📷'}</span>}
              </div>
              <input className="polaroid-caption" placeholder={t('journal.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} />
              <div className="camera-row">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => cameraRef.current.click()}>📸 {t('journal.takePhoto')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => libraryRef.current.click()}>🖼️ {t('journal.choosePhoto')}</button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
                <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onFile} />
              </div>
              <p className="muted small-note">🔒 {t('journal.private')}</p>
            </div>
          )}

          <div className="composer-fields">
            {type === 'meal' && (
              <>
                <div className={'field-label' + (focus === 'meal' ? ' hl' : '')}>{t('journal.whatIAte')}</div>
                <input className="field" placeholder={t('journal.mealPlaceholder')} value={meal} onChange={(e) => setMeal(e.target.value)} maxLength={120} />
                <div className="star-picker" role="radiogroup" aria-label={t('journal.mealRating')}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={n === rating} aria-label={t('journal.stars', { count: n })}
                      className={'star' + (n <= rating ? ' on' : '')} onClick={() => setRating(n)}>★</button>
                  ))}
                </div>
              </>
            )}

            <div className={'field-label' + (type === 'mood' ? ' hl' : '')}>{type === 'mood' ? t('journal.howFeel') : t('journal.mood')}</div>
            <div className="emoji-picker" role="radiogroup" aria-label={t('journal.mood')}>
              {MOODS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mood === m} className={'emoji-opt' + (mood === m ? ' on' : '')} onClick={() => setMood(mood === m ? '' : m)}>{m}</button>
              ))}
            </div>

            {showNote && (
              <>
                <div className="field-label">{t('journal.promptIdeas')}</div>
                <div className="prompt-row">
                  {prompts.map((p) => (
                    <button key={p} type="button" className={'prompt-chip' + (prompt === p ? ' on' : '')} onClick={() => setPrompt(prompt === p ? '' : p)}>{p}</button>
                  ))}
                </div>
                {prompt && <q className="memory-prompt big">{prompt}</q>}
                <div className={'field-label' + (type === 'story' ? ' hl' : '')}>{focus === 'contest' ? t('journal.story') : t('journal.notes')}</div>
                <textarea className="field" placeholder={focus === 'contest' ? t('journal.storyPlaceholder') : prompt || t('journal.notesPlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
              </>
            )}

            {focus === 'contest' && (
              <>
                <div className="field-label hl">{t('journal.contestCategory')}</div>
                {!contestAllowed && <div className="safety-note">👨‍👩‍👧 {t('journal.parentNeeded')}</div>}
                <div className="pick-grid">
                  {CONTEST_CATEGORIES.map((c, i) => (
                    <button key={c} type="button" className={'pick' + (category === c ? ' on' : '')} onClick={() => setCategory(c)} disabled={!contestAllowed}>{t(`contest.${i}`)}</button>
                  ))}
                </div>
              </>
            )}

            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-wide" type="submit" disabled={saving || !canSave}>
              {saving ? t('common.saving') : t('play.saveJournal')} <span className="btn-arrow">➜</span>
            </button>
          </div>
        </div>
      </form>

      <div className="section-head">
        <h2>{t('journal.memories')}</h2>
      </div>
      <div className="stat-strip journal-stats">
        <div><b>{entries.length}</b><span>{t('journal.statMemories')}</span></div>
        <div><b>{count((e) => e.photo_url)}</b><span>{t('journal.statPhotos')}</span></div>
        <div><b>{count((e) => e.note)}</b><span>{t('journal.statStories')}</span></div>
        <div><b>{count((e) => e.meal_description)}</b><span>{t('journal.statMeals')}</span></div>
      </div>
      {trips.length > 1 && (
        <div className="chip-row">
          <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setTripFilter('all')}>{t('journal.allTrips')}</button>
          {trips.map((trip) => (
            <button key={trip.key} className={'chip' + (filter === trip.key ? ' on' : '')} onClick={() => setTripFilter(trip.key)}>
              {trip.flight ? `${trip.flight.flight_number} · ${trip.flight.destination_code}` : t('journal.everyday')}
            </button>
          ))}
        </div>
      )}
      {entries.length === 0 && <p className="muted">{t('journal.empty')}</p>}

      {shown.map((trip) => (
        <section key={trip.key} className="trip">
          <header className="trip-head">
            {trip.flight ? (
              <>
                <span className="trip-route"><b>{trip.flight.origin_code}</b> ✈ <b>{trip.flight.destination_code}</b></span>
                <span className="muted">{trip.flight.flight_number} · {formatDate(trip.flight.departure_at)} · {t('journal.memoriesCount', { count: trip.list.length })}</span>
              </>
            ) : (
              <span className="trip-route"><b>{t('journal.everyday')}</b></span>
            )}
          </header>
          <div className="timeline">
            {trip.sections.map((s) => (
              <div key={s.key || 'other'} className={'timeline-section ' + (s.key || 'other')}>
                <h3 className="timeline-label"><span>{s.icon}</span> {s.key ? t(`journalStage.${s.key}`) : t('journalStage.none')} <small>{s.list.length}</small></h3>
                <div className="memory-list">
                  {s.list.map((entry) => <EntryCard key={entry.id} entry={entry} onDelete={remove} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
