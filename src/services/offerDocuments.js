/**
 * Documents and change history for an offer. kind is 'bid' (buyer_bid_drafts, the
 * buyer proposed it) or 'proposal' (broker_offer_proposals, the broker built it).
 * Files live in the private offer-documents bucket at {kind}/{offer_id}/{doc_type}/{file};
 * can_access_offer_docs() lets in the buyer, their broker and admins.
 */

import { supabase } from '../config/supabase'

const BUCKET = 'offer-documents'
export const MAX_FILE_BYTES = 15 * 1024 * 1024
export const ACCEPT = 'application/pdf,image/jpeg,image/png,image/heic,image/webp'

export const DOC_TYPES = [
  { id: 'bid_confirmation', label: 'HUD bid confirmation' },
  { id: 'prequalification', label: 'Pre-qualification / pre-approval letter' },
  { id: 'earnest_money', label: 'Earnest money deposit' },
  { id: 'sales_contract', label: 'Sales contract (HUD-9548)' },
  { id: 'addendum', label: 'Addendum' },
  { id: 'inspection', label: 'Inspection report' },
  { id: 'closing', label: 'Closing documents' },
  { id: 'other', label: 'Other' },
]
export const docTypeLabel = (id) => DOC_TYPES.find(t => t.id === id)?.label || id

const offerColumn = (kind) => (kind === 'bid' ? 'bid_draft_id' : 'proposal_id')

export async function getOfferDetails(kind, id) {
  const { data, error } = await supabase.rpc('get_offer_details', { p_kind: kind, p_offer_id: id })
  if (error) throw error
  return data
}

export async function getOfferTimeline(kind, id) {
  const { data, error } = await supabase.rpc('get_offer_timeline', { p_kind: kind, p_offer_id: id })
  if (error) throw error
  return data || []
}

export async function listDocuments(kind, id) {
  const { data, error } = await supabase.from('offer_documents')
    .select('id, doc_type, storage_path, file_name, mime_type, size_bytes, notes, uploaded_by, created_at')
    .eq(offerColumn(kind), id).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadDocument(kind, id, docType, file, notes = '') {
  if (file.size > MAX_FILE_BYTES) throw new Error('Files can be up to 15 MB.')
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)
  const path = `${kind}/${id}/${docType}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
  if (uploadError) throw uploadError
  const { data, error } = await supabase.from('offer_documents').insert([{
    [offerColumn(kind)]: id, doc_type: docType, storage_path: path, file_name: file.name,
    mime_type: file.type || null, size_bytes: file.size, notes: notes.trim() || null,
  }]).select().single()
  if (error) {
    // Don't leave an orphaned file behind when the row is refused
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

/** A short-lived link to open or download the file. */
export async function documentUrl(doc, { download = false } = {}) {
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(doc.storage_path, 300, download ? { download: doc.file_name } : undefined)
  if (error) throw error
  return data.signedUrl
}

/** Saves the file. A signed link with a download name, so it stays on this page (and works on iPhone). */
export async function downloadDocument(doc) {
  const url = await documentUrl(doc, { download: true })
  const a = document.createElement('a')
  a.href = url
  a.download = doc.file_name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function deleteDocument(doc) {
  const { data, error } = await supabase.from('offer_documents').delete().eq('id', doc.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Only the person who uploaded this file (or an admin) can remove it.')
  await supabase.storage.from(BUCKET).remove([doc.storage_path])
}

/** Notes left on the offer's documents, oldest first, grouped by document id. */
export async function listDocumentNotes(documentIds) {
  if (!documentIds.length) return {}
  const { data, error } = await supabase.from('offer_document_notes')
    .select('id, document_id, body, author_id, author_name, created_at')
    .in('document_id', documentIds).order('created_at', { ascending: true })
  if (error) throw error
  const byDoc = {}
  for (const n of data || []) (byDoc[n.document_id] ||= []).push(n)
  return byDoc
}

export async function addDocumentNote(documentId, body) {
  const text = String(body || '').trim()
  if (!text) throw new Error('Write a note first.')
  const { data, error } = await supabase.from('offer_document_notes')
    .insert([{ document_id: documentId, body: text }])
    .select('id, document_id, body, author_id, author_name, created_at').single()
  if (error) throw error
  return data
}

export async function deleteDocumentNote(noteId) {
  const { data, error } = await supabase.from('offer_document_notes').delete().eq('id', noteId).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Only the person who wrote this note (or an admin) can remove it.')
}

export const offerPagePath = (kind, id) => `/offers/${kind}/${id}`
