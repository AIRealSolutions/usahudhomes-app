import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Save, Plus, Trash2, Copy, ChevronDown, ChevronUp, Eye,
  Palette, Type, Layout, Bell, Film, Check, X, GripVertical,
  Smartphone, Monitor
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

// ─── Default template values ──────────────────────────────────────────────────
const DEFAULT_TEMPLATE = {
  name: 'New Template',
  description: '',
  agency_name: 'Lightkeeper Realty',
  agency_phone: '910.363.6147',
  agency_website: 'USAHUDhomes.com',
  logo_url: '',
  color_primary: '#1a2744',
  color_accent: '#e8a020',
  color_background: '#0d1b2a',
  color_text: '#ffffff',
  font_family: 'DejaVu Sans',
  cta_line1: 'Visit USAHUDhomes.com',
  cta_line2: 'Call Marc Spencer: 910.363.6147',
  cta_line3: 'Get pre-qualified & bid',
  incentive1_title: '$100 DOWN',
  incentive1_sub: 'FHA Loan',
  incentive1_body: 'Buy this HUD home with just $100 down using an FHA loan.',
  incentive2_title: '3% CLOSING',
  incentive2_sub: 'Costs Paid',
  incentive2_body: 'HUD pays up to 3% of the purchase price toward closing costs.',
  incentive3_title: '$35K REPAIR',
  incentive3_sub: '203k Escrow',
  incentive3_body: 'Finance repairs into your mortgage with a 203k escrow loan.',
  subscribe_overlay_enabled: true,
  subscribe_overlay_start_sec: 2.0,
  subscribe_overlay_duration_sec: 2.5,
  slide_order: ['hero', 'details', 'incentives', 'agency', 'cta'],
  slide_duration_sec: 4.0,
  transition_duration_sec: 0.4,
  video_format: 'reels',
}

const SLIDE_LABELS = {
  hero: { label: 'Hero Photo', desc: 'Full-bleed property photo with price & status' },
  details: { label: 'Listing Details', desc: 'Case #, beds, baths, county, bids open' },
  incentives: { label: 'Incentives', desc: '$100 Down, 3% Closing, 203k Repair' },
  agency: { label: 'Agency Brand', desc: 'Agency name, phone, website' },
  cta: { label: 'Call to Action', desc: 'CTA lines + subscribe overlay' },
}

const FONT_OPTIONS = [
  'DejaVu Sans', 'DejaVu Serif', 'Liberation Sans', 'Liberation Serif',
  'Ubuntu', 'FreeSans', 'FreeMono',
]

// ─── Live Phone Preview ───────────────────────────────────────────────────────
function SlidePreview({ template, activeSlide, sampleProperty }) {
  const bg = template.color_background || '#0d1b2a'
  const primary = template.color_primary || '#1a2744'
  const accent = template.color_accent || '#e8a020'
  const text = template.color_text || '#ffffff'

  const slides = {
    hero: (
      <div className="relative w-full h-full flex flex-col justify-end" style={{ background: `linear-gradient(to bottom, ${primary}88, ${bg})` }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-20 h-20 rounded-full border-4" style={{ borderColor: accent }} />
        </div>
        <div className="p-4 z-10">
          <div className="inline-block px-2 py-0.5 rounded text-xs font-bold mb-2" style={{ background: accent, color: bg }}>
            {sampleProperty?.status || 'NEW LISTING'}
          </div>
          <div className="text-2xl font-black" style={{ color: accent }}>
            ${(sampleProperty?.price || 149900).toLocaleString()}
          </div>
          <div className="text-sm font-semibold mt-1" style={{ color: text }}>
            {sampleProperty?.city || 'Wilmington'}, {sampleProperty?.state || 'NC'}
          </div>
          <div className="text-xs mt-0.5 opacity-70" style={{ color: text }}>
            {sampleProperty?.beds || 3} bed · {sampleProperty?.baths || 2} bath · {sampleProperty?.county || 'New Hanover'} County
          </div>
        </div>
      </div>
    ),
    details: (
      <div className="p-3 h-full flex flex-col" style={{ background: primary }}>
        <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: accent }}>Listing Details</div>
        {[
          ['Case #', sampleProperty?.case_number || '387-087425'],
          ['City', `${sampleProperty?.city || 'Wilmington'}, ${sampleProperty?.state || 'NC'}`],
          ['County', sampleProperty?.county || 'New Hanover'],
          ['Price', `$${(sampleProperty?.price || 149900).toLocaleString()}`],
          ['Beds / Baths', `${sampleProperty?.beds || 3} / ${sampleProperty?.baths || 2}`],
          ['Bids Open', sampleProperty?.bids_open || '03/15/2026'],
          ['Status', sampleProperty?.status || 'BIDS OPEN'],
        ].map(([k, v], i) => (
          <div key={k} className="flex justify-between text-xs py-1" style={{ background: i % 2 === 0 ? `${bg}44` : 'transparent', color: text }}>
            <span className="opacity-60">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    ),
    incentives: (
      <div className="p-3 h-full flex flex-col justify-center gap-2" style={{ background: '#0a2a1a' }}>
        <div className="text-xs font-bold mb-1 uppercase tracking-wider text-center" style={{ color: accent }}>Owner-Occupant Incentives</div>
        {[
          [template.incentive1_title, template.incentive1_sub, template.incentive1_body],
          [template.incentive2_title, template.incentive2_sub, template.incentive2_body],
          [template.incentive3_title, template.incentive3_sub, template.incentive3_body],
        ].map(([title, sub, body], i) => (
          <div key={i} className="rounded p-2" style={{ background: `${primary}88` }}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs font-black" style={{ color: accent }}>{title}</span>
              <span className="text-xs opacity-60" style={{ color: text }}>{sub}</span>
            </div>
            <div className="text-xs opacity-70 leading-tight" style={{ color: text }}>{body}</div>
          </div>
        ))}
      </div>
    ),
    agency: (
      <div className="p-4 h-full flex flex-col justify-center items-center text-center gap-2" style={{ background: primary }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ background: accent }}>
          <span className="text-xl font-black" style={{ color: bg }}>LR</span>
        </div>
        <div className="text-sm font-black" style={{ color: text }}>{template.agency_name}</div>
        <div className="text-xs opacity-70" style={{ color: text }}>Registered HUD Buyer's Agency</div>
        <div className="text-xs font-bold mt-1 px-3 py-1 rounded-full" style={{ background: accent, color: bg }}>{template.agency_phone}</div>
        <div className="text-xs opacity-60 mt-1" style={{ color: text }}>{template.agency_website}</div>
      </div>
    ),
    cta: (
      <div className="p-4 h-full flex flex-col justify-center gap-3" style={{ background: bg }}>
        <div className="text-xs font-bold uppercase tracking-wider text-center mb-1" style={{ color: accent }}>Get Started Today</div>
        {[template.cta_line1, template.cta_line2, template.cta_line3].map((line, i) => (
          <div key={i} className="flex items-center gap-2 text-xs" style={{ color: text }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: accent, color: bg }}>{i + 1}</span>
            {line}
          </div>
        ))}
        {template.subscribe_overlay_enabled && (
          <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#ff0000ee' }}>
            <Bell className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-bold">SUBSCRIBE</span>
            <span className="text-white text-xs opacity-80 ml-auto">👍 LIKE</span>
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="relative mx-auto overflow-hidden rounded-2xl shadow-2xl border-4 border-gray-700"
      style={{ width: 180, height: 320, background: bg }}>
      {slides[activeSlide] || slides.hero}
      {/* Phone notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-gray-900 rounded-b-lg z-20" />
    </div>
  )
}

// ─── Slide Order Drag List ────────────────────────────────────────────────────
function SlideOrderEditor({ order, onChange }) {
  const move = (from, to) => {
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }
  return (
    <div className="space-y-1">
      {order.map((slide, i) => (
        <div key={slide} className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{SLIDE_LABELS[slide]?.label}</div>
            <div className="text-xs text-gray-500 truncate">{SLIDE_LABELS[slide]?.desc}</div>
          </div>
          <div className="flex gap-1">
            <button disabled={i === 0} onClick={() => move(i, i - 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronUp className="w-3 h-3" />
            </button>
            <button disabled={i === order.length - 1} onClick={() => move(i, i + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section Accordion ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon className="w-4 h-4 text-blue-600" />
          {title}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-3 space-y-3 bg-white">{children}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
        <Input value={value} onChange={e => onChange(e.target.value)}
          className="font-mono text-xs h-8" maxLength={7} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoTemplateBuilder() {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null) // template being edited
  const [form, setForm] = useState(DEFAULT_TEMPLATE)
  const [activeSlide, setActiveSlide] = useState('hero')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('video_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTemplates(data || [])
    setLoading(false)
  }

  const handleSelect = (tmpl) => {
    setSelected(tmpl)
    setForm({ ...DEFAULT_TEMPLATE, ...tmpl })
    setActiveSlide('hero')
    setSaved(false)
  }

  const handleNew = () => {
    setSelected(null)
    setForm({ ...DEFAULT_TEMPLATE, name: `Template ${templates.length + 1}` })
    setActiveSlide('hero')
    setSaved(false)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form }
      delete payload.id
      delete payload.created_at
      delete payload.updated_at

      if (selected?.id) {
        const { error } = await supabase.from('video_templates').update(payload).eq('id', selected.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('video_templates').insert(payload).select().single()
        if (error) throw error
        setSelected(data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadTemplates()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDuplicate = async (tmpl) => {
    const { id, created_at, updated_at, is_default, ...rest } = tmpl
    const { data, error } = await supabase.from('video_templates')
      .insert({ ...rest, name: `${rest.name} (Copy)`, is_default: false })
      .select().single()
    if (!error) { await loadTemplates(); handleSelect(data) }
  }

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Delete template "${tmpl.name}"?`)) return
    await supabase.from('video_templates').delete().eq('id', tmpl.id)
    if (selected?.id === tmpl.id) { setSelected(null); setForm(DEFAULT_TEMPLATE) }
    await loadTemplates()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-600" />
            Video Template Builder
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Design reusable Reels/Shorts templates. Save a template, then select properties to bulk-generate videos.
          </p>
        </div>
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Template List ── */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Saved Templates</div>
          {loading ? (
            <div className="text-sm text-gray-400 p-4 text-center">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-400 p-4 text-center border border-dashed rounded-lg">
              No templates yet. Click "New Template" to create one.
            </div>
          ) : (
            templates.map(tmpl => (
              <div key={tmpl.id}
                onClick={() => handleSelect(tmpl)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === tmpl.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{tmpl.name}</div>
                    {tmpl.is_default && <Badge variant="secondary" className="text-xs mt-0.5">Default</Badge>}
                    <div className="flex gap-1 mt-1">
                      {['color_primary', 'color_accent', 'color_background'].map(k => (
                        <div key={k} className="w-4 h-4 rounded-full border border-gray-300" style={{ background: tmpl[k] }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleDuplicate(tmpl) }}
                      className="p-1 rounded hover:bg-gray-100" title="Duplicate">
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    {!tmpl.is_default && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(tmpl) }}
                        className="p-1 rounded hover:bg-red-50" title="Delete">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Editor ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              className="text-base font-bold max-w-xs" placeholder="Template name" />
            <Button onClick={handleSave} disabled={saving} size="sm"
              className={saved ? 'bg-green-600 hover:bg-green-700' : ''}>
              {saved ? <><Check className="w-4 h-4 mr-1" /> Saved!</> : saving ? 'Saving...' : <><Save className="w-4 h-4 mr-1" /> Save Template</>}
            </Button>
          </div>

          <Field label="Description">
            <Input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Optional notes about this template" />
          </Field>

          {/* Video format toggle */}
          <div className="flex gap-2">
            {[
              { id: 'reels', label: 'Reels / Shorts', icon: Smartphone, desc: '1080×1920 · 9:16' },
              { id: 'landscape', label: 'Landscape', icon: Monitor, desc: '1280×720 · 16:9' },
            ].map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => set('video_format', id)}
                className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${form.video_format === id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <Icon className={`w-5 h-5 ${form.video_format === id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Accordion sections */}
          <Section title="Agency Branding" icon={Type} defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agency Name">
                <Input value={form.agency_name} onChange={e => set('agency_name', e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={form.agency_phone} onChange={e => set('agency_phone', e.target.value)} />
              </Field>
              <Field label="Website">
                <Input value={form.agency_website} onChange={e => set('agency_website', e.target.value)} />
              </Field>
              <Field label="Logo URL">
                <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </Section>

          <Section title="Color Palette" icon={Palette}>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primary (Navy)" value={form.color_primary} onChange={v => set('color_primary', v)} />
              <ColorField label="Accent (Gold)" value={form.color_accent} onChange={v => set('color_accent', v)} />
              <ColorField label="Background" value={form.color_background} onChange={v => set('color_background', v)} />
              <ColorField label="Text" value={form.color_text} onChange={v => set('color_text', v)} />
            </div>
            <Field label="Font Family">
              <select value={form.font_family} onChange={e => set('font_family', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Incentives Slide" icon={Layout}>
            {[1, 2, 3].map(n => (
              <div key={n} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-gray-600">Incentive {n}</div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Title">
                    <Input value={form[`incentive${n}_title`]} onChange={e => set(`incentive${n}_title`, e.target.value)} className="text-sm" />
                  </Field>
                  <Field label="Subtitle">
                    <Input value={form[`incentive${n}_sub`]} onChange={e => set(`incentive${n}_sub`, e.target.value)} className="text-sm" />
                  </Field>
                </div>
                <Field label="Body Text">
                  <Textarea value={form[`incentive${n}_body`]} onChange={e => set(`incentive${n}_body`, e.target.value)} rows={2} className="text-sm" />
                </Field>
              </div>
            ))}
          </Section>

          <Section title="CTA Slide" icon={Type}>
            {[1, 2, 3].map(n => (
              <Field key={n} label={`Line ${n}`}>
                <Input value={form[`cta_line${n}`]} onChange={e => set(`cta_line${n}`, e.target.value)} />
              </Field>
            ))}
          </Section>

          <Section title="Subscribe Overlay" icon={Bell}>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.subscribe_overlay_enabled}
                  onChange={e => set('subscribe_overlay_enabled', e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Enable animated subscribe overlay</span>
              </label>
            </div>
            {form.subscribe_overlay_enabled && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label="Start at (seconds)">
                  <Input type="number" step="0.5" min="0" value={form.subscribe_overlay_start_sec}
                    onChange={e => set('subscribe_overlay_start_sec', parseFloat(e.target.value))} />
                </Field>
                <Field label="Duration (seconds)">
                  <Input type="number" step="0.5" min="0.5" value={form.subscribe_overlay_duration_sec}
                    onChange={e => set('subscribe_overlay_duration_sec', parseFloat(e.target.value))} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Slide Layout & Timing" icon={Film}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slide Duration (sec)">
                <Input type="number" step="0.5" min="2" max="10" value={form.slide_duration_sec}
                  onChange={e => set('slide_duration_sec', parseFloat(e.target.value))} />
              </Field>
              <Field label="Transition (sec)">
                <Input type="number" step="0.1" min="0.1" max="1" value={form.transition_duration_sec}
                  onChange={e => set('transition_duration_sec', parseFloat(e.target.value))} />
              </Field>
            </div>
            <Field label="Slide Order (drag to reorder)">
              <SlideOrderEditor order={form.slide_order || DEFAULT_TEMPLATE.slide_order}
                onChange={v => set('slide_order', v)} />
            </Field>
          </Section>
        </div>

        {/* ── Live Preview ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</div>
            <SlidePreview template={form} activeSlide={activeSlide} sampleProperty={null} />
            {/* Slide selector */}
            <div className="grid grid-cols-1 gap-1">
              {(form.slide_order || DEFAULT_TEMPLATE.slide_order).map(slide => (
                <button key={slide} onClick={() => setActiveSlide(slide)}
                  className={`text-left px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeSlide === slide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {SLIDE_LABELS[slide]?.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 text-center">
              {form.video_format === 'reels' ? '1080×1920 · 9:16 Reels/Shorts' : '1280×720 · 16:9 Landscape'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
