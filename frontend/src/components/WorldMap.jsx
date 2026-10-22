import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath } from 'd3-geo'
import { useMemo, useRef } from 'react'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'
import { useI18n } from '../i18n/context'

const W = 960
const H = 500
const land = feature(landTopo, landTopo.objects.land)
const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' })
const path = geoPath(projection)

function arcPath(a, b) {
  // Great-circle arc, drawn as a curve like an airline route map.
  const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat])
  const pts = Array.from({ length: 65 }, (_, i) => projection(interp(i / 64)))
  // Split where the arc wraps around the map edge (e.g. Hong Kong to Vancouver over the Pacific).
  const segs = [[pts[0]]]
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - pts[i - 1][0]) > W / 2) segs.push([])
    segs[segs.length - 1].push(pts[i])
  }
  return segs.map((s) => 'M' + s.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L')).join(' ')
}

// `routes`: [{origin:{code,lat,lon,city}, destination:{…}, flown}] — dashed until flown, then solid.
// `onPick(lon, lat)` makes the map tappable.
export default function WorldMap({ routes = [], home, pick, target, onPick, className = '' }) {
  const { t } = useI18n()
  const svgRef = useRef(null)
  const airports = useMemo(() => {
    const seen = new Map()
    routes.forEach((r) => [r.origin, r.destination].forEach((a) => a && seen.set(a.code, a)))
    if (home) seen.set(home.code, home)
    return [...seen.values()]
  }, [routes, home])

  const handleClick = (e) => {
    if (!onPick) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse())
    const lonLat = projection.invert([x, y])
    if (lonLat) onPick(lonLat[0], lonLat[1])
  }

  return (
    <svg ref={svgRef} className={'world-map ' + (onPick ? 'pickable ' : '') + className} viewBox={`0 0 ${W} ${H}`} onClick={handleClick} role="img" aria-label={t('map.aria')}>
      <path d={path({ type: 'Sphere' })} className="wm-sea" />
      <path d={path(geoGraticule10())} className="wm-grid" />
      <path d={path(land)} className="wm-land" />
      {routes.map((r, i) => (
        <path key={i} d={arcPath(r.origin, r.destination)} className={'wm-route' + (r.flown === false ? ' planned' : ' flown')} />
      ))}
      {target && pick && <path d={arcPath(target, pick)} className="wm-miss" />}
      {airports.map((a) => {
        const [x, y] = projection([a.lon, a.lat])
        const isHome = home && a.code === home.code
        return (
          <g key={a.code} transform={`translate(${x},${y})`} className={'wm-airport' + (isHome ? ' home' : '')}>
            <circle r={isHome ? 7 : 5} />
            <text y={-11}>{a.code}</text>
          </g>
        )
      })}
      {pick && (() => {
        const [x, y] = projection([pick.lon, pick.lat])
        return <g transform={`translate(${x},${y})`} className="wm-pick"><circle r="9" /><text y={-14}>{t('map.you')}</text></g>
      })()}
      {target && pick && (() => {
        const [x, y] = projection([target.lon, target.lat])
        return <g transform={`translate(${x},${y})`} className="wm-target"><circle r="9" /><text y={-14}>{target.code}</text></g>
      })()}
    </svg>
  )
}
