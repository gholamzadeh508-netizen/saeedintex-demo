function deepClone(v){return JSON.parse(JSON.stringify(v))}
function loadData(){
  try{
    const raw=localStorage.getItem('saeedintex_demo_data');
    return raw ? JSON.parse(raw) : deepClone(window.DEFAULT_DATA);
  }catch(e){return deepClone(window.DEFAULT_DATA)}
}
function saveData(d){localStorage.setItem('saeedintex_demo_data',JSON.stringify(d))}
function resetData(){localStorage.removeItem('saeedintex_demo_data')}
function nav(active=''){
  return `<div class="topbar"><div class="wrap">مرجع آموزشی محصولات بادی • تجربه واقعی و راهنمای کاربردی</div></div>
  <header class="header"><div class="wrap header-row">
    <a class="logo" href="/"><b>سعید</b> اینتکس</a>
    <nav class="nav">
      <a class="${active==='home'?'active':''}" href="/">خانه</a>
      <a class="${active==='guide'?'active':''}" href="/guide.html">راهنمای خرید</a>
      <a class="${active==='articles'?'active':''}" href="/articles.html">مقالات و آموزش</a>
      <a class="${active==='customers'?'active':''}" href="/customers.html">تجربه مشتریان</a>
      <a class="${active==='about'?'active':''}" href="/about.html">درباره سایت</a>
      <a class="cta" id="shopNav" target="_blank">مشاهده فروشگاه</a>
    </nav>
  </div></header>`;
}
function footer(){
  return `<footer class="footer"><div class="wrap"><div class="footer-grid">
    <div><h3>سعید اینتکس</h3><p>مرجع آموزشی برای انتخاب، استفاده و نگهداری بهتر محصولات بادی.</p></div>
    <div><h3>راهنما</h3><p><a href="/guide.html">راهنمای خرید</a></p><p><a href="/articles.html">مقالات</a></p></div>
    <div><h3>مدیریت</h3><p><a href="/admin.html">پنل مدیریت دمو</a></p></div>
  </div><small>نسخه آزمایشی سایت مرجع سعید اینتکس</small></div></footer>`;
}
function articleCard(a){
  return `<article class="card"><img src="${a.image}" alt="${a.title}"><div class="card-body"><span class="tag">${a.category}</span><h3>${a.title}</h3><p>${a.excerpt}</p><a class="read" href="/article.html?id=${encodeURIComponent(a.id)}">مطالعه مقاله ←</a></div></article>`;
}
