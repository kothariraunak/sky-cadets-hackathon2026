import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useI18n } from '../i18n/context'
import Medal from './art/Medal'

// Copy per mission kind: sheet.<kind>.prompt / sheet.<kind>.cta
const KINDS = ['activity', 'photo', 'land', 'complete', 'auto']

export default function MissionSheet({ mission, onClose }) {
  const navigate = useNavigate()
  const { progressFor, land, completeJourney } = useGame()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const done = progressFor(mission.id)?.completed
  const kind = KINDS.includes(mission.kind) ? mission.kind : 'activity'
  const cta = kind === 'auto' ? '' : t(`sheet.${kind}.cta`)
  const contest = mission.key === 'My Destination Story'

  const go = async () => {
    if (mission.kind === 'activity') {
      navigate(`/play/${mission.activity}?mission=${mission.id}`)
      return onClose()
    }
    if (mission.kind === 'photo') {
      navigate(`/journal?mission=${mission.id}&focus=${contest ? 'contest' : mission.key.includes('Food') ? 'meal' : 'photo'}`)
      return onClose()
    }
    setBusy(true)
    try {
      if (mission.kind === 'land') await land()
      if (mission.kind === 'complete') await completeJourney()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={mission.title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <button className="icon-btn sheet-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        <div className="sheet-head">
          <Medal icon={mission.icon} size={84} />
          <div>
            <div className="eyebrow">{t('sheet.mission')}</div>
            <h2>{mission.title}</h2>
            <div className="reward-chip">+{mission.stars_reward} ★</div>
          </div>
        </div>
        <div className="sheet-body">
          <p className="sheet-prompt">{mission.description}</p>
          <p className="muted">{contest ? t('sheet.contest') : t(`sheet.${kind}.prompt`)}</p>
        </div>
        {done ? (
          <div className="sheet-done">✓ {t('sheet.done')}</div>
        ) : cta ? (
          <button className="btn btn-primary btn-wide" onClick={go} disabled={busy}>
            {busy ? t('common.oneMoment') : cta} <span className="btn-arrow">➜</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
