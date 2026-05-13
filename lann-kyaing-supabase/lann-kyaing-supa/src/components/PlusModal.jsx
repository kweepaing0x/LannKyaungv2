import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { postPin, postCheckRequest, getNowMMT, getSituationTypes, getTimeWindows } from "../services/supabaseService";

const FALLBACK_TYPES = [
  {id:"police",  emoji:"🚔", label_my:"ရဲ ရှိသည်",    label_en:"Police",       color:"#E24B4A"},
  {id:"blocked", emoji:"🚧", label_my:"လမ်းပိတ်",      label_en:"Road blocked", color:"#EF9F27"},
  {id:"traffic", emoji:"🚗", label_my:"လမ်းကြပ်",      label_en:"Traffic",      color:"#EF9F27"},
  {id:"danger",  emoji:"⚠️", label_my:"အန္တရာယ်",    label_en:"Danger",       color:"#E24B4A"},
  {id:"flood",   emoji:"🌊", label_my:"ရေကြီး",        label_en:"Flood",        color:"#378ADD"},
  {id:"repair",  emoji:"🔧", label_my:"လမ်းပြုပြင်", label_en:"Repair",       color:"#888780"},
  {id:"event",   emoji:"🎉", label_my:"အခမ်းအနား",    label_en:"Event",        color:"#534AB7"},
  {id:"other",   emoji:"❓", label_my:"အခြား",         label_en:"Other",        color:"#888780"},
];

const FALLBACK_WINDOWS = [
  {minutes:30,  credits_cost:50,  label_my:"၃၀ မိနစ်"},
  {minutes:60,  credits_cost:80,  label_my:"၁ နာရီ"},
  {minutes:120, credits_cost:120, label_my:"၂ နာရီ"},
];

export default function PlusModal({ onClose }) {
  const { t } = useTranslation();
  const { user, userDoc, userLocation, setShowPlusModal } = useAppStore();
  const [mode, setMode]           = useState("update");
  const [selType, setSelType]     = useState("police");
  const [selWin, setSelWin]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const [types, setTypes]         = useState(FALLBACK_TYPES);
  const [windows, setWindows]     = useState(FALLBACK_WINDOWS);
  const [mmtTime, setMmtTime]     = useState(getNowMMT());

  useEffect(() => {
    getSituationTypes().then(d => { if(d?.length) setTypes(d); }).catch(()=>{});
    getTimeWindows().then(d => { if(d?.length) setWindows(d); }).catch(()=>{});
    const id = setInterval(() => setMmtTime(getNowMMT()), 30000);
    return () => clearInterval(id);
  }, []);

  const currentType = types.find(x => x.id === selType) || types[0];
  const currentWin  = windows[selWin] || windows[0];

  async function handlePostPin() {
    if (!userLocation) return alert("တည်နေရာ မသိသေးပါ - Location not found");
    setLoading(true);
    try {
      await postPin({
        type: currentType.id, emoji: currentType.emoji,
        lat: userLocation.lat, lng: userLocation.lng,
        postedBy: user?.id || "anon",
        labelMy: currentType.label_my, labelEn: currentType.label_en,
      });
      setShowPlusModal(false);
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function handleCheckRequest() {
    if (!userLocation) return alert("တည်နေရာ မသိသေးပါ");
    if ((userDoc?.balance_credits||0) < currentWin.credits_cost)
      return alert("Credits မလုံလောက်ပါ");
    setLoading(true);
    try {
      await postCheckRequest({
        requesterUid: user?.id,
        targetLat: userLocation.lat, targetLng: userLocation.lng,
        targetLabel: "Selected location",
        windowMinutes: currentWin.minutes,
        creditsCost: currentWin.credits_cost,
      });
      setShowPlusModal(false);
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    /* Full-screen overlay — fixed to viewport */
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
        zIndex:999, display:"flex", alignItems:"flex-end",
        // limit to phone width
        maxWidth:480, margin:"0 auto",
      }}
    >
      {/* Sheet — stop clicks propagating */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%", background:"#161616",
          borderRadius:"20px 20px 0 0",
          border:"0.5px solid rgba(255,255,255,0.08)",
          paddingBottom:32, maxHeight:"90vh", overflowY:"auto",
        }}
      >
        {/* Handle */}
        <div style={{width:36,height:4,background:"#333",borderRadius:2,margin:"12px auto 14px"}}/>

        {/* Mode tabs */}
        <div style={{display:"flex",margin:"0 14px 14px",background:"#0d0d0d",borderRadius:10,padding:3,gap:3}}>
          {["update","request"].map(m => (
            <button key={m} onClick={()=>setMode(m)} style={{
              flex:1, padding:"9px 4px", borderRadius:8, border:"none",
              background: mode===m ? "#222" : "transparent",
              color: mode===m ? "#fff" : "#555",
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>
              {m==="update" ? t("plus_modal.update") : t("plus_modal.check_request")}
            </button>
          ))}
        </div>

        {/* ── UPDATE SITUATION ── */}
        {mode === "update" && (
          <div style={{padding:"0 14px"}}>
            <Label>{t("plus_modal.situation_type")}</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
              {types.map(st => (
                <div key={st.id} onClick={()=>setSelType(st.id)} style={{
                  background: selType===st.id ? `${st.color}18` : "#0d0d0d",
                  border: `1.5px solid ${selType===st.id ? st.color : "transparent"}`,
                  borderRadius:10, padding:"8px 4px", textAlign:"center", cursor:"pointer",
                }}>
                  <span style={{fontSize:20,display:"block"}}>{st.emoji}</span>
                  <div style={{fontSize:9,color:selType===st.id?st.color:"#666",marginTop:3}}>
                    {st.label_my}
                  </div>
                </div>
              ))}
            </div>

            <Label>{t("plus_modal.your_location")}</Label>
            <InfoRow icon="ti-map-pin" color="#4a9eff">
              <p style={{fontSize:11,color:"#ccc",fontWeight:600,margin:0}}>
                {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "Locating..."}
              </p>
              <p style={{fontSize:9,color:"#555",margin:0}}>GPS locked</p>
            </InfoRow>

            <Label>{t("plus_modal.posted_time")}</Label>
            <InfoRow icon="ti-clock" color="#EF9F27">
              <p style={{fontSize:11,color:"#ccc",fontWeight:600,margin:0}}>{mmtTime}</p>
              <p style={{fontSize:9,color:"#555",margin:0}}>Myanmar Standard Time (UTC+6:30)</p>
            </InfoRow>

            <button onClick={handlePostPin} disabled={loading} style={{
              width:"100%",marginTop:16,border:"none",borderRadius:12,padding:14,
              background:"#e24b4a",color:"#fff",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
            }}>
              {loading ? "..." : t("plus_modal.post_pin")}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:7}}>
              {t("plus_modal.expires")}
            </p>
          </div>
        )}

        {/* ── CHECK REQUEST ── */}
        {mode === "request" && (
          <div style={{padding:"0 14px"}}>
            <Label>{t("plus_modal.target_location")}</Label>
            <InfoRow icon="ti-map-search" color="#534AB7">
              <p style={{fontSize:11,color:"#ccc",fontWeight:600,margin:0}}>
                {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "Locating..."}
              </p>
              <p style={{fontSize:9,color:"#555",margin:0}}>Tap map to change</p>
            </InfoRow>

            <Label>{t("plus_modal.time_window")}</Label>
            <div style={{display:"flex",gap:6}}>
              {windows.map((w,i) => (
                <div key={i} onClick={()=>setSelWin(i)} style={{
                  flex:1, background: selWin===i ? "#0e0c1a" : "#0d0d0d",
                  border:`1.5px solid ${selWin===i?"#534AB7":"transparent"}`,
                  borderRadius:10, padding:"9px 4px", textAlign:"center", cursor:"pointer",
                }}>
                  <div style={{fontSize:11,fontWeight:700,color:selWin===i?"#CECBF6":"#666"}}>{w.label_my}</div>
                  <div style={{fontSize:9,color:selWin===i?"#7F77DD":"#555"}}>{w.credits_cost} pts</div>
                </div>
              ))}
            </div>

            <div style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              background:"#0e0c1a",borderRadius:10,padding:"10px 12px",
              border:"0.5px solid #534AB7",marginTop:10,
            }}>
              <span style={{color:"#CECBF6",fontSize:12}}>{t("plus_modal.your_balance")}</span>
              <strong style={{color:"#EF9F27",fontSize:15}}>{userDoc?.balance_credits||0} pts</strong>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 2px 0"}}>
              <span style={{color:"#555",fontSize:11}}>Cost</span>
              <span style={{color:"#EF9F27",fontSize:12,fontWeight:700}}>{currentWin.credits_cost} pts</span>
            </div>

            <button onClick={handleCheckRequest} disabled={loading} style={{
              width:"100%",marginTop:14,border:"none",borderRadius:12,padding:14,
              background:"#534AB7",color:"#fff",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
            }}>
              {loading ? "..." : t("plus_modal.send_request")}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:7}}>
              {t("plus_modal.notify")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:7,marginTop:14}}>{children}</div>;
}

function InfoRow({ icon, color, children }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:8,background:"#0d0d0d",
      borderRadius:10,padding:"10px 12px",marginBottom:4,
      border:"0.5px solid rgba(255,255,255,0.06)",
    }}>
      <i className={`ti ${icon}`} style={{fontSize:16,color,flexShrink:0}} aria-hidden="true"/>
      <div>{children}</div>
    </div>
  );
}
