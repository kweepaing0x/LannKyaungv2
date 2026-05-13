import { supabase } from "../supabase";
import dayjs from "dayjs";

// ─── MMT TIME ────────────────────────────────────────────────────
export function getNowMMT() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const mmt = new Date(utc + 6.5 * 3600000);
  const h = String(mmt.getHours()).padStart(2, "0");
  const m = String(mmt.getMinutes()).padStart(2, "0");
  return `${h}:${m} (MMT)`;
}

// ─── AUTH ────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ─── USER DOC ────────────────────────────────────────────────────
export async function getUserDoc(uid) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserDoc(uid, updates) {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("uid", uid);
  if (error) throw error;
}

// ─── ADMIN CONFIG ────────────────────────────────────────────────
export async function getAdminConfig() {
  const { data, error } = await supabase
    .from("admin_config")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ─── SITUATION TYPES ─────────────────────────────────────────────
export async function getSituationTypes() {
  const { data, error } = await supabase
    .from("situation_types")
    .select("*")
    .eq("is_active", true)
    .order("severity", { ascending: false });
  if (error) throw error;
  return data;
}

// ─── PINS ────────────────────────────────────────────────────────
// Subscribe to live active pins (real-time)
export function subscribePins(callback) {
  const now = new Date().toISOString();

  // Initial fetch
  supabase
    .from("pins")
    .select("*")
    .gt("expires_at", now)
    .order("posted_at", { ascending: false })
    .then(({ data }) => callback(data || []));

  // Real-time subscription
  const channel = supabase
    .channel("pins-live")
    .on("postgres_changes",
      { event: "*", schema: "public", table: "pins" },
      () => {
        supabase
          .from("pins")
          .select("*")
          .gt("expires_at", new Date().toISOString())
          .order("posted_at", { ascending: false })
          .then(({ data }) => callback(data || []));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Subscribe to history pins (expired, last 7 days)
export function subscribeHistoryPins(callback) {
  const now = new Date().toISOString();
  const sevenDaysAgo = dayjs().subtract(7, "day").toISOString();

  supabase
    .from("pins")
    .select("*")
    .lte("expires_at", now)
    .gte("expires_at", sevenDaysAgo)
    .order("posted_at", { ascending: false })
    .then(({ data }) => callback((data || []).map(p => ({ ...p, is_history: true }))));
}

// Post a new warning pin
export async function postPin({ type, emoji, lat, lng, postedBy, labelMy, labelEn }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("pins").insert({
    type, emoji,
    label_my: labelMy,
    label_en: labelEn,
    lat, lng,
    posted_by: postedBy,
    posted_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_history: false,
  });
  if (error) throw error;
}

// ─── CHECK REQUESTS ──────────────────────────────────────────────
export function subscribeCheckRequests(callback) {
  supabase
    .from("check_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .then(({ data }) => callback(data || []));

  const channel = supabase
    .channel("checkreqs-live")
    .on("postgres_changes",
      { event: "*", schema: "public", table: "check_requests" },
      () => {
        supabase
          .from("check_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .then(({ data }) => callback(data || []));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function postCheckRequest({
  requesterUid, targetLat, targetLng, targetLabel,
  windowMinutes, creditsCost,
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);
  const { error } = await supabase.from("check_requests").insert({
    requester_uid: requesterUid,
    target_lat: targetLat,
    target_lng: targetLng,
    target_label: targetLabel,
    window_minutes: windowMinutes,
    credits_cost: creditsCost,
    status: "pending",
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;
}

export async function acceptCheckRequest(reqId, checkerUid) {
  const { error } = await supabase
    .from("check_requests")
    .update({ status: "accepted", checker_uid: checkerUid })
    .eq("id", reqId);
  if (error) throw error;
}

// ─── TIME WINDOW OPTIONS ─────────────────────────────────────────
export async function getTimeWindows() {
  const { data, error } = await supabase
    .from("time_window_options")
    .select("*")
    .eq("is_active", true)
    .order("minutes");
  if (error) throw error;
  return data;
}
