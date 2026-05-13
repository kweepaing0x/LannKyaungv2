import { useAppStore } from "../store";
import { signOut } from "../services/supabaseService";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const s = {
  wrap:{ height:"100%", overflowY:"auto", background:"#0d0d0d", padding:"28px 16px 32px" },
  header:{ textAlign:"center", marginBottom:28 },
  avatar:{
    width:72, height:72, borderRadius:"50%", background:"#534AB7",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:28, margin:"0 auto 12px",
  },
  name:{ color:"#fff", fontSize:18, fontWeight:700 },
  role:{ color:"#534AB7", fontSize:11, fontWeight:700, letterSpacing:1, marginTop:3, textTransform:"uppercase" },
  email:{ color:"#555", fontSize:12, marginTop:3 },
  card:{
    background:"#1a1a1a", borderRadius:14, padding:16,
    border:"0.5px solid rgba(255,255,255,0.07)", marginBottom:12,
  },
  cardLbl:{ color:"#555", fontSize:10, fontWeight:700, letterSpacing:.5, marginBottom:12 },
  balBig:{ color:"#EF9F27", fontSize:34, fontWeight:800, textAlign:"center", margin:"4px 0 2px" },
  balSub:{ color:"#555", fontSize:11, textAlign:"center" },
  statRow:{ display:"flex", justifyContent:"space-between" },
  stat:{ textAlign:"center", flex:1 },
  statVal:{ color:"#fff", fontSize:20, fontWeight:700 },
  statKey:{ color:"#555", fontSize:10, marginTop:3 },
  row:{
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"11px 0", borderTop:"0.5px solid rgba(255,255,255,0.05)",
  },
  rowLbl:{ color:"#ccc", fontSize:13 },
  langBtns:{ display:"flex", gap:6 },
  langBtn:(a) => ({
    padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", border:"none",
    background: a ? "#534AB7" : "#222", color: a ? "#CECBF6" : "#555",
  }),
  tgBtn:{
    display:"block", textAlign:"center", background:"#0088cc",
    borderRadius:12, padding:"13px", color:"#fff", fontSize:13,
    fontWeight:700, textDecoration:"none", marginBottom:12,
  },
  outBtn:{
    width:"100%", background:"transparent", border:"0.5px solid #2a2a2a",
    borderRadius:12, padding:"13px", color:"#555", fontSize:13, cursor:"pointer",
  },
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userDoc, user } = useAppStore();
  const lang = i18n.language;
  const doc = userDoc || {};

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.avatar}>{(doc.display_name||"U")[0]}</div>
        <div style={s.name}>{doc.display_name || user?.email}</div>
        <div style={s.role}>{doc.role || "user"}</div>
        <div style={s.email}>{user?.email}</div>
      </div>

      <div style={s.card}>
        <div style={s.cardLbl}>CREDIT BALANCE</div>
        <div style={s.balBig}>{doc.balance_credits || 0} pts</div>
        <div style={s.balSub}>Top-up via @doublepz Yet on Telegram</div>
      </div>

      <div style={s.card}>
        <div style={s.cardLbl}>STATS</div>
        <div style={s.statRow}>
          <div style={s.stat}>
            <div style={s.statVal}>{doc.total_earned||0}</div>
            <div style={s.statKey}>{t("profile.earned")}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statVal}>{doc.total_spent||0}</div>
            <div style={s.statKey}>{t("profile.spent")}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statVal}>{doc.reports_submitted||0}</div>
            <div style={s.statKey}>{t("profile.reports")}</div>
          </div>
          {doc.role === "checker" && (
            <div style={s.stat}>
              <div style={s.statVal}>⭐{doc.rating?.toFixed(1)||"—"}</div>
              <div style={s.statKey}>{t("profile.rating")}</div>
            </div>
          )}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardLbl}>SETTINGS</div>
        <div style={s.row}>
          <span style={s.rowLbl}>{t("profile.language")}</span>
          <div style={s.langBtns}>
            <button style={s.langBtn(lang==="my")} onClick={()=>i18n.changeLanguage("my")}>မြန်မာ</button>
            <button style={s.langBtn(lang==="en")} onClick={()=>i18n.changeLanguage("en")}>EN</button>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.rowLbl}>Role</span>
          <span style={{color:"#534AB7",fontSize:12,fontWeight:600}}>{doc.role||"user"}</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLbl}>Checks fulfilled</span>
          <span style={{color:"#666",fontSize:13}}>{doc.check_requests_fulfilled||0}</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLbl}>Requests made</span>
          <span style={{color:"#666",fontSize:13}}>{doc.check_requests_made||0}</span>
        </div>
      </div>

      <a href="https://t.me/doublepzYet" style={s.tgBtn} target="_blank" rel="noreferrer">
        📱 Contact Admin · @doublepz Yet
      </a>
      <button style={s.outBtn} onClick={signOut}>{t("auth.sign_out")}</button>
    </div>
  );
}
