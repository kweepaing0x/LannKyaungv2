import { useAppStore } from "../store";
import { signOut } from "../services/supabaseService";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userDoc, user } = useAppStore();
  const lang = i18n.language;
  const doc  = userDoc || {};
  const balance = doc.balance_credits ?? 0;

  return (
    <div style={{
      height:"100%", overflowY:"auto", background:"#0d0d0d",
      padding:"28px 16px 32px",
      WebkitOverflowScrolling:"touch",
    }}>
      {/* Avatar & name */}
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{
          width:72, height:72, borderRadius:"50%", background:"#534AB7",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, margin:"0 auto 12px", fontWeight:700,
        }}>
          {(doc.display_name||user?.email||"U")[0].toUpperCase()}
        </div>
        <div style={{color:"#fff",fontSize:18,fontWeight:700}}>
          {doc.display_name || user?.email}
        </div>
        <div style={{
          color:"#534AB7",fontSize:11,fontWeight:700,
          letterSpacing:1,marginTop:4,textTransform:"uppercase",
        }}>
          {doc.role || "user"}
        </div>
        <div style={{color:"#555",fontSize:12,marginTop:3}}>{user?.email}</div>
      </div>

      {/* Balance card */}
      <div style={card}>
        <div style={cardLbl}>CREDIT BALANCE</div>
        <div style={{color:"#EF9F27",fontSize:36,fontWeight:800,textAlign:"center",margin:"6px 0 2px"}}>
          {balance.toLocaleString()} pts
        </div>
        <div style={{color:"#555",fontSize:11,textAlign:"center"}}>
          Top-up via Telegram · @doublepz Yet
        </div>
      </div>

      {/* Stats */}
      <div style={card}>
        <div style={cardLbl}>STATS</div>
        <div style={{display:"flex",justifyContent:"space-around"}}>
          <Stat val={doc.total_earned||0}            label={t("profile.earned")}/>
          <Stat val={doc.total_spent||0}             label={t("profile.spent")}/>
          <Stat val={doc.reports_submitted||0}       label={t("profile.reports")}/>
          {doc.role==="checker" &&
            <Stat val={`⭐${(doc.rating||0).toFixed(1)}`} label={t("profile.rating")}/>}
        </div>
      </div>

      {/* Activity */}
      <div style={card}>
        <div style={cardLbl}>ACTIVITY</div>
        <Row label="Check requests made"      val={doc.check_requests_made||0}/>
        <Row label="Checks fulfilled"         val={doc.check_requests_fulfilled||0}/>
        <Row label="Warning pins posted"      val={doc.reports_submitted||0}/>
        <Row label="Account status"           val={doc.is_active?"Active ✅":"Suspended ❌"}/>
      </div>

      {/* Settings */}
      <div style={card}>
        <div style={cardLbl}>SETTINGS</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"11px 0",borderTop:"0.5px solid rgba(255,255,255,0.05)"}}>
          <span style={{color:"#ccc",fontSize:13}}>{t("profile.language")}</span>
          <div style={{display:"flex",gap:6}}>
            {["my","en"].map(l => (
              <button key={l} onClick={()=>i18n.changeLanguage(l)} style={{
                padding:"4px 12px", borderRadius:7, border:"none",
                background: lang===l ? "#534AB7" : "#1a1a1a",
                color: lang===l ? "#CECBF6" : "#555",
                fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              }}>
                {l==="my" ? "မြန်မာ" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact admin */}
      <a href="https://t.me/dx0dev" target="_blank" rel="noreferrer" style={{
        display:"block", textAlign:"center", background:"#0088cc",
        borderRadius:12, padding:"13px", color:"#fff",
        fontSize:13, fontWeight:700, textDecoration:"none", marginBottom:12,
      }}>
        📱 Contact Admin · @dx0dev
      </a>

      <button onClick={signOut} style={{
        width:"100%", background:"transparent",
        border:"0.5px solid #2a2a2a", borderRadius:12,
        padding:"13px", color:"#555", fontSize:13,
        cursor:"pointer", fontFamily:"inherit",
      }}>
        Sign out
      </button>
    </div>
  );
}

const card = {
  background:"#1a1a1a", borderRadius:14, padding:16,
  border:"0.5px solid rgba(255,255,255,0.07)", marginBottom:12,
};
const cardLbl = {
  color:"#555", fontSize:10, fontWeight:700,
  letterSpacing:.5, marginBottom:12,
};

function Stat({ val, label }) {
  return (
    <div style={{textAlign:"center",flex:1}}>
      <div style={{color:"#fff",fontSize:20,fontWeight:700}}>{val}</div>
      <div style={{color:"#555",fontSize:10,marginTop:3}}>{label}</div>
    </div>
  );
}
function Row({ label, val }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"10px 0", borderTop:"0.5px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{color:"#ccc",fontSize:13}}>{label}</span>
      <span style={{color:"#666",fontSize:13}}>{val}</span>
    </div>
  );
}
