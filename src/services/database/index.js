/**
 * Database Services Index
 * Central export for all database services
 */

export { propertyService } from './propertyService'
export { customerService } from './customerService'
export { agentService } from './agentService'
export { consultationService } from './consultationService'
export { referralService } from './referralService'
export { eventService } from './eventService'

// Re-export Supabase client and utilities
export { supabase, TABLES, isSupabaseConfigured } from '../../config/supabase'
