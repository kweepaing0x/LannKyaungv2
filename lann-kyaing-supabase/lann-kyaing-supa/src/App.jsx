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
          const [uDoc, cfg] = await Promise.all([getUserDoc(u.id), getAdminConfig()]);
          setUserDoc(uDoc);
          setAdminConfig(cfg);
        } catch(e) { console.warn(e.message); }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",background:"#0d0d0d",gap:12}}>
      <div style={{fontSize:34,fontWeight:800,color:"#fff"}}>လမ်းကြောင်း</div>
      <div style={{fontSize:11,color:"#444",letterSpacing:3}}>LOADING...</div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div style={{
      height:"100vh", maxWidth:480, margin:"0 auto",
      display:"flex", flexDirection:"column",
      background:"#0d0d0d", overflow:"hidden", position:"relative"
    }}>
      {/* Page content */}
      <div style={{flex:1, overflow:"hidden", position:"relative"}}>
        {activeTab === "map"     && <MapPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        height:64, background:"#0d0d0d",
        borderTop:"0.5px solid rgba(255,255,255,0.08)",
        display:"flex", alignItems:"center", justifyContent:"space-around",
        flexShrink:0, position:"relative", zIndex:20,
        paddingBottom:"env(safe-area-inset-bottom,0px)",
      }}>
        {/* Checkpoints */}
        <div onClick={()=>setActiveTab("map")} style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          gap:3, flex:1, cursor:"pointer", padding:"8px 0",
          opacity: activeTab==="map" ? 1 : 0.35
        }}>
          <i className="ti ti-map-pin" style={{fontSize:22,color:"#fff"}} aria-hidden="true"/>
          <span style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:.5}}>
            {t("tabs.checkpoints").toUpperCase()}
          </span>
        </div>

        {/* + button */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1}}>
          <div
            onClick={()=>{setActiveTab("map");setShowPlusModal(true);}}
            style={{
              width:52, height:52, background:"#e24b4a",
              borderRadius:"50%", display:"flex", alignItems:"center",
              justifyContent:"center", marginTop:-22, cursor:"pointer",
              border:"3px solid #0d0d0d", boxShadow:"0 4px 20px rgba(226,75,74,0.4)"
            }}
          >
            <i className="ti ti-plus" style={{fontSize:26,color:"#fff"}} aria-hidden="true"/>
          </div>
        </div>

        {/* Profile */}
        <div onClick={()=>setActiveTab("profile")} style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          gap:3, flex:1, cursor:"pointer", padding:"8px 0",
          opacity: activeTab==="profile" ? 1 : 0.35
        }}>
          <i className="ti ti-user-circle" style={{fontSize:22,color:"#fff"}} aria-hidden="true"/>
          <span style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:.5}}>
            {t("tabs.profile").toUpperCase()}
          </span>
        </div>
      </nav>

      {/* Plus modal — rendered at App level so it covers everything */}
      {showPlusModal && <PlusModal onClose={()=>setShowPlusModal(false)}/>}
    </div>
  );
}
