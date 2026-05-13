import { useState } from "react";
import { signIn } from "../services/supabaseService";
import { useTranslation } from "react-i18next";

const s = {
  wrap: {
    height:"100vh", display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center",
    background:"#0d0d0d", padding:"0 32px",
  },
  logo: { fontSize:38, fontWeight:800, color:"#fff", marginBottom:4, letterSpacing:-1 },
  sub:  { fontSize:12, color:"#555", marginBottom:52, letterSpacing:3, textTransform:"uppercase" },
  input: {
    width:"100%", background:"#1a1a1a", border:"0.5px solid #2a2a2a",
    borderRadius:12, padding:"14px 16px", color:"#fff", fontSize:15,
    marginBottom:12, outline:"none", transition:"border .2s",
  },
  btn: {
    width:"100%", background:"linear-gradient(135deg,#e24b4a,#ff7043)",
    border:"none", borderRadius:12, padding:"15px",
    color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", marginTop:6,
    boxShadow:"0 4px 20px rgba(226,75,74,0.3)",
  },
  err:  { color:"#e24b4a", fontSize:12, marginTop:12, textAlign:"center" },
  hint: { color:"#444", fontSize:11, marginTop:32, textAlign:"center", lineHeight:1.8 },
  link: { color:"#534AB7", textDecoration:"none", fontWeight:600 },
};

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(t("auth.error") + ": " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={s.wrap}>
      <div style={s.logo}>လမ်းကြောင်း</div>
      <div style={s.sub}>LANN KYAING</div>
      <form onSubmit={handleLogin} style={{ width:"100%", maxWidth:340 }}>
        <input style={s.input} type="email" placeholder={t("auth.email")}
          value={email} onChange={e => setEmail(e.target.value)} required/>
        <input style={s.input} type="password" placeholder={t("auth.password")}
          value={password} onChange={e => setPassword(e.target.value)} required/>
        <button style={s.btn} type="submit" disabled={loading}>
          {loading ? "..." : t("auth.sign_in")}
        </button>
        {error && <div style={s.err}>{error}</div>}
      </form>
      <div style={s.hint}>
        အကောင့် မရှိသေးပါက Telegram မှ ဆက်သွယ်ပါ<br/>
        <a href="https://t.me/doublepzYet" style={s.link} target="_blank" rel="noreferrer">
          @doublepz Yet
        </a>
      </div>
    </div>
  );
}
