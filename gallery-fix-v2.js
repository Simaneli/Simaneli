(function(){
  "use strict";

  const SUPABASE_URL="https://euuqxtpumhecvbsainms.supabase.co";
  const SUPABASE_KEY="sb_publishable_ilqXAt3lZkQ3wOHXr2LKGA_4sRHer9u";

  function applyCompactStyles(){
    if(document.getElementById("simaneli-compact-cards")) return;
    const style=document.createElement("style");
    style.id="simaneli-compact-cards";
    style.textContent=`
      .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:10px 12px 100px}
      .card{border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.07)}
      .card img{display:block;width:100%;height:220px;object-fit:contain;background:#f7f5f1}
      .card-body{padding:8px}
      .card .name{margin:4px 0;line-height:1.2}
      .card .meta{line-height:1.3}
      .card .price{font-size:18px;margin-top:5px}
      .sim-price-main{font-weight:800;line-height:1.15}
      .sim-price-alt{font-size:12px;font-weight:600;color:#777;line-height:1.25;margin-top:2px}
      #productModal .detail-img{display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;background:#f7f5f1}
      @media(max-width:650px){
        .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:6px 6px 90px}
        .card img{height:170px}
        .card-body{padding:6px}
        .card .price{font-size:16px}
        #productModal .detail-img{height:auto !important;max-height:60vh !important;object-fit:contain !important}
      }
    `;
    document.body.append(style);
  }

  function parseImages(v){
    if(!v) return [];
    if(Array.isArray(v)) return v.filter(Boolean).slice(0,10);
    const s=String(v).trim();
    if(!s) return [];
    if(s.startsWith("[")){
      try{
        const a=JSON.parse(s);
        if(Array.isArray(a)) return a.filter(Boolean).slice(0,10);
      }catch(e){}
    }
    return [s];
  }

  function firstImage(v){
    return parseImages(v)[0] || "";
  }

  const FALLBACK_FX={USD_AMD:382,USD_CNY:7.12};
  let fx={...FALLBACK_FX};

  function n(v){
    const x=Number(v);
    return Number.isFinite(x)?x:0;
  }

  async function loadFxRates(){
    try{
      const r=await fetch("https://open.er-api.com/v6/latest/USD",{cache:"no-store"});
      if(!r.ok) return;
      const d=await r.json();
      if(d && d.rates){
        if(n(d.rates.AMD)>0) fx.USD_AMD=n(d.rates.AMD);
        if(n(d.rates.CNY)>0) fx.USD_CNY=n(d.rates.CNY);
      }
    }catch(e){
      console.warn("Simaneli FX fallback rates are being used.",e);
    }
  }

  function convertToAll(price,currency){
    const p=n(price);
    const cur=String(currency||"AMD").toUpperCase();
    let usd=0;
    if(cur==="USD") usd=p;
    else if(cur==="CNY") usd=p/fx.USD_CNY;
    else usd=p/fx.USD_AMD;
    return {AMD:usd*fx.USD_AMD,CNY:usd*fx.USD_CNY,USD:usd};
  }

  function fmtCurrency(v,cur){
    const value=n(v);
    if(cur==="AMD") return "֏ "+new Intl.NumberFormat("hy-AM",{maximumFractionDigits:0}).format(Math.round(value));
    if(cur==="CNY") return "¥ "+new Intl.NumberFormat("zh-CN",{maximumFractionDigits:0}).format(Math.round(value));
    return "$ "+new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(value));
  }

  async function applyThreeCurrencyPrices(){
    try{
      const res=await fetch(
        SUPABASE_URL+"/rest/v1/products?select=sku,sale_price,currency,active&active=eq.true",
        {headers:{apikey:SUPABASE_KEY}}
      );
      if(!res.ok) return;
      const products=await res.json();
      for(const p of products){
        if(!p.sku) continue;
        const card=findCardForSku(String(p.sku));
        if(!card) continue;
        const priceEl=card.querySelector(".price");
        if(!priceEl) continue;
        const all=convertToAll(p.sale_price,p.currency);
        priceEl.innerHTML=
          '<div class="sim-price-main">'+fmtCurrency(all.AMD,"AMD")+'</div>'+
          '<div class="sim-price-alt">'+fmtCurrency(all.CNY,"CNY")+' &nbsp;·&nbsp; '+fmtCurrency(all.USD,"USD")+'</div>';
      }
    }catch(e){
      console.error("Simaneli FX price display:",e);
    }
  }

  function findCardForSku(sku){
    const all=[...document.querySelectorAll("body *")];
    const exact=all.filter(el=>{
      const t=(el.textContent||"").trim();
      return t===sku;
    });

    for(const el of exact){
      let p=el;
      for(let i=0;i<6 && p;i++,p=p.parentElement){
        if(p.querySelector && p.querySelector("img")) return p;
      }
    }

    const candidates=[...document.querySelectorAll(".card,[class*='card'],article,li")];
    return candidates.find(el=>(el.textContent||"").includes(sku)) || null;
  }

  async function fixHomeCardImages(){
    try{
      const res=await fetch(
        SUPABASE_URL+"/rest/v1/products?select=sku,image_url&active=eq.true",
        {headers:{apikey:SUPABASE_KEY}}
      );
      if(!res.ok) return;
      const products=await res.json();

      for(const p of products){
        const cover=firstImage(p.image_url);
        if(!cover || !p.sku) continue;

        const card=findCardForSku(String(p.sku));
        if(!card) continue;

        let img=card.querySelector("img");
        if(!img){
          const holder=[...card.children].find(x=>x && x.nodeType===1);
          if(holder){
            img=document.createElement("img");
            img.style.cssText="width:100%;object-fit:contain;display:block;";
            holder.prepend(img);
          }
        }
        if(img && img.src!==cover){
          img.src=cover;
          img.removeAttribute("srcset");
        }
      }
    }catch(e){
      console.error("Simaneli cover fix:",e);
    }
  }

  function openGallery(images,startIndex){
    if(!images || !images.length) return;
    let index=Math.max(0,Math.min(startIndex||0,images.length-1));

    const old=document.getElementById("simaneliGalleryOverlay");
    if(old) old.remove();

    const overlay=document.createElement("div");
    overlay.id="simaneliGalleryOverlay";
    overlay.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:18px;";

    const close=document.createElement("button");
    close.type="button";
    close.textContent="×";
    close.style.cssText="position:absolute;right:18px;top:18px;width:44px;height:44px;border:0;border-radius:50%;font-size:32px;background:#fff;color:#111;z-index:3;";

    const img=document.createElement("img");
    img.style.cssText="max-width:100%;max-height:78vh;object-fit:contain;border-radius:12px;";

    const counter=document.createElement("div");
    counter.style.cssText="position:absolute;bottom:22px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.14);color:#fff;padding:7px 12px;border-radius:999px;font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;";

    const prev=document.createElement("button");
    prev.type="button"; prev.textContent="‹";
    prev.style.cssText="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:46px;height:58px;border:0;border-radius:12px;font-size:42px;background:rgba(255,255,255,.15);color:#fff;";

    const next=document.createElement("button");
    next.type="button"; next.textContent="›";
    next.style.cssText="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:46px;height:58px;border:0;border-radius:12px;font-size:42px;background:rgba(255,255,255,.15);color:#fff;";

    function render(){
      img.src=images[index];
      counter.textContent=(index+1)+" / "+images.length;
      const show=images.length>1?"block":"none";
      prev.style.display=show;
      next.style.display=show;
    }

    close.onclick=()=>overlay.remove();
    prev.onclick=(e)=>{e.stopPropagation();index=(index-1+images.length)%images.length;render();};
    next.onclick=(e)=>{e.stopPropagation();index=(index+1)%images.length;render();};
    overlay.onclick=(e)=>{if(e.target===overlay) overlay.remove();};

    overlay.append(close,img,prev,next,counter);
    document.body.appendChild(overlay);
    render();
  }

  async function attachDetailGallery(){
    try{
      const res=await fetch(
        SUPABASE_URL+"/rest/v1/products?select=sku,image_url&active=eq.true",
        {headers:{apikey:SUPABASE_KEY}}
      );
      if(!res.ok) return;
      const products=await res.json();

      for(const p of products){
        const images=parseImages(p.image_url);
        if(images.length<2 || !p.sku) continue;

        const card=findCardForSku(String(p.sku));
        if(!card) continue;

        const img=card.querySelector("img");
        if(!img || img.dataset.simaneliGalleryReady==="1") continue;

        img.dataset.simaneliGalleryReady="1";
        img.style.cursor="pointer";
        img.addEventListener("click",function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          openGallery(images,0);
        });
      }
    }catch(e){}
  }

  async function runFixes(){
    applyCompactStyles();
    await loadFxRates();
    await fixHomeCardImages();
    await attachDetailGallery();
    await applyThreeCurrencyPrices();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>setTimeout(runFixes,700),{once:true});
  }else{
    setTimeout(runFixes,700);
  }

  setTimeout(runFixes,2500);
  setTimeout(runFixes,5000);
})();
