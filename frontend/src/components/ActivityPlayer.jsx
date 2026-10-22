import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { useI18n } from '../i18n/context'
import { saveJournalEntry } from '../utils/media'
import Cadet from './art/Cadet'
import StarMeter from './StarMeter'
import { distanceKm } from '../utils/geo'
import WorldMap from './WorldMap'

const LETTERS = ['A', 'B', 'C', 'D']

// ---------------------------------------------------------------- shared bits

function Coach({ cheer, children }) {
  const { cadet } = useAuth()
  return (
    <div className="quiz-coach">
      <Cadet avatar={cadet.avatar} pose={cheer ? 'cheer' : 'thumbs'} size={96} />
      <div className="panel quiz-progress">{children}</div>
    </div>
  )
}

function DoneButton({ children, onClick, disabled }) {
  const { t } = useI18n()
  return (
    <button className="btn btn-primary btn-wide" onClick={onClick} disabled={disabled}>
      {children ?? t('play.finish')} <span className="btn-arrow">➜</span>
    </button>
  )
}

// ---------------------------------------------------------------- quiz (graded on the device)

function QuizGame({ activity, onFinish }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const q = activity.questions[i]
  const total = activity.questions.length
  const answered = picked !== null
  const last = i === total - 1

  const choose = (idx) => {
    if (answered) return
    setPicked(idx)
    if (idx === q.answer) setScore((s) => s + 1)
  }
  const next = () => {
    if (last) return onFinish({ score, total })
    setPicked(null)
    setI(i + 1)
  }

  return (
    <div className="quiz-stage">
      <div className="quiz-left">
        {activity.ai && <div className="ai-chip">✨ {t('play.aiChip')}</div>}
        <RouteCard route={activity.route} />
        <div className="quiz-q-count">{t('play.questionOf', { n: i + 1, total })}</div>
        <h2 className="quiz-question">{q.q}</h2>
      </div>
      <div className="quiz-right">
        <div className="quiz-choices">
          {q.choices.map((choice, idx) => {
            let cls = 'quiz-choice'
            if (answered) cls += idx === q.answer ? ' correct' : idx === picked ? ' wrong' : ' dim'
            return (
              <button key={idx} type="button" className={cls} onClick={() => choose(idx)} disabled={answered}>
                <span className="choice-art">{activity.icon}</span>
                <span className="choice-text"><b>{LETTERS[idx]}.</b> {choice}</span>
                {answered && idx === q.answer && <span className="choice-mark">✓</span>}
                {answered && idx === picked && idx !== q.answer && <span className="choice-mark">✕</span>}
              </button>
            )
          })}
        </div>
        {answered && (
          <div className={'quiz-feedback ' + (picked === q.answer ? 'good' : 'bad')}>
            <div className="fb-head">{picked === q.answer ? t('play.correct') : t('play.notQuite')}</div>
            {q.explain && <p>{q.explain}</p>}
            <DoneButton onClick={next}>{last ? t('play.seeScore') : t('play.nextQuestion')}</DoneButton>
          </div>
        )}
        <Coach cheer={answered && picked === q.answer}>
          <StarMeter filled={score} total={total} label={t('play.missionProgress')} />
        </Coach>
      </div>
    </div>
  )
}

export function RouteCard({ route }) {
  const { t } = useI18n()
  if (!route) return null
  return (
    <div className="route-card">
      <svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f6b4f" />
            <stop offset="1" stopColor="#5a7a3e" />
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill="#174a6b" />
        <path d="M0 70 C40 40 80 60 120 44 C160 30 200 56 240 40 C270 30 300 44 320 36 L320 120 L0 120 Z" fill="url(#landGrad)" />
        <path d="M90 52 l10 -14 10 14z M150 40 l12 -18 12 18z M168 44 l8 -11 8 11z" fill="#e9eef0" />
        <path d="M24 96 Q160 0 296 70" fill="none" stroke="#3fe0d0" strokeWidth="3" />
      </svg>
      <span className="route-pin from">{route.origin}</span>
      <span className="route-pin to">{route.dest}</span>
      <span className="route-plane">✈</span>
      <span className="route-live"><i /> {t('play.liveRoute')}</span>
    </div>
  )
}

// ---------------------------------------------------------------- bingo & checklists

function ChecklistGame({ activity, onFinish }) {
  const { t } = useI18n()
  const [ticked, setTicked] = useState(() => new Set())
  const toggle = (i) =>
    setTicked((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  const bingo = activity.kind === 'bingo'
  return (
    <div className="play-col">
      {activity.safety && <div className="safety-note">🛑 {activity.safety}</div>}
      <div className={bingo ? 'bingo-grid' : 'check-list'}>
        {activity.items.map((item, i) => (
          <button key={i} type="button" className={'check-item' + (ticked.has(i) ? ' on' : '')} onClick={() => toggle(i)} aria-pressed={ticked.has(i)}>
            <span className="check-icon">{item.icon}</span>
            <span className="check-label">{item.label}</span>
            <span className="check-box">{ticked.has(i) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <Coach cheer={ticked.size >= activity.need}>
        <StarMeter filled={Math.min(ticked.size, activity.need)} total={activity.need} label={bingo ? t('play.spotToWin', { n: activity.need }) : t('play.tickToFinish', { n: activity.need })} />
      </Coach>
      <DoneButton disabled={ticked.size < activity.need} onClick={() => onFinish({ score: ticked.size, total: activity.items.length, data: { ticked: [...ticked] } })}>
        {bingo ? t('play.bingo') : t('play.done')}
      </DoneButton>
    </div>
  )
}

// ---------------------------------------------------------------- matching pairs

function MatchGame({ activity, onFinish }) {
  const { t } = useI18n()
  const rights = useMemo(() => {
    const r = activity.pairs.map((p, i) => ({ text: p.right, i }))
    for (let k = r.length - 1; k > 0; k--) {
      const j = (k * 7 + 3) % (k + 1)
      ;[r[k], r[j]] = [r[j], r[k]]
    }
    return r
  }, [activity])
  const [left, setLeft] = useState(null)
  const [matched, setMatched] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [mistakes, setMistakes] = useState(0)

  const pickRight = (i) => {
    if (left === null || matched.has(i)) return
    if (i === left) {
      setMatched((m) => new Set(m).add(i))
      setLeft(null)
    } else {
      setMiss(i)
      setMistakes((n) => n + 1)
      setTimeout(() => setMiss(null), 500)
    }
  }
  const done = matched.size === activity.pairs.length
  return (
    <div className="play-col">
      <p className="sheet-prompt">{t('play.matchPrompt')}</p>
      <div className="match-grid">
        <div className="match-col">
          {activity.pairs.map((p, i) => (
            <button key={i} type="button" className={'match-card' + (matched.has(i) ? ' done' : left === i ? ' on' : '')} onClick={() => !matched.has(i) && setLeft(i)}>
              {p.left}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((r) => (
            <button key={r.i} type="button" className={'match-card right' + (matched.has(r.i) ? ' done' : miss === r.i ? ' miss' : '')} onClick={() => pickRight(r.i)}>
              {r.text}
            </button>
          ))}
        </div>
      </div>
      <Coach cheer={done}>
        <StarMeter filled={matched.size} total={activity.pairs.length} label={t('play.pairsMatched')} />
      </Coach>
      <DoneButton disabled={!done} onClick={() => onFinish({ score: activity.pairs.length, total: activity.pairs.length + mistakes })}>{t('play.allMatched')}</DoneButton>
    </div>
  )
}

// ---------------------------------------------------------------- predictions

function PredictGame({ activity, onFinish }) {
  const { t } = useI18n()
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const all = activity.predictions.every((_, i) => answers[i] !== undefined)
  const reveal = activity.predictions.find((p) => p.reveal !== undefined)
  return (
    <div className="play-col">
      {activity.predictions.map((p, i) => (
        <div key={i} className="panel predict-q">
          <h3>{p.q}</h3>
          <div className="pick-grid">
            {p.options.map((o, k) => (
              <button key={k} type="button" disabled={revealed}
                className={'pick' + (answers[i] === k ? ' on' : '') + (revealed && p.reveal === k ? ' right' : '')}
                onClick={() => setAnswers((a) => ({ ...a, [i]: k }))}>
                {o}
              </button>
            ))}
          </div>
        </div>
      ))}
      {revealed && reveal && (
        <div className={'quiz-feedback ' + (answers[activity.predictions.indexOf(reveal)] === reveal.reveal ? 'good' : 'bad')}>
          <div className="fb-head">{answers[activity.predictions.indexOf(reveal)] === reveal.reveal ? t('play.spotOn') : t('play.boardingClosed')}</div>
          <p>{reveal.reveal_text}</p>
        </div>
      )}
      {!reveal && revealed && <div className="quiz-feedback good"><div className="fb-head">{t('play.lockedIn')}</div><p>{t('play.checkWhenLand')}</p></div>}
      {!revealed ? (
        <DoneButton disabled={!all} onClick={() => setRevealed(true)}>{reveal ? t('play.lockGuess') : t('play.lockPredictions')}</DoneButton>
      ) : (
        <DoneButton onClick={() => onFinish({
          score: reveal ? Number(answers[activity.predictions.indexOf(reveal)] === reveal.reveal) : 0,
          total: reveal ? 1 : 0, data: { answers },
        })}>{t('play.collectStars')}</DoneButton>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- place the destination on the map

function MapGame({ activity, onFinish }) {
  const { t } = useI18n()
  const [pick, setPick] = useState(null)
  const tg = activity.target
  const km = pick ? distanceKm(pick, tg) : null
  const grade = km === null ? null : km < 800 ? 3 : km < 2500 ? 2 : 1
  return (
    <div className="play-col">
      <p className="sheet-prompt">{t('play.mapPrompt', { city: tg.city })}</p>
      <div className="panel map-panel">
        <WorldMap home={tg.origin} pick={pick} target={pick ? tg : null} onPick={(lon, lat) => !pick && setPick({ lon, lat })} />
      </div>
      {pick && (
        <div className={'quiz-feedback ' + (grade >= 2 ? 'good' : 'bad')}>
          <div className="fb-head">{grade === 3 ? t('play.bullseye') : grade === 2 ? t('play.close') : t('play.goodTry')}</div>
          <p>{t('play.mapDistance', { km: km.toLocaleString(), city: tg.city })}</p>
          <DoneButton onClick={() => onFinish({ score: grade, total: 3, data: { km } })}>{t('common.continue')}</DoneButton>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- drawing (saved to the journal)

const PALETTE = ['#0f4a4a', '#3fe0d0', '#f6c544', '#e8533f', '#2d6cdf', '#8a4bd6', '#2fa35a', '#ffffff', '#1a1a1a']

function DrawGame({ activity, onFinish }) {
  const { t } = useI18n()
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [color, setColor] = useState(PALETTE[1])
  const [size, setSize] = useState(10)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const isTail = activity.slug === 'design-a-tail'

  const reset = () => {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f3f8f7'
    ctx.fillRect(0, 0, c.width, c.height)
    if (isTail) {
      // A tail-fin outline to colour in.
      ctx.strokeStyle = '#9fb4b1'
      ctx.lineWidth = 6
      ctx.setLineDash([16, 12])
      ctx.beginPath()
      ctx.moveTo(180, 700)
      ctx.lineTo(560, 120)
      ctx.lineTo(720, 120)
      ctx.lineTo(640, 700)
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
    }
    setDirty(false)
  }
  useEffect(reset, [isTail]) // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e) => {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]
  }
  const start = (e) => {
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const [x, y] = pos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = size * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
    canvasRef.current.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const [x, y] = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setDirty(true)
  }
  const end = () => {
    drawing.current = false
  }

  const finish = async () => {
    setSaving(true)
    try {
      const blob = await new Promise((r) => canvasRef.current.toBlob(r, 'image/png'))
      await onFinish({ score: 1, total: 0, image: blob, caption: activity.title })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="play-col">
      <p className="sheet-prompt">{activity.prompt || activity.blurb}</p>
      <div className="draw-tools">
        {PALETTE.map((c) => (
          <button key={c} type="button" className={'swatch' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={t('play.colour', { c })} />
        ))}
        <button type="button" className={'brush' + (size === 5 ? ' on' : '')} onClick={() => setSize(5)}>{t('play.thin')}</button>
        <button type="button" className={'brush' + (size === 14 ? ' on' : '')} onClick={() => setSize(14)}>{t('play.thick')}</button>
        <button type="button" className="brush" onClick={reset}>{t('play.clear')}</button>
      </div>
      <canvas ref={canvasRef} className="draw-canvas" width="900" height="760" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <DoneButton disabled={!dirty || saving} onClick={finish}>{saving ? t('common.saving') : t('play.saveJournal')}</DoneButton>
    </div>
  )
}

// ---------------------------------------------------------------- writing (saved to the journal)

function WriteGame({ activity, onFinish }) {
  const { t } = useI18n()
  const [lines, setLines] = useState(() => activity.prompts.map(() => ''))
  const [saving, setSaving] = useState(false)
  const ready = lines.filter((l) => l.trim()).length >= Math.min(2, lines.length)
  return (
    <div className="play-col">
      {activity.prompts.map((p, i) => (
        <div key={i} className="panel write-line">
          <label className="field-label" htmlFor={`w${i}`}>{i + 1}. {p}</label>
          <textarea id={`w${i}`} className="field" rows={2} maxLength={240} value={lines[i]} onChange={(e) => setLines((l) => l.map((x, k) => (k === i ? e.target.value : x)))} />
        </div>
      ))}
      <DoneButton disabled={!ready || saving} onClick={async () => {
        setSaving(true)
        try {
          await onFinish({ score: 1, total: 0, text: lines.filter((l) => l.trim()).join('\n') })
        } finally {
          setSaving(false)
        }
      }}>{saving ? t('common.saving') : t('play.saveJournal')}</DoneButton>
    </div>
  )
}

// ---------------------------------------------------------------- the player

const GAMES = { quiz: QuizGame, bingo: ChecklistGame, checklist: ChecklistGame, match: MatchGame, predict: PredictGame, map: MapGame, draw: DrawGame, write: WriteGame }

export default function ActivityPlayer({ activity, missionId, onExit, exitLabel }) {
  const { t } = useI18n()
  const { cadet } = useAuth()
  const { flight, completeActivity } = useGame()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const Game = GAMES[activity.kind]

  const finish = async ({ score = 0, total = 0, data = {}, image, text, caption }) => {
    setError('')
    try {
      if (image || text) {
        await saveJournalEntry({
          flight: flight?.id, kind: image ? 'drawing' : 'story', photo_caption: caption || activity.title, note: text || '',
        }, image)
      }
      await completeActivity(activity, { score, total, data, missionId })
      setResult({ score, total, saved: Boolean(image || text) })
    } catch {
      setError(t('play.saveError'))
    }
  }

  if (result) {
    const perfect = result.total && result.score === result.total
    return (
      <div className="quiz-result">
        <Cadet avatar={cadet.avatar} pose="cheer" size={150} />
        <div className="panel quiz-result-panel">
          <div className="quiz-result-trophy">{perfect ? '🏆' : '🎉'}</div>
          <h2>{perfect ? t('play.perfect') : t('play.accomplished')}</h2>
          {result.total > 0 && <StarMeter filled={result.score} total={result.total} label={t('play.yourScore')} size="lg" />}
          {result.saved && <p className="muted">{t('play.savedJournal')}</p>}
          <div className="btn-stack">
            <DoneButton onClick={onExit}>{exitLabel}</DoneButton>
            <button className="btn btn-ghost" onClick={() => setResult(null)}>{t('play.again')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="activity">
      <div className="activity-head">
        <span className="activity-icon">{activity.icon}</span>
        <div>
          <div className="eyebrow">{t(`category.${activity.category}`)} · +{activity.stars} ★</div>
          <h1>{activity.title}</h1>
          {activity.kind !== 'quiz' && <p className="muted">{activity.blurb}</p>}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {Game ? <Game key={activity.slug} activity={activity} onFinish={finish} /> : <p>{t('play.comingSoon')}</p>}
    </div>
  )
}
