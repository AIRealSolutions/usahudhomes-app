/**
 * Active-listing counts by state and city for the search dropdowns.
 * Counted in the database (property_state_counts / property_city_counts) so the
 * lists are never cut short by the API's 1000-row limit.
 */

import { supabase } from '../config/supabase'
import { US_STATES } from '../utils/states'

let stateCountsPromise = null
const cityCache = new Map()

/** @returns {Promise<Object<string, number>>} listings per state code, e.g. { NC: 17 } */
export function getStateCounts() {
  if (!stateCountsPromise) {
    stateCountsPromise = supabase.rpc('property_state_counts').then(({ data, error }) => {
      if (error) {
        stateCountsPromise = null
        throw error
      }
      return Object.fromEntries((data || []).map(r => [r.state, Number(r.listings)]))
    })
  }
  return stateCountsPromise
}

/**
 * Every state (plus DC) with its listing count, A–Z by name. States with no
 * current listings are included so buyers can still search them.
 */
export async function getStateOptions() {
  let counts = {}
  try {
    counts = await getStateCounts()
  } catch (err) {
    console.error('Error loading state counts:', err)
  }
  const known = new Set(US_STATES.map(s => s.code))
  const extra = Object.keys(counts)
    .filter(code => !known.has(code))
    .map(code => ({ code, name: code }))
  return [...US_STATES, ...extra]
    .map(s => ({ ...s, listings: counts[s.code] || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** @returns {Promise<Array<{city: string, listings: number}>>} */
export async function getCityOptions(stateCode) {
  if (!stateCode) return []
  const key = stateCode.toUpperCase()
  if (!cityCache.has(key)) {
    const { data, error } = await supabase.rpc('property_city_counts', { p_state: key })
    if (error) throw error
    cityCache.set(key, (data || []).map(r => ({ city: r.city, listings: Number(r.listings) })))
  }
  return cityCache.get(key)
}

/** "North Carolina (17)" */
export function stateLabel(option) {
  return `${option.name} (${option.listings})`
}
