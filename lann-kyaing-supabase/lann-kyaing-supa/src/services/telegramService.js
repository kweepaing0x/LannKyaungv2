// ── Telegram Bot Notification ─────────────────────────────────
// Set in your .env file:
//   VITE_TELEGRAM_BOT_TOKEN=8841317370:AAEXmbIbftjaF5NfHEvijw4-fdAQUR_vtsQ
//   VITE_TELEGRAM_CHAT_ID=5957583236

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
const CHAT_ID   = import.meta.env.VITE_TELEGRAM_CHAT_ID   || "";

function toMMT(date = new Date()) {
  const mmt = new Date(date.getTime() + (6.5 * 60 + date.getTimezoneOffset()) * 60000);
  const h   = String(mmt.getHours()).padStart(2,"0");
  const m   = String(mmt.getMinutes()).padStart(2,"0");
  const day = mmt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  return `${day} ${h}:${m} MMT`;
}

function mapsLink(lat, lng) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

// windowMinutes is always a NUMBER now (30, 60, 120, or custom hours*60)
// windowLabel is the human-readable string e.g. "Next 30 min", "Custom · 2 hrs"
export async function notifyCheckRequest({
  requesterEmail,
  targetLat,
  targetLng,
  targetLabel,
  windowMinutes,
  creditsCost,
  windowLabel,
}) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("Telegram not configured — skipping notification");
    return;
  }

  const link    = mapsLink(targetLat, targetLng);
  const timeStr = toMMT();

  // Format minutes into readable string
  const durationText = windowMinutes >= 60
    ? `${windowMinutes / 60} hr${windowMinutes > 60 ? "s" : ""}`
    : `${windowMinutes} min`;

  const message = [
    `🎥 *New Check Request*`,
    ``,
    `📍 *Location:* ${targetLabel || "Custom location"}`,
    `🗺 [View on Google Maps](${link})`,
    `\`${Number(targetLat).toFixed(6)}, ${Number(targetLng).toFixed(6)}\``,
    ``,
    `⏱ *Window:* ${windowLabel} (${durationText})`,
    `💰 *Credits:* ${creditsCost} pts`,
    `👤 *Requested by:* ${requesterEmail || "unknown"}`,
    `🕐 *Sent at:* ${timeStr}`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id:    CHAT_ID,
          text:       message,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) {
      console.warn("Telegram send failed:", data.description);
    } else {
      console.log("✅ Telegram notification sent");
    }
  } catch(e) {
    // Never block the main request flow if Telegram fails
    console.warn("Telegram error (non-fatal):", e.message);
  }
}
