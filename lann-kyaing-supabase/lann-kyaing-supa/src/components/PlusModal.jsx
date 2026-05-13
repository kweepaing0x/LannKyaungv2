import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store";
import { postPin, postCheckRequest, getNowMMT, getSituationTypes, getTimeWindows } from "../services/supabaseService";

const s = {
  overlay: {
    position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
    zIndex:100, display:"flex", alignItems:"flex-end",
  },
  sheet: {
    width:"100%", background:"#1a1a1a", borderRadius:"20px 20px 0 0",
    paddingBottom:32, border:"0.5px solid rgba(255,255,255,0.08)",
    maxHeight:"88vh", overflowY:"auto",
  },
  handle: { width:36, height:4, background:"#333", borderRadius:2, margin:"12px auto 16px" },
  tabs: {
    display:"flex", margin:"0 14px 16px",
    background:"#111", borderRadius:10, padding:3,
  },
  tab: (a) => ({
    flex:1, textAlign:"center", padding:"9px 4px", borderRadius:8,
    cursor:"pointer", background: a ? "#2a2a2a" : "transparent",
    color: a ? "#fff" : "#555", fontSize:12, fontWeight:700, border:"none",
  }),
  p: { padding:"0 14px" },
  lbl: { color:"#555", fontSize:10, fontWeight:700, letterSpacing:.5, marginBottom:7, display:"block" },
  grid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 },
  ecard: (sel, c) => ({
    background: sel ? `${c}18` : "#111", border:`1.5px solid ${sel ? c : "transparent"}`,
    borderRadius:10, padding:"8px 4px", textAlign:"center", cursor:"pointer",
  }),
  eicon: { fontSize:20, display:"block" },
  elbl: (sel, c) => ({ fontSize:9, color: sel ? c : "#666", marginTop:3 }),
  row: {
    display:"flex", alignItems:"center", gap:8, background:"#111",
    borderRadius:10, padding:"10px 12px", marginBottom:10,
    border:"0.5px solid rgba(255,255,255,0.06)",
  },
  rowText: { fontSize:11, color:"#ccc", fontWeight:500 },
  rowSub: { fontSize:10, color:"#555" },
  timerRow: { display:"flex", gap:8, marginBottom:10 },
  topt: (sel) => ({
    flex:1, background: sel ? "#18152a" : "#111",
    border:`1.5px solid ${sel ? "#534AB7" : "transparent"}`,
    borderRadius:10, padding:"8px 4px", textAlign:"center", cursor:"pointer",
  }),
  tlbl: (sel) => ({ fontSize:11, fontWeight:700, color: sel ? "#CECBF6" : "#777" }),
  tsub: (sel) => ({ fontSize:9, color: sel ? "#7F77DD" : "#555" }),
  creditBox: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    background:"#18152a", borderRadius:10, padding:"10px 12px", marginBottom:12,
    border:"0.5px solid #534AB7",
  },
  submitBtn: (bg) => ({
    margin:"0 14px", background:bg, border:"none", borderRadius:12,
    padding:"14px", width:"calc(100% - 28px)", color:"#fff",
    fontSize:14, fontWeight:700, cursor:"pointer",
  }),
  hint: { color:"#444", fontSize:10, textAlign:"center", marginTop:8 },
};

export default function PlusModal({ onClose }) {
  const { t } = useTranslation();
  const { user, userDoc, userLocation, setShowPlusModal } = useAppStore();
  const [mode, setMode]             = useState("update");
  const [selectedType, setSelectedType] = useState("police");
  const [selectedWindow, setSelectedWindow] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [situationTypes, setSituationTypes] = useState([]);
  const [timeWindows, setTimeWindows]       = useState([]);

  useEffect(() => {
    getSituationTypes().then(setSituationTypes).catch(() => {
      setSituationTypes([
        { id:"police",  emoji:"🚔", label_my:"ရဲ ရှိသည်",    color:"#E24B4A" },
        { id:"blocked", emoji:"🚧", label_my:"လမ်းပိတ်",      color:"#EF9F27" },
        { id:"traffic", emoji:"🚗", label_my:"လမ်းကြပ်",      color:"#EF9F27" },
        { id:"danger",  emoji:"⚠️", label_my:"အန္တရာယ်",    color:"#E24B4A" },
        { id:"flood",   emoji:"🌊", label_my:"ရေကြီး",        color:"#378ADD" },
        { id:"repair",  emoji:"🔧", label_my:"လမ်းပြုပြင်", color:"#888780" },
        { id:"event",   emoji:"🎉", label_my:"အခမ်းအနား",    color:"#534AB7" },
        { id:"other",   emoji:"❓", label_my:"အခြား",         color:"#888780" },
      ]);
    });
    getTimeWindows().then(setTimeWindows).catch(() => {
      setTimeWindows([
        { minutes:30, credits_cost:50,  label_my:"၃၀ မိနစ်" },
        { minutes:60, credits_cost:80,  label_my:"၁ နာရီ" },
        { minutes:120,credits_cost:120, label_my:"၂ နာရီ" },
      ]);
    });
  }, []);

  const selType = situationTypes.find(x => x.id === selectedType) || situationTypes[0];
  const selWin  = timeWindows[selectedWindow] || { minutes:30, credits_cost:50 };

  async function handlePostPin() {
    if (!userLocation) return alert("တည်နေရာ မသိသေးပါ");
    if (!selType) return;
    setLoading(true);
    try {
      await postPin({
        type: selType.id, emoji: selType.emoji,
        lat: userLocation.lat, lng: userLocation.lng,
        postedBy: user.id,
        labelMy: selType.label_my, labelEn: selType.label_en || selType.id,
      });
      setShowPlusModal(false);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function handleCheckRequest() {
    if (!userLocation) return alert("တည်နေရာ မသိသေးပါ");
    if ((userDoc?.balance_credits || 0) < selWin.credits_cost)
      return alert("Credits မလုံလောက်ပါ");
    setLoading(true);
    try {
      await postCheckRequest({
        requesterUid: user.id,
        targetLat: userLocation.lat, targetLng: userLocation.lng,
        targetLabel: "Selected location",
        windowMinutes: selWin.minutes, creditsCost: selWin.credits_cost,
      });
      setShowPlusModal(false);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handle}/>
        <div style={s.tabs}>
          <button style={s.tab(mode==="update")}  onClick={() => setMode("update")}>{t("plus_modal.update")}</button>
          <button style={s.tab(mode==="request")} onClick={() => setMode("request")}>{t("plus_modal.check_request")}</button>
        </div>

        {mode === "update" && (<>
          <div style={s.p}>
            <span style={s.lbl}>{t("plus_modal.situation_type")}</span>
            <div style={s.grid}>
              {situationTypes.map(st => (
                <div key={st.id} style={s.ecard(selectedType===st.id, st.color)}
                  onClick={() => setSelectedType(st.id)}>
                  <span style={s.eicon}>{st.emoji}</span>
                  <div style={s.elbl(selectedType===st.id, st.color)}>{st.label_my}</div>
                </div>
              ))}
            </div>
            <span style={s.lbl}>{t("plus_modal.your_location")}</span>
            <div style={s.row}>
              <span style={{fontSize:16}}>📍</span>
              <div>
                <div style={s.rowText}>{userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "Locating..."}</div>
                <div style={s.rowSub}>GPS</div>
              </div>
            </div>
            <span style={s.lbl}>{t("plus_modal.posted_time")}</span>
            <div style={{...s.row, marginBottom:16}}>
              <span style={{fontSize:16}}>🕐</span>
              <div>
                <div style={s.rowText}>{getNowMMT()}</div>
                <div style={s.rowSub}>Myanmar Standard Time (UTC+6:30)</div>
              </div>
            </div>
          </div>
          <button style={s.submitBtn("linear-gradient(135deg,#e24b4a,#ff7043)")}
            onClick={handlePostPin} disabled={loading}>
            {loading ? "..." : t("plus_modal.post_pin")}
          </button>
          <div style={s.hint}>{t("plus_modal.expires")}</div>
        </>)}

        {mode === "request" && (<>
          <div style={s.p}>
            <span style={s.lbl}>{t("plus_modal.target_location")}</span>
            <div style={s.row}>
              <span style={{fontSize:16}}>🗺️</span>
              <div>
                <div style={s.rowText}>{userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : "Locating..."}</div>
                <div style={s.rowSub}>Tap map to change</div>
              </div>
            </div>
            <span style={s.lbl}>{t("plus_modal.time_window")}</span>
            <div style={s.timerRow}>
              {timeWindows.map((tw, i) => (
                <div key={i} style={s.topt(selectedWindow===i)} onClick={() => setSelectedWindow(i)}>
                  <div style={s.tlbl(selectedWindow===i)}>{tw.label_my}</div>
                  <div style={s.tsub(selectedWindow===i)}>{tw.credits_cost} pts</div>
                </div>
              ))}
            </div>
            <div style={s.creditBox}>
              <span style={{color:"#CECBF6",fontSize:12}}>{t("plus_modal.your_balance")}</span>
              <span style={{color:"#EF9F27",fontWeight:700,fontSize:15}}>{userDoc?.balance_credits||0} pts</span>
            </div>
            <div style={{color:"#666",fontSize:11,marginBottom:12}}>
              Cost: <span style={{color:"#EF9F27",fontWeight:600}}>{selWin.credits_cost} pts</span>
            </div>
          </div>
          <button style={s.submitBtn("#534AB7")} onClick={handleCheckRequest} disabled={loading}>
            {loading ? "..." : t("plus_modal.send_request")}
          </button>
          <div style={s.hint}>{t("plus_modal.notify")}</div>
        </>)}
      </div>
    </div>
  );
}
