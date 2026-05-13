import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import { onAuthChange, getUserDoc, getAdminConfig } from "./services/supabaseService";
import { isConfigured } from "./supabase";
import { useTranslation } from "react-i18next";
import LoginPage   from "./pages/LoginPage";
import MapPage     from "./pages/MapPage";
import ProfilePage from "./pages/ProfilePage";
import PlusModal   from "./components/PlusModal";

export default function App() {
  const { t } = useTranslation();
  const {
    user, setUser, setUserDoc, setAdminConfig,
    activeTab, setActiveTab,
    showPlusModal, setShowPlusModal,
  } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        try {
          const [uDoc, cfg] = await Promise.all([
            getUserDoc(u.id),
            getAdminConfig(),
          ]);
          setUserDoc(uDoc);
          setAdminConfig(cfg);
        } catch(e) {
          console.warn("getUserDoc error:", e.message);
        }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Not configured screen ─────────────────────────────────
  if (!isConfigured) {
    return (
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"#0d0d0d", padding:28, textAlign:"center", gap:16,
      }}>
        <div style={{fontSize:36, fontWeight:800, color:"#fff"}}>လမ်းကြောင်း</div>
        <div style={{
          background:"#1a1a1a", borderRadius:14, padding:20,
          border:"0.5px solid rgba(255,165,0,0.4)", maxWidth:340, width:"100%",
        }}>
          <div style={{fontSize:22, marginBottom:10}}>⚙️</div>
          <div style={{color:"#EF9F27", fontWeight:700, fontSize:14, marginBottom:8}}>
            Setup Required
          </div>
          <div style={{color:"#888", fontSize:12, lineHeight:1.7, marginBottom:16}}>
            Add your Supabase keys to a <code style={{color:"#EF9F27",background:"#111",padding:"1px 5px",borderRadius:4}}>.env</code> file:
          </div>
          <div style={{
            background:"#0d0d0d", borderRadius:10, padding:14,
            textAlign:"left", fontFamily:"monospace", fontSize:11,
            color:"#4a9eff", lineHeight:2, border:"0.5px solid #222",
          }}>
            <div style={{color:"#555", marginBottom:4}}># create .env in project root</div>
            <div>VITE_SUPABASE_URL=https://xxx.supabase.co</div>
            <div>VITE_SUPABASE_ANON=eyJhbGci...</div>
          </div>
          <div style={{color:"#555", fontSize:11, marginTop:12, lineHeight:1.6}}>
            Get keys from:<br/>
            <span style={{color:"#4a9eff"}}>Supabase Console → Project Settings → API</span>
          </div>
          <div style={{marginTop:16, color:"#555", fontSize:11}}>
            Then restart: <code style={{color:"#EF9F27",background:"#111",padding:"1px 5px",borderRadius:4}}>npm run dev</code>
          </div>
        </div>
        <div style={{color:"#444", fontSize:11}}>
          Need help? Contact{" "}
          <a href="https://t.me/doublepzYet" style={{color:"#534AB7"}}>@doublepz Yet</a>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"#0d0d0d", gap:14,
      }}>
        <div style={{fontSize:34, fontWeight:800, color:"#fff"}}>လမ်းကြောင်း</div>
        <div style={{
          width:32, height:32, border:"3px solid #333",
          borderTopColor:"#e24b4a", borderRadius:"50%",
          animation:"spin 0.8s linear infinite",
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Not logged in ─────────────────────────────────────────
  if (!user) return <LoginPage />;

  // ── Main app ──────────────────────────────────────────────
  return (
    <>
      {/* Page */}
      <div style={{flex:1, overflow:"hidden", position:"relative", minHeight:0}}>
        {activeTab === "map"     && <MapPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        flexShrink:0,
        height:60,
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        background:"#0d0d0d",
        borderTop:"0.5px solid rgba(255,255,255,0.08)",
        display:"flex",
        alignItems:"center",
        zIndex:20,
      }}>
        <TabBtn
          active={activeTab==="map"}
          icon="ti-map-pin"
          label={t("tabs.checkpoints")}
          onClick={()=>setActiveTab("map")}
        />

        {/* + FAB */}
        <div style={{flex:1, display:"flex", justifyContent:"center"}}>
          <button
            onClick={()=>{ setActiveTab("map"); setShowPlusModal(true); }}
            aria-label="Post situation or check request"
            style={{
              width:54, height:54,
              borderRadius:"50%",
              background:"linear-gradient(135deg,#e24b4a,#ff6b35)",
              border:"3px solid #0d0d0d",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
              marginTop:-20,
              boxShadow:"0 4px 18px rgba(226,75,74,0.5)",
            }}
          >
            <i className="ti ti-plus" style={{fontSize:28, color:"#fff"}} aria-hidden="true"/>
          </button>
        </div>

        <TabBtn
          active={activeTab==="profile"}
          icon="ti-user-circle"
          label={t("tabs.profile")}
          onClick={()=>setActiveTab("profile")}
        />
      </nav>

      {/* Modal above everything */}
      {showPlusModal && <PlusModal onClose={()=>setShowPlusModal(false)}/>}
    </>
  );
}

function TabBtn({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", gap:3, padding:"6px 0",
      background:"none", border:"none", cursor:"pointer",
      opacity: active ? 1 : 0.38,
    }}>
      <i className={`ti ${icon}`} style={{fontSize:22, color:"#fff"}} aria-hidden="true"/>
      <span style={{fontSize:9, fontWeight:700, color:"#fff", letterSpacing:.5}}>
        {label.toUpperCase()}
      </span>
    </button>
  );
}
