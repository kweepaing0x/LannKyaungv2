import { createClient } from "@supabase/supabase-js";

// ── Paste your Supabase keys here ──────────────────────────────
// Supabase Console → Project Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON);
