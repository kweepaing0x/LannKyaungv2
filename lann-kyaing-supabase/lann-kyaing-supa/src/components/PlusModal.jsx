import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  postPin, postCheckRequest, getNowMMT,
  getSituationTypes, getUserDoc,
  requestGPS, uploadPinMedia,
} from "../services/supabaseService";
import { notifyCheckRequest } from "../services/telegramService";

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

// Fixed time window options
const TIME_WINDOWS = [
  { id:"30min",  label:"Next 30 min",  minutes:30,   credits:150, desc:"I want to know in 30 mins" },
  { id:"1hr",    label:"Next 1 hour",  minutes:60,   credits:200, desc:"I want to know in 1 hour"  },
  { id:"custom", label:"Custom time",  minutes:null, credits:null,desc:"Set your own time"          },
];

// Custom hour options: 1–8 hours
const CUSTOM_HOURS = [1,2,3,4,5,6,7,8];
// Credits per hour for custom
const CREDITS_PER_HOUR = 180;

export default function PlusModal({ onClose }) {
  const {
    user, userDoc, setUserDoc,
    userLocation, setUserLocation,
    setShowPlusModal,
    setPickingLocation,
    pickedLocation, setPickedLocation,
    pendingPickTarget, setPendingPickTarget,
  } = useAppStore();

  const [mode,        setMode]        = useState("update");
  const [selType,     setSelType]     = useState("police");
  const [loading,     setLoading]     = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [types,       setTypes]       = useState(FALLBACK_TYPES);
  const [mmtTime,     setMmtTime]     = useState(getNowMMT());

  // Media upload
  const [mediaFile,    setMediaFile]    = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Locations
  const [pinLoc,      setPinLoc]      = useState(null);
  const [pinLocLabel, setPinLocLabel] = useState("");
  const [reqLoc,      setReqLoc]      = useState(null);
  const [reqLocLabel, setReqLocLabel] = useState("");

  // Time window selection
  const [selWindow,    setSelWindow]    = useState("30min"); // "30min" | "1hr" | "custom"
  const [customHours,  setCustomHours]  = useState(1);

  // Derived credits & minutes
  const activeWindow  = TIME_WINDOWS.find(w => w.id === selWindow);
  const finalMinutes  = selWindow === "custom" ? customHours * 60 : activeWindow.minutes;
  const finalCredits  = selWindow === "custom"
    ? customHours * CREDITS_PER_HOUR
    : activeWindow.credits;
  const windowLabel   = selWindow === "custom"
    ? `Custom · ${customHours} hr${customHours>1?"s":""}`
    : activeWindow.label;

  const balance = userDoc?.balance_credits ?? 0;
  const canAfford = balance >= finalCredits;

  // On mount — GPS default + apply picked location
  useEffect(() => {
    if (userLocation) {
      setPinLoc(userLocation);  setPinLocLabel("Current location (GPS)");
      setReqLoc(userLocation);  setReqLocLabel("Current location (GPS)");
    }
    if (pickedLocation && pendingPickTarget) {
      const label = `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`;
      if (pendingPickTarget==="pin") { setPinLoc(pickedLocation); setPinLocLabel(label); }
      else { setReqLoc(pickedLocation); setReqLocLabel(label); }
      setPickedLocation(null);
      setPendingPickTarget(null);
    }
  },[]);

  useEffect(() => {
    getSituationTypes().then(d=>{if(d?.length)setTypes(d);}).catch(()=>{});
    const id=setInterval(()=>setMmtTime(getNowMMT()),30000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    if(!userLocation) return;
    if(!pinLoc){setPinLoc(userLocation);setPinLocLabel("Current location (GPS)");}
    if(!reqLoc){setReqLoc(userLocation);setReqLocLabel("Current location (GPS)");}
  },[userLocation]);

  // GPS re-request
  async function handleUseGPS(target) {
    setGpsLoading(true);
    try {
      const loc = await requestGPS();
      setUserLocation(loc);
      if(target==="pin"||!target){setPinLoc(loc);setPinLocLabel("Current location (GPS)");}
      if(target==="req"||!target){setReqLoc(loc);setReqLocLabel("Current location (GPS)");}
    } catch(err) {
      if(err.code===1) {
        alert(
          "GPS is blocked.\n\n" +
          "To enable:\n" +
          "Chrome → tap 🔒 in address bar\n" +
          "→ Site settings → Location → Allow\n\n" +
          "Then tap 'Use GPS' again."
        );
      } else {
        alert("GPS not available. Try again or pick on map.");
      }
    } finally { setGpsLoading(false); }
  }

  function pickOnMap(target) {
    setPendingPickTarget(target);
    setPickingLocation(true);
    setShowPlusModal(false);
  }

  // Media
  function handleFileChange(e) {
    const file=e.target.files?.[0];
    if(!file) return;
    if(file.size>50*1024*1024){alert("File too large. Max 50MB.");return;}
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  }
  function removeMedia(){
    setMediaFile(null);
    if(mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if(fileInputRef.current) fileInputRef.current.value="";
  }

  const currentType = types.find(x=>x.id===selType)||types[0];

  // Post pin
  async function handlePostPin() {
    if(!pinLoc) return alert("Please select a location first");
    setLoading(true);
    try {
      let mediaUrl=null;
      if(mediaFile){
        try{ mediaUrl=await uploadPinMedia(mediaFile,`${user?.id}_${Date.now()}`); }
        catch(e){ console.warn("Media upload failed:",e.message); }
      }
      await postPin({
        type:currentType.id, emoji:currentType.emoji,
        lat:pinLoc.lat, lng:pinLoc.lng,
        postedBy:user?.id, postedByEmail:user?.email,
        labelMy:currentType.label_my, labelEn:currentType.label_en,
        mediaUrl,
      });
      setShowPlusModal(false);
    } catch(e){ alert("Error: "+e.message); }
    finally{ setLoading(false); }
  }

  // Send check request + Telegram notification
  async function handleCheckRequest() {
    if(!reqLoc) return alert("Please select a target location");
    if(!canAfford){
      alert(
        `Not enough credits.\n\n` +
        `Your balance: ${balance} pts\n` +
        `Cost: ${finalCredits} pts\n\n` +
        `Contact admin to top up:\n@doublepz Yet on Telegram`
      );
      return;
    }
    setLoading(true);
    try {
      await postCheckRequest({
        requesterUid: user?.id,
        targetLat:    reqLoc.lat,
        targetLng:    reqLoc.lng,
        targetLabel:  reqLocLabel||"Custom location",
        windowMinutes: finalMinutes,
        creditsCost:  finalCredits,
      });

      // Notify admin via Telegram bot
      await notifyCheckRequest({
        requesterEmail: user?.email,
        targetLat:      reqLoc.lat,
        targetLng:      reqLoc.lng,
        targetLabel:    reqLocLabel||"Custom location",
        windowMinutes:  finalMinutes,
        creditsCost:    finalCredits,
        windowLabel,
      });

      // Refresh balance
      if(user?.id){ const fresh=await getUserDoc(user.id); if(fresh)setUserDoc(fresh); }
      setShowPlusModal(false);
    } catch(e){ alert("Error: "+e.message); }
    finally{ setLoading(false); }
  }

  const isVideo=mediaFile?.type?.startsWith("video");

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",
      zIndex:999,display:"flex",alignItems:"flex-end",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%",background:"#161616",
        borderRadius:"20px 20px 0 0",
        border:"0.5px solid rgba(255,255,255,0.09)",
        maxHeight:"92vh",overflowY:"auto",
        WebkitOverflowScrolling:"touch",
        paddingBottom:"env(safe-area-inset-bottom,20px)",
      }}>
        <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 14px"}}/>

        {/* Tabs */}
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
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <LocBtn active={pinLocLabel==="Current location (GPS)"} loading={gpsLoading}
                onClick={()=>handleUseGPS("pin")}>
                {gpsLoading?"⌛ Getting...":"📍 Use GPS"}
              </LocBtn>
              <LocBtn purple onClick={()=>pickOnMap("pin")}>🗺️ Pick on map</LocBtn>
            </div>
            <LocBox
              icon={pinLocLabel==="Current location (GPS)"?"📍":"🗺️"}
              title={pinLocLabel||"No location yet"}
              sub={pinLoc?`${pinLoc.lat.toFixed(5)}, ${pinLoc.lng.toFixed(5)}`:"Tap a button above"}
              highlight={!!pinLoc} gps={pinLocLabel==="Current location (GPS)"}
            />

            <SLabel>POSTED TIME (MMT)</SLabel>
            <LocBox icon="🕐" title={mmtTime} sub="Myanmar Standard Time · UTC+6:30"/>

            <SLabel>PHOTO / VIDEO <Opt/></SLabel>
            {!mediaPreview?(
              <button onClick={()=>fileInputRef.current?.click()} style={{
                width:"100%",padding:"12px",borderRadius:12,
                border:"1.5px dashed rgba(255,255,255,0.12)",
                background:"#0d0d0d",color:"#666",
                fontSize:12,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",marginBottom:14,
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}>
                <i className="ti ti-camera" style={{fontSize:18}} aria-hidden="true"/>
                Add photo or video to verify
              </button>
            ):(
              <div style={{marginBottom:14,position:"relative"}}>
                {isVideo?(
                  <video src={mediaPreview} style={{width:"100%",borderRadius:12,
                    maxHeight:180,objectFit:"cover",background:"#000"}} controls/>
                ):(
                  <img src={mediaPreview} alt="preview" style={{width:"100%",
                    borderRadius:12,maxHeight:180,objectFit:"cover"}}/>
                )}
                <button onClick={removeMedia} style={{
                  position:"absolute",top:8,right:8,width:28,height:28,
                  borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"none",
                  color:"#fff",fontSize:14,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>✕</button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*"
              style={{display:"none"}} onChange={handleFileChange}/>

            <button onClick={handlePostPin} disabled={loading||!pinLoc} style={{
              width:"100%",marginTop:4,border:"none",borderRadius:12,padding:14,
              background:(loading||!pinLoc)?"#2a2a2a":"#e24b4a",
              color:(loading||!pinLoc)?"#555":"#fff",
              fontSize:14,fontWeight:700,
              cursor:pinLoc?"pointer":"not-allowed",fontFamily:"inherit",
            }}>
              {loading?(mediaFile?"Uploading...":"Posting..."):"Post warning pin"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:8,marginBottom:4}}>
              Pin expires automatically after 24 hours
            </p>
          </div>
        )}

        {/* ══ CHECK REQUEST ══ */}
        {mode==="request"&&(
          <div style={{padding:"0 14px"}}>

            {/* Intent headline */}
            <div style={{
              background:"rgba(83,74,183,0.1)",borderRadius:12,padding:"12px 14px",
              border:"0.5px solid rgba(83,74,183,0.3)",marginBottom:14,
            }}>
              <div style={{color:"#CECBF6",fontSize:13,fontWeight:700,marginBottom:3}}>
                🎥 Request a live video check
              </div>
              <div style={{color:"#888",fontSize:11,lineHeight:1.6}}>
                A nearby user will go to your selected location and send a video within your chosen time window.
              </div>
            </div>

            <SLabel>TARGET LOCATION</SLabel>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <LocBtn active={reqLocLabel==="Current location (GPS)"} loading={gpsLoading}
                onClick={()=>handleUseGPS("req")}>
                {gpsLoading?"⌛ Getting...":"📍 Use GPS"}
              </LocBtn>
              <LocBtn purple onClick={()=>pickOnMap("req")}>🗺️ Pick on map</LocBtn>
            </div>
            <LocBox
              icon={reqLocLabel==="Current location (GPS)"?"📍":"🗺️"}
              title={reqLocLabel||"No location yet"}
              sub={reqLoc?`${reqLoc.lat.toFixed(5)}, ${reqLoc.lng.toFixed(5)}`:"Tap a button above"}
              highlight={!!reqLoc} gps={reqLocLabel==="Current location (GPS)"}
            />

            <SLabel>I WANT TO KNOW WITHIN</SLabel>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {TIME_WINDOWS.map(w=>(
                <div key={w.id} onClick={()=>setSelWindow(w.id)} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:selWindow===w.id?"#0e0c1a":"#0d0d0d",
                  border:`1.5px solid ${selWindow===w.id?"#534AB7":"rgba(255,255,255,0.06)"}`,
                  borderRadius:12,padding:"12px 14px",cursor:"pointer",
                }}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,
                      color:selWindow===w.id?"#CECBF6":"#ccc"}}>
                      {w.label}
                    </div>
                    <div style={{fontSize:10,color:selWindow===w.id?"#7F77DD":"#555",marginTop:2}}>
                      {w.desc}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                    {w.id!=="custom"?(
                      <div style={{fontSize:14,fontWeight:800,
                        color:selWindow===w.id?"#EF9F27":"#666"}}>
                        {w.credits} pts
                      </div>
                    ):(
                      <div style={{fontSize:11,color:selWindow===w.id?"#7F77DD":"#555",fontWeight:600}}>
                        {CREDITS_PER_HOUR} pts/hr
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom hour picker */}
            {selWindow==="custom"&&(
              <div style={{marginBottom:14}}>
                <SLabel>SELECT HOURS</SLabel>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {CUSTOM_HOURS.map(h=>(
                    <button key={h} onClick={()=>setCustomHours(h)} style={{
                      width:44,height:44,borderRadius:10,border:"none",
                      background:customHours===h?"#534AB7":"#0d0d0d",
                      color:customHours===h?"#fff":"#666",
                      fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    }}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Balance + cost summary */}
            <div style={{
              background:"#0e0c1a",borderRadius:12,padding:14,
              border:`0.5px solid ${canAfford?"#534AB7":"#e24b4a"}`,marginBottom:12,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{color:"#888",fontSize:12}}>Your balance</span>
                <span style={{color:"#EF9F27",fontSize:20,fontWeight:800}}>
                  {balance.toLocaleString()} pts
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{color:"#888",fontSize:12}}>Time window</span>
                <span style={{color:"#ccc",fontSize:12,fontWeight:600}}>{windowLabel}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#888",fontSize:12}}>Cost</span>
                <span style={{fontSize:16,fontWeight:800,
                  color:canAfford?"#a8f0c6":"#e24b4a"}}>
                  − {finalCredits} pts
                </span>
              </div>

              {!canAfford&&(
                <div style={{
                  marginTop:12,background:"rgba(226,75,74,0.1)",
                  borderRadius:10,padding:"10px 12px",
                }}>
                  <div style={{color:"#e24b4a",fontSize:12,fontWeight:700,marginBottom:4}}>
                    ⚠️ Not enough credits
                  </div>
                  <div style={{color:"#999",fontSize:11,lineHeight:1.6}}>
                    You need {finalCredits - balance} more pts. Contact admin to top up:
                  </div>
                  <a
                    href="https://t.me/doublepzYet"
                    target="_blank" rel="noreferrer"
                    onClick={e=>e.stopPropagation()}
                    style={{
                      display:"block",marginTop:8,textAlign:"center",
                      background:"#0088cc",borderRadius:8,padding:"8px",
                      color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",
                    }}
                  >
                    📱 Contact @doublepz Yet on Telegram
                  </a>
                </div>
              )}
            </div>

            <button onClick={handleCheckRequest} disabled={loading||!reqLoc||!canAfford} style={{
              width:"100%",border:"none",borderRadius:12,padding:14,
              background:(loading||!reqLoc||!canAfford)?"#1a1830":"#534AB7",
              color:(loading||!reqLoc||!canAfford)?"#555":"#fff",
              fontSize:14,fontWeight:700,
              cursor:(reqLoc&&canAfford)?"pointer":"not-allowed",fontFamily:"inherit",
            }}>
              {loading?"Sending request...":"Send check request"}
            </button>
            <p style={{textAlign:"center",color:"#444",fontSize:10,marginTop:8,marginBottom:4}}>
              Admin will be notified · Nearby checkers will receive this request
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────
function Opt(){ return <span style={{color:"#444",fontWeight:400,letterSpacing:0,fontSize:9}}> (Optional)</span>; }
function SLabel({children}){
  return <div style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:7,marginTop:4}}>
    {children}
  </div>;
}
function LocBox({icon,title,sub,highlight,gps}){
  return(
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      background:gps?"rgba(74,158,255,0.07)":highlight?"rgba(83,74,183,0.07)":"#0d0d0d",
      borderRadius:12,padding:"11px 14px",
      border:`0.5px solid ${gps?"rgba(74,158,255,0.35)":highlight?"rgba(83,74,183,0.35)":"rgba(255,255,255,0.07)"}`,
      marginBottom:12,
    }}>
      <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,color:highlight?"#ddd":"#666",fontWeight:600,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>
        <div style={{fontSize:10,color:gps?"#4a9eff":highlight?"#7F77DD":"#555",marginTop:2}}>{sub}</div>
      </div>
    </div>
  );
}
function LocBtn({children,onClick,purple,active,loading}){
  return(
    <button onClick={onClick} disabled={loading} style={{
      flex:1,padding:"10px 4px",
      border:`1.5px solid ${active?"#4a9eff":purple?"#534AB7":"rgba(255,255,255,0.1)"}`,
      borderRadius:10,
      background:active?"rgba(74,158,255,0.12)":purple?"#18152a":"#0d0d0d",
      color:active?"#4a9eff":purple?"#CECBF6":"#aaa",
      fontSize:11,fontWeight:700,
      cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",
      opacity:loading?0.6:1,
    }}>{children}</button>
  );
}
