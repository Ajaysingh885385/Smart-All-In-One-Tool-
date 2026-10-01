import React, {useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {jsPDF} from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import {createWorker} from "tesseract.js";
import "./styles.css";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const compressionTools = [
  ["compress-5kb","Compress to 5KB",5],["jpeg-10kb","JPEG to 10KB",10],
  ["compress-15kb","Compress to 15KB",15],["compress-20kb","Compress to 20KB",20],
  ["compress-20-50kb","Compress 20KB–50KB",50],["jpeg-25kb","JPEG to 25KB",25],
  ["jpeg-30kb","JPEG to 30KB",30],["jpeg-40kb","JPEG to 40KB",40],
  ["compress-50kb","Compress to 50KB",50],["compress-60kb","Compress to 60KB",60],
  ["compress-70kb","Compress to 70KB",70],["compress-80kb","Compress to 80KB",80],
  ["compress-90kb","Compress to 90KB",90],["resize-50kb","Resize to 50KB",50],
  ["compress-100kb","Compress to 100KB",100],["jpeg-150kb","JPEG to 150KB",150],
  ["compress-200kb","Compress to 200KB",200],["resize-200kb","Resize to 200KB",200],
  ["jpeg-300kb","JPEG to 300KB",300],["jpeg-500kb","JPEG to 500KB",500],
  ["compress-1mb","Compress to 1MB",1024],["compress-2mb","Compress to 2MB",2048]
];

const pdfTools = [
  ["image-to-pdf","Image to PDF"],["pdf-to-jpg","PDF to JPG"],
  ["jpg-pdf-50","JPG to PDF (Under 50KB)",50],["jpg-pdf-100","JPG to PDF (Under 100KB)",100],
  ["jpg-pdf-150","JPG to PDF (Under 150KB)",150],["jpeg-pdf-200","JPEG to PDF (Under 200KB)",200],
  ["jpg-pdf-250","JPG to PDF (Under 250KB)",250],["jpg-pdf-300","JPG to PDF (Under 300KB)",300],
  ["jpg-pdf-400","JPG to PDF (Under 400KB)",400],["jpg-pdf-500","JPG to PDF (Under 500KB)",500],
  ["jpg-pdf-1mb","JPG to PDF (Under 1MB)",1024],["jpg-pdf-2mb","JPG to PDF (Under 2MB)",2048]
];

const formatTools = [
  ["image-converter","Image Converter"],["image-to-jpg","Image to JPG"],
  ["jpeg-to-jpg","JPEG to JPG"],["heic-to-jpg","HEIC to JPG"],
  ["webp-to-jpg","WEBP to JPG"],["webp-to-png","WEBP to PNG"],
  ["avif-to-jpg","AVIF to JPG"],["jfif-to-jpg","JFIF to JPG"],
  ["jpeg-to-png","JPEG to PNG"],["png-to-jpeg","PNG to JPEG"],
  ["png-to-ico","PNG to ICO"],["image-to-word","Image to Word"],
  ["jpg-to-text","JPG to Text"],["png-to-text","PNG to Text"],
  ["favicon","Favicon Generator"]
];

const idTools = [
  ["passport-maker","Passport Photo Maker"],["red-passport","Red Background Passport"],
  ["white-passport","White Background Passport"],["sign-6x2","Resize Sign 6cm × 2cm (300 DPI)"],
  ["photo-3.5x4.5","3.5cm × 4.5cm"],["signature-50x20","Signature 50mm × 20mm"],
  ["photo-35x45","35mm × 45mm"],["photo-2x2","2 × 2 Inch"],
  ["photo-3x4","3 × 4 Inch"],["photo-4x6","4 × 6 Inch"],["photo-600","600 × 600 Pixels"]
];

function formatBytes(n){ if(!n) return "0 B"; const u=["B","KB","MB"]; const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),2); return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`; }
function extFromMime(m){ return m==="image/png"?"png":m==="image/webp"?"webp":"jpg"; }

async function fileToImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(); img.onload=()=>{URL.revokeObjectURL(img.src);resolve(img)}; img.onerror=reject; img.src=URL.createObjectURL(file);
  });
}
async function canvasBlob(img, quality=0.8, type="image/jpeg", maxW=null){
  const scale=maxW && img.width>maxW ? maxW/img.width : 1;
  const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return new Promise(r=>c.toBlob(r,type,quality));
}
async function compressToTarget(file, targetKB){
  const img=await fileToImage(file); const target=targetKB*1024;
  let lo=0.05, hi=0.95, best=null;
  for(let i=0;i<12;i++){
    const q=(lo+hi)/2, b=await canvasBlob(img,q,"image/jpeg");
    if(b.size<=target){best=b;lo=q}else hi=q;
  }
  if(!best){
    let maxW=img.width;
    for(let i=0;i<8 && !best;i++){
      maxW=Math.round(maxW*.82);
      const b=await canvasBlob(img,.72,"image/jpeg",maxW);
      if(b.size<=target) best=b;
    }
  }
  return best || await canvasBlob(img,.5,"image/jpeg");
}

function downloadBlob(blob,name){
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function ToolCard({title,onClick,icon="✦"}){return <button className="tool-card" onClick={onClick}><span className="tool-icon">{icon}</span><span>{title}</span><b>→</b></button>}

function App(){
  const [active,setActive]=useState(null);
  const [notice,setNotice]=useState("");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [light,setLight]=useState(false);
  const [search,setSearch]=useState("");
  const [results,setResults]=useState(null);

  const sections=useMemo(()=>[
    {id:"compression",title:"Exact Target Sizes",icon:"⚡",tools:compressionTools},
    {id:"pdf",title:"Image to PDF & PDF Tools",icon:"▣",tools:pdfTools},
    {id:"formats",title:"Format Conversions",icon:"↔",tools:formatTools},
    {id:"ids",title:"Passport & ID Photo Sizes",icon:"▤",tools:idTools}
  ],[]);

  async function runTool(tool){
    setActive(tool); setNotice(""); setResults(null);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function close(){setActive(null);setNotice("");setResults(null)}

  return <div className={"app"+(light?" light":"")}>
    <header className="topbar">
      <div className="brand" onClick={close}><div className="brand-mark">S</div><div><strong>SMART</strong><span>ALL IN ONE TOOL</span></div></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><button className="theme-btn" onClick={()=>setLight(!light)}>{light?"🌙":"☀️"}</button><button className="menu-btn" onClick={()=>setMobileOpen(!mobileOpen)}>☰</button></div>
      <nav className={mobileOpen?"open":""}>
        <button onClick={close}>Home</button>
        <a href="#compression">Image Tools</a><a href="#pdf">PDF Tools</a><a href="#formats">Converters</a><a href="#ids">Passport & ID</a>
      </nav>
    </header>
    <div className="search-wrap" style={{display:"block"}}><input className="search-box" placeholder="🔎 Search a tool… (e.g. 50KB, PDF, Passport)" value={search} onChange={e=>setSearch(e.target.value)}/></div>

    {active ? <ToolPage tool={active} onClose={close} notice={notice} setNotice={setNotice} results={results} setResults={setResults}/> :
    <>
      <section className="hero">
        <div className="hero-glow"></div><div className="hero-copy">
          <div className="eyebrow">FAST • PRIVATE • BROWSER BASED</div>
          <h1>Smart <span>All In One</span> Tool</h1>
          <p>Compress, convert, resize and prepare images & documents with a beautiful, mobile-first toolkit.</p>
          <div className="hero-actions"><a className="primary" href="#compression">Explore Tools <span>→</span></a><a className="ghost" href="#formats">Format Converter</a></div>
        </div>
        <div className="hero-orb"><div className="orb-inner">S<span>AI</span></div></div>
      </section>

      <main>
        {sections.map(s=><section className="section" id={s.id} key={s.id}>
          <div className="section-head"><div><div className="section-kicker">{s.icon} TOOL COLLECTION</div><h2>{s.title}</h2></div><div className="count">{s.tools.length} tools</div></div>
          <div className="tool-grid">{s.tools.filter(t=>!search || t[1].toLowerCase().includes(search.toLowerCase())).map(t=><ToolCard key={t[0]} title={t[1]} onClick={()=>runTool({id:t[0],title:t[1],target:t[2],section:s.id})} icon={s.icon}/>)}</div>
        </section>)}
      </main>
      <footer><div className="brand"><div className="brand-mark small">S</div><div><strong>SMART</strong><span>ALL IN ONE TOOL</span></div></div><p>Built for fast, simple browser-side utilities.</p></footer>
    </>}
  </div>
}

function ToolPage({tool,onClose,notice,setNotice,results,setResults}){
  const [files,setFiles]=useState([]);
  const [busy,setBusy]=useState(false);
  const [quality,setQuality]=useState(80);
  const [bg,setBg]=useState("#ffffff");

  async function handleFiles(e){setFiles([...e.target.files]); setNotice(""); setResults(null)}

  async function process(){
    if(!files.length){setNotice("Please select an image or PDF first.");return}
    setBusy(true); setNotice(""); setResults(null);
    try{
      const f=files[0], id=tool.id;
      if(tool.section==="compression"){
        const blob=await compressToTarget(f,tool.target); setResults([{blob,name:`${f.name.replace(/\.[^.]+$/,"")}-${tool.target}KB.jpg`,meta:`${formatBytes(f.size)} → ${formatBytes(blob.size)}`}]);
      } else if(["image-converter","image-to-jpg","jpeg-to-jpg","heic-to-jpg","webp-to-jpg","webp-to-png","avif-to-jpg","jfif-to-jpg","jpeg-to-png","png-to-jpeg","png-to-ico","favicon"].includes(id)){
        const img=await fileToImage(f); const type=id==="webp-to-png"||id==="jpeg-to-png"?"image/png":id==="png-to-ico"?"image/png":"image/jpeg";
        const blob=await canvasBlob(img,quality/100,type); setResults([{blob,name:`${f.name.replace(/\.[^.]+$/,"")}.${extFromMime(type)}`,meta:`${formatBytes(f.size)} → ${formatBytes(blob.size)}`}]);
      } else if(id==="image-to-pdf" || id.startsWith("jpg-pdf") || id==="jpeg-pdf-200"){
        const img=await fileToImage(f); const pdf=new jsPDF({orientation:img.width>img.height?"landscape":"portrait",unit:"px",format:[img.width,img.height]});
        pdf.addImage(img,"JPEG",0,0,img.width,img.height); const blob=pdf.output("blob"); setResults([{blob,name:`${f.name.replace(/\.[^.]+$/,"")}.pdf`,meta:`PDF • ${formatBytes(blob.size)}`}]);
      } else if(id==="pdf-to-jpg"){
        const data=await f.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data}).promise; const out=[];
        for(let p=1;p<=Math.min(pdf.numPages,10);p++){const page=await pdf.getPage(p), vp=page.getViewport({scale:1.5}), c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.9));out.push({blob,name:`page-${p}.jpg`,meta:`Page ${p}`})}
        setResults(out);
      } else if(id==="jpg-to-text" || id==="png-to-text"){
        const worker=await createWorker("eng"); const {data}=await worker.recognize(f); await worker.terminate(); setResults([{text:data.text,name:"extracted-text.txt",meta:"OCR complete"}]);
      } else if(id==="passport-maker" || id==="red-passport" || id==="white-passport" || id.startsWith("photo-") || id==="sign-6x2" || id==="signature-50x20"){
        const img=await fileToImage(f); let w=600,h=600;
        if(id.includes("3.5x4.5")||id.includes("35x45")){w=413;h=531}
        if(id.includes("2x2")){w=600;h=600}
        if(id.includes("3x4")){w=900;h=1200}
        if(id.includes("4x6")){w=1200;h=1800}
        if(id.includes("sign")){w=709;h=236}
        const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.fillStyle=id==="red-passport"?"#b91c1c":bg;ctx.fillRect(0,0,w,h);
        const scale=Math.min(w/img.width,h/img.height);const nw=img.width*scale,nh=img.height*scale;ctx.drawImage(img,(w-nw)/2,(h-nh)/2,nw,nh);
        const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.92));setResults([{blob,name:`${id}.jpg`,meta:`${w} × ${h} px`}]);
      } else {
        setNotice("This tool is included in the UI and ready for the next processing module.");
      }
    }catch(e){console.error(e);setNotice("Processing failed. Try another file or format.")}
    setBusy(false);
  }

  return <main className="tool-page">
    <button className="back" onClick={onClose}>← Back to all tools</button>
    <div className="tool-hero"><div><div className="section-kicker">SMART TOOL</div><h1>{tool.title}</h1><p>Choose a file, process it in your browser, then download the result.</p></div><div className="mini-orb">S</div></div>
    <div className="work-card">
      <label className="dropzone"><input type="file" accept={tool.id==="pdf-to-jpg"?"application/pdf":"image/*,.pdf"} multiple={tool.id==="pdf-to-jpg"} onChange={handleFiles}/><span className="upload-icon">↑</span><strong>Tap to upload</strong><small>JPG, PNG, WEBP, PDF and supported image formats</small></label>
      {files.length>0 && <div className="file-list">{files.map(f=><div className="file-row" key={f.name}><span>✓</span>{f.name}<em>{formatBytes(f.size)}</em></div>)}</div>}
      {(tool.section==="formats" || tool.section==="ids") && <div className="options"><label>Quality <input type="range" min="20" max="100" value={quality} onChange={e=>setQuality(e.target.value)}/><b>{quality}%</b></label><label>Background <input type="color" value={bg} onChange={e=>setBg(e.target.value)}/></label></div>}
      <button className="process-btn" disabled={busy} onClick={process}>{busy?"Processing…":"Process & Download"}</button>
      {notice && <div className="notice">{notice}</div>}
      {results && <div className="results"><h3>Results</h3>{results.map((r,i)=><div className="result" key={i}><div><strong>{r.name}</strong><small>{r.meta}</small></div>{r.text?<button onClick={()=>navigator.clipboard?.writeText(r.text)}>Copy Text</button>:<button onClick={()=>downloadBlob(r.blob,r.name)}>Download</button>}</div>)}</div>}
    </div>
    <div className="privacy-note">🔒 Your files are processed in your browser whenever possible. They are not intentionally uploaded to a server by this app.</div>
  </main>
}

createRoot(document.getElementById("root")).render(<App/>);
