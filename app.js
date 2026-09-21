async function api(url,opt={}){const r=await fetch(url,opt),t=await r.text();let j={};try{j=JSON.parse(t)}catch{j={error:t}}if(!r.ok)throw new Error(j.error||'خطا');return j}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function nav(active=''){return `<div class="topbar"><div class="wrap">مرجع آموزشی محصولات بادی • قیمت و خرید در saeedintex.com</div></div><header class="header"><div class="wrap header-row"><a class="logo" href="/"><b>سعید</b> اینتکس</a><nav class="nav"><a class="${active==='home'?'active':''}" href="/">خانه</a><a class="${active==='articles'?'active':''}" href="/articles.html">مقالات</a><a class="${active==='qa'?'active':''}" href="/questions.html">پرسش و پاسخ</a><a class="${active==='about'?'active':''}" href="/about.html">درباره سایت</a><a class="shop-btn" id="shopNav" target="_blank">فروشگاه اصلی</a></nav></div></header>`}
function footer(){return `<footer class="footer"><div class="wrap"><div class="footer-grid"><div><h3>سعید اینتکس</h3><p>مرجع آموزش، مقایسه، عیب‌یابی و تجربه واقعی محصولات بادی.</p></div><div><h3>دسترسی سریع</h3><p><a href="/articles.html">مقالات</a></p><p><a href="/questions.html">پرسش و پاسخ</a></p></div><div><h3>مدیریت</h3><p><a href="/admin.html">ورود مدیر</a></p></div></div><small>نسخه آزمایشی سایت مرجع سعید اینتکس</small></div></footer>`}
function articleCard(a){return `<article class="card"><img src="${esc(a.image||'')}" alt="${esc(a.title)}"><div class="card-body"><span class="tag">${esc(a.category||'مقاله')}</span><h3>${esc(a.title)}</h3><p>${esc(a.excerpt||'')}</p><a class="read" href="/article.html?id=${encodeURIComponent(a.id)}">مطالعه مقاله ←</a></div></article>`}
function qCard(q){const ans=(q.answers||[]).filter(a=>a.status==='approved').slice(0,2).map(a=>`<div class="answer ${a.official?'official':''}"><b>${esc(a.author)}</b>${a.official?' <span class="pill">پاسخ رسمی</span>':''}<p>${esc(a.body)}</p></div>`).join('');return `<div class="qa" id="${q.id}"><h3>${esc(q.title)}</h3><p>${esc(q.body)}</p>${ans}<a class="read" href="/questions.html#${q.id}">مشاهده و پاسخ ←</a></div>`}
function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function decodeImage(file){
  try{return await createImageBitmap(file)}
  catch(e){
    return await new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('این فرمت تصویر در مرورگر قابل پردازش نیست'))};
      img.src=url;
    })
  }
}
async function imageToWebp(file,opts={}){
  const img=await decodeImage(file);
  const sw=img.width||img.naturalWidth,sh=img.height||img.naturalHeight;
  const maxW=opts.maxW||1600,maxH=opts.maxH||1000,quality=opts.quality||.82,mode=opts.mode||'contain';
  let cw,ch,sx=0,sy=0,srcW=sw,srcH=sh;
  if(mode==='cover'){
    cw=maxW;ch=maxH;
    const srcRatio=sw/sh,dstRatio=cw/ch;
    if(srcRatio>dstRatio){srcW=Math.round(sh*dstRatio);sx=Math.round((sw-srcW)/2)}
    else{srcH=Math.round(sw/dstRatio);sy=Math.round((sh-srcH)/2)}
  }else{
    const ratio=Math.min(maxW/sw,maxH/sh,1);
    cw=Math.max(1,Math.round(sw*ratio));ch=Math.max(1,Math.round(sh*ratio));
  }
  const c=document.createElement('canvas');c.width=cw;c.height=ch;
  const ctx=c.getContext('2d',{alpha:true});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(mode==='cover')ctx.drawImage(img,sx,sy,srcW,srcH,0,0,cw,ch);
  else ctx.drawImage(img,0,0,cw,ch);
  const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('تبدیل تصویر انجام نشد')),'image/webp',quality));
  return {dataUrl:await blobToDataURL(blob),beforeBytes:file.size,afterBytes:blob.size,width:cw,height:ch,originalWidth:sw,originalHeight:sh};
}
async function uploadImage(file,role='article'){
  const presets={
    hero:{maxW:1800,maxH:850,quality:.82,mode:'cover'},
    article:{maxW:1400,maxH:1050,quality:.82,mode:'contain'},
    thumb:{maxW:800,maxH:540,quality:.80,mode:'cover'},
    logo:{maxW:700,maxH:300,quality:.90,mode:'contain'}
  };
  const optimized=await imageToWebp(file,presets[role]||presets.article);
  const uploaded=await api('/api/admin/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,dataUrl:optimized.dataUrl})});
  return {...uploaded,...optimized};
}
