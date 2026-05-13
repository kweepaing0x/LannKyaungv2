// ─────────────────────────────────────────────────────────────
// src/supabase.js
// Supabase Console → Project Settings → API
// Copy "Project URL" and "anon public" key below
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://ccrndognodytzqgsdwlb.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcm5kb2dub2R5dHpxZ3Nkd2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTA0MjgsImV4cCI6MjA5NDE4NjQyOH0.1KafAemZ9RuUcROw41mrL6oIeGauArnkvSGT9dvHz2I";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
