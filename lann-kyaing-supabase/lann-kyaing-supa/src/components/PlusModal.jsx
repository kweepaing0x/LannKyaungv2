import { useState, useEffect, useRef } from "react";
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
  {minutes:30,  credits_cost:50,  label_my:"၃၀ မိနစ်"},
  {minutes:60,  credits_cost:80,  label_my:"၁ နာရီ"},
  {minutes:120, credits_cost:120, label_my:"၂ နာရီ"},
];

export default function PlusModal({ onClose }) {
  const {
    user, userDoc, setUserDoc,
    userLocation,
    setShowPlusModal,
    setPickingLocation,
    pickedLocation, setPickedLocation,
  } = useAppStore();

  const [mode,    setMode]    = useState("update");
  const [selType, setSelType] = useState("police");
  const [selWin,  setSelWin]  = useState(0);
  const [loading, setLoading] = useState(false);
  const [types,   setTypes]   = useState(FALLBACK_TYPES);
  const [windows, setWindows] = useState(FALLBACK_WINDOWS);
  const [mmtTime, setMmtTime] = useState(getNowMMT());

  // Which field is waiting for map pick: "pin" | "req" | null
  const pendingPick = useRef(null);

  // Locations — GPS by default immediately
  const [pinLoc,      setPinLoc]      = useState(userLocation);
  const [pinLocLabel, setPinLocLabel] = useState(userLocation ? "Current location (GPS)" : "Waiting for GPS...");
  const [reqLoc,      setReqLoc]      = useState(userLocation);
  const [reqLocLabel, setReqLocLabel] = useState(userLocation ? "Current location (GPS)" : "Waiting for GPS...");

  // Load from Supabase
  useEffect(()=>{
    getSituationTypes().then(d=>{if(d?.length)setTypes(d);}).catch(()=>{});
    getTimeWindows().then(d=>{if(d?.length)setWindows(d);}).catch(()=>{});
    const id=setInterval(()=>setMmtTime(getNowMMT()),30000);
    return()=>clearInterval(id);
  },[]);

  // When GPS arrives, fill both locations
  useEffect(()=>{
    if(userLocation){
      if(!pinLoc){setPinLoc(userLocation);setPinLocLabel("Current location (GPS)");}
      if(!reqLoc){setReqLoc(userLocation);setReqLocLabel("Current location (GPS)");}
    }
  },[userLocation]);

  // When map returns a confirmed picked location → fill the right field
  useEffect(()=>{
    if(!pickedLocation||!pendingPick.current) return;
    const loc={lat:pickedLocation.lat,lng:pickedLocation.lng};
    const label=`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
    if(pendingPick.current==="pin"){setPinLoc(loc);setPinLocLabel(label);}
    else{setReqLoc(loc);setReqLocLabel(label);}
    pendingPick.current=null;
    setPickedLocation(null);
  },[pickedLocation]);

  function useGPS(target){
    if(!userLocation) return alert("GPS not ready yet. Please wait a moment.");
    if(target==="pin"){setPinLoc(userLocation);setPinLocLabel("Current location (GPS)");}
    else{setReqLoc(userLocation);setReqLocLabel("Current location (GPS)");}
  }

  function pickOnMap(target){
    pendingPick.current=target;
    setPickingLocation(true);
    // Close modal — MapPage shows pick UI, user confirms, modal reopens
    setShowPlusModal(false);
  }

  const currentType = types.find(x=>x.id===selType)||types[0];
  const currentWin  = windows[selWin]||windows[0];
  const balance     = userDoc?.balance_credits ?? 0;

  async function handlePostPin(){
    if(!pinLoc) return alert("Please select a location first");
    setLoading(true);
    try{
      await postPin({
        type:currentType.id, emoji:currentType.emoji,
        lat:pinLoc.lat, lng:pinLoc.lng,
        postedBy:user?.id,
        labelMy:currentType.label_my, labelEn:currentType.label_en,
      });
      setShowPlusModal(false);
    }catch(e){alert("Error: "+e.message);}
    finally{setLoading(false);}
  }

  async function handleCheckRequest(){
    if(!reqLoc) return alert("Please select a target location");
    if(balance<currentWin.credits_cost)
      return alert(`Not enough credits.\nYou have ${balance} pts, need ${currentWin.credits_cost} pts.\nContact @doublepz Yet to top up.`);
    setLoading(true);
    try{
      await postCheckRequest({
        requesterUid:user?.id,
        targetLat:reqLoc.lat, targetLng:reqLoc.lng,
        targetLabel:reqLocLabel||"Custom location",
        windowMinutes:currentWin.minutes,
        creditsCost:currentWin.credits_cost,
      });
      // Refresh balance immediately
      if(user?.id){const fresh=await getUserDoc(user.id);if(fresh)setUserDoc(fresh);}
      setShowPlusModal(false);
    }catch(e){alert("Error: "+e.message);}
    finally{setLoading(false);}
  }

  const canRequest=!!reqLoc&&balance>=currentWin.credits_cost;

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,
      background:"rgba(0,0,0,0.78)",
      zIndex:999,display:"flex",alignItems:"flex-end",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%",background:"#161616",
        borderRadius:"20px 20px 0 0",
        border:"0.5px solid rgba(255,255,255,0.09)",
        maxHeight:"90vh",overflowY:"auto",
        WebkitOverflowScrolling:"touch",
        paddingBottom:"env(safe-area-inset-bottom,20px)",
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 14px"}}/>

        {/* Mode tabs */}
        <div style={{display:"flex",gap:3,margin:"0 14px 16px",background:"#0d0d0d",borderRadius:10,padding:3}}>
          {[["update","Update Situation"],["request","Check Request"]].map(([m,lbl])=>(
            <button key={m} onClick={()=>setMode(m)} style={{
              flex:1,padding:"9px 4px",borderRadius:8,border:"none",
              background:mode===m?"#222":"transparent",
              color:mode===m?"#fff":"#555",
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>

        {/* ══ UPDATE SITUATION ══ */}
        {mode==="update"&&(
          <div style={{padding:"0 14px"}}>
            <SLabel>SITUATION TYPE</SLabel>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {types.map(st=>(
                <div key={st.id} onClick={()=>setSelType(st.id)} style={{
                  background:selType===st.id?`${st.color}22`:"#0d0d0d",
                  border:`1.5px solid ${selType===st.id?st.color:"transparent"}`,
                  borderRadius:12,padding:"9px 4px",textAlign:"center",cursor:"pointer",
                }}>
                  <span style={{fontSize:22,display:"block"}}>{st.emoji}</span>
                  <span style={{fontSize:9,color:selType===st.id?st.color:"#666",marginTop:3,display:"block"}}>
                    {st.label_my}
                  </span>
                </div>
              ))}
            </div>

            <SLabel>LOCATION</SLabel>
            {/* GPS button — active/highlighted when using GPS */}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <LocBtn
                active={pinLocLabel==="Current location (GPS)"}
                onClick={()=>useGPS("pin")}
              >
                📍 Use GPS
              </LocBtn>
              <LocBtn purple onClick={()=>pickOnMap("pin")}>
                🗺️ Pick on map
              </LocBtn>
            </div>
            <LocBox
              icon={pinLocLabel==="Current location (GPS)"?"📍":"🗺️"}
              title={pinLocLabel||"No location selected"}
              sub={pinLoc?`${pinLoc.lat.toFixed(5)}, ${pinLoc.lng.toFixed(5)}`:"Tap a button above"}
              highlight={pinLocLabel==="Current location (GPS)"}
            />

            <SLabel>POSTED TIME (MMT)</SLabel>
            <LocBox icon="🕐" title={mmtTime} sub="Myanmar Standard Time · UTC+6:30"/>

            <button onClick={handlePostPin} disabled={loading||!pinLoc} style={{
              width:"100%",marginTop:14,border:"none",borderRadius:12,padding:14,
              background:(loading||!pinLoc)?"#2a2a2a":"#e24b4a",
              color:(loading||!pinLoc)?"#666":"#fff",
              fontSize:14,fontWeight:700,
              cursor:pinLoc?"pointer":"not-allowed",fontFamily:"inherit",
            }}>
              {loading?"Posting...":"Post warning pin"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:8,marginBottom:4}}>
              Pin expires automatically after 24 hours
            </p>
          </div>
        )}

        {/* ══ CHECK REQUEST ══ */}
        {mode==="request"&&(
          <div style={{padding:"0 14px"}}>
            <SLabel>TARGET LOCATION</SLabel>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <LocBtn
                active={reqLocLabel==="Current location (GPS)"}
                onClick={()=>useGPS("req")}
              >
                📍 Use GPS
              </LocBtn>
              <LocBtn purple onClick={()=>pickOnMap("req")}>
                🗺️ Pick on map
              </LocBtn>
            </div>
            <LocBox
              icon={reqLocLabel==="Current location (GPS)"?"📍":"🗺️"}
              title={reqLocLabel||"No location selected"}
              sub={reqLoc?`${reqLoc.lat.toFixed(5)}, ${reqLoc.lng.toFixed(5)}`:"Tap a button above"}
              highlight={reqLocLabel==="Current location (GPS)"}
            />

            <SLabel>TIME WINDOW</SLabel>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {windows.map((w,i)=>(
                <div key={i} onClick={()=>setSelWin(i)} style={{
                  flex:1,background:selWin===i?"#0e0c1a":"#0d0d0d",
                  border:`1.5px solid ${selWin===i?"#534AB7":"transparent"}`,
                  borderRadius:12,padding:"10px 4px",textAlign:"center",cursor:"pointer",
                }}>
                  <div style={{fontSize:12,fontWeight:700,color:selWin===i?"#CECBF6":"#666"}}>
                    {w.label_my}
                  </div>
                  <div style={{fontSize:10,color:selWin===i?"#7F77DD":"#555",marginTop:2}}>
                    {w.credits_cost} pts
                  </div>
                </div>
              ))}
            </div>

            {/* Balance card */}
            <div style={{
              background:"#0e0c1a",borderRadius:12,padding:"14px",
              border:"0.5px solid #534AB7",marginBottom:12,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{color:"#888",fontSize:12}}>Your balance</span>
                <span style={{color:"#EF9F27",fontSize:20,fontWeight:800}}>
                  {balance.toLocaleString()} pts
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#888",fontSize:12}}>Cost</span>
                <span style={{
                  fontSize:14,fontWeight:700,
                  color:balance>=currentWin.credits_cost?"#a8f0c6":"#e24b4a",
                }}>
                  − {currentWin.credits_cost} pts
                </span>
              </div>
              {balance<currentWin.credits_cost&&(
                <div style={{
                  marginTop:10,background:"rgba(226,75,74,0.1)",
                  borderRadius:8,padding:"8px 10px",
                  color:"#e24b4a",fontSize:11,textAlign:"center",
                }}>
                  ⚠️ Not enough credits · Contact @doublepz Yet to top up
                </div>
              )}
            </div>

            <button onClick={handleCheckRequest} disabled={loading||!canRequest} style={{
              width:"100%",border:"none",borderRadius:12,padding:14,
              background:(loading||!canRequest)?"#1a1830":"#534AB7",
              color:(loading||!canRequest)?"#555":"#fff",
              fontSize:14,fontWeight:700,
              cursor:canRequest?"pointer":"not-allowed",fontFamily:"inherit",
            }}>
              {loading?"Sending...":"Send check request"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:8,marginBottom:4}}>
              Nearby checkers will be notified
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SLabel({children}){
  return <div style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:7,marginTop:4}}>
    {children}
  </div>;
}

function LocBox({icon,title,sub,highlight}){
  return(
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      background: highlight?"rgba(74,158,255,0.06)":"#0d0d0d",
      borderRadius:12,padding:"11px 14px",
      border:`0.5px solid ${highlight?"rgba(74,158,255,0.3)":"rgba(255,255,255,0.07)"}`,
      marginBottom:12,
    }}>
      <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
      <div>
        <div style={{fontSize:12,color:highlight?"#cce7ff":"#ccc",fontWeight:600}}>{title}</div>
        <div style={{fontSize:10,color:"#555",marginTop:2}}>{sub}</div>
      </div>
    </div>
  );
}

function LocBtn({children,onClick,purple,active}){
  return(
    <button onClick={onClick} style={{
      flex:1,padding:"10px 4px",
      border:`1.5px solid ${active?"#4a9eff":purple?"#534AB7":"rgba(255,255,255,0.1)"}`,
      borderRadius:10,
      background:active?"rgba(74,158,255,0.1)":purple?"#18152a":"#0d0d0d",
      color:active?"#4a9eff":purple?"#CECBF6":"#aaa",
      fontSize:11,fontWeight:700,
      cursor:"pointer",fontFamily:"inherit",
    }}>
      {children}
    </button>
  );
}
