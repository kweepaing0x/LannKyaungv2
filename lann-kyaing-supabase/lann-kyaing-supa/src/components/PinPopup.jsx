import { useState } from "react";
import { formatMMT, maskEmail, sendTip, getUserDoc } from "../services/supabaseService";
import { useAppStore } from "../store";

// ── Full-screen media viewer ──────────────────────────────────
function MediaViewer({ url, onClose }) {
  const isVideo = url.match(/\.(mp4|mov|webm|ogg)/i);
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",
      zIndex:3000,display:"flex",flexDirection:"column",
    }}>
      <div style={{
        flexShrink:0,display:"flex",alignItems:"center",
        padding:"14px 16px",borderBottom:"0.5px solid rgba(255,255,255,0.08)",
      }}>
        <button onClick={onClose} style={{
          background:"none",border:"none",color:"#fff",fontSize:15,
          cursor:"pointer",display:"flex",alignItems:"center",
          gap:6,fontFamily:"inherit",fontWeight:600,
        }}>
          <i className="ti ti-arrow-left" style={{fontSize:20}} aria-hidden="true"/>
          Back
        </button>
        <span style={{color:"#666",fontSize:12,marginLeft:"auto"}}>
          {isVideo ? "Video" : "Photo"}
        </span>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{
        flex:1,display:"flex",alignItems:"center",
        justifyContent:"center",padding:16,overflow:"hidden",
      }}>
        {isVideo
          ? <video src={url} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,background:"#000"}}/>
          : <img src={url} alt="Pin media" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
        }
      </div>
    </div>
  );
}

// ── Main PinPopup ─────────────────────────────────────────────
export default function PinPopup({ pin, onClose }) {
  const { user, userDoc, setUserDoc, adminConfig } = useAppStore();

  const tipAmount      = pin.tip_amount || 25;
  const commissionRate = adminConfig?.tip_commission_rate ?? 0.20;
  const receiverGets   = Math.round(tipAmount * (1 - commissionRate));
  const commission     = tipAmount - receiverGets;
  const myBalance      = userDoc?.balance_credits ?? 0;
  const isMyPin        = pin.tip_receiver === user?.id;
  const isTippable     = pin.tip_enabled && !isMyPin;

  // unlocked = either: not a tip pin, OR it's my own pin, OR already paid
  const [unlocked,    setUnlocked]    = useState(!isTippable);
  const [tipLoading,  setTipLoading]  = useState(false);
  const [tipDone,     setTipDone]     = useState(false);
  const [showMedia,   setShowMedia]   = useState(false);

  if (!pin) return null;

  const maskedUser = maskEmail(pin.posted_by_email);
  const timeStr    = formatMMT(pin.posted_at);
  const hasMedia   = !!pin.media_url;
  const isVid      = hasMedia && pin.media_url.match(/\.(mp4|mov|webm|ogg)/i);

  // Called when user taps OK on the confirm prompt
  async function handleTip() {
    if (myBalance < tipAmount) {
      alert(
        `Not enough credits.\n\n` +
        `Your balance: ${myBalance} pts\n` +
        `Tip costs: ${tipAmount} pts\n\n` +
        `Contact @doublepz Yet on Telegram to top up.`
      );
      return;
    }

    // Show native confirm — simple and reliable on mobile
    const ok = window.confirm(
      `☕ လက်ဖက်ရည်တိုက်\n\n` +
      `You are treating ${maskedUser} with a cup of tea.\n\n` +
      `Cost: ${tipAmount} pts\n` +
      `Poster receives: ${receiverGets} pts\n` +
      `Commission: ${commission} pts\n\n` +
      `OK to confirm?`
    );
    if (!ok) return;

    setTipLoading(true);
    try {
      await sendTip({
        fromUid:      user?.id,
        toUid:        pin.tip_receiver,
        pinId:        pin.id,
        tipAmount,
        commissionRate,
      });
      // Refresh balance
      const fresh = await getUserDoc(user?.id);
      if (fresh) setUserDoc(fresh);
      setTipDone(true);
      setUnlocked(true); // show full content
    } catch(e) {
      alert("Error: " + e.message);
    } finally {
      setTipLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.65)",
        zIndex:1000, display:"flex", alignItems:"flex-end",
      }}>
        <div onClick={e=>e.stopPropagation()} style={{
          width:"100%", background:"#1a1a1a",
          borderRadius:"20px 20px 0 0",
          border:"0.5px solid rgba(255,255,255,0.09)",
          paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))",
        }}>
          {/* Handle */}
          <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 16px"}}/>

          <div style={{padding:"0 20px"}}>

            {/* ── LOCKED STATE — tippable, not yet paid ── */}
            {!unlocked && (
              <>
                {/* Blurred pin preview */}
                <div style={{
                  borderRadius:14, overflow:"hidden",
                  border:"0.5px solid rgba(255,255,255,0.07)",
                  marginBottom:16, position:"relative",
                }}>
                  {/* Blurred content */}
                  <div style={{
                    padding:"16px",
                    filter:"blur(5px)", opacity:0.4,
                    pointerEvents:"none", userSelect:"none",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{fontSize:32}}>{pin.emoji||"📍"}</div>
                      <div>
                        <div style={{color:"#fff",fontSize:16,fontWeight:700}}>{pin.label_my||pin.type}</div>
                        <div style={{color:"#888",fontSize:12,marginTop:2}}>Posted by @??*** · ??:?? MMT</div>
                      </div>
                    </div>
                    <div style={{marginTop:10,color:"#888",fontSize:11}}>📷 Photo/video attached</div>
                  </div>
                  {/* Lock overlay */}
                  <div style={{
                    position:"absolute", inset:0,
                    display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center",
                    background:"rgba(22,22,22,0.55)",
                    backdropFilter:"blur(2px)",
                    gap:6,
                  }}>
                    <span style={{fontSize:26}}>🔒</span>
                    <span style={{color:"#fff",fontSize:13,fontWeight:700}}>Locked content</span>
                    <span style={{color:"#aaa",fontSize:11}}>Tip to unlock</span>
                  </div>
                </div>

                {/* Pin type hint */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <span style={{fontSize:26}}>{pin.emoji||"📍"}</span>
                  <div>
                    <div style={{color:"#fff",fontSize:15,fontWeight:700}}>{pin.label_my||pin.type}</div>
                    <div style={{color:"#666",fontSize:11}}>Verified pin with photo/video</div>
                  </div>
                </div>

                {/* Balance info */}
                <div style={{
                  background:"rgba(239,159,39,0.08)", borderRadius:12,
                  padding:"12px 14px", marginBottom:16,
                  border:"0.5px solid rgba(239,159,39,0.25)",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:"#888",fontSize:12}}>Tip to unlock</span>
                    <span style={{color:"#EF9F27",fontWeight:700,fontSize:13}}>{tipAmount} pts</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:"#888",fontSize:12}}>Your balance</span>
                    <span style={{
                      color: myBalance>=tipAmount ? "#a8f0c6" : "#e24b4a",
                      fontWeight:700, fontSize:13,
                    }}>{myBalance} pts</span>
                  </div>
                </div>

                {/* Tip button */}
                <button
                  onClick={handleTip}
                  disabled={tipLoading}
                  style={{
                    width:"100%", padding:"14px", borderRadius:12, border:"none",
                    background: tipLoading ? "#333" : "linear-gradient(135deg,#e24b4a,#EF9F27)",
                    color:"#fff", fontSize:14, fontWeight:700,
                    cursor: tipLoading ? "not-allowed" : "pointer",
                    fontFamily:"inherit", marginBottom:10,
                    boxShadow:"0 4px 16px rgba(239,159,39,0.25)",
                  }}
                >
                  {tipLoading ? "Processing..." : `☕ လက်ဖက်ရည်တိုက် · Unlock for ${tipAmount} pts`}
                </button>

                <button onClick={onClose} style={{
                  width:"100%", padding:"12px", borderRadius:12,
                  background:"#222", border:"0.5px solid rgba(255,255,255,0.08)",
                  color:"#666", fontSize:13, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit",
                }}>
                  Close
                </button>
              </>
            )}

            {/* ── UNLOCKED STATE — full detail ── */}
            {unlocked && (
              <>
                {/* Tea success badge */}
                {tipDone && (
                  <div style={{
                    background:"rgba(168,240,198,0.1)", borderRadius:10,
                    padding:"10px 14px", border:"0.5px solid #a8f0c6",
                    marginBottom:14, textAlign:"center",
                    color:"#a8f0c6", fontSize:12, fontWeight:600,
                  }}>
                    ☕ Tea sent! Thank you for supporting this poster.
                  </div>
                )}

                {/* Emoji + label */}
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                  <div style={{
                    width:52, height:52, borderRadius:"50%",
                    background:"rgba(255,255,255,0.05)",
                    display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:28, flexShrink:0,
                  }}>
                    {pin.emoji||"📍"}
                  </div>
                  <div>
                    <div style={{color:"#fff",fontSize:17,fontWeight:700,lineHeight:1.3}}>
                      {pin.label_my||pin.type}
                    </div>
                    {pin.label_en && (
                      <div style={{color:"#666",fontSize:12,marginTop:2}}>{pin.label_en}</div>
                    )}
                    <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                      <span style={{
                        background: pin.is_history?"rgba(255,255,255,0.06)":"rgba(226,75,74,0.15)",
                        borderRadius:6, padding:"2px 8px",
                        fontSize:10, fontWeight:700,
                        color: pin.is_history?"#666":"#e24b4a",
                      }}>
                        {pin.is_history ? "🕐 History" : "🔴 Live"}
                      </span>
                      {pin.tip_enabled && (
                        <span style={{
                          background:"rgba(239,159,39,0.15)",borderRadius:6,
                          padding:"2px 8px",fontSize:10,fontWeight:700,color:"#EF9F27",
                        }}>☕ Tipped</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{height:"0.5px",background:"rgba(255,255,255,0.07)",marginBottom:14}}/>

                {/* Posted by */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <i className="ti ti-user-circle" style={{fontSize:16,color:"#555",flexShrink:0}} aria-hidden="true"/>
                  <span style={{color:"#888",fontSize:12}}>Posted by</span>
                  <span style={{color:"#ccc",fontSize:12,fontWeight:600,fontFamily:"monospace"}}>
                    {maskedUser}
                  </span>
                </div>

                {/* Time */}
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <i className="ti ti-clock" style={{fontSize:16,color:"#555",flexShrink:0}} aria-hidden="true"/>
                  <span style={{color:"#888",fontSize:12}}>Time</span>
                  <span style={{color:"#ccc",fontSize:12,fontWeight:600}}>{timeStr}</span>
                </div>

                {/* View photo/video */}
                {hasMedia ? (
                  <button onClick={()=>setShowMedia(true)} style={{
                    background:"none", border:"none", padding:"0 0 14px",
                    display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                  }}>
                    <i className={`ti ${isVid?"ti-player-play":"ti-photo"}`}
                      style={{fontSize:16,color:"#4a9eff"}} aria-hidden="true"/>
                    <span style={{
                      color:"#4a9eff", fontSize:13, fontWeight:600,
                      textDecoration:"underline", textUnderlineOffset:3,
                    }}>
                      {isVid ? "View video" : "View photo"}
                    </span>
                  </button>
                ) : (
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
                    <i className="ti ti-photo-off" style={{fontSize:15,color:"#333"}} aria-hidden="true"/>
                    <span style={{color:"#444",fontSize:12}}>No photo or video attached</span>
                  </div>
                )}

                <button onClick={onClose} style={{
                  width:"100%", padding:"13px", borderRadius:12,
                  background:"#222", border:"0.5px solid rgba(255,255,255,0.08)",
                  color:"#888", fontSize:13, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit",
                }}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showMedia && pin.media_url && (
        <MediaViewer url={pin.media_url} onClose={()=>setShowMedia(false)}/>
      )}
    </>
  );
}

