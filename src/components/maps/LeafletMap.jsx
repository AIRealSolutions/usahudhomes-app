/**
 * LeafletMap — a small wrapper around Leaflet with OpenStreetMap tiles.
 *
 * points: [{ id, lat, lng, color, radius?, label (plain text tooltip), popup (HTML string, already escaped) }]
 * Re-fits to the points whenever `fitKey` changes. `onSelect(id)` fires on marker click.
 */
import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function LeafletMap({ points = [], fitKey, onSelect, height = 520, center = [35.5, -79.4], zoom = 7 }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: true }).setView(center, zoom)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current)
    layer.current = L.featureGroup().addTo(map.current)
    return () => { map.current.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue
      const m = L.circleMarker([p.lat, p.lng], {
        radius: p.radius || 7, color: '#fff', weight: 1.5, fillColor: p.color || '#2563eb', fillOpacity: 0.9,
      })
      if (p.label) m.bindTooltip(p.label)
      if (p.popup) m.bindPopup(p.popup)
      m.on('click', () => selectRef.current?.(p.id))
      g.addLayer(m)
    }
  }, [points])

  useEffect(() => {
    const g = layer.current
    if (!g || !map.current) return
    const b = g.getBounds()
    if (b.isValid()) map.current.fitBounds(b.pad(0.15), { maxZoom: 11 })
  }, [fitKey])

  return <div ref={el} style={{ height, width: '100%' }} className="rounded border z-0" />
}
