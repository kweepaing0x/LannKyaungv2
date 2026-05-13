import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import {
  postPin, postCheckRequest, getNowMMT,
  getSituationTypes, getTimeWindows, getUserDoc,
} from "../services/supabaseService";

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
  {minutes:30,  credits_cost:50,  label_my:"၃၀ မိနစ်", label_en:"30 min"},
  {minutes:60,  credits_cost:80,  label_my:"၁ နာရီ",   label_en:"1 hour"},
  {minutes:120, credits_cost:120, label_my:"၂ နာရီ",   label_en:"2 hours"},
];

export default function PlusModal({ onClose }) {
  const { t } = useTranslation();
  const {
    user, userDoc, setUserDoc,
    userLocation,
    setShowPlusModal,
    pickingLocation, setPickingLocation,
    pickedLocation,  setPickedLocation,
  } = useAppStore();

  const [mode,       setMode]       = useState("update");
  const [selType,    setSelType]    = useState("police");
  const [selWin,     setSelWin]     = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [types,      setTypes]      = useState(FALLBACK_TYPES);
  const [windows,    setWindows]    = useState(FALLBACK_WINDOWS);
  const [mmtTime,    setMmtTime]    = useState(getNowMMT());

  // "Update situation" location — user's GPS or a tapped spot
  const [pinLocation, setPinLocation] = useState(null);
  const [pinLocLabel, setPinLocLabel] = useState("");

  // "Check request" target location
  const [reqLocation, setReqLocation] = useState(null);
  const [reqLocLabel, setReqLocLabel] = useState("");

  // Which mode is waiting for a map tap
  const pendingPick = useRef(null);  // "pin" | "req"

  // Load types & windows from Supabase (fallback to hardcoded)
  useEffect(() => {
    getSituationTypes().then(d => { if(d?.length) setTypes(d); }).catch(()=>{});
    getTimeWindows().then(d =>    { if(d?.length) setWindows(d); }).catch(()=>{});
    const id = setInterval(() => setMmtTime(getNowMMT()), 30000);
    return () => clearInterval(id);
  }, []);

  // Set GPS as default when userLocation is known
  useEffect(() => {
    if (userLocation && !pinLocation) {
      setPinLocation(userLocation);
      setPinLocLabel("Current location (GPS)");
    }
    if (userLocation && !reqLocation) {
      setReqLocation(userLocation);
      setReqLocLabel("Current location (GPS)");
    }
  }, [userLocation]);

  // When map tap returns a picked location
  useEffect(() => {
    if (!pickedLocation || !pendingPick.current) return;
    const loc = { lat: pickedLocation.lat, lng: pickedLocation.lng };
    const label = `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
    if (pendingPick.current === "pin") {
      setPinLocation(loc);
      setPinLocLabel(label);
    } else {
      setReqLocation(loc);
      setReqLocLabel(label);
    }
    pendingPick.current = null;
    setPickedLocation(null);
  }, [pickedLocation]);

  function useCurrentGPS(target) {
    if (!userLocation) return alert("GPS not found yet. Please wait.");
    if (target === "pin") { setPinLocation(userLocation); setPinLocLabel("Current location (GPS)"); }
    else { setReqLocation(userLocation); setReqLocLabel("Current location (GPS)"); }
  }

  function pickOnMap(target) {
    pendingPick.current = target;
    setPickingLocation(true);
    onClose(); // close modal so user can tap the map
  }

  const currentType = types.find(x => x.id === selType) || types[0];
  const currentWin  = windows[selWin] || windows[0];
  const balance     = userDoc?.balance_credits ?? 0;

  async function handlePostPin() {
    if (!pinLocation) return alert("Please select a location first");
    setLoading(true);
    try {
      await postPin({
        type:     currentType.id,
        emoji:    currentType.emoji,
        lat:      pinLocation.lat,
        lng:      pinLocation.lng,
        postedBy: user?.id,
        labelMy:  currentType.label_my,
        labelEn:  currentType.label_en,
      });
      setShowPlusModal(false);
    } catch(e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  }

  async function handleCheckRequest() {
    if (!reqLocation) return alert("Please select a target location");
    if (balance < currentWin.credits_cost)
      return alert(`Not enough credits. You have ${balance} pts, need ${currentWin.credits_cost} pts.`);
    setLoading(true);
    try {
      await postCheckRequest({
        requesterUid:  user?.id,
        targetLat:     reqLocation.lat,
        targetLng:     reqLocation.lng,
        targetLabel:   reqLocLabel || "Custom location",
        windowMinutes: currentWin.minutes,
        creditsCost:   currentWin.credits_cost,
      });
      // Refresh userDoc so balance updates in UI immediately
      const fresh = await getUserDoc(user?.id);
      if (fresh) setUserDoc(fresh);
      setShowPlusModal(false);
    } catch(e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.78)",
        zIndex:999,
        display:"flex", alignItems:"flex-end",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:"100%",
          background:"#161616",
          borderRadius:"20px 20px 0 0",
          border:"0.5px solid rgba(255,255,255,0.09)",
          maxHeight:"88vh",
          overflowY:"auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Handle */}
        <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 14px"}}/>

        {/* Mode tabs */}
        <div style={{display:"flex",gap:3,margin:"0 14px 14px",background:"#0d0d0d",borderRadius:10,padding:3}}>
          {[["update","Update Situation"],["request","Check Request"]].map(([m,lbl]) => (
            <button key={m} onClick={()=>setMode(m)} style={{
              flex:1, padding:"9px 4px", borderRadius:8, border:"none",
              background: mode===m ? "#222" : "transparent",
              color: mode===m ? "#fff" : "#555",
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>

        {/* ════ UPDATE SITUATION ════ */}
        {mode === "update" && (
          <div style={{padding:"0 14px"}}>
            <SLabel>SITUATION TYPE</SLabel>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {types.map(st => (
                <div key={st.id} onClick={()=>setSelType(st.id)} style={{
                  background: selType===st.id ? `${st.color}20` : "#0d0d0d",
                  border:`1.5px solid ${selType===st.id ? st.color : "transparent"}`,
                  borderRadius:12, padding:"9px 4px", textAlign:"center", cursor:"pointer",
                }}>
                  <span style={{fontSize:22,display:"block"}}>{st.emoji}</span>
                  <span style={{fontSize:9,color:selType===st.id?st.color:"#666",marginTop:3,display:"block"}}>
                    {st.label_my}
                  </span>
                </div>
              ))}
            </div>

            <SLabel>LOCATION</SLabel>
            <InfoBox
              icon="ti-map-pin" color="#4a9eff"
              title={pinLocLabel || "No location selected"}
              sub={pinLocation ? `${pinLocation.lat.toFixed(5)}, ${pinLocation.lng.toFixed(5)}` : "Choose below"}
            />
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <LocBtn onClick={()=>useCurrentGPS("pin")}>📍 Use GPS</LocBtn>
              <LocBtn onClick={()=>pickOnMap("pin")} purple>🗺️ Pick on map</LocBtn>
            </div>

            <SLabel>POSTED TIME</SLabel>
            <InfoBox icon="ti-clock" color="#EF9F27" title={mmtTime} sub="Myanmar Standard Time (UTC+6:30)"/>

            <button onClick={handlePostPin} disabled={loading||!pinLocation} style={{
              width:"100%", marginTop:16, border:"none", borderRadius:12, padding:14,
              background: (!pinLocation||loading) ? "#333" : "#e24b4a",
              color:"#fff", fontSize:14, fontWeight:700, cursor: pinLocation?"pointer":"not-allowed",
              fontFamily:"inherit",
            }}>
              {loading ? "Posting..." : "Post warning pin"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:7,marginBottom:4}}>
              Pin expires automatically after 24 hours
            </p>
          </div>
        )}

        {/* ════ CHECK REQUEST ════ */}
        {mode === "request" && (
          <div style={{padding:"0 14px"}}>
            <SLabel>TARGET LOCATION</SLabel>
            <InfoBox
              icon="ti-map-search" color="#534AB7"
              title={reqLocLabel || "No location selected"}
              sub={reqLocation ? `${reqLocation.lat.toFixed(5)}, ${reqLocation.lng.toFixed(5)}` : "Choose below"}
            />
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <LocBtn onClick={()=>useCurrentGPS("req")}>📍 Use GPS</LocBtn>
              <LocBtn onClick={()=>pickOnMap("req")} purple>🗺️ Pick on map</LocBtn>
            </div>

            <SLabel>TIME WINDOW</SLabel>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {windows.map((w,i)=>(
                <div key={i} onClick={()=>setSelWin(i)} style={{
                  flex:1, background:selWin===i?"#0e0c1a":"#0d0d0d",
                  border:`1.5px solid ${selWin===i?"#534AB7":"transparent"}`,
                  borderRadius:12, padding:"10px 4px", textAlign:"center", cursor:"pointer",
                }}>
                  <div style={{fontSize:12,fontWeight:700,color:selWin===i?"#CECBF6":"#666"}}>{w.label_my}</div>
                  <div style={{fontSize:10,color:selWin===i?"#7F77DD":"#555",marginTop:2}}>{w.credits_cost} pts</div>
                </div>
              ))}
            </div>

            {/* Balance & cost */}
            <div style={{
              background:"#0e0c1a", borderRadius:12, padding:"12px 14px",
              border:"0.5px solid #534AB7", marginBottom:8,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{color:"#888",fontSize:12}}>Your balance</span>
                <span style={{color:"#EF9F27",fontSize:14,fontWeight:700}}>{balance} pts</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#888",fontSize:12}}>Cost</span>
                <span style={{color:balance>=currentWin.credits_cost?"#fff":"#e24b4a",fontSize:14,fontWeight:700}}>
                  {currentWin.credits_cost} pts
                </span>
              </div>
              {balance < currentWin.credits_cost && (
                <div style={{marginTop:8,color:"#e24b4a",fontSize:11,textAlign:"center"}}>
                  ⚠️ Not enough credits — contact @doublepz Yet
                </div>
              )}
            </div>

            <button onClick={handleCheckRequest}
              disabled={loading || !reqLocation || balance < currentWin.credits_cost}
              style={{
                width:"100%", border:"none", borderRadius:12, padding:14,
                background: (loading||!reqLocation||balance<currentWin.credits_cost) ? "#2a2040" : "#534AB7",
                color: (loading||!reqLocation||balance<currentWin.credits_cost) ? "#666" : "#fff",
                fontSize:14, fontWeight:700,
                cursor:(reqLocation&&balance>=currentWin.credits_cost)?"pointer":"not-allowed",
                fontFamily:"inherit",
              }}>
              {loading ? "Sending..." : "Send check request"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:7,marginBottom:4}}>
              Nearby checkers will be notified
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
function SLabel({ children }) {
  return <div style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:7,marginTop:4}}>
    {children}
  </div>;
}

function InfoBox({ icon, color, title, sub }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      background:"#0d0d0d", borderRadius:12, padding:"11px 14px",
      border:"0.5px solid rgba(255,255,255,0.07)", marginBottom:8,
    }}>
      <i className={`ti ${icon}`} style={{fontSize:18,color,flexShrink:0}} aria-hidden="true"/>
      <div>
        <div style={{fontSize:12,color:"#ccc",fontWeight:600}}>{title}</div>
        <div style={{fontSize:10,color:"#555",marginTop:2}}>{sub}</div>
      </div>
    </div>
  );
}

function LocBtn({ children, onClick, purple }) {
  return (
    <button onClick={onClick} style={{
      flex:1, padding:"9px 4px", border:`1px solid ${purple?"#534AB7":"rgba(255,255,255,0.1)"}`,
      borderRadius:10, background: purple ? "#18152a" : "#0d0d0d",
      color: purple ? "#CECBF6" : "#ccc", fontSize:11, fontWeight:600,
      cursor:"pointer", fontFamily:"inherit",
    }}>
      {children}
    </button>
  );
}
