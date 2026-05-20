import { useState, useEffect, useRef } from "react";

// ── 本地儲存 ──────────────────────────────────────────────────────────────────
const DB_KEY = "shoppingApp_v3";
const loadDB = () => { try { return JSON.parse(localStorage.getItem(DB_KEY))||{}; } catch { return {}; } };
const saveDB = d => localStorage.setItem(DB_KEY, JSON.stringify(d));

// ── 常數 ──────────────────────────────────────────────────────────────────────
const P = {
  cream:"#FAF8F5", warm:"#F2EDE6", card:"#FFFFFF", border:"#E8E2DA",
  text:"#2C2825", muted:"#9C9189", accent:"#C4956A", accentLight:"#F0E6D8",
  red:"#E05C5C", yellow:"#E0A83C", green:"#5CB87A", blue:"#5C8FE0", tag:"#EDE8E1",
  purple:"#8B7FD4",
};
const STORES_DEFAULT   = ["無印良品","好市多","蝦皮","大創","IKEA","PChome","全聯","Momo","寶雅","宜得利"];
const STORE_BRAND = {
  "無印良品": { bg:"#8B2020", color:"#fff",   text:"MUJI"  },
  "好市多":   { bg:"#fff",    color:"#E31837", text:"COST", border:"#E31837" },
  "蝦皮":     { bg:"#EE4D2D", color:"#fff",   text:"蝦皮"  },
  "大創":     { bg:"#fff",    color:"#E4007F", text:"DAISO",border:"#E4007F" },
  "IKEA":     { bg:"#0058A3", color:"#FFDA1A",text:"IKEA"  },
  "PChome":   { bg:"#fff",    color:"#0066CC", text:"PC",   border:"#0066CC" },
  "全聯":     { bg:"#003DA5", color:"#fff",   text:"全聯"  },
  "Momo":     { bg:"#fff",    color:"#E4007F", text:"momo", border:"#E4007F" },
  "寶雅":     { bg:"#E4007F", color:"#fff",   text:"POYA"  },
  "宜得利":   { bg:"#81C7C1", color:"#fff",   text:"Nitori"},
};
const CATS_DEFAULT     = ["寶寶用品","居家","食物","其他"];
const PRIORITIES       = { high:"高", mid:"中", low:"低" };
const PRI_COLOR        = { high:P.red, mid:P.yellow, low:P.green };
const NEED_TYPES       = ["需要","想要"];
// fix #4: 確保用繁中，不依賴瀏覽器 locale
const DAYS_ZH = ["日","一","二","三","四","五","六"];
const CREATORS_BUILTIN = ["我","伴侶"];


const uid      = () => Math.random().toString(36).slice(2,10);
const today    = () => new Date().toISOString().slice(0,10);
const fmtPrice = n => n ? `NT$ ${Number(n).toLocaleString()}` : "";
// Tomohiko Sakamoto 演算法，純數學算星期幾，不依賴 Date/locale
const fmtDate = d => {
  if (!d) return "";
  const p = d.split("-");
  let y=parseInt(p[0],10), m=parseInt(p[1],10), day=parseInt(p[2],10);
  const t=[0,3,2,5,0,3,5,1,4,6,2,4];
  if(m<3) y--;
  const w=(y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+t[m-1]+day)%7;
  return d+" (星期"+DAYS_ZH[w]+")";
};

// ── 共用 UI ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width:"100%", padding:"8px 11px", borderRadius:9,
  border:`1.5px solid ${P.border}`, background:P.warm,
  fontSize:13, color:P.text, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};
function Btn({ children, onClick, color, ghost, round, title, disabled, style:sx }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      background:ghost?"transparent":(color||P.accent),
      color:ghost?(color||P.accent):"#fff",
      border:ghost?`1.5px solid ${color||P.accent}`:"none",
      borderRadius:round?"50%":10,
      width:round?24:undefined, height:round?24:undefined,
      padding:round?0:"7px 14px",
      fontSize:round?11:13, fontWeight:600,
      cursor:disabled?"not-allowed":"pointer",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      transition:"opacity .15s", opacity:disabled?0.5:1,
      flexShrink:0, ...sx,
    }}>{children}</button>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label style={{fontSize:11,fontWeight:700,color:P.muted,display:"block",marginBottom:4}}>{label}</label>
      {children}
    </div>
  );
}
function Toggle({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{
      width:38,height:20,borderRadius:10,
      background:checked?P.accent:P.border,
      position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0,
    }}>
      <div style={{position:"absolute",top:2,left:checked?19:2,width:16,height:16,
        borderRadius:"50%",background:"#fff",transition:"left .2s",
        boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}/>
    </div>
  );
}
function Overlay({ onClick, children }) {
  return (
    <div onClick={onClick} style={{
      position:"fixed",inset:0,background:"rgba(44,40,37,0.5)",
      backdropFilter:"blur(4px)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:12,
    }}>{children}</div>
  );
}
function StoreBadge({ name }) {
  const brand = STORE_BRAND[name];
  if (brand) {
    return (
      <span style={{
        display:"inline-flex", alignItems:"center", gap:4,
        whiteSpace:"nowrap",
      }}>
        <span style={{
          background:brand.bg, color:brand.color,
          fontSize:9, fontWeight:800, padding:"1px 5px",
          borderRadius:4, letterSpacing:0.3, flexShrink:0,
          lineHeight:"14px", fontFamily:"sans-serif",
          border: brand.border ? `1px solid ${brand.border}` : "none",
        }}>{brand.text}</span>
        <span style={{fontSize:10, color:P.muted}}>{name}</span>
      </span>
    );
  }
  return <MiniTag>🏪{name}</MiniTag>;
}

function MiniTag({ children, accent }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:2,
      background:accent?P.accentLight:P.tag,
      color:accent?P.accent:P.muted,
      fontSize:10,padding:"2px 6px",borderRadius:20,
      fontWeight:accent?600:400,whiteSpace:"nowrap",
    }}>{children}</span>
  );
}

// ── fix #2: 裁切器 — Pointer capture 防止拖曳滾動 ─────────────────────────────
function ImageCropper({ src, onDone, onCancel }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const dragRef    = useRef(false);
  const startRef   = useRef({x:0,y:0});
  const [loaded,   setLoaded] = useState(false);
  const [box,      setBox]    = useState({x:30,y:30,w:240,h:240});
  const DISP=320, CW=640, CH=640; // canvas 2x 提升畫質

  // 鎖定整頁滾動
  useEffect(()=>{
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return ()=>{
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  },[]);

  useEffect(()=>{ if (loaded) draw(); }, [box, loaded]);

  const draw = () => {
    const canvas=canvasRef.current, img=imgRef.current;
    if (!canvas||!img) return;
    const ctx = canvas.getContext("2d");
    const scale = Math.min(CW/img.naturalWidth, CH/img.naturalHeight);
    const dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;
    const ox=(CW-dw)/2, oy=(CH-dh)/2;
    ctx.clearRect(0,0,CW,CH);
    ctx.drawImage(img,ox,oy,dw,dh);
    ctx.fillStyle="rgba(0,0,0,0.52)";
    ctx.fillRect(0,0,CW,CH);
    const bx=box.x*2, by=box.y*2, bw=box.w*2, bh=box.h*2;
    ctx.save(); ctx.beginPath(); ctx.rect(bx,by,bw,bh); ctx.clip();
    ctx.drawImage(img,ox,oy,dw,dh); ctx.restore();
    ctx.strokeStyle=P.accent; ctx.lineWidth=3;
    ctx.strokeRect(bx,by,bw,bh);
    const cs=16;
    ctx.strokeStyle="#fff"; ctx.lineWidth=4;
    [[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]].forEach(([x,y,sx,sy])=>{
      ctx.beginPath(); ctx.moveTo(x+cs*sx,y); ctx.lineTo(x,y); ctx.lineTo(x,y+cs*sy); ctx.stroke();
    });
  };

  // 用原生 addEventListener + passive:false 才能在 iframe 內真正阻止滾動
  useEffect(()=>{
    const el = canvasRef.current;
    if (!el) return;
    const down = e => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const ratio = DISP / r.width;
      const x = (e.clientX-r.left)*ratio, y = (e.clientY-r.top)*ratio;
      startRef.current={x,y}; dragRef.current=true;
      setBox({x,y,w:1,h:1});
    };
    const move = e => {
      e.preventDefault(); e.stopPropagation();
      if (!dragRef.current) return;
      const r = el.getBoundingClientRect();
      const ratio = DISP / r.width;
      const mx = (e.clientX-r.left)*ratio, my = (e.clientY-r.top)*ratio;
      const {x:sx,y:sy} = startRef.current;
      setBox({x:Math.min(sx,mx),y:Math.min(sy,my),w:Math.abs(mx-sx),h:Math.abs(my-sy)});
    };
    const up = e => { e.preventDefault(); dragRef.current=false; };
    el.addEventListener('pointerdown', down, {passive:false});
    el.addEventListener('pointermove', move, {passive:false});
    el.addEventListener('pointerup',   up,   {passive:false});
    el.addEventListener('pointercancel', up, {passive:false});
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup',   up);
      el.removeEventListener('pointercancel', up);
    };
  }, [loaded]);

  const crop = () => {
    const img = imgRef.current;
    const scale = Math.min(CW/img.naturalWidth, CH/img.naturalHeight);
    const dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;
    const ox=(CW-dw)/2, oy=(CH-dh)/2;
    const srcX=(box.x*2-ox)/scale, srcY=(box.y*2-oy)/scale;
    const srcW=box.w*2/scale, srcH=box.h*2/scale;
    const out = document.createElement("canvas");
    out.width  = Math.max(1,Math.round(Math.min(srcW,img.naturalWidth)));
    out.height = Math.max(1,Math.round(Math.min(srcH,img.naturalHeight)));
    out.getContext("2d").drawImage(img,srcX,srcY,srcW,srcH,0,0,out.width,out.height);
    onDone(out.toDataURL("image/jpeg",0.95));
  };

  return (
    <Overlay onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:P.card,borderRadius:20,padding:18,
        width:"min(380px,96vw)",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:15,color:P.text}}>✂️ 裁切圖片</h3>
          <button onClick={onCancel} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:P.muted}}>✕</button>
        </div>
        <p style={{fontSize:11,color:P.muted,marginBottom:8}}>拖曳選取要保留的區域</p>
        <img ref={imgRef} src={src} style={{display:"none"}} onLoad={()=>setLoaded(true)} alt=""/>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{width:DISP,maxWidth:"100%",borderRadius:10,cursor:"crosshair",
            display:"block",margin:"0 auto",touchAction:"none",userSelect:"none"}}
          />
        <div style={{display:"flex",gap:10,marginTop:12,justifyContent:"flex-end"}}>
          <Btn ghost color={P.muted} onClick={onCancel}>取消</Btn>
          <Btn color={P.accent} onClick={crop}>套用裁切</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── 已購買確認 ────────────────────────────────────────────────────────────────
function BoughtConfirm({ item, onConfirm, onCancel }) {
  const [fp,setFp] = useState(item.price||"");
  return (
    <Overlay onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:P.card,borderRadius:20,padding:"22px 18px",
        width:"min(340px,92vw)",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
      }}>
        <div style={{fontSize:34,marginBottom:8}}>🛒</div>
        <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:15,color:P.text,marginBottom:5}}>
          確認購買「{item.name}」
        </h3>
        <p style={{fontSize:12,color:P.muted,marginBottom:14}}>確認實際購買價格（可修改）</p>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,textAlign:"left"}}>
          <span style={{fontSize:13,color:P.muted,flexShrink:0}}>NT$</span>
          <input type="number" value={fp} onChange={e=>setFp(e.target.value)}
            placeholder="購買價格（選填）" style={{...inputStyle,flex:1}}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <Btn ghost color={P.muted} onClick={onCancel}>取消</Btn>
          <Btn color={P.green} onClick={()=>onConfirm(fp)}>✓ 確認已購買</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── 商品卡片 ──────────────────────────────────────────────────────────────────
function ItemCard({ item, onMarkBought, onUndo, onEdit, onDelete, view }) {
  const isGrid = view==="grid";
  const pc = PRI_COLOR[item.priority]||P.muted;
  return (
    <div onClick={()=>onEdit(item)} style={{
      background:item.bought?P.warm:P.card,
      border:`1.5px solid ${item.bought?P.border:"#EDE8E1"}`,
      borderRadius:13,position:"relative",
      padding:isGrid?"11px 11px 9px":"6px 10px",
      opacity:item.bought?0.75:1,
      display:"flex",flexDirection:isGrid?"column":"row",
      gap:isGrid?7:6,alignItems:isGrid?"stretch":"center",
      cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
      transition:"box-shadow .15s,transform .15s",
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.09)";e.currentTarget.style.transform="translateY(-1px)";}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}
    >
      <div style={{position:"absolute",top:6,right:6,width:7,height:7,
        borderRadius:"50%",background:pc,boxShadow:`0 0 0 2px ${pc}33`}}/>
      {item.image&&(
        <div style={{width:isGrid?"100%":36,height:isGrid?100:36,
          borderRadius:8,overflow:"hidden",flexShrink:0,background:P.warm}}>
          <img src={item.image} alt={item.name}
            style={{width:"100%",height:"100%",objectFit:"cover"}}
            onError={e=>e.target.style.display="none"}/>
        </div>
      )}
      <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
        {/* 第一列：名稱 + 標籤 + by + 橫式按鈕 */}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {/* 名稱區塊 */}
          <div style={{flex:1,minWidth:0}}>
            {/* 第一列：名稱標籤 + 右側連結/by */}
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",flex:1,minWidth:0}}>
                <span style={{fontFamily:"'Noto Serif TC',serif",fontSize:isGrid?15:16,fontWeight:600,
                  color:item.bought?P.muted:P.text,textDecoration:item.bought?"line-through":"none",
                  wordBreak:"break-all",lineHeight:1.3}}>{item.name}</span>
                {item.qty>1&&<MiniTag>×{item.qty}</MiniTag>}
                {item.onSale&&<span style={{background:"#FFEAEA",color:P.red,fontSize:10,
                  padding:"1px 5px",borderRadius:20,fontWeight:600}}>特價</span>}
                <MiniTag>{item.needType}</MiniTag>
              </div>
              {/* 連結 + by 靠右 */}
              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                {item.url&&(
                  <span onClick={e=>{e.stopPropagation();window.open(item.url,"_blank","noopener,noreferrer");}}
                    style={{fontSize:10,color:P.blue,cursor:"pointer",textDecoration:"underline",whiteSpace:"nowrap"}}>
                    🔗 商品連結
                  </span>
                )}
                {item.creator&&<span style={{fontSize:10,color:"#C0B8AF",whiteSpace:"nowrap"}}>by {item.creator}</span>}
              </div>
            </div>
          </div>
          {/* 橫式按鈕靠右 */}
          <div onClick={e=>e.stopPropagation()}
            style={{display:"flex",flexDirection:"row",gap:4,flexShrink:0,alignItems:"center"}}>
            {item.bought
              ?<Btn round onClick={()=>onUndo(item.id)} color={P.muted} title="還原">↩</Btn>
              :<Btn round onClick={()=>onMarkBought(item)} color={P.green} title="標記已購買">✓</Btn>
            }
            <Btn round onClick={()=>onEdit(item)} color={P.accent}>✏️</Btn>
            <Btn round onClick={()=>onDelete(item.id)} color={P.red} ghost>✕</Btn>
          </div>
        </div>
        {/* 第二列：標籤 */}
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
          {item.store&&<StoreBadge name={item.store}/>}
          {item.category&&<MiniTag>📦{item.category}</MiniTag>}
          {item.price&&<MiniTag accent>💰{fmtPrice(item.price)}</MiniTag>}
          {item.deadline&&item.deadline!=="無"&&<MiniTag>📅{fmtDate(item.deadline)}</MiniTag>}
        </div>
        {item.note&&(
          <p style={{fontSize:11,color:P.muted,marginTop:2,lineHeight:1.4,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {item.note}
          </p>
        )}
      </div>
    </div>
  );
}

// ── 消費分析（直條 / 圓餅切換） ───────────────────────────────────────────────
function AnalysisPanel({ items }) {
  const [chartType,setChartType] = useState("bar");
  const bought = items.filter(i=>i.bought&&i.finalPrice);
  const total  = bought.reduce((a,i)=>a+Number(i.finalPrice),0);
  const bycat  = {};
  bought.forEach(i=>{ const c=i.category||"其他"; bycat[c]=(bycat[c]||0)+Number(i.finalPrice); });
  const entries = Object.entries(bycat).sort((a,b)=>b[1]-a[1]);
  const COLORS  = [P.accent,P.blue,P.green,P.purple,P.yellow,P.red,"#A0C4A0","#C4A0C4"];

  const PieChart = () => {
    let angle = -Math.PI/2;
    const slices = entries.map(([cat,amt],i)=>{
      const pct=amt/total, end=angle+pct*2*Math.PI;
      const x1=80+68*Math.cos(angle),y1=80+68*Math.sin(angle);
      const x2=80+68*Math.cos(end),  y2=80+68*Math.sin(end);
      const path=`M80,80 L${x1},${y1} A68,68 0 ${pct>0.5?1:0} 1 ${x2},${y2} Z`;
      const s={path,color:COLORS[i%COLORS.length],cat,pct}; angle=end; return s;
    });
    return (
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
        </svg>
        <div style={{flex:1,minWidth:100}}>
          {slices.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <div style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0}}/>
              <span style={{fontSize:12,color:P.text,flex:1}}>{s.cat}</span>
              <span style={{fontSize:11,color:P.muted}}>{(s.pct*100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{padding:"0 14px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:16,color:P.text}}>📊 消費分析</h3>
        <div style={{display:"flex",background:P.warm,borderRadius:8,padding:2}}>
          {[{v:"bar",l:"直條"},{v:"pie",l:"圓餅"}].map(t=>(
            <button key={t.v} onClick={()=>setChartType(t.v)} style={{
              background:chartType===t.v?P.accent:"transparent",
              color:chartType===t.v?"#fff":P.muted,
              border:"none",borderRadius:6,padding:"3px 10px",
              fontSize:11,fontWeight:600,cursor:"pointer",
            }}>{t.l}</button>
          ))}
        </div>
      </div>
      <div style={{background:P.card,borderRadius:14,padding:16,marginBottom:10,border:`1px solid ${P.border}`}}>
        <p style={{fontSize:11,color:P.muted,marginBottom:4}}>已購買總花費</p>
        <p style={{fontSize:26,fontWeight:700,color:P.accent,fontFamily:"'Noto Serif TC',serif"}}>{fmtPrice(total)}</p>
        <p style={{fontSize:11,color:P.muted,marginTop:4}}>{bought.length} 件商品</p>
      </div>
      {entries.length>0&&(
        <div style={{background:P.card,borderRadius:14,padding:16,border:`1px solid ${P.border}`}}>
          <p style={{fontSize:11,color:P.muted,marginBottom:12}}>分類占比</p>
          {chartType==="bar" ? entries.map(([cat,amt],i)=>{
            const pct=total?((amt/total)*100).toFixed(1):0;
            return (
              <div key={cat} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,color:P.text}}>{cat}</span>
                  <span style={{fontSize:11,color:P.muted}}>{pct}% · {fmtPrice(amt)}</span>
                </div>
                <div style={{height:6,borderRadius:3,background:P.warm,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:COLORS[i%COLORS.length],
                    borderRadius:3,transition:"width .5s"}}/>
                </div>
              </div>
            );
          }) : <PieChart/>}
        </div>
      )}
      {bought.length===0&&<div style={{textAlign:"center",padding:40,color:P.muted,fontSize:13}}>尚無已購買花費資料</div>}
    </div>
  );
}

// ── 新增/編輯表單 ──────────────────────────────────────────────────────────────
// ── 自製日期選擇器（全繁中，不用原生 date picker）────────────────────────────
function DatePicker({ value, onChange }) {
  const now   = new Date();
  const initY = value ? parseInt(value.split("-")[0],10) : now.getFullYear();
  const initM = value ? parseInt(value.split("-")[1],10) : now.getMonth()+1;
  const [open,  setOpen]  = useState(false);
  const [year,  setYear]  = useState(initY);
  const [month, setMonth] = useState(initM);
  const MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const WEEK   = ["日","一","二","三","四","五","六"];
  const daysInMonth = (y,m) => new Date(y,m,0).getDate();
  const firstDay    = (y,m) => new Date(y,m-1,1).getDay();
  const sakamoto = (y,m,d) => {
    const t=[0,3,2,5,0,3,5,1,4,6,2,4]; if(m<3) y--;
    return (y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+t[m-1]+d)%7;
  };
  const select = d => {
    const mm=String(month).padStart(2,"0"), dd=String(d).padStart(2,"0");
    onChange(`${year}-${mm}-${dd}`); setOpen(false);
  };
  const clear = () => { onChange(""); setOpen(false); };
  const prevMonth = () => { if(month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); };
  const selY = value ? parseInt(value.split("-")[0],10) : null;
  const selM = value ? parseInt(value.split("-")[1],10) : null;
  const selD = value ? parseInt(value.split("-")[2],10) : null;
  const cells = [];
  const fd = firstDay(year,month);
  for(let i=0;i<fd;i++) cells.push(null);
  for(let d=1;d<=daysInMonth(year,month);d++) cells.push(d);
  return (
    <div style={{position:"relative"}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{
          ...inputStyle, textAlign:"left", cursor:"pointer",
          color: value ? P.text : P.muted, flex:1,
        }}>
          {value ? fmtDate(value) : "無期限 — 點選設定日期"}
        </button>
        {value && <Btn ghost color={P.red} onClick={clear} style={{padding:"6px 10px",fontSize:12,whiteSpace:"nowrap"}}>清除</Btn>}
      </div>
      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:200,
          background:P.card,borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
          border:`1px solid ${P.border}`,overflow:"hidden",
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"12px 14px 8px",borderBottom:`1px solid ${P.border}`}}>
            <button onClick={prevMonth} style={{background:"none",border:"none",
              fontSize:18,cursor:"pointer",color:P.muted,padding:"0 6px"}}>‹</button>
            <span style={{fontFamily:"'Noto Serif TC',serif",fontSize:14,fontWeight:700,color:P.text}}>
              {year}年 {MONTHS[month-1]}
            </span>
            <button onClick={nextMonth} style={{background:"none",border:"none",
              fontSize:18,cursor:"pointer",color:P.muted,padding:"0 6px"}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"6px 8px 2px",gap:2}}>
            {WEEK.map((w,i)=>(
              <div key={w} style={{textAlign:"center",fontSize:11,fontWeight:600,
                color:i===0?P.red:i===6?P.blue:P.muted,padding:"2px 0"}}>{w}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"2px 8px 10px",gap:2}}>
            {cells.map((d,i)=>{
              if(!d) return <div key={i}/>;
              const isToday=d===now.getDate()&&month===now.getMonth()+1&&year===now.getFullYear();
              const isSel=d===selD&&month===selM&&year===selY;
              const dow=sakamoto(year,month,d);
              return (
                <button key={i} onClick={()=>select(d)} style={{
                  background:isSel?P.accent:isToday?P.accentLight:"transparent",
                  color:isSel?"#fff":dow===0?P.red:dow===6?P.blue:P.text,
                  border:isToday&&!isSel?`1.5px solid ${P.accent}`:"none",
                  borderRadius:8,padding:"5px 2px",fontSize:13,
                  fontWeight:isSel?700:isToday?600:400,
                  cursor:"pointer",textAlign:"center",
                }}>{d}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemForm({ item, stores, categories, allCreators, onAddCreator, onSave, onClose, username }) {
  const isEdit = !!item;
  const [form,setForm] = useState(item?{...item}:{
    id:uid(),name:"",price:"",qty:1,store:"",category:categories[0]||"食物",
    note:"",url:"",image:"",priority:"mid",needType:"需要",
    onSale:false,deadline:"",deadlineType:"無",
    bought:false,creator:username||"我",staple:false,
    priceHistory:[],createdAt:today(),
  });
  // fix #7: 只保留「基本」和「進階」，移除價格追蹤和商品比較頁籤
  const TABS = [{id:"basic",label:"基本"},{id:"advanced",label:"進階"}];
  const [tab,        setTab]        = useState("basic");
  const [urlInput,   setUrlInput]   = useState(item?.url||"");
  const [fetching,   setFetching]   = useState(false);
  const [fetchMsg,   setFetchMsg]   = useState("");
  const [cropSrc,    setCropSrc]    = useState(null);
  const [saveErr,    setSaveErr]    = useState("");
  const [newCat,     setNewCat]     = useState("");
  const [addingCat,  setAddingCat]  = useState(false);
  const [creatorVal, setCreatorVal] = useState(item?.creator||username||"我");
  // fix #3: 新增建立者直接按 Enter 或點外部確認，不需獨立確認按鈕
  const [newCreator, setNewCreator] = useState("");
  const [addingCreator,setAddingCreator] = useState(false);
  const newCreatorRef = useRef(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // 短網址偵測
  const isShortUrl = u => {
    const SHORT=["shp.ee","bit.ly","reurl.cc","pse.is","lihi.cc","ppt.cc","goo.gl","tinyurl.com"];
    try{const h=new URL(u).hostname.toLowerCase();return SHORT.some(s=>h.includes(s));}catch{return false;}
  };

  const STORE_RULES = [
    {p:["muji.com","muji.net"],       store:"無印良品",cat:"居家"},
    {p:["costco.com","costco.com.tw"],store:"好市多",  cat:"食物"},
    {p:["shopee.tw","shopee.com"],    store:"蝦皮",    cat:"其他"},
    {p:["daiso"],                     store:"大創",    cat:"居家"},
    {p:["ikea.com"],                  store:"IKEA",    cat:"居家"},
    {p:["pchome.com.tw","pchome.tw"], store:"PChome",  cat:"其他"},
    {p:["pxmart.com.tw"],             store:"全聯",    cat:"食物"},
    {p:["momo","momoshop"],           store:"Momo",    cat:"其他"},
    {p:["poya.com","poya.net"],       store:"寶雅",    cat:"其他"},
    {p:["nitori"],                    store:"宜得利",  cat:"居家"},
  ];

  const importUrl = () => {
    const u=urlInput.trim(); if(!u) return;
    let host=""; try{host=new URL(u).hostname.toLowerCase();}catch{}
    let store="",category="";
    for(const r of STORE_RULES){if(r.p.some(p=>host.includes(p))){store=r.store;category=r.cat;break;}}
    setForm(f=>({...f,url:u,store:store||f.store,category:category||f.category}));
    setUrlInput(u);
    const filled=[store&&`商店: ${store}`,category&&`分類: ${category}`].filter(Boolean);
    setFetchMsg(filled.length?`✅ ${filled.join("  ")}（可手動修改）`:"✅ 連結已儲存");
  };

  // fix #1: 只保留本地上傳，移除圖片網址功能
  const handleFile = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>setCropSrc(ev.target.result);
    r.readAsDataURL(f);
  };

  const handleSave = () => {
    if(!form.name.trim()){setSaveErr("請填寫商品名稱");return;}
    setSaveErr("");
    onSave({...form,url:urlInput.trim()||form.url||"",qty:Number(form.qty)||1,creator:creatorVal});
  };

  const addNewCat = () => {
    if(!newCat.trim()) return;
    onSave({...form,_newCat:newCat.trim()},true);
    set("category",newCat.trim());
    setAddingCat(false); setNewCat("");
  };

  // fix #3: 建立者確認 — 失焦或 Enter 即確認，不需按鈕
  const commitCreator = () => {
    const v = newCreator.trim();
    if(v){
      setCreatorVal(v);
      if(!allCreators.includes(v)) onAddCreator(v); // 立即同步到父層
    }
    setAddingCreator(false); setNewCreator("");
  };

  return (
    <Overlay onClick={onClose}>
      {cropSrc&&<ImageCropper src={cropSrc} onDone={b64=>{set("image",b64);setCropSrc(null);}} onCancel={()=>setCropSrc(null)}/>}
      <div onClick={e=>e.stopPropagation()} style={{
        background:P.card,borderRadius:22,padding:"18px 16px",
        width:"min(500px,97vw)",maxHeight:"93vh",overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.16)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{fontFamily:"'Noto Serif TC',serif",fontSize:17,fontWeight:700,color:P.text}}>
            {isEdit?"編輯商品":"新增商品"}
          </h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:19,cursor:"pointer",color:P.muted}}>✕</button>
        </div>

        {/* 頁籤 */}
        <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:`1px solid ${P.border}`,paddingBottom:8}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:tab===t.id?P.accent:"transparent",
              color:tab===t.id?"#fff":P.muted,
              border:"none",borderRadius:7,padding:"4px 10px",
              fontSize:12,fontWeight:600,cursor:"pointer",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── 基本頁 ── */}
        {tab==="basic"&&(
          <div style={{display:"flex",flexDirection:"column",gap:11}}>

            <Field label="商品名稱 *">
              <input value={form.name} onChange={e=>set("name",e.target.value)}
                placeholder="例：IKEA 燈泡 3入" style={inputStyle}/>
            </Field>

            {/* 商品網址 + AI 解析 */}
            <Field label="商品網址">
              <div style={{display:"flex",gap:7,marginBottom:4}}>
                <input value={urlInput}
                  onChange={e=>{setUrlInput(e.target.value);set("url",e.target.value);setFetchMsg("");setShowPaste(false);setAiMsg("");}}
                  placeholder="貼入完整商品網址 https://..." style={{...inputStyle,flex:1}}/>
                <Btn onClick={importUrl} disabled={!urlInput.trim()} color={P.blue}
                  style={{padding:"7px 11px",fontSize:12,whiteSpace:"nowrap"}}>解析</Btn>
              </div>
              {urlInput.trim()&&isShortUrl(urlInput)&&!fetchMsg&&(
                <div style={{background:"#FFF8EC",border:`1px solid ${P.yellow}`,borderRadius:8,
                  padding:"7px 10px",fontSize:11,color:"#7A5C00",lineHeight:1.5}}>
                  ⚠️ 偵測到短網址，請先在瀏覽器開啟 → 複製完整網址 → 再貼回來
                </div>
              )}
              {fetchMsg&&<p style={{fontSize:11,color:fetchMsg.startsWith("✅")?P.green:P.yellow,marginBottom:2}}>{fetchMsg}</p>}
            </Field>



            {/* 價格 + 數量 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="價格（NT$）">
                <input type="number" value={form.price} onChange={e=>set("price",e.target.value)}
                  placeholder="0" style={inputStyle}/>
              </Field>
              <Field label="數量">
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <button onClick={()=>set("qty",Math.max(1,(Number(form.qty)||1)-1))} style={{
                    width:30,height:34,borderRadius:7,border:`1.5px solid ${P.border}`,
                    background:P.warm,cursor:"pointer",fontSize:18,color:P.text,flexShrink:0}}>−</button>
                  <input type="number" value={form.qty||1} min={1}
                    onChange={e=>set("qty",Math.max(1,Number(e.target.value)))}
                    style={{...inputStyle,textAlign:"center",padding:"7px 4px"}}/>
                  <button onClick={()=>set("qty",(Number(form.qty)||1)+1)} style={{
                    width:30,height:34,borderRadius:7,border:`1.5px solid ${P.border}`,
                    background:P.warm,cursor:"pointer",fontSize:18,color:P.text,flexShrink:0}}>＋</button>
                </div>
              </Field>
            </div>

            {/* 建立者 */}
            <Field label="建立者">
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                {allCreators.map(c=>(
                  <button key={c} onClick={()=>{setCreatorVal(c);setAddingCreator(false);}} style={{
                    background:creatorVal===c?P.accent:P.warm,
                    color:creatorVal===c?"#fff":P.muted,
                    border:`1.5px solid ${creatorVal===c?P.accent:P.border}`,
                    borderRadius:20,padding:"4px 11px",fontSize:12,cursor:"pointer",
                    fontWeight:creatorVal===c?600:400,
                  }}>{c}</button>
                ))}
                <button onClick={()=>setAddingCreator(v=>!v)} style={{
                  background:"none",border:`1.5px dashed ${P.border}`,
                  borderRadius:20,padding:"4px 10px",fontSize:12,cursor:"pointer",color:P.muted,
                }}>＋</button>
              </div>
              {addingCreator&&(
                <div style={{display:"flex",gap:7}}>
                  <input ref={newCreatorRef} value={newCreator}
                    onChange={e=>setNewCreator(e.target.value)}
                    placeholder="輸入名稱後按確認" style={{...inputStyle,flex:1}}
                    onKeyDown={e=>{
                      if(e.key==="Enter"){commitCreator();}
                      if(e.key==="Escape"){setAddingCreator(false);setNewCreator("");}
                    }}
                    autoFocus/>
                  <Btn color={P.accent} onClick={commitCreator}>確認</Btn>
                  <Btn ghost color={P.muted} onClick={()=>{setAddingCreator(false);setNewCreator("");}}>✕</Btn>
                </div>
              )}
            </Field>

            {/* 商店 + 分類 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="商店">
                <select value={form.store} onChange={e=>set("store",e.target.value)} style={inputStyle}>
                  <option value="">— 選擇 —</option>
                  {stores.map(s=><option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="分類">
                <select value={form.category} onChange={e=>{
                  if(e.target.value==="__add__") setAddingCat(true);
                  else set("category",e.target.value);
                }} style={inputStyle}>
                  {categories.map(c=><option key={c} value={c}>{c}</option>)}
                  <option value="__add__">＋ 新增分類…</option>
                </select>
              </Field>
            </div>
            {addingCat&&(
              <div style={{display:"flex",gap:7}}>
                <input value={newCat} onChange={e=>setNewCat(e.target.value)}
                  placeholder="新分類名稱" style={{...inputStyle,flex:1}}
                  onKeyDown={e=>{if(e.key==="Enter")addNewCat();}}
                  autoFocus/>
                <Btn color={P.accent} onClick={addNewCat}>新增</Btn>
                <Btn ghost color={P.muted} onClick={()=>{setAddingCat(false);setNewCat("");}}>取消</Btn>
              </div>
            )}

            {/* 優先度 + 需求 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="優先度">
                <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inputStyle}>
                  {Object.entries(PRIORITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="需求類型">
                <select value={form.needType} onChange={e=>set("needType",e.target.value)} style={inputStyle}>
                  {NEED_TYPES.map(n=><option key={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <Field label="備註（尺寸、用途等）">
              <textarea value={form.note} onChange={e=>set("note",e.target.value)}
                placeholder="例：S號 白色" rows={2} style={{...inputStyle,resize:"vertical"}}/>
            </Field>

            {/* 購買期限 — 自製選擇器，避免 iOS 日文日期 UI */}
            <Field label="購買期限">
              <DatePicker value={form.deadline} onChange={v=>set("deadline",v)}/>
            </Field>

            {/* fix #1: 只保留本地上傳，移除圖片網址欄位 */}
            <div style={{borderTop:`1px solid ${P.border}`,paddingTop:11}}>
              <p style={{fontSize:11,fontWeight:700,color:P.muted,marginBottom:8}}>商品圖片</p>
              <Field label="上傳本地圖片（上傳後可裁切）">
                <input type="file" accept="image/*" onChange={handleFile} style={inputStyle}/>
              </Field>
              {form.image&&(
                <div style={{marginTop:8}}>
                  <div style={{borderRadius:10,overflow:"hidden",maxHeight:200,background:P.warm,marginBottom:8}}>
                    <img src={form.image} alt="" style={{width:"100%",objectFit:"cover"}}
                      onError={e=>e.target.style.display="none"}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {form.image.startsWith("data:")&&(
                      <Btn color={P.accent} onClick={()=>setCropSrc(form.image)}
                        style={{flex:1,justifyContent:"center"}}>✂️ 裁切</Btn>
                    )}
                    <Btn ghost color={P.red} onClick={()=>set("image","")}
                      style={{flex:1,justifyContent:"center"}}>移除圖片</Btn>
                  </div>
                </div>
              )}
            </div>

            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <Toggle checked={form.onSale} onChange={v=>set("onSale",v)}/>
              <span style={{fontSize:13,color:P.text}}>🏷️ 特價商品</span>
            </label>
          </div>
        )}

        {/* 進階頁 — 只保留常備品 */}
        {tab==="advanced"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <Toggle checked={form.staple} onChange={v=>set("staple",v)}/>
              <span style={{fontSize:13,color:P.text}}>🔁 常用備品（可快速補貨加入清單）</span>
            </label>
          </div>
        )}

        {saveErr&&<p style={{fontSize:12,color:P.red,marginTop:10,textAlign:"center"}}>{saveErr}</p>}
        <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
          <Btn ghost color={P.muted} onClick={onClose}>取消</Btn>
          <Btn onClick={handleSave} color={P.accent}>儲存商品</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── 主應用程式 ────────────────────────────────────────────────────────────────
export default function App() {
  const [items,        setItems]        = useState([]);
  const [custStores,   setCustStores]   = useState([]);
  const [custCats,     setCustCats]     = useState([]);
  const [custCreators, setCustCreators] = useState([]);
  const [view,         setView]         = useState("list");
  const [tab,          setTab]          = useState("list");
  const [showForm,     setShowForm]     = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [sidebar,      setSidebar]      = useState(false);
  const [username,     setUsername]     = useState("我");
  const [delId,        setDelId]        = useState(null);
  const [boughtItem,   setBoughtItem]   = useState(null);
  const [syncing,      setSyncing]      = useState(false);
  const [filters,      setFilters]      = useState({
    stores:[],categories:[],priorities:[],needTypes:[],onSale:false,showBought:false,sortBy:"default",
  });

  const allStores   = [...STORES_DEFAULT,...custStores];
  const allCats     = [...CATS_DEFAULT,...custCats];
  const allCreators = [...new Set([...CREATORS_BUILTIN,...custCreators])];

  // 載入本地資料
  useEffect(()=>{
    const db = loadDB();
    if(db.items)        setItems(db.items);
    if(db.custStores)   setCustStores(db.custStores);
    if(db.custCats)     setCustCats(db.custCats);
    if(db.custCreators) setCustCreators(db.custCreators);
    if(db.username)     setUsername(db.username);
    setSyncing(false);
  },[]);

  const saveItem = (item, addCatOnly=false) => {
    if(item._newCat&&!allCats.includes(item._newCat)) setCustCats(p=>[...p,item._newCat]);
    if(addCatOnly) return;
    const {_newCat,...clean}=item;
    if(clean.creator&&!allCreators.includes(clean.creator))
      setCustCreators(p=>[...p,clean.creator]);
    setItems(prev=>{
      const idx=prev.findIndex(i=>i.id===clean.id);
      if(idx>=0){const n=[...prev];n[idx]=clean;return n;}
      return [clean,...prev];
    });
    setShowForm(false); setEditItem(null);
  };

  const openEdit   = item => { setEditItem({...item}); setShowForm(true); };
  const markBought = item => setBoughtItem(item);

  const confirmBought = fp => {
    setItems(prev=>prev.map(i=>i.id===boughtItem.id
      ?{...i,bought:true,boughtAt:today(),finalPrice:fp||i.price,
          priceHistory:[...(i.priceHistory||[]),...(fp?[{price:Number(fp),date:today()}]:[])]}
      :i));
    setBoughtItem(null);
  };

  const undoBought = id => setItems(prev=>prev.map(i=>i.id===id?{...i,bought:false}:i));
  // 儲存到 localStorage
  useEffect(()=>{
    saveDB({items,custStores,custCats,custCreators,username});
  },[items,custStores,custCats,custCreators,username]);

  const setF   = (k,v) => setFilters(f=>({...f,[k]:v}));
  const toggleF = (k,v) => setFilters(f=>({...f,[k]:f[k].includes(v)?f[k].filter(x=>x!==v):[...f[k],v]}));

  const filtered = items
    .filter(i=>{
      if(!filters.showBought&&i.bought) return false;
      if(filters.showBought&&!i.bought) return false;
      if(filters.stores.length     &&!filters.stores.includes(i.store))       return false;
      if(filters.categories.length &&!filters.categories.includes(i.category)) return false;
      if(filters.priorities.length &&!filters.priorities.includes(i.priority)) return false;
      if(filters.needTypes.length  &&!filters.needTypes.includes(i.needType))  return false;
      if(filters.onSale            &&!i.onSale)                                return false;
      return true;
    })
    .sort((a,b)=>{
      if(filters.sortBy==="price_asc")  return (Number(a.price)||0)-(Number(b.price)||0);
      if(filters.sortBy==="price_desc") return (Number(b.price)||0)-(Number(a.price)||0);
      if(filters.sortBy==="deadline")   return (a.deadline||"9999")<(b.deadline||"9999")?-1:1;
      if(filters.sortBy==="priority"){const o={high:0,mid:1,low:2};const oa=o[a.priority]??1,ob=o[b.priority]??1;return oa-ob;}
      if(filters.sortBy==="store") return (a.store||"").localeCompare(b.store||"","zh-Hant");
      return 0;
    });

  const pending = items.filter(i=>!i.bought).length;
  const staples = items.filter(i=>i.staple);

  return (
    <div style={{minHeight:"100vh",background:P.cream,fontFamily:"'Noto Sans TC',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&family=Noto+Serif+TC:wght@600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:${P.border};border-radius:3px;}
        input,select,textarea,button{font-family:'Noto Sans TC',sans-serif;}
      `}</style>

      {/* 頂部導覽 */}
      <div style={{background:P.card,borderBottom:`1px solid ${P.border}`,
        position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",alignItems:"center",
          gap:10,height:48,padding:"0 12px"}}>
          <button onClick={()=>setSidebar(true)}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:19,color:P.muted,padding:4}}>☰</button>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <h1 style={{fontFamily:"'Noto Serif TC',serif",fontSize:16,fontWeight:700,color:P.text}}>🛍️ 購物清單</h1>

            </div>
            {pending>0&&<p style={{fontSize:10,color:P.muted}}>{pending} 件待購</p>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {tab==="list"&&(
              <div style={{display:"flex",background:P.warm,borderRadius:7,padding:2}}>
                {["grid","list"].map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{
                    background:view===v?P.accent:"transparent",color:view===v?"#fff":P.muted,
                    border:"none",borderRadius:5,padding:"3px 9px",fontSize:13,cursor:"pointer",
                  }}>{v==="grid"?"⊞":"☰"}</button>
                ))}
              </div>
            )}
            <Btn onClick={()=>{setEditItem(null);setShowForm(true);}} color={P.accent}
              style={{padding:"5px 12px",fontSize:13}}>＋ 新增</Btn>
          </div>
        </div>
        {/* 頁籤 — fix #7: 移除商品比較頁籤 */}
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",overflowX:"auto",
          scrollbarWidth:"none",padding:"0 12px"}}>
          {[{id:"list",label:"📋 清單"},{id:"analysis",label:"📊 分析"},
            {id:"staples",label:"🔁 常備"},{id:"share",label:"🤝 共享"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none",border:"none",
              borderBottom:tab===t.id?`2px solid ${P.accent}`:"2px solid transparent",
              color:tab===t.id?P.accent:P.muted,
              padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",
              whiteSpace:"nowrap",transition:"color .15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",paddingTop:10}}>

        {/* 清單頁 */}
        {tab==="list"&&(
          <>
            {/* 商店快篩 */}
            <div style={{padding:"0 12px",marginBottom:7,overflowX:"auto",scrollbarWidth:"none"}}>
              <div style={{display:"flex",gap:5,minWidth:"max-content"}}>
                {["全部",...allStores].map(s=>{
                  const active=s==="全部"?filters.stores.length===0:filters.stores.includes(s);
                  return(
                    <button key={s} onClick={()=>{
                      if(s==="全部") setF("stores",[]);
                      else toggleF("stores",s);
                    }} style={{
                      background:active?P.accent:P.warm,color:active?"#fff":P.muted,
                      border:"none",borderRadius:20,padding:"3px 11px",fontSize:11,
                      fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap",
                    }}>{s}</button>
                  );
                })}
              </div>
            </div>
            {/* 篩選列 */}
            <div style={{padding:"0 12px",marginBottom:8,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <select value={filters.sortBy} onChange={e=>setF("sortBy",e.target.value)}
                style={{...inputStyle,width:"auto",padding:"3px 8px",fontSize:11}}>
                <option value="default">預設排序</option>
                <option value="priority">優先度</option>
                <option value="store">商店</option>
                <option value="price_asc">價格↑</option>
                <option value="price_desc">價格↓</option>
                <option value="deadline">期限最近</option>
              </select>
              {/* 需求類型多選 */}
              {["需要","想要"].map(n=>{
                const v=filters.needTypes.includes(n);
                return <button key={n} onClick={()=>toggleF("needTypes",n)} style={{
                  background:v?P.accentLight:P.warm,color:v?P.accent:P.muted,
                  border:`1.5px solid ${v?P.accent:P.border}`,
                  borderRadius:20,padding:"3px 9px",fontSize:11,cursor:"pointer",fontWeight:v?600:400,
                }}>{n}</button>;
              })}
              {/* 優先度多選 */}
              {Object.entries(PRIORITIES).map(([k,lbl])=>{
                const v=filters.priorities.includes(k);
                return <button key={k} onClick={()=>toggleF("priorities",k)} style={{
                  background:v?PRI_COLOR[k]+"22":P.warm,
                  color:v?PRI_COLOR[k]:P.muted,
                  border:`1.5px solid ${v?PRI_COLOR[k]:P.border}`,
                  borderRadius:20,padding:"3px 9px",fontSize:11,cursor:"pointer",fontWeight:v?600:400,
                }}>● {lbl}</button>;
              })}
              {/* 特價 */}
              {[
                {label:"🏷️特價",v:filters.onSale,fn:()=>setF("onSale",!filters.onSale)},
                {label:"已購買",v:filters.showBought,fn:()=>setF("showBought",!filters.showBought)},
              ].map(b=>(
                <button key={b.label} onClick={b.fn} style={{
                  background:b.v?P.accentLight:P.warm,color:b.v?P.accent:P.muted,
                  border:`1.5px solid ${b.v?P.accent:P.border}`,
                  borderRadius:20,padding:"3px 9px",fontSize:11,cursor:"pointer",fontWeight:b.v?600:400,
                }}>{b.label}</button>
              ))}
            </div>
            {/* 商品列表 */}
            {filtered.length===0?(
              <div style={{textAlign:"center",padding:50,color:P.muted}}>
                <div style={{fontSize:36,marginBottom:10}}>🛒</div>
                <p style={{fontSize:13}}>{items.length===0?"點擊「＋ 新增」加入第一件商品！":"沒有符合篩選條件的商品"}</p>
              </div>
            ):(
              <div style={{
                padding:"0 12px 80px",
                display:view==="grid"?"grid":"flex",
                gridTemplateColumns:view==="grid"?"repeat(2,1fr)":undefined,
                flexDirection:view==="list"?"column":undefined,
                gap:view==="list"?4:9,
              }}>
                {filtered.map(item=>(
                  <ItemCard key={item.id} item={item} view={view}
                    onMarkBought={markBought} onUndo={undoBought}
                    onEdit={openEdit} onDelete={id=>setDelId(id)}/>
                ))}
              </div>
            )}
          </>
        )}

        {tab==="analysis"&&<AnalysisPanel items={items}/>}

        {/* 常備品 */}
        {tab==="staples"&&(
          <div style={{padding:"0 14px 80px"}}>
            <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:16,color:P.text,marginBottom:4}}>🔁 常備品管理</h3>
            <p style={{fontSize:11,color:P.muted,marginBottom:10}}>標記為常用備品，一鍵補貨加入清單</p>
            {staples.length===0?(
              <div style={{textAlign:"center",padding:28,color:P.muted,fontSize:13,
                background:P.card,borderRadius:12,border:`1px solid ${P.border}`}}>
                尚無常備品。新增商品時可於「進階」頁籤標記。
              </div>
            ):staples.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,
                padding:"9px 12px",background:P.card,borderRadius:11,marginBottom:6,
                border:`1px solid ${P.border}`}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:P.text}}>{item.name}</p>
                  <p style={{fontSize:11,color:P.muted}}>{[item.store,item.category].filter(Boolean).join(" · ")}</p>
                </div>
                {item.price&&<span style={{fontSize:12,color:P.accent,fontWeight:600}}>{fmtPrice(item.price)}</span>}
                <Btn color={P.accent} onClick={()=>{
                  const newItem={...item,id:uid(),bought:false,createdAt:today(),creator:username};
                  setItems(p=>[newItem,...p]);
                }} style={{padding:"5px 11px",fontSize:12}}>＋ 補貨</Btn>
              </div>
            ))}
          </div>
        )}

        {tab==="share"&&(
          <div style={{padding:"0 14px 20px"}}>
            <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:16,color:P.text,marginBottom:12}}>🤝 共享清單</h3>
            <div style={{background:P.accentLight,borderRadius:14,padding:16,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>☁️</div>
              <p style={{fontSize:14,fontWeight:700,color:P.accent,marginBottom:6}}>Firebase 雲端即時同步</p>
              <p style={{fontSize:12,color:P.muted,lineHeight:1.7}}>
                你和老公使用同一個 App，<br/>資料會自動即時同步。<br/>新增、修改、刪除對方立即看到。
              </p>
            </div>
            <div style={{background:P.card,borderRadius:14,padding:14,border:`1px solid ${P.border}`,marginBottom:10}}>
              <p style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:8}}>目前同步狀態</p>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:10,height:10,borderRadius:"50%",
                  background:syncError?P.red:syncing?P.yellow:P.green}}/>
                <span style={{fontSize:13,color:P.text}}>
                  {syncError?"離線 — 請檢查網路連線":syncing?"同步中…":"已連線，即時同步中"}
                </span>
              </div>
              <p style={{fontSize:11,color:P.muted,marginTop:8}}>共 {items.length} 件商品已儲存至雲端</p>
            </div>
            <div style={{background:P.card,borderRadius:14,padding:14,border:`1px solid ${P.border}`}}>
              <p style={{fontSize:12,fontWeight:700,color:P.text,marginBottom:6}}>使用方式</p>
              <p style={{fontSize:11,color:P.muted,lineHeight:1.8}}>
                1. 老公在他的裝置開啟相同的 App<br/>
                2. 兩人都會看到同一份清單<br/>
                3. 任何一方新增或修改，對方即時更新
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 側邊欄 */}
      {sidebar&&(
        <Overlay onClick={()=>setSidebar(false)}>
          <div onClick={e=>e.stopPropagation()} style={{
            position:"fixed",left:0,top:0,bottom:0,width:272,
            background:P.card,boxShadow:"4px 0 24px rgba(0,0,0,0.12)",
            overflowY:"auto",padding:"16px 13px",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontFamily:"'Noto Serif TC',serif",fontSize:15,color:P.text}}>篩選 & 設定</h2>
              <button onClick={()=>setSidebar(false)}
                style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:P.muted}}>✕</button>
            </div>

            <SbSec title="使用者名稱">
              <input value={username} onChange={e=>setUsername(e.target.value)} style={{...inputStyle,marginTop:5}}/>
            </SbSec>

            {/* 建立者管理 */}
            <SbSec title="建立者管理">
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                {allCreators.map(c=>(
                  <div key={c} style={{display:"flex",alignItems:"center",gap:3,
                    background:P.warm,border:`1.5px solid ${P.border}`,
                    borderRadius:20,padding:"3px 8px 3px 11px"}}>
                    <span style={{fontSize:11,color:P.text}}>{c}</span>
                    {!CREATORS_BUILTIN.includes(c)&&(
                      <button onClick={()=>setCustCreators(p=>p.filter(x=>x!==c))} style={{
                        background:"none",border:"none",color:P.red,cursor:"pointer",
                        fontSize:12,lineHeight:1,padding:"0 2px",
                      }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <SbAddInput placeholder="新增建立者" onAdd={v=>{
                if(v&&!allCreators.includes(v)) setCustCreators(p=>[...p,v]);
              }}/>
            </SbSec>

            {/* 商店管理（多選 + Logo） */}
            <SbSec title="商店管理">
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                {STORES_DEFAULT.map(s=>{
                  const brand=STORE_BRAND[s];
                  const active=filters.stores.includes(s);
                  return (
                    <div key={s} style={{
                      display:"flex",alignItems:"center",gap:5,
                      background:active?P.accentLight:P.warm,
                      border:`1.5px solid ${active?P.accent:P.border}`,
                      borderRadius:20,padding:"4px 10px",cursor:"pointer",
                      opacity:active?1:0.85,
                    }} onClick={()=>{toggleF("stores",s);setTab("list");}}>
                      {brand&&<span style={{
                        background:brand.bg,color:brand.color,
                        fontSize:8,fontWeight:800,padding:"1px 4px",
                        borderRadius:3,letterSpacing:0.2,lineHeight:"13px",
                        fontFamily:"sans-serif",flexShrink:0,
                        border: brand.border ? `1px solid ${brand.border}` : "none",
                      }}>{brand.text}</span>}
                      <span style={{fontSize:11,color:active?P.accent:P.muted,
                        fontWeight:active?700:400}}>{s}</span>
                    </div>
                  );
                })}
                {custStores.map(s=>{
                  const active=filters.stores.includes(s);
                  return (
                    <div key={s} style={{display:"flex",alignItems:"center",gap:4,
                      background:active?P.accentLight:P.warm,
                      border:`1.5px solid ${active?P.accent:P.border}`,
                      borderRadius:20,padding:"4px 8px 4px 10px"}}>
                      <span style={{fontSize:11,color:active?P.accent:P.muted,
                        fontWeight:active?700:400,cursor:"pointer"}}
                        onClick={()=>{toggleF("stores",s);setTab("list");}}>
                        🏪 {s}
                      </span>
                      <button onClick={()=>setCustStores(p=>p.filter(x=>x!==s))} style={{
                        background:"none",border:"none",color:P.red,cursor:"pointer",
                        fontSize:12,lineHeight:1,padding:"0 2px",
                      }}>✕</button>
                    </div>
                  );
                })}
              </div>
              <SbAddInput placeholder="新增商店" onAdd={v=>{
                if(v&&!allStores.includes(v)) setCustStores(p=>[...p,v]);
              }}/>
            </SbSec>

            {/* 分類管理（多選） */}
            <SbSec title="分類管理">
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                {CATS_DEFAULT.map(c=>(
                  <div key={c} style={{
                    background:filters.categories.includes(c)?P.accentLight:P.warm,
                    border:`1.5px solid ${filters.categories.includes(c)?P.accent:P.border}`,
                    borderRadius:20,padding:"3px 11px",cursor:"pointer",
                  }} onClick={()=>{toggleF("categories",c);setTab("list");}}>
                    <span style={{fontSize:11,color:filters.categories.includes(c)?P.accent:P.muted,
                      fontWeight:filters.categories.includes(c)?600:400}}>{c}</span>
                  </div>
                ))}
                {custCats.map(c=>(
                  <div key={c} style={{display:"flex",alignItems:"center",gap:3,
                    background:filters.categories.includes(c)?P.accentLight:P.warm,
                    border:`1.5px solid ${filters.categories.includes(c)?P.accent:P.border}`,
                    borderRadius:20,padding:"3px 8px 3px 11px"}}>
                    <span style={{fontSize:11,color:filters.categories.includes(c)?P.accent:P.muted,
                      fontWeight:filters.categories.includes(c)?600:400,cursor:"pointer"}}
                      onClick={()=>{toggleF("categories",c);setTab("list");}}>
                      {c}
                    </span>
                    <button onClick={()=>setCustCats(p=>p.filter(x=>x!==c))} style={{
                      background:"none",border:"none",color:P.red,cursor:"pointer",
                      fontSize:12,lineHeight:1,padding:"0 2px",
                    }}>✕</button>
                  </div>
                ))}
              </div>
              <SbAddInput placeholder="新增分類" onAdd={v=>{
                if(v&&!allCats.includes(v)) setCustCats(p=>[...p,v]);
              }}/>
            </SbSec>

            <SbSec title="優先度">
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                {Object.entries(PRIORITIES).map(([k,v])=>(
                  <SbChip key={k} active={filters.priorities.includes(k)} color={PRI_COLOR[k]}
                    onClick={()=>{toggleF("priorities",k);setTab("list");setSidebar(false);}}>
                    ● {v}
                  </SbChip>
                ))}
              </div>
            </SbSec>

            <SbSec title="其他篩選">
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                <SbChip active={filters.onSale} onClick={()=>{setF("onSale",!filters.onSale);setTab("list");setSidebar(false);}}>🏷️ 只看特價</SbChip>
                <SbChip active={filters.showBought} onClick={()=>{setF("showBought",!filters.showBought);setTab("list");setSidebar(false);}}>✓ 已購買</SbChip>
              </div>
            </SbSec>

            <button onClick={()=>{
              setFilters({stores:[],categories:[],priorities:[],needTypes:[],onSale:false,showBought:false,sortBy:"default"});
              setSidebar(false);
            }} style={{display:"block",width:"100%",marginTop:12,padding:"8px",
              background:P.warm,border:"none",borderRadius:9,color:P.muted,cursor:"pointer",fontSize:12}}>
              清除所有篩選
            </button>
          </div>
        </Overlay>
      )}

      {/* 刪除確認 */}
      {delId&&(
        <Overlay onClick={()=>setDelId(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:P.card,borderRadius:20,padding:"22px 20px",
            width:"min(300px,90vw)",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.16)",
          }}>
            <div style={{fontSize:34,marginBottom:10}}>🗑️</div>
            <h3 style={{fontFamily:"'Noto Serif TC',serif",fontSize:15,color:P.text,marginBottom:6}}>確定刪除？</h3>
            <p style={{fontSize:12,color:P.muted,marginBottom:18}}>此動作無法復原</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn ghost color={P.muted} onClick={()=>setDelId(null)}>取消</Btn>
              <Btn color={P.red} onClick={()=>{setItems(p=>p.filter(i=>i.id!==delId));setDelId(null);}}>刪除</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {boughtItem&&<BoughtConfirm item={boughtItem} onConfirm={confirmBought} onCancel={()=>setBoughtItem(null)}/>}

      {showForm&&(
        <ItemForm item={editItem} stores={allStores} categories={allCats}
          allCreators={allCreators}
          onAddCreator={v=>{ if(!allCreators.includes(v)) setCustCreators(p=>[...p,v]); }}
          onSave={saveItem}
          onClose={()=>{setShowForm(false);setEditItem(null);}}
          username={username}/>
      )}
    </div>
  );
}

// ── 側邊欄輔助 ────────────────────────────────────────────────────────────────
function SbSec({ title, children }) {
  return (
    <div style={{marginBottom:16}}>
      <p style={{fontSize:10,fontWeight:700,color:P.muted,textTransform:"uppercase",letterSpacing:1}}>{title}</p>
      {children}
    </div>
  );
}
function SbChip({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background:active?(color||P.accent):P.warm,
      color:active?"#fff":(color||P.muted),
      border:`1.5px solid ${active?(color||P.accent):P.border}`,
      borderRadius:8,padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:active?600:400,
    }}>{children}</button>
  );
}
function SbAddInput({ placeholder, onAdd }) {
  const [val,setVal] = useState("");
  const commit = () => { if(!val.trim()) return; onAdd(val.trim()); setVal(""); };
  return (
    <div style={{display:"flex",gap:6,marginTop:7}}>
      <input value={val} onChange={e=>setVal(e.target.value)} placeholder={placeholder}
        style={{...inputStyle,flex:1,padding:"4px 9px",fontSize:11}}
        onKeyDown={e=>e.key==="Enter"&&commit()}/>
      <Btn onClick={commit} color={P.accent} style={{padding:"4px 10px",fontSize:11}}>＋</Btn>
    </div>
  );
}
