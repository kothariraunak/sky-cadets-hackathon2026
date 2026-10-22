import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/context'

const TABS = [
  { to: '/map', icon: '🗺️', label: 'nav.missions' },
  { to: '/arcade', icon: '🎮', label: 'nav.arcade' },
  { to: '/journal', icon: '📔', label: 'nav.journal' },
  { to: '/passport', icon: '🛂', label: 'nav.passport' },
]

export default function BottomNav() {
  const { t } = useI18n()
  return (
    <nav className="hud-dock" aria-label={t('nav.aria')}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => 'dock-item' + (isActive ? ' active' : '')}>
          <span className="dock-icon">{tab.icon}</span>
          <span className="dock-label">{t(tab.label)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
