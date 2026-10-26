import React from 'react'
import { meterLabel, meterTone } from '../lib/dealMeter'

const TONES = {
  green: { stroke: '#15803d', chip: 'bg-green-100 text-green-800' },
  lime: { stroke: '#4d7c0f', chip: 'bg-lime-100 text-lime-800' },
  amber: { stroke: '#b45309', chip: 'bg-amber-100 text-amber-800' },
  red: { stroke: '#b91c1c', chip: 'bg-red-100 text-red-800' },
}

/** Half-circle gauge for a 0–100 deal meter score */
export function DealMeterGauge({ score, size = 220 }) {
  const p = Math.max(0, Math.min(100, Number(score) || 0)) / 100
  const cx = 110, cy = 110, r = 88
  const pt = f => { const a = Math.PI * (1 - f); return [cx + r * Math.cos(a), cy - r * Math.sin(a)] }
  const arc = f => { const [x0, y0] = pt(0), [x1, y1] = pt(f); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}` }
  const [nx, ny] = (() => { const a = Math.PI * (1 - p); return [cx + (r - 24) * Math.cos(a), cy - (r - 24) * Math.sin(a)] })()
  return (
    <svg viewBox="0 0 220 130" width={size} role="img" aria-label={`Deal meter ${Math.round(p * 100)} of 100`} className="max-w-full">
      <path d={arc(1)} stroke="#e5e7eb" strokeWidth="18" fill="none" strokeLinecap="round" />
      {p > 0.005 && <path d={arc(p)} stroke={TONES[meterTone(p * 100)].stroke} strokeWidth="18" fill="none" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="#111827" />
      <text x={cx} y={cy - 34} textAnchor="middle" fontSize="30" fontWeight="800" fill="#111827">{Math.round(p * 100)}</text>
      <text x={cx - r} y={cy + 18} textAnchor="middle" fontSize="10" fill="#6b7280">0</text>
      <text x={cx + r} y={cy + 18} textAnchor="middle" fontSize="10" fill="#6b7280">100</text>
    </svg>
  )
}

/** Compact chip for lists: "Deal meter 62 · Competitive" */
export function DealMeterChip({ score }) {
  if (score == null) return null
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[meterTone(score)].chip}`}>Deal meter {score} · {meterLabel(score)}</span>
}
