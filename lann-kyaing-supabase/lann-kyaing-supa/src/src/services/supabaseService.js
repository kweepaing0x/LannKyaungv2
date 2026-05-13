import { supabase, isConfigured } from "../supabase";
import dayjs from "dayjs";

// ── MMT time helper ───────────────────────────────────────────
export function getNowMMT() {
  const now = new Date();
  const mmt = new Date(now.getTime() + (6.5 * 60 + now.getTimezoneOffset()) * 60000);
  return `${String(mmt.getHours()).padStart(2,"0")}:${String(mmt.getMinutes()).padStart(2,"0")} (MMT)`;
}

// ── Guard: throw if Supabase not configured ───────────────────
function requireSupabase() {
  if (!isConfigured || !supabase)
    throw new Error("Supabase not configured. Add keys to .env file.");
}

// ── AUTH ──────────────────────────────────────────────────────
export async function signIn(email, password) {
  requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isConfigured || !supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  // If not configured — call back with null immediately so app shows login
  if (!isConfigured || !supabase) {
    setTimeout(() => callback(null), 0);
    return () => {};
  }

  // Fire immediately with current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

// ── USER DOC ──────────────────────────────────────────────────
export async function getUserDoc(authUid) {
  requireSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", authUid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUserDoc(uid, updates) {
  requireSupabase();
  const { error } = await supabase.from("users").update(updates).eq("uid", uid);
  if (error) throw error;
}

// ── ADMIN CONFIG ──────────────────────────────────────────────
export async function getAdminConfig() {
  if (!isConfigured || !supabase) return null;
  const { data } = await supabase.from("admin_config").select("*").maybeSingle();
  return data;
}

// ── SITUATION TYPES ───────────────────────────────────────────
export async function getSituationTypes() {
  if (!isConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from("situation_types")
    .select("*")
    .eq("is_active", true)
    .order("severity", { ascending: false });
  if (error) throw error;
  return data;
}

// ── TIME WINDOWS ──────────────────────────────────────────────
export async function getTimeWindows() {
  if (!isConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from("time_window_options")
    .select("*")
    .eq("is_active", true)
    .order("minutes");
  if (error) throw error;
  return data;
}

// ── LIVE PINS ─────────────────────────────────────────────────
export function subscribePins(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }

  const fetch = () =>
    supabase
      .from("pins")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("posted_at", { ascending: false })
      .then(({ data }) => callback(data || []));

  fetch();

  const ch = supabase
    .channel("pins-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"pins" }, fetch)
    .subscribe();

  return () => supabase.removeChannel(ch);
}

// ── HISTORY PINS ──────────────────────────────────────────────
export function subscribeHistoryPins(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }

  const now          = new Date().toISOString();
  const sevenDaysAgo = dayjs().subtract(7,"day").toISOString();

  supabase
    .from("pins")
    .select("*")
    .lte("expires_at", now)
    .gte("expires_at", sevenDaysAgo)
    .order("posted_at", { ascending: false })
    .then(({ data }) => callback((data||[]).map(p => ({ ...p, is_history:true }))));

  return () => {};
}

// ── POST PIN ──────────────────────────────────────────────────
export async function postPin({ type, emoji, lat, lng, postedBy, labelMy, labelEn }) {
  requireSupabase();
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("pins").insert({
    type, emoji,
    label_my:   labelMy,
    label_en:   labelEn,
    lat, lng,
    posted_by:  postedBy,
    posted_at:  now.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_history: false,
  });
  if (error) throw error;
}

// ── CHECK REQUESTS ────────────────────────────────────────────
export function subscribeCheckRequests(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }

  const fetch = () =>
    supabase
      .from("check_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => callback(data || []));

  fetch();

  const ch = supabase
    .channel("checkreqs-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"check_requests" }, fetch)
    .subscribe();

  return () => supabase.removeChannel(ch);
}

export async function postCheckRequest({
  requesterUid, targetLat, targetLng, targetLabel, windowMinutes, creditsCost,
}) {
  requireSupabase();
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

  // 1. Insert request
  const { error: reqErr } = await supabase.from("check_requests").insert({
    requester_uid:  requesterUid,
    target_lat:     targetLat,
    target_lng:     targetLng,
    target_label:   targetLabel || "Custom location",
    window_minutes: windowMinutes,
    credits_cost:   creditsCost,
    status:         "pending",
    created_at:     now.toISOString(),
    expires_at:     expiresAt.toISOString(),
  });
  if (reqErr) throw reqErr;

  // 2. Deduct credits
  const { data: u, error: fetchErr } = await supabase
    .from("users").select("balance_credits,total_spent").eq("uid", requesterUid).single();
  if (fetchErr) throw fetchErr;

  const newBalance = (u.balance_credits || 0) - creditsCost;
  if (newBalance < 0) throw new Error("Insufficient credits");

  const { error: updErr } = await supabase
    .from("users")
    .update({ balance_credits: newBalance, total_spent: (u.total_spent||0) + creditsCost })
    .eq("uid", requesterUid);
  if (updErr) throw updErr;

  // 3. Log transaction
  await supabase.from("transactions").insert({
    uid: requesterUid, type:"spend", amount: -creditsCost,
    description: `Check request · ${windowMinutes} min`,
    created_at: now.toISOString(),
  });
}
