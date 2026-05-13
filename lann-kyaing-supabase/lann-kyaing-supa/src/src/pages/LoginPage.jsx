import { useState } from "react";
import { signIn } from "../services/supabaseService";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t }                   = useTranslation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await signIn(email, password); }
    catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#0d0d0d", padding:"0 28px",
      overflowY:"auto",
    }}>
      {/* Logo */}
      <div style={{marginBottom:48,textAlign:"center"}}>
        <div style={{fontSize:40,fontWeight:800,color:"#fff",letterSpacing:-1}}>
          လမ်းကြောင်း
        </div>
        <div style={{fontSize:12,color:"#444",letterSpacing:4,marginTop:4}}>
          LANN KYAING
        </div>
      </div>

      <form onSubmit={handleLogin} style={{width:"100%",maxWidth:360}}>
        <input
          type="email" placeholder={t("auth.email")}
          value={email} onChange={e=>setEmail(e.target.value)} required
          style={inputStyle}
        />
        <input
          type="password" placeholder={t("auth.password")}
          value={password} onChange={e=>setPassword(e.target.value)} required
          style={{...inputStyle,marginBottom:20}}
        />
        <button type="submit" disabled={loading} style={{
          width:"100%", padding:15, border:"none", borderRadius:14,
          background: loading ? "#444" : "#e24b4a",
          color:"#fff", fontSize:16, fontWeight:700,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily:"inherit",
          boxShadow:"0 4px 20px rgba(226,75,74,0.35)",
        }}>
          {loading ? "Signing in..." : t("auth.sign_in")}
        </button>
        {error && (
          <div style={{
            marginTop:14, padding:"10px 14px", borderRadius:10,
            background:"rgba(226,75,74,0.12)", border:"0.5px solid #e24b4a",
            color:"#e24b4a", fontSize:12, textAlign:"center",
          }}>
            {error}
          </div>
        )}
      </form>

      <div style={{marginTop:40,textAlign:"center"}}>
        <div style={{color:"#444",fontSize:12,lineHeight:1.8}}>
          အကောင့် မရှိသေးပါက Telegram မှ ဆက်သွယ်ပါ
        </div>
        <a href="https://t.me/doublepzYet" target="_blank" rel="noreferrer"
          style={{color:"#534AB7",fontSize:13,fontWeight:700,textDecoration:"none"}}>
          @doublepz Yet
        </a>
      </div>
    </div>
  );
}

const inputStyle = {
  width:"100%", background:"#1a1a1a",
  border:"0.5px solid rgba(255,255,255,0.08)",
  borderRadius:12, padding:"14px 16px",
  color:"#fff", fontSize:15, marginBottom:12,
  outline:"none", fontFamily:"inherit",
  WebkitAppearance:"none",
};
