import { useEffect, useRef, useState } from 'react'
import client from '../api/client'
import { formatDate } from '../game/config'
import { useI18n } from '../i18n/context'

function Level({ n }) {
  const { t } = useI18n()
  return (
    <span className="ff-level" title={t('funFacts.level', { n })} aria-label={t('funFacts.level', { n })}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
    </span>
  )
}

// 30 cards that get gradually harder. Flipping one marks it read (with the date); when it is turned back,
// the next fact in line takes its place, so there is always something new to discover.
export default function FunFacts() {
  const { t } = useI18n()
  const [tab, setTab] = useState('deck')
  const [cards, setCards] = useState(null)
  const [viewed, setViewed] = useState([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(null)
  const [fresh, setFresh] = useState(null)
  const serverDeck = useRef([])

  useEffect(() => {
    client.get('/fun-facts/').then(({ data }) => {
      setCards(data.deck)
      setViewed(data.viewed)
      setTotal(data.total)
      serverDeck.current = data.deck
    })
  }, [])

  // Swap a read card for the next unread fact the server has lined up.
  const retire = (id, list) => {
    const replacement = serverDeck.current.find((f) => !list.some((c) => c.id === f.id))
    setFresh(replacement?.id ?? null)
    return replacement ? list.map((c) => (c.id === id ? replacement : c)) : list.filter((c) => c.id !== id)
  }

  const flip = async (fact) => {
    if (open === fact.id) {
      setCards((list) => retire(fact.id, list))
      setOpen(null)
      return
    }
    if (open !== null) setCards((list) => retire(open, list))
    setOpen(fact.id)
    setFresh(null)
    if (viewed.some((v) => v.id === fact.id)) return
    try {
      const { data } = await client.post(`/fun-facts/${fact.id}/viewed/`)
      serverDeck.current = data.deck
      setViewed(data.viewed)
    } catch {
      /* stays on the card; it will be recorded next time */
    }
  }

  const days = []
  viewed.forEach((f) => {
    const day = formatDate(f.viewed_at)
    const last = days[days.length - 1]
    if (last && last.day === day) last.facts.push(f)
    else days.push({ day, facts: [f] })
  })

  return (
    <div className="fun-facts-page">
      <div className="section-head">
        <h1>💡 {t('funFacts.title')}</h1>
        <span className="muted">{t('funFacts.progress', { n: viewed.length, total })}</span>
      </div>

      <div className="chip-row" role="tablist">
        <button role="tab" aria-selected={tab === 'deck'} className={'chip' + (tab === 'deck' ? ' on' : '')} onClick={() => setTab('deck')}>🃏 {t('funFacts.deck')}</button>
        <button role="tab" aria-selected={tab === 'viewed'} className={'chip' + (tab === 'viewed' ? ' on' : '')} onClick={() => setTab('viewed')}>📚 {t('funFacts.viewed', { n: viewed.length })}</button>
      </div>

      {tab === 'deck' && (
        <>
          <p className="muted">{t('funFacts.deckNote')}</p>
          {cards === null && <p className="muted">{t('common.oneMoment')}</p>}
          {cards?.length === 0 && <div className="panel empty">🏆 {t('funFacts.allRead')}</div>}
          <div className="fact-grid">
            {(cards || []).map((f) => {
              const isOpen = open === f.id
              return (
                <button key={f.id} className={'fact-card' + (isOpen ? ' open' : '') + (fresh === f.id ? ' fresh' : '')} onClick={() => flip(f)} aria-expanded={isOpen}>
                  <span className="fact-top"><span className="fact-cat">{f.category}</span><Level n={f.level} /></span>
                  <span className="fact-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  {isOpen && <p>{f.text}</p>}
                  <span className="fact-flip">{isOpen ? t('funFacts.tapNext') : t('arcade.tapToRead')}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'viewed' && (
        <>
          {viewed.length === 0 && <div className="panel empty">{t('funFacts.noneYet')}</div>}
          {days.map((d) => (
            <div key={d.day} className="ff-day">
              <h3 className="ff-date">📅 {d.day}</h3>
              <div className="ff-viewed">
                {d.facts.map((f) => (
                  <div key={f.id} className="panel ff-item">
                    <span className="fact-icon">{f.icon}</span>
                    <div>
                      <span className="fact-top"><span className="fact-cat">{f.category}</span><Level n={f.level} /></span>
                      <b>{f.title}</b>
                      <p>{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
