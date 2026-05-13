import { supabase } from "../supabase";
import dayjs from "dayjs";

// ── MMT TIME ─────────────────────────────────────────────────────
export function getNowMMT() {
  const now = new Date();
  const mmt = new Date(now.getTime() + (6.5 * 60 + now.getTimezoneOffset()) * 60000);
  return `${String(mmt.getHours()).padStart(2,"0")}:${String(mmt.getMinutes()).padStart(2,"0")} (MMT)`;
}

// ── AUTH ─────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  await supabase.auth.signOut();
}
export function onAuthChange(callback) {
  // Fire immediately with current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ── USER DOC ─────────────────────────────────────────────────────
// Match by auth uid — the uid column stores the Supabase auth user id
export async function getUserDoc(authUid) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", authUid)
    .maybeSingle();          // returns null instead of error if not found
  if (error) throw error;
  return data;
}

export async function updateUserDoc(uid, updates) {
  const { error } = await supabase.from("users").update(updates).eq("uid", uid);
  if (error) throw error;
}

// ── ADMIN CONFIG ─────────────────────────────────────────────────
export async function getAdminConfig() {
  const { data, error } = await supabase
    .from("admin_config")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── SITUATION TYPES ──────────────────────────────────────────────
export async function getSituationTypes() {
  const { data, error } = await supabase
    .from("situation_types")
    .select("*")
    .eq("is_active", true)
    .order("severity", { ascending: false });
  if (error) throw error;
  return data;
}

// ── TIME WINDOW OPTIONS ──────────────────────────────────────────
export async function getTimeWindows() {
  const { data, error } = await supabase
    .from("time_window_options")
    .select("*")
    .eq("is_active", true)
    .order("minutes");
  if (error) throw error;
  return data;
}

// ── PINS — live ──────────────────────────────────────────────────
export function subscribePins(callback) {
  const fetchActive = () =>
    supabase
      .from("pins")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("posted_at", { ascending: false })
      .then(({ data }) => callback(data || []));

  fetchActive();

  const channel = supabase
    .channel("pins-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"pins" }, fetchActive)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── PINS — history ───────────────────────────────────────────────
export function subscribeHistoryPins(callback) {
  const now          = new Date().toISOString();
  const sevenDaysAgo = dayjs().subtract(7,"day").toISOString();
  supabase
    .from("pins")
    .select("*")
    .lte("expires_at", now)
    .gte("expires_at", sevenDaysAgo)
    .order("posted_at", { ascending: false })
    .then(({ data }) => callback((data||[]).map(p=>({...p,is_history:true}))));
}

// ── POST PIN ─────────────────────────────────────────────────────
export async function postPin({ type, emoji, lat, lng, postedBy, labelMy, labelEn }) {
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

// ── CHECK REQUESTS ────────────────────────────────────────────────
export function subscribeCheckRequests(callback) {
  const fetchPending = () =>
    supabase
      .from("check_requests")
      .select("*")
      .eq("status","pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => callback(data || []));

  fetchPending();

  const channel = supabase
    .channel("checkreqs-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"check_requests" }, fetchPending)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function postCheckRequest({
  requesterUid, targetLat, targetLng, targetLabel,
  windowMinutes, creditsCost,
}) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);

  // 1. Insert the request
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

  // 2. Deduct credits from user balance
  const { data: userData, error: fetchErr } = await supabase
    .from("users")
    .select("balance_credits, total_spent")
    .eq("uid", requesterUid)
    .single();
  if (fetchErr) throw fetchErr;

  const newBalance = (userData.balance_credits || 0) - creditsCost;
  if (newBalance < 0) throw new Error("Insufficient credits");

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      balance_credits: newBalance,
      total_spent: (userData.total_spent || 0) + creditsCost,
      check_requests_made: supabase.rpc ? undefined : undefined, // incremented below
    })
    .eq("uid", requesterUid);
  if (updateErr) throw updateErr;

  // 3. Log transaction
  await supabase.from("transactions").insert({
    uid:         requesterUid,
    type:        "spend",
    amount:      -creditsCost,
    description: `Check request · ${windowMinutes} min`,
    created_at:  now.toISOString(),
  });
}

export async function acceptCheckRequest(reqId, checkerUid) {
  const { error } = await supabase
    .from("check_requests")
    .update({ status:"accepted", checker_uid: checkerUid })
    .eq("id", reqId);
  if (error) throw error;
}
