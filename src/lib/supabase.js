import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// ── Storefront client ─────────────────────────────────────────────────────────
// Handles customer OAuth / email sessions. Persists across tabs & refreshes.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    flowType:           'pkce',
    detectSessionInUrl: true,
    persistSession:     true,
    autoRefreshToken:   true,
    storageKey:         'jj_store_session',
  },
})

// ── ERP admin client ──────────────────────────────────────────────────────────
// Uses a SEPARATE storageKey so ERP and storefront sessions never collide.
// ERP staff authenticate via Supabase Auth (real JWT, not fake token).
export const supabaseERP = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    flowType:           'pkce',
    detectSessionInUrl: false,
    persistSession:     true,
    autoRefreshToken:   true,
    storageKey:         'jj_erp_session',
  },
})

// ── Legacy alias (used by appData.js and admin views via supabaseAdmin) ───────
export const supabaseAdmin = supabaseERP
