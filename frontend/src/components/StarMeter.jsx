// Row of stars + progress bar, as in the "Mission Progress" panel of the quiz mockup.
export default function StarMeter({ filled, total, label, showBar = true, size = 'md' }) {
  const pct = total ? Math.round((filled / total) * 100) : 0
  return (
    <div className={'star-meter ' + size}>
      {label && <div className="star-meter-label">{label}</div>}
      <div className="star-row">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={'star' + (i < filled ? ' on' : '')}>★</span>
        ))}
      </div>
      {showBar && (
        <div className="meter-line">
          <span className="meter-count">{filled} / {total}</span>
          <div className="bar">
            <div className="bar-fill" style={{ width: pct + '%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
