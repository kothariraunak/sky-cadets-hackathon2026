import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import SkyBackdrop from './components/art/SkyBackdrop'
import AppLayout, { CadetArea, LoadingScreen } from './components/AppLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import I18nProvider from './i18n/I18nProvider'
import Arcade from './pages/Arcade'
import FunFacts from './pages/FunFacts'
import Journal from './pages/Journal'
import Login from './pages/Login'
import MissionMap from './pages/MissionMap'
import Onboarding from './pages/Onboarding'
import Passport from './pages/Passport'
import Phase from './pages/Phase'
import Play from './pages/Play'
import Scan from './pages/Scan'
import Settings from './pages/Settings'
import './styles/app.css'

function PublicOnly({ children }) {
  const { cadet, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (cadet) return <Navigate to="/map" replace />
  return children
}

function App() {
  return (
    <I18nProvider>
    <Router>
      <AuthProvider>
        <SkyBackdrop />
        <Routes>
          {/* Login wall: signed-out visitors only ever see this screen */}
          <Route path="/" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<CadetArea />}>
            <Route element={<AppLayout />}>
              <Route path="/map" element={<MissionMap />} />
              <Route path="/missions/:phaseKey" element={<Phase />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/arcade" element={<Arcade />} />
              <Route path="/fun-facts" element={<FunFacts />} />
              <Route path="/passport" element={<Passport />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/play/:slug" element={<Play />} />
            <Route path="/scan" element={<Scan />} />
          </Route>

          {/* Routes from the first design */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<Navigate to="/map" replace />} />
          <Route path="/logbook" element={<Navigate to="/journal" replace />} />
          <Route path="/explore" element={<Navigate to="/arcade" replace />} />
          <Route path="/profile" element={<Navigate to="/passport" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
    </I18nProvider>
  )
}

export default App
