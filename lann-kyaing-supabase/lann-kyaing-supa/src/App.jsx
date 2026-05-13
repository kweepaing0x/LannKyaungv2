import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import { onAuthChange, getUserDoc, getAdminConfig } from "./services/supabaseService";
import { useTranslation } from "react-i18next";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import ProfilePage from "./pages/ProfilePage";
import PlusModal from "./components/PlusModal";

export default function App() {
  const { t } = useTranslation();
  const { user, setUser, setUserDoc, setAdminConfig,
    activeTab, setActiveTab, showPlusModal, setShowPlusModal } = useAppStore();
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
        } catch(e) { console.warn("Load user doc:", e.message); }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#0d0d0d", gap:12
    }}>
      <div style={{fontSize:32,fontWeight:800,color:"#fff"}}>လမ်းကြောင်း</div>
      <div style={{fontSize:11,color:"#444",letterSpacing:3}}>LOADING...</div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <>
      {/* Page content — takes all remaining height */}
      <div style={{flex:1, overflow:"hidden", position:"relative", minHeight:0}}>
        {activeTab === "map"     && <MapPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom nav — fixed height, never shrinks */}
      <nav style={{
        flexShrink:0,
        height: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background:"#0d0d0d",
        borderTop:"0.5px solid rgba(255,255,255,0.08)",
        display:"flex", alignItems:"center",
        position:"relative", zIndex:20,
      }}>
        <TabBtn active={activeTab==="map"} icon="ti-map-pin"
          label={t("tabs.checkpoints")} onClick={()=>setActiveTab("map")}/>

        {/* + FAB */}
        <div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"center"}}>
          <button
            onClick={()=>{ setActiveTab("map"); setShowPlusModal(true); }}
            aria-label="Add situation or check request"
            style={{
              width:52, height:52, borderRadius:"50%",
              background:"#e24b4a", border:"3px solid #0d0d0d",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", marginTop:-20,
              boxShadow:"0 4px 16px rgba(226,75,74,0.5)",
            }}
          >
            <i className="ti ti-plus" style={{fontSize:26,color:"#fff"}} aria-hidden="true"/>
          </button>
        </div>

        <TabBtn active={activeTab==="profile"} icon="ti-user-circle"
          label={t("tabs.profile")} onClick={()=>setActiveTab("profile")}/>
      </nav>

      {/* Modal — above everything, true fixed overlay */}
      {showPlusModal && <PlusModal onClose={()=>setShowPlusModal(false)}/>}
    </>
  );
}

function TabBtn({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      gap:3, cursor:"pointer", padding:"6px 0", background:"none", border:"none",
      opacity: active ? 1 : 0.38,
    }}>
      <i className={`ti ${icon}`} style={{fontSize:22,color:"#fff"}} aria-hidden="true"/>
      <span style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:.5}}>
        {label.toUpperCase()}
      </span>
    </button>
  );
}
