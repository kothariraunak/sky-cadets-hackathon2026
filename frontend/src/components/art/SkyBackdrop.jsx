// Fixed night-sky backdrop: soft clouds, a dashed flight arc and a cruising plane.
function Cloud({ className }) {
  return (
    <svg className={'sky-cloud ' + className} viewBox="0 0 200 90" aria-hidden="true">
      <path d="M30 80 C8 80 4 56 24 50 C22 30 46 22 60 34 C68 10 106 6 116 30 C132 18 160 26 158 48 C180 48 188 80 164 80 Z" />
    </svg>
  )
}

export default function SkyBackdrop() {
  return (
    <div className="sky-backdrop" aria-hidden="true">
      <Cloud className="c1" />
      <Cloud className="c2" />
      <Cloud className="c3" />
      <svg className="sky-arc" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <path d="M-20 360 Q500 -60 1020 300" fill="none" stroke="rgba(160,235,225,0.22)" strokeWidth="2" strokeDasharray="6 10" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="sky-plane">✈</div>
    </div>
  )
}
