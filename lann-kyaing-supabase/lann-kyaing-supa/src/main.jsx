import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",background:"#0d0d0d",padding:28,textAlign:"center",gap:12}}>
        <div style={{fontSize:32}}>⚠️</div>
        <div style={{color:"#e24b4a",fontWeight:700,fontSize:14}}>Something went wrong</div>
        <div style={{color:"#555",fontSize:12,maxWidth:280,lineHeight:1.6}}>{this.state.error.message}</div>
        <button onClick={()=>window.location.reload()} style={{
          marginTop:12,padding:"10px 24px",borderRadius:10,
          background:"#e24b4a",border:"none",color:"#fff",
          fontSize:13,fontWeight:700,cursor:"pointer",
        }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
