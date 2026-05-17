import { supabase, isConfigured } from "../supabase";
import dayjs from "dayjs";

// ── TIME HELPERS ──────────────────────────────────────────────
export function getNowMMT() {
  const now = new Date();
  const mmt = new Date(now.getTime() + (6.5*60 + now.getTimezoneOffset())*60000);
  return `${String(mmt.getHours()).padStart(2,"0")}:${String(mmt.getMinutes()).padStart(2,"0")} (MMT)`;
}

export function formatMMT(isoString) {
  if (!isoString) return "Unknown time";
  const d   = new Date(isoString);
  const mmt = new Date(d.getTime() + (6.5*60 + d.getTimezoneOffset())*60000);
  const h   = String(mmt.getHours()).padStart(2,"0");
  const m   = String(mmt.getMinutes()).padStart(2,"0");
  const day = mmt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
  return `${day} · ${h}:${m} MMT`;
}

export function maskEmail(email) {
  if (!email) return "unknown";
  const [name, domain] = email.split("@");
  if (!domain) return "@" + name.slice(0,2) + "***";
  return `@${name.slice(0,2)}*** (${domain})`;
}

function guard() {
  if (!isConfigured || !supabase)
    throw new Error("Supabase not configured. Add keys to .env");
}

// ── AUTH ──────────────────────────────────────────────────────
export async function signIn(email, password) {
  guard();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isConfigured || !supabase) return;
  await supabase.auth.signOut();
}

// FIX: only call callback once — use getSession, ignore the redundant onAuthStateChange initial event
export function onAuthChange(callback) {
  if (!isConfigured || !supabase) {
    setTimeout(() => callback(null), 0);
    return () => {};
  }

  let resolved = false; // prevent double-call

  // 1. Get current session immediately
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!resolved) {
      resolved = true;
      callback(session?.user ?? null);
    }
  }).catch(() => {
    if (!resolved) { resolved = true; callback(null); }
  });

  // 2. Listen for future changes (sign in, sign out, token refresh)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // Skip INITIAL_SESSION — we already handled it via getSession above
    if (event === "INITIAL_SESSION") return;
    callback(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}

// ── GPS ───────────────────────────────────────────────────────
export function requestGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ── USER DOC ──────────────────────────────────────────────────
export async function getUserDoc(authUid) {
  guard();
  if (!authUid) return null;
  const { data, error } = await supabase
    .from("users").select("*").eq("uid", authUid).maybeSingle();
  if (error) { console.error("getUserDoc:", error.message); return null; }
  return data;
}

export async function updateUserDoc(uid, updates) {
  guard();
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
  const { data } = await supabase.from("situation_types").select("*")
    .eq("is_active", true).order("severity", { ascending: false });
  return data;
}

// ── MEDIA UPLOAD ──────────────────────────────────────────────
export async function uploadPinMedia(file, pinId) {
  guard();
  const ext  = file.name.split(".").pop();
  const path = `pins/${pinId || Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("pin-media").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("pin-media").getPublicUrl(path);
  return data.publicUrl;
}

// ── LIVE PINS ─────────────────────────────────────────────────
export function subscribePins(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }
  const fetch = () =>
    supabase.from("pins").select("*")
      .gt("expires_at", new Date().toISOString())
      .order("posted_at", { ascending: false })
      .then(({ data }) => callback(data || []));
  fetch();
  const ch = supabase.channel("pins-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"pins" }, fetch)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export function subscribeHistoryPins(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }
  supabase.from("pins").select("*")
    .lte("expires_at", new Date().toISOString())
    .gte("expires_at", dayjs().subtract(7,"day").toISOString())
    .order("posted_at", { ascending: false })
    .then(({ data }) => callback((data||[]).map(p => ({ ...p, is_history: true }))));
  return () => {};
}

// ── POST PIN ──────────────────────────────────────────────────
export async function postPin({ type, emoji, lat, lng, postedBy, postedByEmail, labelMy, labelEn, mediaUrl }) {
  guard();
  const now = new Date();
  const { error } = await supabase.from("pins").insert({
    type, emoji,
    label_my:        labelMy,
    label_en:        labelEn,
    lat:             Number(lat),   // ensure number not string
    lng:             Number(lng),
    posted_by:       postedBy,
    posted_by_email: postedByEmail || null,
    media_url:       mediaUrl || null,
    posted_at:       now.toISOString(),
    expires_at:      new Date(now.getTime() + 24*60*60*1000).toISOString(),
    is_history:      false,
  });
  if (error) throw error;
}

// ── CHECK REQUESTS ────────────────────────────────────────────
export function subscribeCheckRequests(callback) {
  if (!isConfigured || !supabase) { callback([]); return () => {}; }
  const fetch = () =>
    supabase.from("check_requests").select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => callback(data || []));
  fetch();
  const ch = supabase.channel("checkreqs-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"check_requests" }, fetch)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export async function postCheckRequest({
  requesterUid, targetLat, targetLng, targetLabel, windowMinutes, creditsCost,
}) {
  guard();
  const now = new Date();
  const { data: u, error: fe } = await supabase
    .from("users").select("balance_credits,total_spent").eq("uid", requesterUid).single();
  if (fe) throw new Error("Could not fetch balance: " + fe.message);
  const bal = u.balance_credits || 0;
  if (bal < creditsCost) throw new Error(`Not enough credits. Have ${bal}, need ${creditsCost}`);

  const { error: re } = await supabase.from("check_requests").insert({
    requester_uid:  requesterUid,
    target_lat:     Number(targetLat),
    target_lng:     Number(targetLng),
    target_label:   targetLabel || "Custom location",
    window_minutes: windowMinutes,
    credits_cost:   creditsCost,
    status:         "pending",
    created_at:     now.toISOString(),
    expires_at:     new Date(now.getTime() + windowMinutes*60*1000).toISOString(),
  });
  if (re) throw re;

  const { error: ue } = await supabase.from("users")
    .update({ balance_credits: bal - creditsCost, total_spent: (u.total_spent||0) + creditsCost })
    .eq("uid", requesterUid);
  if (ue) throw ue;

  supabase.from("transactions").insert({
    uid: requesterUid, type:"spend", amount: -creditsCost,
    description: `Check request · ${windowMinutes} min`,
    created_at: now.toISOString(),
  }).then(()=>{}).catch(()=>{});
}
