import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { subscribePins, subscribeCheckRequests, subscribeHistoryPins } from "../services/supabaseService";
import PlusModal from "../components/PlusModal";

const PIN_COLORS = {
  police:"#E24B4A", blocked:"#EF9F27", traffic:"#EF9F27",
  danger:"#E24B4A", flood:"#378ADD", repair:"#888780",
  event:"#534AB7", other:"#888780",
};

const s = {
  wrap:{ position:"relative", width:"100%", height:"100%", background:"#0d0d0d" },
  mapDiv:{ width:"100%", height:"100%" },
  loading:{
    position:"absolute", inset:0, display:"flex", alignItems:"center",
    justifyContent:"center", background:"#0d0d0d", color:"#fff", fontSize:14, zIndex:5,
  },
  rightBtns:{
    position:"absolute", top:60, right:12,
    display:"flex", flexDirection:"column", gap:6, zIndex:500,
  },
  rbtn:{
    width:36, height:36, background:"rgba(22,22,22,0.96)",
    borderRadius:9, border:"0.5px solid rgba(255,255,255,0.1)",
    display:"flex", alignItems:"center", justifyContent:"center",
    cursor:"pointer", fontSize:15, userSelect:"none",
  },
  topPill:{
    position:"absolute", top:14, left:"50%", transform:"translateX(-50%)",
    background:"rgba(22,22,22,0.96)", borderRadius:20, padding:"5px 14px",
    border:"0.5px solid rgba(255,255,255,0.08)", zIndex:500,
    whiteSpace:"nowrap", cursor:"pointer",
  },
  reqPanel:{
    position:"absolute", bottom:0, left:0, right:0, zIndex:400,
    background:"rgba(13,13,13,0.97)", borderTop:"0.5px solid rgba(255,255,255,0.07)",
    padding:"10px 14px 14px", maxHeight:160, overflowY:"auto",
  },
  reqHeader:{ color:"#4a9eff", fontSize:11, fontWeight:700, marginBottom:6 },
  reqItem:{
    display:"flex", alignItems:"center", gap:10,
    borderTop:"0.5px solid rgba(255,255,255,0.05)", padding:"7px 0",
  },
  reqAvatar:{
    width:28, height:28, borderRadius:"50%", background:"#534AB7",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:10, color:"#CECBF6", fontWeight:700, flexShrink:0,
  },
  acceptBtn:{
    background:"#534AB7", border:"none", borderRadius:7,
    padding:"5px 9px", color:"#CECBF6", fontSize:10,
    cursor:"pointer", marginLeft:"auto", fontWeight:600,
  },
};

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const {
    userLocation, setUserLocation,
    pins, setPins,
    checkRequests, setCheckRequests,
    showPlusModal, setShowPlusModal,
    showHistory, setShowHistory,
    user,
  } = useAppStore();
  const [mapReady, setMapReady] = useState(false);
  const [historyPins, setHistoryPins] = useState([]);

  // Init Leaflet map
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const tryInit = () => {
      if (!window.L) return;
      const L = window.L;
      const map = L.map(mapRef.current, {
        center:[16.8409, 96.1735], zoom:15,
        zoomControl:false, attributionControl:true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM',
        subdomains:"abcd", maxZoom:19,
      }).addTo(map);
      mapInstance.current = map;
      setMapReady(true);

      navigator.geolocation.watchPosition((pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation({ lat:pos.coords.latitude, lng:pos.coords.longitude });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(ll);
        } else {
          const icon = L.divIcon({
            className:"",
            html:`<div style="width:16px;height:16px;background:#fff;border-radius:50%;
              border:3px solid #4a9eff;box-shadow:0 0 0 8px rgba(74,158,255,0.15)"></div>`,
            iconSize:[16,16], iconAnchor:[8,8],
          });
          userMarkerRef.current = L.marker(ll,{icon,zIndexOffset:1000}).addTo(map);
          map.setView(ll,16);
        }
      }, ()=>{}, {enableHighAccuracy:true});
    };
    if (window.L) tryInit();
    else { const id=setInterval(()=>{if(window.L){clearInterval(id);tryInit();}},100); return ()=>clearInterval(id); }
  }, []);

  // Supabase real-time subscriptions
  useEffect(() => { const u = subscribePins(setPins); return u; }, []);
  useEffect(() => { const u = subscribeCheckRequests(setCheckRequests); return u; }, []);
  useEffect(() => {
    if (showHistory) subscribeHistoryPins(setHistoryPins);
  }, [showHistory]);

  // Draw markers
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const allPins = showHistory ? [...pins, ...historyPins] : pins;

    allPins.forEach(pin => {
      const color = PIN_COLORS[pin.type] || "#888";
      const hist = !!pin.is_history;
      const sz = hist ? 10 : 15;
      const icon = L.divIcon({
        className:"",
        html:`<div style="
          width:${sz}px;height:${sz}px;background:${color};border-radius:50%;
          border:2px solid rgba(255,255,255,${hist?0.25:0.7});
          opacity:${hist?0.35:1};
          box-shadow:0 0 ${hist?4:10}px ${color}${hist?"44":"99"};
        "></div>`,
        iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
      });

      const m = L.marker([pin.lat, pin.lng], {icon})
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="background:#1a1a1a;color:#fff;padding:10px 14px;
            border-radius:10px;font-family:sans-serif;text-align:center;min-width:120px">
            <div style="font-size:24px">${pin.emoji||"📍"}</div>
            <div style="font-size:13px;font-weight:700;margin-top:5px">${pin.label_my||pin.type}</div>
            <div style="font-size:10px;color:#777;margin-top:3px">
              ${hist ? "🕐 History" : "🔴 Live now"}
            </div>
          </div>`, {className:"lk-popup"});
      markersRef.current.push(m);
    });
  }, [pins, historyPins, mapReady, showHistory]);

  function centerOnUser() {
    if (userLocation && mapInstance.current)
      mapInstance.current.setView([userLocation.lat, userLocation.lng], 16);
  }

  const openReqs = checkRequests.filter(r => r.status === "pending");

  return (
    <div style={s.wrap}>
      <div ref={mapRef} style={s.mapDiv}/>
      {!mapReady && <div style={s.loading}>မြေပုံ တင်နေသည်...</div>}

      <div style={s.rightBtns}>
        <div style={s.rbtn} onClick={centerOnUser}>📍</div>
        <div style={{...s.rbtn, color:"#e24b4a"}}>⚠️</div>
      </div>

      <div style={s.topPill} onClick={() => setShowHistory(!showHistory)}>
        <span style={{color:"#EF9F27", fontSize:11, fontWeight:600}}>
          {showHistory ? "🕐 History ON · tap to hide" : `🕐 History layer · ${historyPins.length} pins`}
        </span>
      </div>

      {openReqs.length > 0 && (
        <div style={s.reqPanel}>
          <div style={s.reqHeader}>🎥 Check requests — {openReqs.length} open</div>
          {openReqs.slice(0,3).map(req => (
            <div key={req.id} style={s.reqItem}>
              <div style={s.reqAvatar}>CK</div>
              <div>
                <div style={{fontSize:11,color:"#ddd",fontWeight:600}}>{req.target_label||"Nearby location"}</div>
                <div style={{fontSize:10,color:"#666"}}>{req.window_minutes} min · {req.credits_cost} pts</div>
              </div>
              {req.requester_uid !== user?.id &&
                <button style={s.acceptBtn}>Accept</button>}
            </div>
          ))}
        </div>
      )}

      {showPlusModal && <PlusModal onClose={() => setShowPlusModal(false)}/>}
    </div>
  );
}
