/**
 * Email Template Editor — create and edit the saved templates offered in
 * Compose Email (lead detail page and the broker email composer).
 * Templates are plain text with {{merge_field}} placeholders.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Save, Copy, Trash2, Mail, Star, Eye, EyeOff, RefreshCw, Info } from 'lucide-react'
import {
  MERGE_FIELDS, listTemplates, saveTemplate, deleteTemplate,
  templateToText, fillTemplate, fieldsUsed, sampleValues,
} from '../../services/emailTemplates'

const BLANK = {
  name: '', description: '', subject: '', body: 'Hi {{first_name}},\n\n\n\nBest regards,\n{{agent_name}}\n{{agent_phone}}',
  video_url: '', is_primary: false, is_active: true,
}

const GROUPS = [...new Set(MERGE_FIELDS.map(f => f.group))]
const KNOWN = new Set(MERGE_FIELDS.map(f => f.key))

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // template being edited
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const bodyRef = useRef(null)
  const subjectRef = useRef(null)
  const lastFocused = useRef('body')

  const load = async (selectId) => {
    setLoading(true)
    try {
      const list = await listTemplates()
      setTemplates(list)
      const pick = list.find(t => t.id === selectId) || (!form && list[0])
      if (pick) openTemplate(pick)
    } catch (e) {
      setError(`Could not load templates: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDiscard = () => !dirty || window.confirm('Discard unsaved changes?')

  function openTemplate(t) {
    setForm({
      ...BLANK,
      ...t,
      description: t.description || '',
      video_url: t.video_url || '',
      body: templateToText(t.body), // older templates were HTML
    })
    setDirty(false)
    setError(null)
    setMessage(null)
  }

  const select = (t) => { if (confirmDiscard()) openTemplate(t) }

  const startNew = () => {
    if (!confirmDiscard()) return
    setForm({ ...BLANK })
    setDirty(false)
    setError(null)
    setMessage(null)
  }

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
    setMessage(null)
  }

  // Insert {{field}} at the cursor in whichever box was used last
  const insertField = (key) => {
    const target = lastFocused.current === 'subject' ? subjectRef.current : bodyRef.current
    const field = lastFocused.current === 'subject' ? 'subject' : 'body'
    const token = `{{${key}}}`
    const value = form[field] || ''
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    update(field, value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      if (!target) return
      target.focus()
      target.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Give the template a name.')
    if (!form.subject.trim()) return setError('Add a subject line.')
    if (!form.body.trim()) return setError('Write the message.')
    setSaving(true)
    setError(null)
    try {
      const saved = await saveTemplate(form)
      setMessage('Template saved.')
      setDirty(false)
      await load(saved.id)
      setMessage('Template saved.')
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = () => {
    if (!confirmDiscard()) return
    const copy = { ...form, id: undefined, name: `${form.name} (Copy)`, is_primary: false }
    delete copy.created_at
    delete copy.updated_at
    setForm(copy)
    setDirty(true)
    setMessage('Copy created — save it to keep it.')
  }

  const handleDelete = async () => {
    if (!form?.id) { setForm(null); setDirty(false); return }
    if (!window.confirm(`Delete the template "${form.name}"? This cannot be undone.`)) return
    try {
      await deleteTemplate(form.id)
      setForm(null)
      setDirty(false)
      await load()
      setMessage('Template deleted.')
    } catch (e) {
      setError(`Delete failed: ${e.message}`)
    }
  }

  const samples = { ...sampleValues(), ...(form?.video_url ? { video_url: form.video_url } : {}) }
  const unknownFields = form ? fieldsUsed(form.subject, form.body).filter(k => !KNOWN.has(k)) : []
  const needsVideo = form && fieldsUsed(form.subject, form.body).includes('video_url') && !form.video_url.trim()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-sm text-gray-600">
            Templates appear under Compose Email on a lead's page and in the broker email composer.
          </p>
        </div>
        <button onClick={startNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Template list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Saved templates</span>
            <button onClick={() => load(form?.id)} className="p-1 text-gray-400 hover:text-gray-600" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {templates.length === 0 && !loading ? (
            <p className="px-4 py-6 text-sm text-gray-500">No templates yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {templates.map(t => (
                <li key={t.id}>
                  <button onClick={() => select(t)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${form?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium ${t.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{t.name}</span>
                      {t.is_primary && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" title="Default" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.subject}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        {!form ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            Select a template to edit, or create a new one.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-700 mb-1">Template name *</span>
                  <input value={form.name} onChange={e => update('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. First follow-up" />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-700 mb-1">Description (only you see this)</span>
                  <input value={form.description} onChange={e => update('description', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="When to use it" />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-semibold text-gray-700 mb-1">Subject *</span>
                <input ref={subjectRef} value={form.subject}
                  onChange={e => update('subject', e.target.value)}
                  onFocus={() => { lastFocused.current = 'subject' }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject line" />
              </label>

              {/* Merge fields */}
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">
                  Insert a field <span className="font-normal text-gray-500">(goes where your cursor is; filled in automatically when composing)</span>
                </span>
                <div className="space-y-1.5">
                  {GROUPS.map(group => (
                    <div key={group} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-14">{group}</span>
                      {MERGE_FIELDS.filter(f => f.group === group).map(f => (
                        <button key={f.key} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertField(f.key)}
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100"
                          title={`{{${f.key}}}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="block text-xs font-semibold text-gray-700 mb-1">Message *</span>
                <textarea ref={bodyRef} value={form.body} rows={14}
                  onChange={e => update('body', e.target.value)}
                  onFocus={() => { lastFocused.current = 'body' }}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-gray-700 mb-1">Video link for {'{{video_url}}'} (optional)</span>
                <input value={form.video_url} onChange={e => update('video_url', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.youtube.com/watch?v=…" />
              </label>

              <div className="flex flex-wrap gap-5">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} />
                  {form.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} Show in Compose Email
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_primary} onChange={e => update('is_primary', e.target.checked)} />
                  <Star className="w-4 h-4" /> Default template (listed first)
                </label>
              </div>

              {(unknownFields.length > 0 || needsVideo) && (
                <div className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <div>
                    {unknownFields.length > 0 && <p>Not a known field (it will be sent as typed): {unknownFields.map(k => `{{${k}}}`).join(', ')}</p>}
                    {needsVideo && <p>This template uses {'{{video_url}}'} but no video link is set.</p>}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-700">{message}</p>}

              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <div className="flex gap-2">
                  <button onClick={handleDelete} type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" /> {form.id ? 'Delete' : 'Discard'}
                  </button>
                  {form.id && (
                    <button onClick={handleDuplicate} type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Copy className="w-4 h-4" /> Duplicate
                    </button>
                  )}
                </div>
                <button onClick={handleSave} disabled={saving || (!dirty && !!form.id)} type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Save Template'}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Preview</span>
                <span className="text-xs text-gray-500">with sample lead Jane Smith</span>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500">Subject</p>
                <p className="font-semibold text-gray-900 mb-4">{fillTemplate(form.subject, samples) || '—'}</p>
                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {fillTemplate(form.body, samples)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
