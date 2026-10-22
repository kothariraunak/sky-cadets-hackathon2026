import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import client from '../api/client'
import { AFTER_LANDING, CURRENT_FLIGHT_KEY, PHASES } from '../game/config'
import { useI18n } from '../i18n/context'
import { useAuth } from './AuthContext'

const GameContext = createContext(null)

const IN_PROGRESS = ['active', 'landed']
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage unavailable */
    }
  },
}

export function GameProvider({ children }) {
  const { cadet, setCadet } = useAuth()
  const { t } = useI18n()
  const cadetRef = useRef(cadet)
  useEffect(() => {
    cadetRef.current = cadet
  }, [cadet])

  const [baseLoading, setBaseLoading] = useState(true)
  const [flights, setFlights] = useState([])
  const [missions, setMissions] = useState([])
  const [progress, setProgress] = useState([])
  const [progressFlightId, setProgressFlightId] = useState(undefined)
  const [arcade, setArcade] = useState({ activities: [], generated: [], ai_enabled: false, ai_topics: [] })
  const [badges, setBadges] = useState([])
  const [stamps, setStamps] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedId, setSelectedId] = useState(() => Number(store.get(CURRENT_FLIGHT_KEY)) || null)
  const [celebrations, setCelebrations] = useState([])

  // The journey on screen: the one the cadet resumed, else the most recent in progress.
  const flight = useMemo(() => {
    const open = flights.filter((f) => IN_PROGRESS.includes(f.status))
    return open.find((f) => f.id === selectedId) || open[0] || null
  }, [flights, selectedId])

  const loadCollection = useCallback(async () => {
    const [b, s, st, a] = await Promise.all([
      client.get('/badge-progress/'), client.get('/passport/'), client.get('/stats/'), client.get('/activities/'),
    ])
    setBadges(b.data)
    setStamps(s.data)
    setStats(st.data)
    setArcade(a.data)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [f, m] = await Promise.all([client.get('/flights/'), client.get('/missions/')])
      await loadCollection()
      if (cancelled) return
      setFlights(f.data)
      setMissions(m.data)
      setBaseLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadCollection])

  const loadProgress = useCallback(async (flightId) => {
    const data = flightId ? (await client.get('/mission-progress/', { params: { flight: flightId } })).data : []
    setProgress(data)
    setProgressFlightId(flightId ?? null)
  }, [])

  useEffect(() => {
    if (!baseLoading) loadProgress(flight?.id)
  }, [baseLoading, flight?.id, loadProgress])

  const loading = baseLoading || progressFlightId !== (flight?.id ?? null)

  // Follow the live flight status (HKIA departure time, gate, estimated landing) while a journey is open.
  // The server refreshes from the airport at most every 5 minutes; we ask every 2.
  const flightId = flight?.id
  useEffect(() => {
    if (!flightId) return
    let live = true
    const poll = () =>
      client.get(`/flights/${flightId}/live/`)
        .then(({ data }) => live && setFlights((prev) => prev.map((f) => (f.id === data.id ? data : f))))
        .catch(() => {})
    poll()
    const timer = setInterval(poll, 2 * 60 * 1000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [flightId])
  const stage = flight?.stage || null

  const selectFlight = (id) => {
    setSelectedId(id)
    store.set(CURRENT_FLIGHT_KEY, String(id))
  }

  // ---------- Rewards ----------
  const badgeItem = (b) => ({
    kind: 'badge',
    tier: b.tier,
    title: b.tier > 1 ? t('reward.tierBadge', { tier: b.tier_name }) : t('reward.newBadge'),
    subtitle: b.name,
    icon: b.icon,
    message: b.tier > 1 ? t('reward.upgraded', { badge: b.name, tier: b.tier_name }) : b.description,
  })

  // Applies the cadet returned by the server, works out stars gained / rank-ups, and queues ONE celebration
  // per achievement: badges earned or upgraded along the way are listed inside it, not shown as extra pop-ups.
  const reward = useCallback(
    (data, items = []) => {
      const next = data.cadet || data
      const prev = cadetRef.current
      const starsGained = prev ? Math.max(0, next.stars - prev.stars) : 0
      const rankUp = prev && next.level > prev.level ? { from: prev.rank_title, to: next.rank_title } : null
      setCadet(next)
      const badges = (data.new_badges || []).map((b) => ({ icon: b.icon, name: b.name, tier: b.tier, tier_name: b.tier_name }))
      let main = items[0]
      if (!main && data.new_badges?.length) main = badgeItem(data.new_badges[0])
      if (!main && rankUp) main = { kind: 'rank', title: t('reward.rankUp'), subtitle: t('reward.youAreNow', { rank: rankUp.to }), icon: '🎖️' }
      if (main) {
        const alsoEarned = main.kind === 'badge' ? badges.slice(1) : badges
        setCelebrations((q) => [...q, { ...main, stars: starsGained, rankUp, badges: alsoEarned, id: Math.random() }])
      }
      if (data.new_badges?.length || items.length) loadCollection()
    },
    [setCadet, loadCollection, t] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const dismissCelebration = () => setCelebrations((q) => q.slice(1))

  // ---------- Missions ----------
  const progressFor = useCallback((missionId) => progress.find((p) => p.mission.id === missionId), [progress])
  const missionsIn = useCallback(
    (phaseKey) =>
      missions.filter((m) => m.phase === phaseKey && (!m.track || (cadet?.interests || []).includes(m.track))),
    [missions, cadet?.interests]
  )
  const phaseStats = useCallback(
    (phaseKey) => {
      const list = missionsIn(phaseKey)
      const done = list.filter((m) => progressFor(m.id)?.completed).length
      return { done, total: list.length, complete: list.length > 0 && done === list.length }
    },
    [missionsIn, progressFor]
  )
  const landed = Boolean(flight) && ['landed', 'completed'].includes(flight.status)
  const isUnlocked = useCallback(
    (phaseKey) => Boolean(flight) && (!AFTER_LANDING.includes(phaseKey) || landed),
    [flight, landed]
  )
  const currentPhase = useMemo(() => {
    const open = PHASES.filter((p) => isUnlocked(p.key))
    if (!open.length) return PHASES[0].key
    return (open.find((p) => !phaseStats(p.key).complete) || open[open.length - 1]).key
  }, [isUnlocked, phaseStats])
  const nextMission = useMemo(
    () => missionsIn(currentPhase).find((m) => !progressFor(m.id)?.completed) || null,
    [currentPhase, missionsIn, progressFor]
  )

  const setProgressRow = (row) => setProgress((prev) => [...prev.filter((p) => p.mission.id !== row.mission.id), row])

  const advanceMission = async (mission) => {
    if (!flight) return null
    const { data } = await client.post('/mission-progress/advance/', { mission: mission.id, flight: flight.id })
    setProgressRow(data.progress)
    if (data.progress.completed) {
      reward(data, [{ kind: 'mission', title: t('reward.missionComplete'), subtitle: mission.title, icon: mission.icon, message: t('reward.greatJob') }])
    }
    return data.progress
  }

  const completeActivity = async (activity, { score = 0, total = 0, data: payload = {}, missionId } = {}) => {
    const { data } = await client.post(`/activities/${activity.slug}/complete/`, {
      flight: flight?.id, mission: missionId, score, total, data: payload,
    })
    if (data.progress) setProgressRow(data.progress)
    const mission = missionId && missions.find((m) => String(m.id) === String(missionId))
    reward(data, [{
      kind: 'mission',
      title: mission ? t('reward.missionComplete') : t('reward.activityComplete'),
      subtitle: mission ? mission.title : activity.title,
      icon: activity.icon,
      message: total ? t('reward.score', { score, total }) : t('reward.greatWork'),
    }])
    return data
  }

  // ---------- Journeys ----------
  const replaceFlight = (next) => setFlights((prev) => [next, ...prev.filter((f) => f.id !== next.id)])

  const scanFlight = async ({ flight_number, seat, day }) => {
    const { data } = await client.post('/flights/scan/', { flight_number, seat, day })
    replaceFlight(data.flight)
    selectFlight(data.flight.id)
    reward(data, [{
      kind: 'checkin', title: t('reward.checkedIn'), icon: '🎫',
      subtitle: `${data.flight.flight_number} · ${data.flight.origin_code} → ${data.flight.destination_code}`,
      message: t('reward.checkedInMsg'),
    }])
    return data.flight
  }

  const checkIn = async (f) => {
    const { data } = await client.post(`/flights/${f.id}/start_journey/`)
    replaceFlight(data.flight)
    selectFlight(data.flight.id)
    reward(data)
  }

  const land = async () => {
    const { data } = await client.post(`/flights/${flight.id}/land/`)
    replaceFlight(data.flight)
    await loadProgress(data.flight.id)
    reward(data, [{
      kind: 'stamp', title: t('reward.touchdown'), icon: data.stamp?.flag || '🛬', subtitle: t('reward.welcomeTo', { city: data.flight.destination_name }),
      message: data.stamp ? t('reward.stampMsg') : t('reward.discoveryUnlocked'),
    }])
  }

  const completeJourney = async () => {
    const { data } = await client.post(`/flights/${flight.id}/complete/`)
    replaceFlight(data.flight)
    reward(data, [{
      kind: 'journey', title: t('reward.journeyComplete'), icon: '🏆', subtitle: `${data.flight.flight_number} · ${data.flight.destination_name}`,
      message: t('reward.journeyMsg'),
    }])
  }

  const leaveFlight = async (f) => {
    const { data } = await client.post(`/flights/${f.id}/leave/`)
    replaceFlight(data)
  }

  // Demo tool (parent zone): pretend the journey is at a stage, or 'auto' to follow the real clock.
  const setDemoStage = async (key) => {
    if (!flight) return
    const { data } = await client.post(`/flights/${flight.id}/stage/`, { stage: key })
    replaceFlight(data)
  }

  const value = {
    loading, flight, flights, missions, progress, arcade, badges, stamps, stats, stage,
    progressFor, missionsIn, phaseStats, isUnlocked, currentPhase, nextMission, landed,
    selectFlight, scanFlight, checkIn, land, completeJourney, leaveFlight, setDemoStage, advanceMission, completeActivity,
    reward, celebrations, dismissCelebration, reloadCollection: loadCollection,
  }
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  return useContext(GameContext)
}
