import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatMiles } from '../game/config'
import { useI18n } from '../i18n/context'
import Cadet from './art/Cadet'
import Crest from './art/Crest'

export default function TopBar() {
  const { cadet } = useAuth()
  const { t } = useI18n()
  const rank = cadet.rank
  const pct = rank.next ? Math.min(1, (cadet.stars - rank.floor) / Math.max(1, rank.next.stars - rank.floor)) : 1

  return (
    <header className="hud-top">
      <Link to="/map" className="hud-crest" aria-label={t('nav.missions')}>
        <Crest size={92} />
      </Link>

      <div className="hud-chips">
        <div className="hud-chip gold" title={t('stats.lifetimeStars')}>
          <span className="chip-icon">★</span>
          <b key={cadet.stars} className="pop">{cadet.stars}</b>
        </div>
        <div className="hud-chip" title={t('stats.lifetimeMiles')}>
          <span className="chip-icon">✈</span>
          <b>{formatMiles(cadet.lifetime_miles)}</b>
          <small>{t('units.mi')}</small>
        </div>
      </div>

      <div className="hud-right">
        <Link to="/settings" className="icon-btn hud-gear" aria-label={t('settings.title')}>⚙️</Link>
        <Link to="/passport" className="hud-avatar" aria-label={t('nav.passport')}>
          <div className="hud-avatar-ring" style={{ '--pct': pct }}>
            <div className="hud-avatar-face">
              <Cadet avatar={cadet.avatar} size={46} />
            </div>
          </div>
          <span className="hud-level">{t('common.level', { n: cadet.level })}</span>
        </Link>
      </div>
    </header>
  )
}
