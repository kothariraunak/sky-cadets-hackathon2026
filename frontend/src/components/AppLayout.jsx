import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GameProvider, useGame } from '../context/GameContext'
import { useI18n } from '../i18n/context'
import BottomNav from './BottomNav'
import RewardOverlay from './RewardOverlay'
import TopBar from './TopBar'

export function LoadingScreen({ text }) {
  const { t } = useI18n()
  return (
    <div className="loading-screen">
      <div className="loading-plane">✈</div>
      <p>{text || t('common.loading')}</p>
    </div>
  )
}

// Auth guard for every signed-in screen; provides game state + the reward overlay.
export function CadetArea() {
  const { cadet, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!cadet) return <Navigate to="/" replace />
  if (!cadet.cadet_name) return <Navigate to="/onboarding" replace />
  return (
    <GameProvider>
      <GameReady />
      <RewardOverlay />
    </GameProvider>
  )
}

function GameReady() {
  const { loading } = useGame()
  if (loading) return <LoadingScreen />
  return <Outlet />
}

// Tabbed screens: HUD on top, nav dock at the bottom.
export default function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="screen">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
