import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { ARCADE_CATEGORIES, stageByKey } from '../game/config'
import { useI18n } from '../i18n/context'

function Cartridge({ a, badgeIcon }) {
  const { t } = useI18n()
  return (
    <Link to={`/play/${a.slug}`} className={'cartridge' + (a.played ? ' played' : '')}>
      <span className="cartridge-icon">{a.icon}</span>
      <b>{a.title}</b>
      <span className="cartridge-meta">{a.blurb}</span>
      <span className="cartridge-tags">
        <em>{t(`kindLabel.${a.kind}`)}</em>
        {badgeIcon[a.badge] && <em title={badgeIcon[a.badge].name}>{badgeIcon[a.badge].icon} {badgeIcon[a.badge].name}</em>}
      </span>
      <span className="cartridge-foot">
        <span className="cartridge-play">▶ {t('arcade.play')}</span>
        <span className="gold-text">+{a.stars} ★</span>
        {a.played > 0 && <span className="played-chip">✓ {a.played}</span>}
      </span>
    </Link>
  )
}

export default function Arcade() {
  const navigate = useNavigate()
  const { arcade, badges, stage } = useGame()
  const { t } = useI18n()
  const [cat, setCat] = useState('All')
  const badgeIcon = Object.fromEntries(badges.map((b) => [b.code, b]))
  const played = arcade.activities.filter((a) => a.played).length

  // The games for where the cadet is right now (airport, on board, landed…) come first.
  const now = stageByKey(stage)
  const featured = now ? arcade.activities.filter((a) => a.phase === now.phase) : []
  const rest = arcade.activities.filter((a) => !featured.includes(a))
  const list = rest.filter((a) => cat === 'All' || a.category === cat)

  const surprise = () => {
    const unplayed = (pool) => pool.filter((a) => !a.played)
    const pool = [unplayed(featured), unplayed(arcade.activities), arcade.activities].find((p) => p.length)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/play/${pick.slug}`)
  }

  return (
    <div className="arcade-page">
      <div className="section-head">
        <h1>{t('nav.arcade')}</h1>
        <span className="muted">{t('arcade.summary', { n: arcade.activities.length, played })}</span>
      </div>

      <button className="panel surprise" onClick={surprise}>
        <span className="surprise-gift" aria-hidden="true">🎁</span>
        <span><b>{t('arcade.surprise')}</b><small>{t('arcade.surpriseNote')}</small></span>
        <span className="btn-arrow">➜</span>
      </button>

      {featured.length > 0 && (
        <section className={'panel right-now stage-' + now.key}>
          <div className="section-head tight">
            <h2>{now.icon} {t('arcade.rightNow')}</h2>
            <span className="status-chip live">{t(`stage.${now.key}`)}</span>
          </div>
          <p className="muted">{t(`arcade.rightNow.${now.key}`)}</p>
          <div className="cartridge-grid">
            {featured.map((a) => <Cartridge key={a.slug} a={a} badgeIcon={badgeIcon} />)}
          </div>
        </section>
      )}

      {featured.length > 0 && <div className="section-head"><h2>{t('arcade.moreGames')}</h2></div>}
      <div className="chip-row" role="tablist" aria-label={t('arcade.categories')}>
        {ARCADE_CATEGORIES.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{t(`category.${c}`)}</button>
        ))}
      </div>

      <div className="cartridge-grid">
        {list.map((a) => <Cartridge key={a.slug} a={a} badgeIcon={badgeIcon} />)}
      </div>
    </div>
  )
}
