import { useState } from "react";
import { formatMMT, maskEmail, sendTip, getUserDoc } from "../services/supabaseService";
import { useAppStore } from "../store";

// ── Full-screen media viewer ──────────────────────────────────
function MediaViewer({ url, onClose }) {
  const isVideo = url.match(/\.(mp4|mov|webm|ogg)/i);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",
      zIndex:2000,display:"flex",flexDirection:"column"}}>
      <div style={{flexShrink:0,display:"flex",alignItems:"center",
        padding:"14px 16px",borderBottom:"0.5px solid rgba(255,255,255,0.08)"}}>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",
          fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",
          gap:6,fontFamily:"inherit",fontWeight:600}}>
          <i className="ti ti-arrow-left" style={{fontSize:20}} aria-hidden="true"/>
          Back
        </button>
        <span style={{color:"#666",fontSize:12,marginLeft:"auto"}}>{isVideo?"Video":"Photo"}</span>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{flex:1,display:"flex",
        alignItems:"center",justifyContent:"center",padding:16,overflow:"hidden"}}>
        {isVideo
          ?<video src={url} controls autoPlay style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,background:"#000"}}/>
          :<img src={url} alt="Pin media" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
        }
      </div>
    </div>
  );
}

// ── Tea tip confirm modal ─────────────────────────────────────
function TipConfirmModal({ pin, tipAmount, commissionRate, onConfirm, onCancel, loading }) {
  const receiverGets = Math.round(tipAmount * (1 - commissionRate));
  const commission   = tipAmount - receiverGets;
  return (
    <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
      zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:340,
        background:"#1a1a1a",borderRadius:20,padding:24,
        border:"0.5px solid rgba(255,255,255,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:38,marginBottom:8}}>☕</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700,marginBottom:6}}>
            လက်ဖက်ရည်တိုက်မည်
          </div>
          <div style={{color:"#888",fontSize:12,lineHeight:1.7}}>
            You are treating{" "}
            <span style={{color:"#ccc",fontWeight:600}}>{maskEmail(pin.posted_by_email)}</span>
            {" "}with a cup of tea
          </div>
        </div>
        <div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16,
          border:"0.5px solid rgba(255,255,255,0.07)"}}>
          <Row2 label="Tip amount"   val={`${tipAmount} pts`}     valColor="#EF9F27"/>
          <Row2 label="Poster gets"  val={`${receiverGets} pts`}  valColor="#a8f0c6"/>
          <Row2 label={`Commission (${Math.round(commissionRate*100)}%)`} val={`${commission} pts`} valColor="#666"/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} disabled={loading} style={{flex:1,padding:"12px",borderRadius:12,
            border:"0.5px solid rgba(255,255,255,0.12)",background:"#222",color:"#888",
            fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{flex:2,padding:"12px",borderRadius:12,
            border:"none",background:loading?"#444":"#e24b4a",color:"#fff",
            fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {loading?"Sending...":"☕ Confirm tip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row2({label,val,valColor}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0"}}>
      <span style={{color:"#888",fontSize:12}}>{label}</span>
      <span style={{color:valColor||"#ccc",fontWeight:700,fontSize:13}}>{val}</span>
    </div>
  );
}

// ── Main PinPopup ─────────────────────────────────────────────
// Flow for tippable pin:
//   1. User taps pin → sees blurred/locked gate screen asking to tip
//   2. User taps "☕ Treat with tea" → TipConfirmModal
//   3. After payment → full pin detail is revealed
export default function PinPopup({ pin, onClose }) {
  const { user, userDoc, setUserDoc, adminConfig } = useAppStore();

  const [showMedia,     setShowMedia]     = useState(false);
  const [showTipGate,   setShowTipGate]   = useState(
    // Tippable pins start locked UNLESS it's your own pin
    pin.tip_enabled && pin.tip_receiver !== user?.id
  );
  const [showTipConfirm,setShowTipConfirm]= useState(false);
  const [tipLoading,    setTipLoading]    = useState(false);
  const [tipDone,       setTipDone]       = useState(false);

  if (!pin) return null;

  const tipAmount      = pin.tip_amount || 25;
  const commissionRate = adminConfig?.tip_commission_rate ?? 0.20;
  const myBalance      = userDoc?.balance_credits ?? 0;

  async function handleTip() {
    if (myBalance < tipAmount) {
      alert(`Not enough credits.\nBalance: ${myBalance} pts\nTip costs: ${tipAmount} pts\n\nContact @doublepz Yet to top up.`);
      return;
    }
    setTipLoading(true);
    try {
      await sendTip({
        fromUid:      user?.id,
        toUid:        pin.tip_receiver,
        pinId:        pin.id,
        tipAmount,
        commissionRate,
      });
      const fresh = await getUserDoc(user?.id);
      if (fresh) setUserDoc(fresh);
      setTipDone(true);
      setShowTipConfirm(false);
      setShowTipGate(false); // unlock — show full detail
    } catch(e) {
      alert("Error: " + e.message);
    } finally { setTipLoading(false); }
  }

  // ── TIP GATE SCREEN ───────────────────────────────────────
  // Shown before payment for tippable pins
  if (showTipGate) {
    return (
      <>
        <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
          zIndex:1000,display:"flex",alignItems:"flex-end"}}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:"100%",background:"#161616",
            borderRadius:"20px 20px 0 0",
            border:"0.5px solid rgba(255,255,255,0.09)",
            padding:"0 0 32px",
            paddingBottom:"calc(32px + env(safe-area-inset-bottom,0px))",
          }}>
            <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 20px"}}/>

            <div style={{padding:"0 20px",textAlign:"center"}}>
              {/* Blurred preview */}
              <div style={{
                background:"rgba(255,255,255,0.03)",
                borderRadius:16,padding:"20px 16px",
                border:"0.5px solid rgba(255,255,255,0.07)",
                marginBottom:20,
                position:"relative",overflow:"hidden",
              }}>
                {/* Blurred content behind */}
                <div style={{filter:"blur(6px)",opacity:0.4,pointerEvents:"none",userSelect:"none"}}>
                  <div style={{fontSize:36,marginBottom:8}}>{pin.emoji||"📍"}</div>
                  <div style={{color:"#fff",fontSize:16,fontWeight:700,marginBottom:4}}>
                    {pin.label_my||pin.type}
                  </div>
                  <div style={{color:"#888",fontSize:12}}>Posted by @??*** · ?? MMT</div>
                  <div style={{color:"#888",fontSize:12,marginTop:4}}>Photo / Video attached</div>
                </div>
                {/* Lock overlay */}
                <div style={{
                  position:"absolute",inset:0,
                  display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",
                  background:"rgba(22,22,22,0.6)",
                  backdropFilter:"blur(2px)",
                }}>
                  <div style={{fontSize:28,marginBottom:6}}>🔒</div>
                  <div style={{color:"#fff",fontSize:13,fontWeight:700}}>Content locked</div>
                  <div style={{color:"#888",fontSize:11,marginTop:3}}>Treat with tea to unlock</div>
                </div>
              </div>

              {/* Emoji + type hint */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:28}}>{pin.emoji||"📍"}</span>
                <div>
                  <div style={{color:"#fff",fontSize:15,fontWeight:700}}>{pin.label_my||pin.type}</div>
                  <div style={{color:"#666",fontSize:11}}>This pin has photo/video verification</div>
                </div>
              </div>

              <div style={{
                background:"rgba(239,159,39,0.08)",borderRadius:12,
                padding:"12px 14px",marginBottom:20,marginTop:16,
                border:"0.5px solid rgba(239,159,39,0.25)",
                textAlign:"left",
              }}>
                <div style={{color:"#EF9F27",fontSize:12,fontWeight:700,marginBottom:4}}>
                  ☕ Tip to unlock full details
                </div>
                <div style={{color:"#888",fontSize:11,lineHeight:1.7}}>
                  The poster will receive a tea tip for sharing this verified information.
                  You will see the photo/video, exact time, and poster info.
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                  <span style={{color:"#888",fontSize:11}}>Tip cost</span>
                  <span style={{color:"#EF9F27",fontWeight:700,fontSize:13}}>{tipAmount} pts</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{color:"#888",fontSize:11}}>Your balance</span>
                  <span style={{
                    color:myBalance>=tipAmount?"#a8f0c6":"#e24b4a",
                    fontWeight:700,fontSize:13,
                  }}>{myBalance} pts</span>
                </div>
              </div>

              <button
                onClick={()=>{
                  if(myBalance<tipAmount){
                    alert(`Not enough credits.\nBalance: ${myBalance} pts\nNeed: ${tipAmount} pts\n\nContact @doublepz Yet to top up.`);
                    return;
                  }
                  setShowTipConfirm(true);
                }}
                style={{
                  width:"100%",padding:"14px",borderRadius:12,border:"none",
                  background:"linear-gradient(135deg,#e24b4a,#EF9F27)",
                  color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",marginBottom:10,
                  boxShadow:"0 4px 16px rgba(239,159,39,0.3)",
                }}>
                ☕ လက်ဖက်ရည်တိုက် · Unlock for {tipAmount} pts
              </button>

              <button onClick={onClose} style={{
                width:"100%",padding:"12px",borderRadius:12,
                background:"#1a1a1a",border:"0.5px solid rgba(255,255,255,0.08)",
                color:"#666",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              }}>
                Close
              </button>
            </div>
          </div>
        </div>

        {showTipConfirm&&(
          <TipConfirmModal
            pin={pin} tipAmount={tipAmount} commissionRate={commissionRate}
            onConfirm={handleTip} onCancel={()=>setShowTipConfirm(false)} loading={tipLoading}
          />
        )}
      </>
    );
  }

  // ── FULL DETAIL SCREEN ────────────────────────────────────
  const maskedUser = maskEmail(pin.posted_by_email);
  const timeStr    = formatMMT(pin.posted_at);
  const hasMedia   = !!pin.media_url;
  const isVid      = hasMedia && pin.media_url.match(/\.(mp4|mov|webm|ogg)/i);

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
        zIndex:1000,display:"flex",alignItems:"flex-end"}}>
        <div onClick={e=>e.stopPropagation()} style={{
          width:"100%",background:"#1a1a1a",
          borderRadius:"20px 20px 0 0",
          border:"0.5px solid rgba(255,255,255,0.09)",
          padding:"0 0 32px",
          paddingBottom:"calc(32px + env(safe-area-inset-bottom,0px))",
        }}>
          <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 16px"}}/>

          <div style={{padding:"0 20px"}}>
            {/* Tip paid success badge */}
            {tipDone&&(
              <div style={{background:"rgba(168,240,198,0.1)",borderRadius:10,padding:"10px 14px",
                border:"0.5px solid #a8f0c6",marginBottom:14,textAlign:"center",
                color:"#a8f0c6",fontSize:12,fontWeight:600}}>
                ☕ Tea sent! Thank you for supporting this poster.
              </div>
            )}

            {/* Emoji + label row */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{width:52,height:52,borderRadius:"50%",
                background:"rgba(255,255,255,0.05)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:28,flexShrink:0}}>
                {pin.emoji||"📍"}
              </div>
              <div>
                <div style={{color:"#fff",fontSize:17,fontWeight:700,lineHeight:1.3}}>
                  {pin.label_my||pin.type}
                </div>
                {pin.label_en&&(
                  <div style={{color:"#666",fontSize:12,marginTop:2}}>{pin.label_en}</div>
                )}
                <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                  <span style={{
                    background:pin.is_history?"rgba(255,255,255,0.06)":"rgba(226,75,74,0.15)",
                    borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,
                    color:pin.is_history?"#666":"#e24b4a"}}>
                    {pin.is_history?"🕐 History":"🔴 Live"}
                  </span>
                  {pin.tip_enabled&&(
                    <span style={{background:"rgba(239,159,39,0.15)",borderRadius:6,
                      padding:"2px 8px",fontSize:10,fontWeight:700,color:"#EF9F27"}}>
                      ☕ Tipped
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{height:"0.5px",background:"rgba(255,255,255,0.07)",marginBottom:14}}/>

            {/* Posted by */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <i className="ti ti-user-circle" style={{fontSize:16,color:"#555",flexShrink:0}} aria-hidden="true"/>
              <span style={{color:"#888",fontSize:12}}>Posted by</span>
              <span style={{color:"#ccc",fontSize:12,fontWeight:600,fontFamily:"monospace"}}>{maskedUser}</span>
            </div>

            {/* Time */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <i className="ti ti-clock" style={{fontSize:16,color:"#555",flexShrink:0}} aria-hidden="true"/>
              <span style={{color:"#888",fontSize:12}}>Time</span>
              <span style={{color:"#ccc",fontSize:12,fontWeight:600}}>{timeStr}</span>
            </div>

            {/* View media */}
            {hasMedia?(
              <button onClick={()=>setShowMedia(true)} style={{
                background:"none",border:"none",padding:"0 0 14px",
                display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <i className={`ti ${isVid?"ti-player-play":"ti-photo"}`}
                  style={{fontSize:16,color:"#4a9eff"}} aria-hidden="true"/>
                <span style={{color:"#4a9eff",fontSize:13,fontWeight:600,
                  textDecoration:"underline",textUnderlineOffset:3}}>
                  {isVid?"View video":"View photo"}
                </span>
              </button>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
                <i className="ti ti-photo-off" style={{fontSize:15,color:"#333"}} aria-hidden="true"/>
                <span style={{color:"#444",fontSize:12}}>No photo or video attached</span>
              </div>
            )}

            <button onClick={onClose} style={{
              width:"100%",padding:"13px",borderRadius:12,
              background:"#222",border:"0.5px solid rgba(255,255,255,0.08)",
              color:"#888",fontSize:13,fontWeight:600,
              cursor:"pointer",fontFamily:"inherit",
            }}>
              Close
            </button>
          </div>
        </div>
      </div>

      {showMedia&&pin.media_url&&(
        <MediaViewer url={pin.media_url} onClose={()=>setShowMedia(false)}/>
      )}
    </>
  );
}
