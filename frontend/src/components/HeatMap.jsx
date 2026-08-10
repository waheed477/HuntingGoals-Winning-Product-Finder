import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { CITY_COORDS } from '../utils/cityList.js'
import WinScoreBadge from './WinScoreBadge.jsx'
import { formatPKR } from '../utils/formatPKR.js'

const CITY_INTENSITY = {
  Lahore: 0.9,
  Karachi: 0.95,
  Islamabad: 0.75,
  Faisalabad: 0.65,
  Rawalpindi: 0.6,
  Multan: 0.5,
  Peshawar: 0.45,
  Quetta: 0.35,
  Sialkot: 0.55,
  Gujranwala: 0.5,
}

function getHeatColor(intensity) {
  if (intensity >= 0.8) return '#ef4444'
  if (intensity >= 0.6) return '#f97316'
  if (intensity >= 0.4) return '#eab308'
  return '#22c55e'
}

export default function HeatMap({ cityProducts = {} }) {
  return (
    <MapContainer
      center={[30.3753, 69.3451]}
      zoom={5}
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {Object.entries(CITY_COORDS).map(([city, coords]) => {
        const intensity = CITY_INTENSITY[city] || 0.5
        const color = getHeatColor(intensity)
        const products = cityProducts[city] || []

        return (
          <CircleMarker
            key={city}
            center={coords}
            radius={Math.round(intensity * 28 + 8)}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.25,
              weight: 2,
              opacity: 0.8,
            }}
          >
            <Tooltip permanent={false} direction="top" offset={[0, -10]}>
              <div style={{ minWidth: 120 }}>
                <strong style={{ color: '#fff' }}>{city}</strong>
                <br />
                <span style={{ color: '#a5b4fc' }}>Demand: {Math.round(intensity * 100)}%</span>
              </div>
            </Tooltip>
            <Popup maxWidth={260}>
              <div style={{ background: '#1e1e3f', color: '#fff', padding: '8px', borderRadius: '8px', minWidth: 220 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
                  Top Products in {city}
                </h3>
                {products.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 12 }}>Loading...</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {products.slice(0, 5).map((p, i) => (
                      <li
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 0',
                          borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{p.name}</span>
                        <span
                          style={{
                            color: p.winScore >= 75 ? '#4ade80' : p.winScore >= 50 ? '#fbbf24' : '#f87171',
                            fontWeight: 700,
                            marginLeft: 8,
                          }}
                        >
                          {p.winScore}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
