import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { signOut, getUserTransactions, formatMMT } from "../services/supabaseService";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const TX_ICONS = {
  spend:"💸", earn:"💰", topup:"➕",
  tip_sent:"☕", tip_received:"☕", tip_commission:"📊",
  commission:"📊",
};
const TX_COLORS = {
  spend:"#e24b4a", earn:"#a8f0c6", topup:"#4a9eff",
  tip_sent:"#EF9F27", tip_received:"#a8f0c6", tip_commission:"#666",
  commission:"#666",
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { userDoc, user } = useAppStore();
  const lang = i18n.language;
  const doc  = userDoc || {};
  const balance = doc.balance_credits ?? 0;

  const [tab, setTab]   = useState("overview");  // "overview" | "activity"
  const [txns, setTxns] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(()=>{
    if(tab==="activity"&&user?.id){
      setTxLoading(true);
      getUserTransactions(user.id,30).then(d=>{setTxns(d);setTxLoading(false);}).catch(()=>setTxLoading(false));
    }
  },[tab,user]);

  const accountType = doc.account_type || "normal";
  const isNormal    = accountType === "normal";

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d0d"}}>
      {/* Profile header */}
      <div style={{padding:"24px 16px 0",flexShrink:0}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{position:"relative",display:"inline-block"}}>
            <div style={{width:72,height:72,borderRadius:"50%",
              background: isNormal?"#333":"#534AB7",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:28,margin:"0 auto 10px",fontWeight:700}}>
              {(doc.display_name||user?.email||"U")[0].toUpperCase()}
            </div>
            <div style={{
              position:"absolute",bottom:10,right:-4,
              background: isNormal?"#444":"#e24b4a",
              borderRadius:20,padding:"2px 7px",border:"2px solid #0d0d0d",
              fontSize:9,fontWeight:700,
              color: isNormal?"#ccc":"#fff",
              whiteSpace:"nowrap",
            }}>
              {isNormal?"Normal":"Business"}
            </div>
          </div>
          <div style={{color:"#fff",fontSize:18,fontWeight:700}}>{doc.display_name||user?.email}</div>
          <div style={{color:"#555",fontSize:12,marginTop:3}}>{user?.email}</div>
        </div>

        {/* Balance card */}
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:16,
          padding:16,marginBottom:14,border:"0.5px solid rgba(83,74,183,0.3)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{color:"#888",fontSize:11,marginBottom:4}}>CREDIT BALANCE</div>
              <div style={{color:"#EF9F27",fontSize:32,fontWeight:800,lineHeight:1}}>{balance.toLocaleString()}</div>
              <div style={{color:"#555",fontSize:11,marginTop:3}}>pts</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#888",fontSize:11,marginBottom:4}}>ACCOUNT</div>
              <div style={{
                background: isNormal?"rgba(255,255,255,0.08)":"rgba(83,74,183,0.3)",
                borderRadius:8,padding:"4px 10px",
                color: isNormal?"#aaa":"#CECBF6",
                fontSize:12,fontWeight:700,
              }}>
                {isNormal?"Normal":"✦ Business"}
              </div>
              {isNormal&&(
                <div style={{color:"#534AB7",fontSize:10,marginTop:6,cursor:"pointer"}}
                  onClick={()=>alert("Contact @doublepz Yet on Telegram to upgrade to Business account.")}>
                  Upgrade →
                </div>
              )}
            </div>
          </div>
          {isNormal&&(
            <div style={{marginTop:12,background:"rgba(255,255,255,0.04)",borderRadius:8,
              padding:"8px 10px",border:"0.5px solid rgba(255,255,255,0.06)"}}>
              <div style={{color:"#666",fontSize:10,lineHeight:1.6}}>
                ⏱ Normal accounts see map pins with a delay.<br/>
                <span style={{color:"#534AB7"}}>Upgrade to Business</span> for real-time pins.
              </div>
            </div>
          )}
          <div style={{marginTop:10,color:"#555",fontSize:10,textAlign:"center"}}>
            Top up via <span style={{color:"#0088cc"}}>@dx0dev</span> on Telegram
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{display:"flex",gap:3,background:"#111",borderRadius:10,padding:3,marginBottom:2}}>
          {[["overview","Overview"],["activity","Activity"]].map(([k,lbl])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              flex:1,padding:"8px",borderRadius:8,border:"none",
              background:tab===k?"#222":"transparent",
              color:tab===k?"#fff":"#555",
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 16px 32px"}}>

        {/* ── OVERVIEW TAB ── */}
        {tab==="overview"&&(<>
          <Card label="STATS">
            <div style={{display:"flex",justifyContent:"space-around"}}>
              <Stat val={doc.total_earned||0}          label="Earned"/>
              <Stat val={doc.total_spent||0}           label="Spent"/>
              <Stat val={doc.reports_submitted||0}     label="Pins Posted"/>
              {doc.role==="checker"&&<Stat val={`⭐${(doc.rating||0).toFixed(1)}`} label="Rating"/>}
            </div>
          </Card>

          <Card label="ACTIVITY">
            <Row label="Check requests made"    val={doc.check_requests_made||0}/>
            <Row label="Checks fulfilled"       val={doc.check_requests_fulfilled||0}/>
            <Row label="Account status"         val={doc.is_active?"Active ✅":"Suspended ❌"}/>
          </Card>

          <Card label="SETTINGS">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"11px 0",borderTop:"0.5px solid rgba(255,255,255,0.05)"}}>
              <span style={{color:"#ccc",fontSize:13}}>{t("profile.language")}</span>
              <div style={{display:"flex",gap:6}}>
                {["my","en"].map(l=>(
                  <button key={l} onClick={()=>i18n.changeLanguage(l)} style={{
                    padding:"4px 12px",borderRadius:7,border:"none",
                    background:lang===l?"#534AB7":"#1a1a1a",
                    color:lang===l?"#CECBF6":"#555",
                    fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  }}>{l==="my"?"မြန်မာ":"EN"}</button>
                ))}
              </div>
            </div>
          </Card>

          <a href="https://t.me/doublepzYet" target="_blank" rel="noreferrer" style={{
            display:"block",textAlign:"center",background:"#0088cc",
            borderRadius:12,padding:"13px",color:"#fff",
            fontSize:13,fontWeight:700,textDecoration:"none",marginBottom:12,
          }}>
            📱 Contact Admin · @doublepz Yet
          </a>

          <button onClick={signOut} style={{
            width:"100%",background:"transparent",
            border:"0.5px solid #2a2a2a",borderRadius:12,
            padding:"13px",color:"#555",fontSize:13,cursor:"pointer",fontFamily:"inherit",
          }}>
            Sign out
          </button>
        </>)}

        {/* ── ACTIVITY TAB ── */}
        {tab==="activity"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:12}}>
              <span style={{color:"#fff",fontSize:14,fontWeight:700}}>Recent transactions</span>
              <span style={{color:"#555",fontSize:11}}>Last 30</span>
            </div>

            {txLoading&&(
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{width:24,height:24,border:"3px solid #222",borderTopColor:"#e24b4a",
                  borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {!txLoading&&txns.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:"#555",fontSize:13}}>
                No transactions yet
              </div>
            )}

            {!txLoading&&txns.map(tx=>{
              const icon  = TX_ICONS[tx.type] || "•";
              const color = TX_COLORS[tx.type] || "#888";
              const isPos = tx.amount>0;
              return(
                <div key={tx.id} style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"12px 0",borderBottom:"0.5px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{width:36,height:36,borderRadius:"50%",
                    background:`${color}18`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:16,flexShrink:0}}>
                    {icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"#ddd",fontSize:12,fontWeight:600,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {tx.description||tx.type}
                    </div>
                    <div style={{color:"#555",fontSize:10,marginTop:2}}>
                      {formatMMT(tx.created_at)}
                    </div>
                  </div>
                  <div style={{
                    color: isPos?"#a8f0c6":"#e24b4a",
                    fontSize:13,fontWeight:700,flexShrink:0,
                  }}>
                    {isPos?"+":""}{tx.amount} pts
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({label,children}){
  return(
    <div style={{background:"#1a1a1a",borderRadius:14,padding:16,
      border:"0.5px solid rgba(255,255,255,0.07)",marginBottom:12}}>
      <div style={{color:"#555",fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:12}}>{label}</div>
      {children}
    </div>
  );
}
function Stat({val,label}){
  return(
    <div style={{textAlign:"center",flex:1}}>
      <div style={{color:"#fff",fontSize:20,fontWeight:700}}>{val}</div>
      <div style={{color:"#555",fontSize:10,marginTop:3}}>{label}</div>
    </div>
  );
}
function Row({label,val}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"10px 0",borderTop:"0.5px solid rgba(255,255,255,0.05)"}}>
      <span style={{color:"#ccc",fontSize:13}}>{label}</span>
      <span style={{color:"#666",fontSize:13}}>{val}</span>
    </div>
  );
}
