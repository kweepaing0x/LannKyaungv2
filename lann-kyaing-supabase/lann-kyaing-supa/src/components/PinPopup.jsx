import { useState } from "react";
import { formatMMT, maskEmail, sendTip, getUserDoc } from "../services/supabaseService";
import { useAppStore } from "../store";

function MediaViewer({ url, onClose }) {
  const isVideo = url.match(/\.(mp4|mov|webm|ogg)/i);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",
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

function TipConfirmModal({ pin, tipAmount, commissionRate, onConfirm, onCancel, loading }) {
  const receiverGets = Math.round(tipAmount * (1 - commissionRate));
  const commission   = tipAmount - receiverGets;
  return (
    <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:340,
        background:"#1a1a1a",borderRadius:20,padding:24,
        border:"0.5px solid rgba(255,255,255,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:32,marginBottom:8}}>☕</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700,marginBottom:4}}>
            လက်ဖက်ရည်တိုက်မည်
          </div>
          <div style={{color:"#888",fontSize:12,lineHeight:1.6}}>
            You are treating <span style={{color:"#ccc",fontWeight:600}}>{maskEmail(pin.posted_by_email)}</span> with a cup of tea
          </div>
        </div>
        <div style={{background:"#0d0d0d",borderRadius:12,padding:14,marginBottom:16,
          border:"0.5px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:"#888",fontSize:12}}>Tip amount</span>
            <span style={{color:"#EF9F27",fontWeight:700,fontSize:14}}>{tipAmount} pts</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:"#888",fontSize:12}}>Poster receives</span>
            <span style={{color:"#a8f0c6",fontWeight:600,fontSize:13}}>{receiverGets} pts</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#888",fontSize:12}}>Commission ({Math.round(commissionRate*100)}%)</span>
            <span style={{color:"#666",fontSize:12}}>{commission} pts</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} disabled={loading} style={{flex:1,padding:"12px",borderRadius:12,
            border:"0.5px solid rgba(255,255,255,0.12)",background:"#222",color:"#888",
            fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{flex:2,padding:"12px",borderRadius:12,
            border:"none",background:"#e24b4a",color:"#fff",
            fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {loading?"Sending...":"☕ Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PinPopup({ pin, onClose }) {
  const { user, userDoc, setUserDoc, adminConfig } = useAppStore();
  const [showMedia,    setShowMedia]    = useState(false);
  const [showTipConfirm,setShowTipConfirm]=useState(false);
  const [tipLoading,   setTipLoading]   = useState(false);
  const [tipDone,      setTipDone]      = useState(false);

  if (!pin) return null;

  const maskedUser     = maskEmail(pin.posted_by_email);
  const timeStr        = formatMMT(pin.posted_at);
  const hasMedia       = !!pin.media_url;
  const isVideo        = hasMedia && pin.media_url.match(/\.(mp4|mov|webm|ogg)/i);
  const tipAmount      = pin.tip_amount || 25;
  const commissionRate = adminConfig?.tip_commission_rate ?? 0.20;
  const canTip         = pin.tip_enabled && pin.tip_receiver && pin.tip_receiver !== user?.id && !tipDone;
  const myBalance      = userDoc?.balance_credits ?? 0;

  async function handleTip() {
    setTipLoading(true);
    try {
      await sendTip({
        fromUid:      user?.id,
        toUid:        pin.tip_receiver,
        pinId:        pin.id,
        tipAmount,
        commissionRate,
      });
      // Refresh own balance
      const fresh = await getUserDoc(user?.id);
      if (fresh) setUserDoc(fresh);
      setTipDone(true);
      setShowTipConfirm(false);
    } catch(e) {
      alert("Error: " + e.message);
    } finally { setTipLoading(false); }
  }

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",
        zIndex:1000,display:"flex",alignItems:"flex-end"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"#1a1a1a",
          borderRadius:"20px 20px 0 0",border:"0.5px solid rgba(255,255,255,0.09)",
          padding:"0 0 32px",paddingBottom:"calc(32px + env(safe-area-inset-bottom,0px))"}}>
          <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 16px"}}/>

          <div style={{padding:"0 20px"}}>
            {/* Emoji + label */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{width:52,height:52,borderRadius:"50%",
                background:"rgba(255,255,255,0.05)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>
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
                  {pin.is_paid_pin&&(
                    <span style={{background:"rgba(83,74,183,0.2)",borderRadius:6,
                      padding:"2px 8px",fontSize:10,fontWeight:700,color:"#CECBF6"}}>
                      📌 Verified pin
                    </span>
                  )}
                  {pin.tip_enabled&&(
                    <span style={{background:"rgba(226,75,74,0.12)",borderRadius:6,
                      padding:"2px 8px",fontSize:10,fontWeight:700,color:"#EF9F27"}}>
                      ☕ Tippable
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
            {hasMedia&&(
              <button onClick={()=>setShowMedia(true)} style={{
                background:"none",border:"none",padding:"0 0 14px",
                display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <i className={`ti ${isVideo?"ti-player-play":"ti-photo"}`}
                  style={{fontSize:16,color:"#4a9eff"}} aria-hidden="true"/>
                <span style={{color:"#4a9eff",fontSize:13,fontWeight:600,
                  textDecoration:"underline",textUnderlineOffset:3}}>
                  {isVideo?"View video":"View photo"}
                </span>
              </button>
            )}
            {!hasMedia&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
                <i className="ti ti-photo-off" style={{fontSize:15,color:"#333"}} aria-hidden="true"/>
                <span style={{color:"#444",fontSize:12}}>No photo or video attached</span>
              </div>
            )}

            {/* Tip button */}
            {canTip&&(
              <button onClick={()=>{
                if(myBalance<tipAmount){
                  alert(`Not enough credits.\nBalance: ${myBalance} pts\nTip costs: ${tipAmount} pts\n\nContact @doublepz Yet to top up.`);
                  return;
                }
                setShowTipConfirm(true);
              }} style={{
                width:"100%",padding:"13px",borderRadius:12,marginBottom:10,
                border:"1.5px solid rgba(226,75,74,0.4)",
                background:"rgba(226,75,74,0.08)",
                color:"#EF9F27",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}>
                ☕ လက်ဖက်ရည်တိုက် · {tipAmount} pts
              </button>
            )}

            {tipDone&&(
              <div style={{
                width:"100%",padding:"12px",borderRadius:12,marginBottom:10,
                background:"rgba(168,240,198,0.1)",border:"0.5px solid #a8f0c6",
                color:"#a8f0c6",fontSize:13,fontWeight:600,textAlign:"center",
              }}>
                ☕ Tea sent! Thank you.
              </div>
            )}

            <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,
              background:"#222",border:"0.5px solid rgba(255,255,255,0.08)",
              color:"#888",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Close
            </button>
          </div>
        </div>
      </div>

      {showMedia&&pin.media_url&&<MediaViewer url={pin.media_url} onClose={()=>setShowMedia(false)}/>}

      {showTipConfirm&&(
        <TipConfirmModal
          pin={pin} tipAmount={tipAmount} commissionRate={commissionRate}
          onConfirm={handleTip} onCancel={()=>setShowTipConfirm(false)} loading={tipLoading}
        />
      )}
    </>
  );
}
