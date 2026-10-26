/**
 * Referring broker signs a buyer referral agreement: type a legal name (e-signature)
 * or upload a signed PDF. Either way the three section-5 confirmations are required.
 */

import React, { useState } from 'react'
import { X, FileSignature, Upload } from 'lucide-react'
import { ATTESTATIONS, AGREEMENT_STATUSES, money, shortDate } from '../../data/buyerReferralProgram'
import { signAgreement, uploadAgreementPdf } from '../../services/buyerReferrals'

export default function AgreementSignDialog({ agreement, onClose, onSigned }) {
  const [method, setMethod] = useState('esign')
  const [signerName, setSignerName] = useState('')
  const [signerTitle, setSignerTitle] = useState('')
  const [file, setFile] = useState(null)
  const [checks, setChecks] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSign = agreement.status === 'awaiting_referring'
  const allChecked = ATTESTATIONS.every(a => checks[a.key])
  const ready = allChecked && (method === 'esign' ? signerName.trim().length > 2 : !!file)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const documentPath = method === 'pdf' ? await uploadAgreementPdf(agreement, file) : null
      await signAgreement(agreement.id, { signerName, signerTitle, documentPath })
      onSigned()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Buyer referral agreement</h2>
            <p className="text-sm text-gray-500">
              {Math.round(agreement.referral_pct * 100)}% of commission, capped at {money(agreement.fee_cap)} · protection through {shortDate(agreement.protection_ends_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-gray-50 border rounded-lg p-4 font-sans text-gray-800 max-h-72 overflow-y-auto">{agreement.agreement_text}</pre>

          {!canSign ? (
            <p className="text-sm text-gray-700">
              Status: <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${AGREEMENT_STATUSES[agreement.status]?.cls}`}>{AGREEMENT_STATUSES[agreement.status]?.label}</span>
              {agreement.referring_signer_name && <> · signed by {agreement.referring_signer_name} {agreement.referring_signed_at && `on ${shortDate(agreement.referring_signed_at)}`}</>}
              {agreement.method === 'pdf' && <> · signed PDF on file</>}
            </p>
          ) : (
            <form id="sign-agreement" onSubmit={submit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setMethod('esign')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${method === 'esign' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                  <FileSignature className="h-4 w-4" /> Sign electronically
                </button>
                <button type="button" onClick={() => setMethod('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${method === 'pdf' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                  <Upload className="h-4 w-4" /> Upload signed PDF
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="font-medium text-gray-700">{method === 'esign' ? 'Full legal name (your signature)' : 'Signer name'}</span>
                  <input value={signerName} onChange={e => setSignerName(e.target.value)} required={method === 'esign'}
                    className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Broker or authorized agent" />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-gray-700">Title</span>
                  <input value={signerTitle} onChange={e => setSignerTitle(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Broker-in-charge, agent…" />
                </label>
              </div>

              {method === 'pdf' && (
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Signed agreement (PDF, up to 10 MB)</span>
                  <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm" />
                </label>
              )}

              <fieldset className="space-y-2">
                {ATTESTATIONS.map(a => (
                  <label key={a.key} className="flex gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-1" checked={!!checks[a.key]}
                      onChange={e => setChecks(c => ({ ...c, [a.key]: e.target.checked }))} />
                    <span>{a.label}</span>
                  </label>
                ))}
              </fieldset>

              {method === 'esign' && (
                <p className="text-xs text-gray-500">Typing your name and clicking Sign is your electronic signature on behalf of your brokerage.</p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-gray-700">Close</button>
          {canSign && (
            <button type="submit" form="sign-agreement" disabled={!ready || saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : method === 'esign' ? 'Sign agreement' : 'Upload agreement'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
