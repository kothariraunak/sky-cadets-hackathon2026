import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import ActivityPlayer from '../components/ActivityPlayer'
import Crest from '../components/art/Crest'
import { LoadingScreen } from '../components/AppLayout'
import { useGame } from '../context/GameContext'
import { useI18n } from '../i18n/context'

// Full-screen game (no tab bar), launched from a mission or from the Academy.
export default function Play() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { flight, missions } = useGame()
  const { t } = useI18n()
  const missionId = params.get('mission')
  const mission = missions.find((m) => String(m.id) === missionId)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    client
      .get(`/activities/${slug}/`, { params: flight ? { flight: flight.id } : {} })
      .then(({ data }) => live && setActivity(data))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [slug, flight])

  const exit = () => navigate(mission ? `/missions/${mission.phase}` : '/academy')

  if (error) return <LoadingScreen text={t('play.loadError')} />
  if (!activity) return <LoadingScreen />
  return (
    <div className="immersive">
      <header className="immersive-top">
        <button className="icon-btn" onClick={exit} aria-label={t('common.back')}>←</button>
        <Crest size={110} />
        <span className="icon-spacer" />
      </header>
      <ActivityPlayer activity={activity} missionId={missionId} onExit={exit} exitLabel={mission ? t('reward.continue') : t('play.backToAcademy')} />
    </div>
  )
}
