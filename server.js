const http=require('http');const fs=require('fs');const path=require('path');const crypto=require('crypto');const {URL}=require('url');
const ROOT=__dirname,PORT=process.env.PORT||3000,DATA=path.join(ROOT,'site-data.json'),UPLOADS=path.join(ROOT,'uploads'),VERSIONS=path.join(ROOT,'versions');
fs.mkdirSync(UPLOADS,{recursive:true});
fs.mkdirSync(VERSIONS,{recursive:true});
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'change-me-now',SECRET=process.env.SESSION_SECRET||'demo-secret-change-me';
function send(res,code,body,type='text/plain; charset=utf-8',headers={}){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store',...headers});res.end(body)}
function j(res,code,obj,headers={}){send(res,code,JSON.stringify(obj),'application/json; charset=utf-8',headers)}
function read(){return JSON.parse(fs.readFileSync(DATA,'utf8'))}
function save(d){
  fs.mkdirSync(VERSIONS,{recursive:true});
  if(fs.existsSync(DATA)){
    const s=new Date().toISOString().replace(/[:.]/g,'-');
    fs.copyFileSync(DATA,path.join(VERSIONS,s+'.json'));
  }
  const tmp=DATA+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(d,null,2),'utf8');
  fs.renameSync(tmp,DATA);
}
function body(req,limit=15000000){return new Promise((ok,bad)=>{let s='';req.on('data',c=>{s+=c;if(s.length>limit){bad(new Error('too_large'));req.destroy()}});req.on('end',()=>ok(s));req.on('error',bad)})}
function sig(v){return crypto.createHmac('sha256',SECRET).update(v).digest('hex')}function token(){const p=Buffer.from(JSON.stringify({exp:Date.now()+28800000})).toString('base64url');return p+'.'+sig(p)}
function auth(req){const m=(req.headers.cookie||'').match(/admin_session=([^;]+)/);if(!m)return false;const [p,s]=m[1].split('.');if(!p||!s||sig(p)!==s)return false;try{return JSON.parse(Buffer.from(p,'base64url').toString()).exp>Date.now()}catch{return false}}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
function serve(res,f){if(!fs.existsSync(f)||!fs.statSync(f).isFile())return send(res,404,'Not found');res.writeHead(200,{'Content-Type':mime[path.extname(f).toLowerCase()]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}
function autoSeo(a){const clean=s=>(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return{title:a.seo?.title||a.title.slice(0,65),description:a.seo?.description||clean(a.excerpt||a.body).slice(0,160),slug:a.seo?.slug||a.id,canonical:a.seo?.canonical||'',ogImage:a.seo?.ogImage||a.image||'',schemaType:a.seo?.schemaType||'Article'}}
function cleanJsonText(s){
  s=String(s||'').trim();
  if(s.startsWith('```')) s=s.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  if(a>=0&&b>a)s=s.slice(a,b+1);
  return s;
}
function sanitizeAiHtml(s){
  s=String(s||'');
  s=s.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  s=s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi,'');
  s=s.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,' $1="#"');
  const allowed=new Set(['p','h2','h3','strong','em','ul','ol','li','a','blockquote','table','thead','tbody','tr','th','td','br']);
  return s.replace(/<\/?([a-z0-9]+)([^>]*)>/gi,(m,t,attrs)=>{
    t=t.toLowerCase(); if(!allowed.has(t)) return '';
    if(m.startsWith('</')) return `</${t}>`;
    if(t==='a'){
      const hm=attrs.match(/href\s*=\s*(['"])(.*?)\1/i);
      const href=hm?hm[2]:'#';
      const safe=(href.startsWith('/')||href.startsWith('https://www.saeedintex.com'))?href:'#';
      return `<a href="${safe}">`;
    }
    return `<${t}>`;
  });
}
function aiPrompt(action,article,site,topic=''){
  const links=(site.articles||[]).filter(a=>a.status==='published'&&a.id!==article?.id).slice(0,30).map(a=>({title:a.title,url:`/article.html?id=${encodeURIComponent(a.id)}`}));
  const rules=`تو دستیار محتوای فارسی سایت saeedintex.ir هستی.
نقش saeedintex.ir مرجع آموزشی، مقایسه، عیب‌یابی و پرسش‌وپاسخ است؛ فروشگاه و صفحات قیمت/موجودی در saeedintex.com هستند.
محتوا نباید سایت .ir را فروشگاه دوم کند. از تبلیغات اغراق‌آمیز، ادعای «بهترین»، اطلاعات ساختگی، مشخصات محصولی که در ورودی نیست و وعده‌های بدون منبع خودداری کن.
متن باید طبیعی، کاربردی، فارسی روان و مناسب سئو باشد.
در HTML فقط از p,h2,h3,strong,em,ul,ol,li,a,blockquote,table,thead,tbody,tr,th,td,br استفاده کن.
عبارت‌های واقعاً مهم را با strong بولد کن، نه بیش از حد.
برای لینک داخلی فقط از فهرست URLهای مجاز زیر استفاده کن. در صورت ارتباط، حداکثر یک لینک طبیعی به فروشگاه اصلی ${site.settings.shopUrl} بگذار.
فهرست لینک داخلی مجاز:
${JSON.stringify(links)}
فقط JSON معتبر برگردان؛ بدون Markdown و بدون توضیح اضافه.`;
  const payload={action,topic,article:{title:article?.title||'',excerpt:article?.excerpt||'',body:article?.body||'',category:article?.category||''}};
  if(action==='excerpt') return {instructions:rules,input:`از این مقاله یک چکیده 1 تا 2 جمله‌ای و حدود 120 تا 220 نویسه بنویس. خروجی: {"excerpt":"..."}\n${JSON.stringify(payload)}`};
  if(action==='write_body') return {instructions:rules,input:`براساس عنوان و چکیده، متن اصلی مقاله را از ابتدا بنویس. خروجی فقط بدنه مقاله به HTML باشد؛ H2/H3 منطقی، پاراگراف‌های کوتاه، بولد محدود و لینک داخلی مرتبط داشته باشد. اطلاعات تأییدنشده اضافه نکن. خروجی: {"body":"HTML..."}\n${JSON.stringify(payload)}`};
  if(action==='continue_body') return {instructions:rules,input:`متن فعلی مقاله را ادامه بده، بدون تکرار بخش‌های موجود. ادامه باید با ساختار و لحن متن فعلی هماهنگ باشد و فقط HTML ادامه متن برگردد. اطلاعات تأییدنشده اضافه نکن. خروجی: {"body":"HTML..."}\n${JSON.stringify(payload)}`};
  if(action==='article') return {instructions:rules,input:`متن موجود را از نظر ساختار، خوانایی، H2/H3، بولد هوشمند و لینک داخلی بازنویسی و بهینه کن. اطلاعات جدیدِ تأییدنشده اضافه نکن. خروجی: {"body":"HTML...","excerpt":"..."}\n${JSON.stringify(payload)}`};
  if(action==='generate') return {instructions:rules,input:`برای موضوع داده‌شده یک مقاله آموزشی کامل بنویس. ساختار منطقی H2/H3، پاراگراف‌های کوتاه، بولد محدود و لینک داخلی مرتبط داشته باشد. پایان مقاله فروش مستقیم نکند؛ فقط در صورت تناسب یک لینک طبیعی به فروشگاه اصلی مجاز است. خروجی: {"title":"...","excerpt":"...","body":"HTML...","category":"..."}\n${JSON.stringify(payload)}`};
  if(action==='seo') return {instructions:rules,input:`برای مقاله SEO Title حداکثر حدود 60 نویسه، Meta Description حدود 120 تا 160 نویسه و slug کوتاه و خوانا پیشنهاد بده. خروجی: {"title":"...","description":"...","slug":"..."}\n${JSON.stringify(payload)}`};
  return {instructions:rules,input:`خروجی JSON مناسب تولید کن.\n${JSON.stringify(payload)}`};
}
async function callOpenAI(action,article,site,topic){
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw new Error('OPENAI_API_KEY در Render تنظیم نشده است');
  const model=process.env.OPENAI_MODEL||'gpt-5.6-luna';
  const p=aiPrompt(action,article,site,topic);
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),90000);
  let r;
  try{
    r=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions:p.instructions,input:p.input,max_output_tokens:5000}),
      signal:ctrl.signal
    });
  } finally {clearTimeout(timer)}
  const out=await r.json();
  if(!r.ok) throw new Error(out?.error?.message||`OpenAI API error ${r.status}`);
  let txt=out.output_text||'';
  if(!txt && Array.isArray(out.output)){
    for(const item of out.output){
      for(const c of (item.content||[])){
        if(c.type==='output_text'&&c.text){txt+=c.text}
      }
    }
  }
  if(!txt) throw new Error('پاسخی از مدل دریافت نشد');
  let parsed; try{parsed=JSON.parse(cleanJsonText(txt))}catch{throw new Error('پاسخ هوش مصنوعی قابل پردازش نبود')}
  if(parsed.body) parsed.body=sanitizeAiHtml(parsed.body);
  return {model,...parsed};
}
http.createServer(async(req,res)=>{const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);try{
 if(u.pathname==='/api/site'&&req.method==='GET')return j(res,200,read());
 if(u.pathname==='/api/login'&&req.method==='POST'){const x=JSON.parse(await body(req)||'{}');if(x.password!==ADMIN_PASSWORD)return j(res,401,{error:'رمز نادرست است'});return j(res,200,{ok:true},{'Set-Cookie':`admin_session=${token()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`})}
 if(u.pathname==='/api/admin/site'&&req.method==='GET'){if(!auth(req))return j(res,401,{error:'unauthorized'});return j(res,200,read())}
 if(u.pathname==='/api/admin/site'&&req.method==='PUT'){
   if(!auth(req))return j(res,401,{error:'unauthorized'});
   try{
     const x=JSON.parse(await body(req));
     save(x);
     return j(res,200,{ok:true});
   }catch(e){
     console.error('Save error:',e);
     return j(res,500,{error:'خطا در ذخیره‌سازی: '+(e.message||'نامشخص')});
   }
 }
 if(u.pathname==='/api/admin/upload'&&req.method==='POST'){if(!auth(req))return j(res,401,{error:'unauthorized'});const x=JSON.parse(await body(req));const m=(x.dataUrl||'').match(/^data:image\/(webp|png|jpeg);base64,(.+)$/);if(!m)return j(res,400,{error:'فرمت تصویر نامعتبر است'});const ext=m[1]==='jpeg'?'jpg':m[1],name=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;fs.writeFileSync(path.join(UPLOADS,name),Buffer.from(m[2],'base64'));return j(res,200,{url:'/uploads/'+name})}
 if(u.pathname==='/api/questions'&&req.method==='POST'){const x=JSON.parse(await body(req)||'{}');if(!x.title||!x.body)return j(res,400,{error:'عنوان و متن سؤال لازم است'});const d=read();d.questions.unshift({id:'q'+Date.now(),title:x.title.slice(0,180),body:x.body.slice(0,4000),author:(x.author||'کاربر مهمان').slice(0,80),status:'pending',createdAt:new Date().toISOString().slice(0,10),answers:[]});save(d);return j(res,200,{ok:true,message:'سؤال برای بررسی ارسال شد'})}
 if(/^\/api\/questions\/[^/]+\/answers$/.test(u.pathname)&&req.method==='POST'){const id=u.pathname.split('/')[3],x=JSON.parse(await body(req)||'{}'),d=read(),q=d.questions.find(v=>v.id===id);if(!q)return j(res,404,{error:'سؤال پیدا نشد'});q.answers.push({id:'a'+Date.now(),body:(x.body||'').slice(0,5000),author:(x.author||'کاربر مهمان').slice(0,80),official:false,status:'pending',helpful:0,createdAt:new Date().toISOString().slice(0,10)});save(d);return j(res,200,{ok:true,message:'پاسخ برای بررسی ارسال شد'})}
 if(u.pathname==='/api/seo/preview'&&req.method==='POST'){const x=JSON.parse(await body(req)||'{}');return j(res,200,autoSeo(x))}
 if(u.pathname==='/api/ai'&&req.method==='POST'){if(!auth(req))return j(res,401,{error:'unauthorized'});const x=JSON.parse(await body(req)||'{}'),d=read();if(!['excerpt','write_body','continue_body','article','generate','seo'].includes(x.action))return j(res,400,{error:'عملیات AI نامعتبر است'});try{const out=await callOpenAI(x.action,x.article||{},d,x.topic||'');return j(res,200,{ok:true,...out})}catch(e){console.error('AI error:',e);return j(res,502,{error:e.message||'خطا در سرویس هوش مصنوعی'})}}
 if(u.pathname==='/api/export'&&req.method==='GET'){if(!auth(req))return j(res,401,{error:'unauthorized'});return send(res,200,JSON.stringify(read(),null,2),'application/json; charset=utf-8',{'Content-Disposition':'attachment; filename=saeedintex-export.json'})}
 if(u.pathname.startsWith('/uploads/'))return serve(res,path.join(UPLOADS,path.basename(u.pathname)));
 const rel=u.pathname==='/'?'index.html':u.pathname.replace(/^\/+/,''),f=path.join(ROOT,rel);if(f.startsWith(ROOT)&&fs.existsSync(f))return serve(res,f);return serve(res,path.join(ROOT,'404.html'));
 }catch(e){console.error(e);return j(res,500,{error:'server_error'})}}).listen(PORT,'0.0.0.0',()=>console.log('SaeedIntex CMS on '+PORT));
