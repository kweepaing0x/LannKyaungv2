// ─────────────────────────────────────────────────────────────
// src/supabase.js
// Supabase Console → Project Settings → API
// Copy "Project URL" and "anon public" key below
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "REPLACE_WITH_YOUR_PROJECT_URL";
const SUPABASE_ANON = "REPLACE_WITH_YOUR_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
