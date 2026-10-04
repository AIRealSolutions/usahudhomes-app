/**
 * Saved homes for the signed-in buyer (saved_properties).
 * One shared set so every heart on a page reflects the same state with a single query.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'

const SavedHomesContext = createContext(null)

export function SavedHomesProvider({ children }) {
  const { user } = useAuth()
  const [savedIds, setSavedIds] = useState(() => new Set()) // property ids

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return }
    let cancelled = false
    supabase.from('saved_properties').select('property_id').then(({ data, error }) => {
      if (error) console.error('Error loading saved homes:', error)
      else if (!cancelled) setSavedIds(new Set((data || []).map(r => r.property_id)))
    })
    return () => { cancelled = true }
  }, [user])

  const toggleSaved = useCallback(async (property) => {
    if (!user || !property?.id) return false
    const wasSaved = savedIds.has(property.id)
    // Update right away; undo if the database says no
    setSavedIds(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(property.id) : next.add(property.id)
      return next
    })
    const { error } = wasSaved
      ? await supabase.from('saved_properties').delete().eq('property_id', property.id)
      : await supabase.from('saved_properties').insert({
          property_id: property.id, case_number: property.case_number, price_at_save: property.price ?? null,
        })
    if (error && error.code !== '23505') { // 23505: already saved in another tab
      console.error('Error saving home:', error)
      setSavedIds(prev => {
        const next = new Set(prev)
        wasSaved ? next.add(property.id) : next.delete(property.id)
        return next
      })
      return wasSaved
    }
    return !wasSaved
  }, [user, savedIds])

  return (
    <SavedHomesContext.Provider value={{ savedIds, toggleSaved, signedIn: !!user }}>
      {children}
    </SavedHomesContext.Provider>
  )
}

export function useSavedHomes() {
  return useContext(SavedHomesContext) || { savedIds: new Set(), toggleSaved: async () => false, signedIn: false }
}

/** Saved homes with their current listing, newest saved first */
export async function listSavedHomes() {
  const { data, error } = await supabase
    .from('saved_properties')
    .select('id, case_number, price_at_save, created_at, properties (id, case_number, address, city, state, zip_code, price, original_list_price, status, is_active, beds, baths, sq_ft, main_image, under_contract_at)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
