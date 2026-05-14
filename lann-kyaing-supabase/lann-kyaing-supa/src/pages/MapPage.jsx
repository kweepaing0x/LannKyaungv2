import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { subscribePins, subscribeCheckRequests, subscribeHistoryPins } from "../services/supabaseService";

const PIN_COLORS = {
  police:"#E24B4A", blocked:"#EF9F27", traffic:"#EF9F27",
  danger:"#E24B4A", flood:"#378ADD", repair:"#888780",
  event:"#534AB7", other:"#888780",
};

export default function MapPage() {
  const mapRef         = useRef(null);
  const mapInstance    = useRef(null);
  const markersRef     = useRef([]);
  const userMarkerRef  = useRef(null);
  const pickMarkerRef  = useRef(null); // draggable pin shown while picking
  const pickHandlerRef = useRef(null);

  const {
    userLocation, setUserLocation,
    pins, setPins,
    checkRequests, setCheckRequests,
    showHistory, setShowHistory,
    showPlusModal, setShowPlusModal,
    pickingLocation, setPickingLocation,
    pickedLocation,  setPickedLocation,
    pendingPickMode,
  } = useAppStore();

  const [mapReady,    setMapReady]    = useState(false);
  const [historyPins, setHistoryPins] = useState([]);

  // ── Init Leaflet ────────────────────────────────────────────
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const init = () => {
      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [16.8409, 96.1735], zoom: 14,
        zoomControl: false, attributionControl: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM',
        subdomains: "abcd", maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
      setMapReady(true);

      // GPS watch
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
          const ll = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(ll);
          } else {
            const icon = L.divIcon({
              className: "",
              html: `<div style="position:relative;width:20px;height:20px">
                <div style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;
                  border-radius:50%;border:2px solid rgba(74,158,255,0.35);
                  animation:lkPulse 2s ease-out infinite"></div>
                <div style="width:20px;height:20px;background:#fff;border-radius:50%;
                  border:3px solid #4a9eff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>
              </div>`,
              iconSize: [20, 20], iconAnchor: [10, 10],
            });
            userMarkerRef.current = L.marker(ll, { icon, zIndexOffset: 1000 }).addTo(map);
            map.setView(ll, 15);
          }
        }, () => {}, { enableHighAccuracy: true });
      }
    };
    if (window.L) init();
    else {
      const id = setInterval(() => { if (window.L) { clearInterval(id); init(); } }, 100);
      return () => clearInterval(id);
    }
  }, []);

  // ── Picking mode — attach click handler + show crosshair marker ──
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Remove previous handler & pick marker
    if (pickHandlerRef.current) {
      map.off("click", pickHandlerRef.current);
      pickHandlerRef.current = null;
    }
    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }

    if (!pickingLocation) return;

    // Crosshair cursor on map container
    mapRef.current.style.cursor = "crosshair";

    const handler = (e) => {
      const { lat, lng } = e.latlng;

      // Place a visible draggable pin at tapped spot
      if (pickMarkerRef.current) pickMarkerRef.current.remove();
      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:28px;height:28px;background:#534AB7;border-radius:50%;
            border:3px solid #fff;box-shadow:0 3px 12px rgba(83,74,183,0.7);
            display:flex;align-items:center;justify-content:center;font-size:14px">📍</div>
          <div style="width:3px;height:12px;background:#534AB7;border-radius:2px;margin-top:-2px"></div>
        </div>`,
        iconSize: [28, 44], iconAnchor: [14, 44],
      });
      pickMarkerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true })
        .addTo(map);

      // If user drags the pin — update location live
      pickMarkerRef.current.on("dragend", (ev) => {
        const pos = ev.target.getLatLng();
        setPickedLocation({ lat: pos.lat, lng: pos.lng });
      });

      setPickedLocation({ lat, lng });
      setPickingLocation(false);
      mapRef.current.style.cursor = "";

      // Re-open the modal after short delay so user sees the pin placed
      setTimeout(() => setShowPlusModal(true), 200);
    };

    pickHandlerRef.current = handler;
    map.once("click", handler);

    return () => {
      map.off("click", handler);
      mapRef.current && (mapRef.current.style.cursor = "");
    };
  }, [pickingLocation]);

  // Clear pick marker when modal closes fully
  useEffect(() => {
    if (!showPlusModal && pickMarkerRef.current && !pickingLocation) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }
  }, [showPlusModal]);

  // ── Realtime subs ───────────────────────────────────────────
  useEffect(() => { const u = subscribePins(setPins); return u; }, []);
  useEffect(() => { const u = subscribeCheckRequests(setCheckRequests); return u; }, []);
  useEffect(() => {
    if (showHistory) { const u = subscribeHistoryPins(setHistoryPins); return u; }
    else setHistoryPins([]);
  }, [showHistory]);

  // ── Draw pin markers ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const allPins = showHistory ? [...pins, ...historyPins] : pins;
    allPins.forEach(pin => {
      const color = PIN_COLORS[pin.type] || "#888";
      const hist  = !!pin.is_history;
      const sz    = hist ? 10 : 16;
      const icon  = L.divIcon({
        className: "",
        html: `<div style="width:${sz}px;height:${sz}px;background:${color};
          border-radius:50%;border:2px solid rgba(255,255,255,${hist ? .3 : .7});
          opacity:${hist ? .35 : 1};
          box-shadow:0 0 ${hist ? 3 : 8}px ${color}${hist ? "33" : "88"}"></div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
      });
      const m = L.marker([pin.lat, pin.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="background:#1a1a1a;color:#fff;padding:12px 16px;border-radius:10px;
            text-align:center;font-family:sans-serif;min-width:120px">
            <div style="font-size:26px">${pin.emoji || "📍"}</div>
            <div style="font-size:13px;font-weight:700;margin-top:6px">${pin.label_my || pin.type}</div>
            <div style="font-size:10px;color:#666;margin-top:3px">${hist ? "🕐 History" : "🔴 Live"}</div>
          </div>`, { className: "lk-popup" });
      markersRef.current.push(m);
    });
  }, [pins, historyPins, mapReady, showHistory]);

  function centerOnUser() {
    if (userLocation && mapInstance.current)
      mapInstance.current.setView([userLocation.lat, userLocation.lng], 16);
  }

  const openReqs = checkRequests.filter(r => r.status === "pending");

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"#0d0d0d" }}>
      <style>{`
        @keyframes lkPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2);opacity:0} }
      `}</style>

      <div ref={mapRef} style={{ width:"100%", height:"100%" }} />

      {!mapReady && (
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", background:"#0d0d0d", color:"#fff", fontSize:14, zIndex:5,
        }}>
          မြေပုံ တင်နေသည်...
        </div>
      )}

      {/* Pick mode banner — tap to pick, shows instructions */}
      {pickingLocation && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:600,
          background:"rgba(83,74,183,0.97)", padding:"14px 16px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 16px rgba(0,0,0,0.5)",
        }}>
          <div>
            <div style={{color:"#fff", fontSize:13, fontWeight:700}}>Tap map to set location</div>
            <div style={{color:"rgba(206,203,246,0.7)", fontSize:11, marginTop:2}}>
              You can drag the pin after placing it
            </div>
          </div>
          <button onClick={() => { setPickingLocation(false); setShowPlusModal(true); }} style={{
            background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8,
            color:"#fff", fontSize:12, fontWeight:600, padding:"6px 12px",
            cursor:"pointer", fontFamily:"inherit",
          }}>Cancel</button>
        </div>
      )}

      {/* History toggle */}
      <div onClick={() => setShowHistory(!showHistory)} style={{
        position:"absolute", top:14, left:"50%", transform:"translateX(-50%)",
        background:"rgba(20,20,20,0.95)", borderRadius:20, padding:"5px 14px",
        border:"0.5px solid rgba(255,255,255,0.08)", zIndex:500,
        whiteSpace:"nowrap", cursor:"pointer",
      }}>
        <span style={{ color:"#EF9F27", fontSize:11, fontWeight:600 }}>
          {showHistory ? "🕐 History ON · tap to hide" : `🕐 History · ${historyPins.length} pins`}
        </span>
      </div>

      {/* Center button */}
      <div style={{
        position:"absolute", top:60, right:12,
        display:"flex", flexDirection:"column", gap:6, zIndex:500,
      }}>
        <button onClick={centerOnUser} style={{
          width:36, height:36, background:"rgba(20,20,20,0.96)",
          borderRadius:9, border:"0.5px solid rgba(255,255,255,0.1)",
          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
        }}>
          <i className="ti ti-navigation" style={{ fontSize:16, color:"#ccc" }} aria-hidden="true" />
        </button>
      </div>

      {/* Open check requests panel */}
      {openReqs.length > 0 && (
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, zIndex:400,
          background:"rgba(13,13,13,0.97)", borderTop:"0.5px solid rgba(255,255,255,0.07)",
          padding:"10px 14px 12px", maxHeight:160, overflowY:"auto",
        }}>
          <div style={{ color:"#4a9eff", fontSize:11, fontWeight:700, marginBottom:6 }}>
            Check requests nearby — {openReqs.length} open
          </div>
          {openReqs.slice(0, 3).map(req => (
            <div key={req.id} style={{
              display:"flex", alignItems:"center", gap:10,
              borderTop:"0.5px solid rgba(255,255,255,0.05)", padding:"7px 0",
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", background:"#534AB7",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, color:"#CECBF6", fontWeight:700, flexShrink:0,
              }}>CK</div>
              <div>
                <div style={{ fontSize:11, color:"#ddd", fontWeight:600 }}>{req.target_label || "Nearby"}</div>
                <div style={{ fontSize:10, color:"#666" }}>{req.window_minutes} min · {req.credits_cost} pts</div>
              </div>
              <button style={{
                background:"#534AB7", border:"none", borderRadius:7, marginLeft:"auto",
                padding:"5px 10px", color:"#CECBF6", fontSize:10, cursor:"pointer", fontWeight:600,
              }}>Accept</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
