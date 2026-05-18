import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { subscribePins, subscribeCheckRequests, subscribeHistoryPins } from "../services/supabaseService";
import PinPopup from "../components/PinPopup";

const PIN_COLORS = {
  police:"#E24B4A",blocked:"#EF9F27",traffic:"#EF9F27",
  danger:"#E24B4A",flood:"#378ADD",repair:"#888780",
  event:"#534AB7",other:"#888780",
};

function PickCrosshair(){
  return(
    <div style={{position:"absolute",top:"50%",left:"50%",
      transform:"translate(-50%,-100%)",zIndex:800,pointerEvents:"none",
      display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:"#534AB7",
        border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:18,boxShadow:"0 4px 16px rgba(83,74,183,0.8)"}}>📍</div>
      <div style={{width:3,height:14,background:"#534AB7",borderRadius:"0 0 2px 2px",marginTop:-1}}/>
      <div style={{width:10,height:4,background:"rgba(0,0,0,0.35)",borderRadius:"50%"}}/>
    </div>
  );
}

export default function MapPage(){
  const mapRef        = useRef(null);
  const mapInstance   = useRef(null);
  const markersRef    = useRef([]);
  const userMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);

  const {
    userLocation,setUserLocation,
    pins,setPins,
    checkRequests,setCheckRequests,
    showHistory,setShowHistory,
    showPlusModal,setShowPlusModal,
    pickingLocation,setPickingLocation,
    setPickedLocation,
    pendingPickTarget,
    userDoc,adminConfig,
  } = useAppStore();

  const [mapReady,setMapReady]       = useState(false);
  const [historyPins,setHistoryPins] = useState([]);
  const [selectedPin,setSelectedPin] = useState(null);

  const accountType  = userDoc?.account_type || "normal";
  const delaySecs    = adminConfig?.map_delay_seconds ?? 1800;

  // Init map
  useEffect(()=>{
    if(mapInstance.current||!mapRef.current) return;
    const init=()=>{
      const L=window.L;
      const map=L.map(mapRef.current,{
        center:[16.8409,96.1735],zoom:14,
        zoomControl:false,attributionControl:true,tap:true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{
        attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM',
        subdomains:"abcd",maxZoom:19,
      }).addTo(map);
      mapInstance.current=map;
      setMapReady(true);
      if(navigator.geolocation){
        navigator.geolocation.watchPosition((pos)=>{
          const ll=[pos.coords.latitude,pos.coords.longitude];
          setUserLocation({lat:pos.coords.latitude,lng:pos.coords.longitude});
          if(userMarkerRef.current){
            userMarkerRef.current.setLatLng(ll);
          } else {
            const icon=L.divIcon({className:"",
              html:`<div style="position:relative;width:20px;height:20px">
                <div style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;border-radius:50%;
                  border:2px solid rgba(74,158,255,0.35);animation:lkPulse 2s ease-out infinite"></div>
                <div style="width:20px;height:20px;background:#fff;border-radius:50%;
                  border:3px solid #4a9eff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>
              </div>`,iconSize:[20,20],iconAnchor:[10,10],
            });
            userMarkerRef.current=L.marker(ll,{icon,zIndexOffset:1000}).addTo(map);
            map.setView(ll,15);
          }
        },()=>{},{enableHighAccuracy:true});
      }
    };
    if(window.L) init();
    else{const id=setInterval(()=>{if(window.L){clearInterval(id);init();}},100);return()=>clearInterval(id);}
  },[]);

  // Confirm map pick
  function confirmPickLocation(){
    const map=mapInstance.current;
    if(!map) return;
    const center=map.getCenter();
    const loc={lat:center.lat,lng:center.lng};
    const L=window.L;
    if(dropMarkerRef.current){dropMarkerRef.current.remove();dropMarkerRef.current=null;}
    const icon=L.divIcon({className:"",
      html:`<div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:30px;height:30px;background:#534AB7;border-radius:50%;
          border:3px solid #fff;display:flex;align-items:center;justify-content:center;
          font-size:15px;box-shadow:0 4px 14px rgba(83,74,183,0.8)">📍</div>
        <div style="width:3px;height:10px;background:#534AB7;margin-top:-2px;border-radius:2px"></div>
        <div style="width:8px;height:3px;background:rgba(0,0,0,0.3);border-radius:50%"></div>
      </div>`,iconSize:[30,46],iconAnchor:[15,46],
    });
    dropMarkerRef.current=L.marker([loc.lat,loc.lng],{icon}).addTo(map);
    setPickedLocation(loc);
    setPickingLocation(false);
    setTimeout(()=>setShowPlusModal(true),100);
  }
  function cancelPick(){
    setPickingLocation(false);
    if(dropMarkerRef.current){dropMarkerRef.current.remove();dropMarkerRef.current=null;}
    setTimeout(()=>setShowPlusModal(true),100);
  }
  useEffect(()=>{
    if(!showPlusModal&&!pickingLocation&&dropMarkerRef.current){
      dropMarkerRef.current.remove();dropMarkerRef.current=null;
    }
  },[showPlusModal,pickingLocation]);

  // Subscribe pins with account type delay
  useEffect(()=>{
    if(!userDoc) return; // wait until we know account type
    const u=subscribePins(setPins, accountType, delaySecs);
    return u;
  },[userDoc]);

  useEffect(()=>{const u=subscribeCheckRequests(setCheckRequests);return u;},[]);
  useEffect(()=>{
    if(showHistory){const u=subscribeHistoryPins(setHistoryPins);return u;}
    else setHistoryPins([]);
  },[showHistory]);

  // Draw pins
  useEffect(()=>{
    if(!mapReady||!mapInstance.current||!window.L) return;
    const L=window.L;
    markersRef.current.forEach(m=>m.remove());
    markersRef.current=[];
    const all=showHistory?[...pins,...historyPins]:pins;
    all.forEach(pin=>{
      const color=PIN_COLORS[pin.type]||"#888";
      const hist=!!pin.is_history;
      const sz=hist?10:20;
      const hasTip=pin.tip_enabled&&!hist;
      const icon=L.divIcon({className:"",
        html:`<div style="position:relative">
          <div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;
            border:2.5px solid rgba(255,255,255,${hist?.2:.7});opacity:${hist?.4:1};
            box-shadow:0 0 ${hist?3:10}px ${color}${hist?"33":"99"};cursor:pointer"></div>
          ${hasTip?`<div style="position:absolute;top:-6px;right:-6px;font-size:10px;line-height:1">☕</div>`:""}
        </div>`,
        iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],
      });
      const m=L.marker([pin.lat,pin.lng],{icon}).addTo(mapInstance.current)
        .on("click",()=>setSelectedPin(pin));
      markersRef.current.push(m);
    });
  },[pins,historyPins,mapReady,showHistory]);

  function centerOnUser(){
    if(userLocation&&mapInstance.current)
      mapInstance.current.setView([userLocation.lat,userLocation.lng],16);
  }

  const openReqs=checkRequests.filter(r=>r.status==="pending");
  const delayMins=Math.round(delaySecs/60);

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#0d0d0d"}}>
      <style>{`@keyframes lkPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}`}</style>
      <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
      {!mapReady&&(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
          justifyContent:"center",background:"#0d0d0d",color:"#fff",fontSize:14,zIndex:5}}>
          မြေပုံ တင်နေသည်...
        </div>
      )}

      {/* Normal user delay banner */}
      {accountType==="normal"&&!pickingLocation&&(
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:600,
          background:"rgba(20,20,20,0.92)",padding:"7px 14px",
          borderBottom:"0.5px solid rgba(255,255,255,0.07)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{color:"#888",fontSize:11}}>
            ⏱ Pins delayed {delayMins} min · <span style={{color:"#EF9F27"}}>Normal account</span>
          </span>
          <span style={{color:"#534AB7",fontSize:10,fontWeight:700,cursor:"pointer"}}
            onClick={()=>alert("Upgrade to Business to see real-time pins.\nContact @doublepz Yet on Telegram.")}>
            Upgrade →
          </span>
        </div>
      )}

      {/* Pick mode */}
      {pickingLocation&&(<>
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:900,
          background:"rgba(83,74,183,0.97)",padding:"12px 16px 10px",
          boxShadow:"0 2px 20px rgba(0,0,0,0.5)"}}>
          <div style={{color:"#fff",fontSize:13,fontWeight:700,textAlign:"center"}}>Pan map to your location</div>
          <div style={{color:"rgba(206,203,246,0.75)",fontSize:11,textAlign:"center",marginTop:3}}>
            The 📍 pin marks the center — pan until it's on your spot
          </div>
        </div>
        <PickCrosshair/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:900,
          background:"rgba(13,13,13,0.97)",padding:"14px 16px",
          borderTop:"0.5px solid rgba(255,255,255,0.08)",display:"flex",gap:10}}>
          <button onClick={cancelPick} style={{flex:1,padding:"13px",borderRadius:12,
            border:"0.5px solid rgba(255,255,255,0.12)",
            background:"#1a1a1a",color:"#aaa",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={confirmPickLocation} style={{flex:2,padding:"13px",borderRadius:12,
            border:"none",background:"#534AB7",color:"#fff",fontSize:14,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(83,74,183,0.5)"}}>
            ✓ Confirm this location
          </button>
        </div>
      </>)}

      {/* Normal mode controls */}
      {!pickingLocation&&(<>
        <div onClick={()=>setShowHistory(!showHistory)} style={{
          position:"absolute",top:accountType==="normal"?42:14,
          left:"50%",transform:"translateX(-50%)",
          background:"rgba(20,20,20,0.95)",borderRadius:20,padding:"5px 14px",
          border:"0.5px solid rgba(255,255,255,0.08)",zIndex:500,
          whiteSpace:"nowrap",cursor:"pointer"}}>
          <span style={{color:"#EF9F27",fontSize:11,fontWeight:600}}>
            {showHistory?`🕐 History ON · tap to hide`:`🕐 History · ${historyPins.length} pins`}
          </span>
        </div>
        <div style={{position:"absolute",top:accountType==="normal"?90:60,right:12,zIndex:500}}>
          <button onClick={centerOnUser} style={{
            width:36,height:36,background:"rgba(20,20,20,0.96)",
            borderRadius:9,border:"0.5px solid rgba(255,255,255,0.1)",
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <i className="ti ti-navigation" style={{fontSize:16,color:"#ccc"}} aria-hidden="true"/>
          </button>
        </div>
        {openReqs.length>0&&(
          <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:400,
            background:"rgba(13,13,13,0.97)",borderTop:"0.5px solid rgba(255,255,255,0.07)",
            padding:"10px 14px 12px",maxHeight:160,overflowY:"auto"}}>
            <div style={{color:"#4a9eff",fontSize:11,fontWeight:700,marginBottom:6}}>
              Check requests nearby — {openReqs.length} open
            </div>
            {openReqs.slice(0,3).map(req=>(
              <div key={req.id} style={{display:"flex",alignItems:"center",gap:10,
                borderTop:"0.5px solid rgba(255,255,255,0.05)",padding:"7px 0"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#534AB7",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,color:"#CECBF6",fontWeight:700,flexShrink:0}}>CK</div>
                <div>
                  <div style={{fontSize:11,color:"#ddd",fontWeight:600}}>{req.target_label||"Nearby"}</div>
                  <div style={{fontSize:10,color:"#666"}}>{req.window_minutes} min · {req.credits_cost} pts</div>
                </div>
                <button style={{background:"#534AB7",border:"none",borderRadius:7,marginLeft:"auto",
                  padding:"5px 10px",color:"#CECBF6",fontSize:10,cursor:"pointer",fontWeight:600}}>
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </>)}

      {selectedPin&&<PinPopup pin={selectedPin} onClose={()=>setSelectedPin(null)}/>}
    </div>
  );
}
