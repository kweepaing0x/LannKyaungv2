import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import { onAuthChange, getUserDoc, getAdminConfig } from "./services/supabaseService";
import { useTranslation } from "react-i18next";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import ProfilePage from "./pages/ProfilePage";

const s = {
  app:{
    height:"100vh", display:"flex", flexDirection:"column",
    background:"#0d0d0d", overflow:"hidden",
  },
  content:{ flex:1, overflow:"hidden", position:"relative" },
  bottomBar:{
    height:64, background:"rgba(13,13,13,0.98)",
    borderTop:"0.5px solid rgba(255,255,255,0.07)",
    display:"flex", alignItems:"center", justifyContent:"space-around",
    flexShrink:0, paddingBottom:"env(safe-area-inset-bottom,0px)",
  },
  tab:(active) => ({
    display:"flex", flexDirection:"column", alignItems:"center",
    gap:3, flex:1, cursor:"pointer", opacity: active ? 1 : 0.35,
    transition:"opacity .2s",
  }),
  tabIcon:{ fontSize:21 },
  tabLabel:(active) => ({
    fontSize:9, fontWeight:700, letterSpacing:.5,
    color: active ? "#fff" : "#666",
  }),
  plusWrap:{
    position:"relative", display:"flex",
    flexDirection:"column", alignItems:"center",
  },
  plusBtn:{
    width:52, height:52,
    background:"linear-gradient(135deg,#e24b4a,#ff7043)",
    borderRadius:"50%", display:"flex", alignItems:"center",
    justifyContent:"center", marginTop:-22, cursor:"pointer",
    border:"3px solid #0d0d0d", fontSize:26, color:"#fff",
    userSelect:"none", boxShadow:"0 4px 24px rgba(226,75,74,0.45)",
    transition:"transform .15s",
  },
  loader:{
    height:"100vh", display:"flex", alignItems:"center",
    justifyContent:"center", background:"#0d0d0d",
    color:"#fff", fontSize:14, flexDirection:"column", gap:12,
  },
  loaderDot:{ color:"#555", fontSize:11, letterSpacing:2 },
};

export default function App() {
  const { t } = useTranslation();
  const {
    user, setUser, setUserDoc, setAdminConfig,
    activeTab, setActiveTab,
    setShowPlusModal,
  } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const [uDoc, cfg] = await Promise.all([
            getUserDoc(firebaseUser.id),
            getAdminConfig(),
          ]);
          setUserDoc(uDoc);
          setAdminConfig(cfg);
        } catch (e) {
          console.warn("Could not load user doc:", e.message);
        }
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) return (
    <div style={s.loader}>
      <div style={{fontSize:32,fontWeight:800}}>လမ်းကြောင်း</div>
      <div style={s.loaderDot}>LOADING...</div>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div style={s.app}>
      <div style={s.content}>
        {activeTab === "map"     && <MapPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      <nav style={s.bottomBar}>
        {/* Checkpoints tab */}
        <div style={s.tab(activeTab === "map")} onClick={() => setActiveTab("map")}>
          <span style={s.tabIcon}>📍</span>
          <span style={s.tabLabel(activeTab === "map")}>
            {t("tabs.checkpoints").toUpperCase()}
          </span>
        </div>

        {/* + button */}
        <div style={s.plusWrap}>
          <div
            style={s.plusBtn}
            onClick={() => { setActiveTab("map"); setShowPlusModal(true); }}
            onTouchStart={e => e.currentTarget.style.transform = "scale(0.93)"}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
          >
            +
          </div>
        </div>

        {/* Profile tab */}
        <div style={s.tab(activeTab === "profile")} onClick={() => setActiveTab("profile")}>
          <span style={s.tabIcon}>👤</span>
          <span style={s.tabLabel(activeTab === "profile")}>
            {t("tabs.profile").toUpperCase()}
          </span>
        </div>
      </nav>
    </div>
  );
}
