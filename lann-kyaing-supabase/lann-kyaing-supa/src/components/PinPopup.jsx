import { useState } from "react";
import { formatMMT, maskEmail } from "../services/supabaseService";

// Full-screen media viewer
function MediaViewer({ url, onClose }) {
  const isVideo = url.match(/\.(mp4|mov|webm|ogg)/i);
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.95)",
        zIndex:2000, display:"flex", flexDirection:"column",
      }}
    >
      {/* Header */}
      <div style={{
        flexShrink:0, display:"flex", alignItems:"center",
        padding:"14px 16px", borderBottom:"0.5px solid rgba(255,255,255,0.08)",
      }}>
        <button
          onClick={onClose}
          style={{
            background:"none", border:"none", color:"#fff",
            fontSize:15, cursor:"pointer", display:"flex", alignItems:"center",
            gap:6, fontFamily:"inherit", fontWeight:600,
          }}
        >
          <i className="ti ti-arrow-left" style={{fontSize:20}} aria-hidden="true"/>
          Back
        </button>
        <span style={{color:"#666", fontSize:12, marginLeft:"auto"}}>
          {isVideo ? "Video" : "Photo"}
        </span>
      </div>

      {/* Media */}
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          flex:1, display:"flex", alignItems:"center",
          justifyContent:"center", padding:16, overflow:"hidden",
        }}
      >
        {isVideo ? (
          <video
            src={url} controls autoPlay
            style={{
              maxWidth:"100%", maxHeight:"100%",
              borderRadius:12, background:"#000",
            }}
          />
        ) : (
          <img
            src={url} alt="Pin media"
            style={{
              maxWidth:"100%", maxHeight:"100%",
              borderRadius:12, objectFit:"contain",
            }}
          />
        )}
      </div>
    </div>
  );
}

// Popup card shown when user taps a pin on the map
export default function PinPopup({ pin, onClose }) {
  const [showMedia, setShowMedia] = useState(false);

  if (!pin) return null;

  const maskedUser  = maskEmail(pin.posted_by_email);
  const timeStr     = formatMMT(pin.posted_at);
  const hasMedia    = !!pin.media_url;
  const isVideo     = hasMedia && pin.media_url.match(/\.(mp4|mov|webm|ogg)/i);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.6)",
          zIndex:1000,
          display:"flex", alignItems:"flex-end",
        }}
      >
        <div
          onClick={e=>e.stopPropagation()}
          style={{
            width:"100%", background:"#1a1a1a",
            borderRadius:"20px 20px 0 0",
            border:"0.5px solid rgba(255,255,255,0.09)",
            padding:"0 0 32px",
            paddingBottom:"calc(32px + env(safe-area-inset-bottom,0px))",
          }}
        >
          {/* Handle */}
          <div style={{width:36,height:4,background:"#2e2e2e",borderRadius:2,margin:"12px auto 16px"}}/>

          {/* Main info */}
          <div style={{padding:"0 20px"}}>
            {/* Emoji + label */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{
                width:52, height:52, borderRadius:"50%",
                background:"rgba(255,255,255,0.05)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:28, flexShrink:0,
              }}>
                {pin.emoji || "📍"}
              </div>
              <div>
                <div style={{color:"#fff",fontSize:17,fontWeight:700,lineHeight:1.3}}>
                  {pin.label_my || pin.type}
                </div>
                {pin.label_en && pin.label_en !== pin.label_my && (
                  <div style={{color:"#666",fontSize:12,marginTop:2}}>{pin.label_en}</div>
                )}
                <div style={{
                  display:"inline-block", marginTop:5,
                  background: pin.is_history?"rgba(255,255,255,0.06)":"rgba(226,75,74,0.15)",
                  borderRadius:6, padding:"2px 8px",
                  fontSize:10, fontWeight:700,
                  color: pin.is_history?"#666":"#e24b4a",
                }}>
                  {pin.is_history ? "🕐 History" : "🔴 Live"}
                </div>
              </div>
            </div>

            {/* Divider */}
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
              <span style={{color:"#ccc",fontSize:12,fontWeight:600}}>
                {timeStr || "Unknown"}
              </span>
            </div>

            {/* View photo/video — hyperlink style */}
            {hasMedia && (
              <button
                onClick={()=>setShowMedia(true)}
                style={{
                  background:"none", border:"none", padding:0,
                  display:"flex", alignItems:"center", gap:6,
                  cursor:"pointer", marginBottom:14,
                }}
              >
                <i className={`ti ${isVideo?"ti-player-play":"ti-photo"}`}
                  style={{fontSize:16,color:"#4a9eff"}} aria-hidden="true"/>
                <span style={{
                  color:"#4a9eff", fontSize:13, fontWeight:600,
                  textDecoration:"underline", textUnderlineOffset:3,
                }}>
                  {isVideo ? "View video" : "View photo"}
                </span>
              </button>
            )}

            {!hasMedia && (
              <div style={{
                display:"flex", alignItems:"center", gap:6, marginBottom:14,
              }}>
                <i className="ti ti-photo-off" style={{fontSize:15,color:"#333"}} aria-hidden="true"/>
                <span style={{color:"#444",fontSize:12}}>No photo or video attached</span>
              </div>
            )}

            {/* Close button */}
            <button onClick={onClose} style={{
              width:"100%", padding:"13px", borderRadius:12,
              background:"#222", border:"0.5px solid rgba(255,255,255,0.08)",
              color:"#888", fontSize:13, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
            }}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full screen media viewer */}
      {showMedia && pin.media_url && (
        <MediaViewer url={pin.media_url} onClose={()=>setShowMedia(false)}/>
      )}
    </>
  );
}
