(function ModeAtlasQol(){
  if (window.__modeAtlasQolLoaded) return;
  window.__modeAtlasQolLoaded = true;

  const APP_VERSION = '2.8.2';
  const THEME_KEY = 'modeAtlasThemePreference';
  const LAST_PAGE_KEY = 'modeAtlasLastKanaPage';
  const DEV_PIN = '3522';
  const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function safeJSON(key, fallback){ try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; } }
  function writeJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} }
  function fmtDate(ts){ const n=Number(ts||0); if(!Number.isFinite(n)||!n) return 'never'; try{return new Date(n).toLocaleString([], { hour:'numeric', minute:'2-digit', day:'numeric', month:'numeric', year:'2-digit' });}catch{return 'never';} }
  function countKeys(obj){ return obj && typeof obj==='object' ? Object.keys(obj).length : 0; }
  function arr(key){ const v=safeJSON(key, []); return Array.isArray(v)?v:[]; }
  function obj(key){ const v=safeJSON(key, {}); return v && typeof v==='object' && !Array.isArray(v)?v:{}; }
  function num(key){ const n=Number(localStorage.getItem(key)||0); return Number.isFinite(n)?n:0; }

  function ensureToastWrap(){ let wrap=$('.ma-toast-wrap'); if(!wrap){ wrap=document.createElement('div'); wrap.className='ma-toast-wrap'; document.body.appendChild(wrap); } return wrap; }
  function toast(message, type='ok', ms=3200){
    const wrap=ensureToastWrap(); const node=document.createElement('div'); node.className='ma-toast '+type; node.textContent=message; wrap.appendChild(node);
    setTimeout(()=>{ node.style.opacity='0'; node.style.transform='translateY(8px)'; setTimeout(()=>node.remove(),220); }, ms);
  }
  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.toast = toast;

  function systemPrefersLight(){ return matchMedia && matchMedia('(prefers-color-scheme: light)').matches; }
  function getThemePref(){ return localStorage.getItem(THEME_KEY) || 'dark'; }
  function effectiveTheme(pref=getThemePref()){ return pref === 'system' ? (systemPrefersLight() ? 'light':'dark') : pref; }
  function applyTheme(){
    const pref=getThemePref(); document.documentElement.dataset.maTheme = effectiveTheme(pref); document.documentElement.dataset.maThemePreference = pref;
    try{ const meta=$('meta[name="theme-color"]'); if(meta) meta.content = effectiveTheme(pref)==='light' ? '#f8fafc' : '#121a2b'; }catch{}
    updateThemeButtons();
  }
  function setTheme(pref){ localStorage.setItem(THEME_KEY, pref); applyTheme(); toast((pref==='system'?'System':pref[0].toUpperCase()+pref.slice(1))+' appearance applied.'); }
  window.ModeAtlas.setTheme = setTheme;
  applyTheme();
  try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); }catch{}

  function buttonClassFor(actions){ return actions?.classList?.contains('profile-actions') ? 'profile-action' : 'drawer-action'; }
  function makeThemePanel(cls){
    const panel=document.createElement('div'); panel.className='ma-qol-panel ma-theme-panel';
    panel.innerHTML = '<div class="ma-qol-title">Appearance</div><div class="ma-qol-grid three"><button class="'+cls+' ma-qol-theme-btn" type="button" data-ma-theme-choice="dark">Dark</button><button class="'+cls+' ma-qol-theme-btn" type="button" data-ma-theme-choice="light">Light</button><button class="'+cls+' ma-qol-theme-btn" type="button" data-ma-theme-choice="system">System</button></div><div class="ma-qol-note">Reading keeps its green identity, Writing keeps its blue identity, and the app shell adapts around them.</div>';
    return panel;
  }
  function makeToolsPanel(cls){
    const panel=document.createElement('div'); panel.className='ma-qol-panel ma-tools-panel';
    panel.innerHTML = '<div class="ma-qol-title">App</div><div class="ma-qol-grid"><button class="'+cls+'" type="button" data-ma-about-open>About Mode Atlas</button><button class="'+cls+'" type="button" data-ma-repair-data>Repair save data</button></div><div class="ma-qol-note">About includes app version, save schema, sync status, legal notes, credits, and What’s New.</div>';
    return panel;
  }
  function updateThemeButtons(){
    const pref=getThemePref(); $all('[data-ma-theme-choice]').forEach(btn=>{ const on=btn.dataset.maThemeChoice===pref; btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', on?'true':'false'); });
  }

  function syncProfileAuthButtons(){
    let user = null;
    try { user = window.KanaCloudSync?.getUser?.() || null; } catch {}
    const signedIn = !!user;
    const signInSelectors = '#profileSignInBtn,#studyProfileSignIn,#identitySignInBtn,[data-ma-sign-in]';
    const signOutSelectors = '#profileSignOutBtn,#studyProfileSignOut,#identitySignOutBtn,[data-ma-sign-out]';
    $all(signInSelectors).forEach(btn=>{
      btn.hidden = signedIn;
      btn.style.display = signedIn ? 'none' : 'inline-flex';
      btn.setAttribute('aria-hidden', signedIn ? 'true' : 'false');
    });
    $all(signOutSelectors).forEach(btn=>{
      btn.hidden = !signedIn;
      btn.style.display = signedIn ? 'inline-flex' : 'none';
      btn.setAttribute('aria-hidden', signedIn ? 'false' : 'true');
    });
  }
  function enhanceProfileMenus(){
    $all('.profile-drawer,#profileDrawer,.profile-overlay aside,.drawer-panel').forEach(drawer=>{
      if (drawer.dataset.maQolEnhanced) { updateThemeButtons(); return; }
      const actions=$('.profile-actions,.drawer-actions', drawer) || drawer;
      const cls=buttonClassFor(actions);
      const save=$('.ma-save-section', drawer);
      if(save) save.insertAdjacentElement('afterend', makeThemePanel(cls)); else actions.insertAdjacentElement('afterend', makeThemePanel(cls));
      const anchor=$('.ma-theme-panel', drawer);
      anchor.insertAdjacentElement('afterend', makeToolsPanel(cls));
      drawer.dataset.maQolEnhanced='true';
    });
    updateThemeButtons();
    dedupeProfileMenu();
    syncProfileAuthButtons();
  }

  function dedupeProfileMenu(){
    $all('.profile-drawer,#profileDrawer,.profile-overlay aside,.drawer-panel').forEach(drawer=>{
      const saveSections=$all('.ma-save-section', drawer); saveSections.slice(1).forEach(x=>x.remove());
      const resetBtns=$all('[data-ma-unified-reset], [data-ma-force-reset], [data-ma-save-reset], button', drawer).filter(btn=>/reset data/i.test(btn.textContent||''));
      resetBtns.slice(1).forEach(x=>x.remove());
      const pills=$all('.ma-sync-pill,#maSyncPill', drawer); pills.slice(1).forEach(x=>x.remove());

      const aboutBtns=$all('[data-ma-about-open]', drawer);
      if (aboutBtns.length > 1){
        const preferred = aboutBtns.find(btn=>btn.closest('.ma-tools-panel')) || aboutBtns[0];
        aboutBtns.forEach(btn=>{ if(btn !== preferred) btn.remove(); });
      }
    });
  }

  document.addEventListener('click', (e)=>{
    const themeBtn=e.target.closest('[data-ma-theme-choice]');
    if(themeBtn){ e.preventDefault(); setTheme(themeBtn.dataset.maThemeChoice); return; }
    if(e.target.closest('[data-ma-whats-new]')){ e.preventDefault(); (window.ModeAtlas?.showWhatsNew||showWhatsNew)?.(); return; }
    if(e.target.closest('[data-ma-repair-data]')){ e.preventDefault(); const r=repairSaveData(); toast('Repair complete · '+r.summary, 'ok', 4200); return; }
  }, true);

  function kanaStats(){
    const readingStats=obj('charStats'), readingTimes=obj('charTimes'), writingStats=obj('reverseCharStats'), writingTimes=obj('reverseCharTimes');
    const readingTests=arr('testModeResults').concat(arr('readingTestModeResults')).concat(arr('kanaTrainerReadingTestModeResults'));
    const writingTests=arr('writingTestModeResults').concat(arr('kanaTrainerWritingTestModeResults'));
    const readingDaily=obj('dailyChallengeHistory'), writingDaily=obj('reverseDailyChallengeHistory');
    function accuracy(stats){ let c=0,w=0; Object.values(stats||{}).forEach(s=>{ if(s&&typeof s==='object'){ c+=Number(s.correct||s.right||0); w+=Number(s.wrong||s.incorrect||0); }}); const t=c+w; return t?Math.round((c/t)*100):0; }
    function totalAnswers(stats){ let t=0; Object.values(stats||{}).forEach(s=>{ if(s&&typeof s==='object') t+=Number(s.correct||s.right||0)+Number(s.wrong||s.incorrect||0); }); return t; }
    function difficult(stats){ let worst=null,best=null; Object.entries(stats||{}).forEach(([k,s])=>{ if(!s||typeof s!=='object')return; const c=Number(s.correct||s.right||0), w=Number(s.wrong||s.incorrect||0), t=c+w; if(!t)return; const score=(c/t)-(w*0.04); const row={kana:k,score,t,c,w}; if(!worst || score<worst.score) worst=row; if(!best || score>best.score) best=row; }); return {worst:worst?.kana||'—', best:best?.kana||'—'}; }
    function dailyDone(hist){ const today=new Date().toISOString().slice(0,10); if(Array.isArray(hist)) return hist.some(x=>String(x?.date||x?.day||'').slice(0,10)===today); return !!hist[today]; }
    function streak(hist){
      const set=new Set();
      if(Array.isArray(hist)) hist.forEach(x=>{ const d=String(x?.date||x?.day||'').slice(0,10); if(d) set.add(d); }); else Object.keys(hist||{}).forEach(k=>set.add(String(k).slice(0,10)));
      let s=0; const d=new Date(); for(;;){ const key=d.toISOString().slice(0,10); if(set.has(key)){s++; d.setDate(d.getDate()-1);} else break; } return s;
    }
    const rd=difficult(readingStats), wd=difficult(writingStats);
    return {
      readingAccuracy:accuracy(readingStats), writingAccuracy:accuracy(writingStats),
      readingAnswers:totalAnswers(readingStats), writingAnswers:totalAnswers(writingStats),
      readingHigh:num('highScore'), writingHigh:num('reverseHighScore'),
      readingKnown:countKeys(readingStats), writingKnown:countKeys(writingStats),
      readingWorst:rd.worst, readingBest:rd.best, writingWorst:wd.worst, writingBest:wd.best,
      readingTests:readingTests.length, writingTests:writingTests.length,
      dailyDone:dailyDone(readingDaily)||dailyDone(writingDaily), streak:Math.max(streak(readingDaily), streak(writingDaily)),
      kanaMasteryTarget: Math.max(countKeys(readingStats), countKeys(writingStats))
    };
  }


  function normalizeResultForCount(item, expectedMode){
    if(!item || typeof item !== 'object') return null;
    const mode = item.mode === 'writing' ? 'writing' : 'reading';
    if(expectedMode && mode !== expectedMode) return null;
    const type = item.type === 'average' ? 'average' : 'test';
    if(type === 'average') return null;
    const id = String(item.id || item.createdAt || item.completedAt || item.date || item.startedAt || '');
    const sig = id || (mode+'|'+String(item.date||'')+'|'+String(item.startedAt||'')+'|'+String(item.correct||'')+'|'+String(item.wrong||''));
    return { mode, sig };
  }
  function formalTestCount(){
    const readingKeys=['testModeResults','kanaTrainerTestModeResults','readingTestModeResults','kanaTrainerReadingTestModeResults'];
    const writingKeys=['writingTestModeResults','kanaTrainerWritingTestModeResults','testModeResults','kanaTrainerTestModeResults','readingTestModeResults','kanaTrainerReadingTestModeResults'];
    const seen=new Set();
    readingKeys.forEach(key=>arr(key).forEach(item=>{ const n=normalizeResultForCount(item,'reading'); if(n) seen.add('reading|'+n.sig); }));
    writingKeys.forEach(key=>arr(key).forEach(item=>{ const n=normalizeResultForCount(item,'writing'); if(n) seen.add('writing|'+n.sig); }));
    return seen.size;
  }

  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.formalTestCount = formalTestCount;

  function enhanceKanaDashboard(){
    if(PAGE !== 'kana.html') return;
    if($('#maKanaProDashboard')) return;
    const s=kanaStats();
    const hero=$('.hero.glass') || $('.hero') || $('.shell');
    const panel=document.createElement('section'); panel.id='maKanaProDashboard'; panel.className='ma-kana-pro-card';
    const reviewText = ([s.readingWorst,s.writingWorst].filter(x=>x&&x!=="—").slice(0,2).join(" / ")) || "—";
    const nextHref = localStorage.getItem(LAST_PAGE_KEY) || 'default.html';
    panel.innerHTML = '<div class="ma-kana-pro-head"><div><h2 class="ma-kana-pro-title">Today’s Kana Trainer dashboard</h2><div class="ma-kana-pro-sub">Your hub for Reading Practice, Writing Practice, daily review, results, and recommended next steps.</div></div><div class="ma-kana-pro-pills"><span class="ma-kana-pill reading">Reading green</span><span class="ma-kana-pill writing">Writing blue</span></div></div>'+
      '<div class="ma-kana-stat-grid">'+
      '<div class="ma-kana-stat"><div class="label">Current streak</div><div class="value">'+s.streak+'</div><div class="hint">daily challenge days</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Today</div><div class="value">'+(s.dailyDone?'Done':'Ready')+'</div><div class="hint">daily challenge status</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Kana seen</div><div class="value">'+Math.max(s.readingKnown,s.writingKnown)+'</div><div class="hint">tracked in practice</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Formal tests</div><div class="value">'+formalTestCount()+'</div><div class="hint">saved result cards</div></div>'+
      '</div><div class="ma-kana-stat-grid">'+
      '<div class="ma-kana-stat"><div class="label">Reading accuracy</div><div class="value">'+(s.readingAccuracy||'—')+(s.readingAccuracy?'%':'')+'</div><div class="hint">'+s.readingAnswers+' answers</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Writing accuracy</div><div class="value">'+(s.writingAccuracy||'—')+(s.writingAccuracy?'%':'')+'</div><div class="hint">'+s.writingAnswers+' answers</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Review next</div><div class="value">' + reviewText + '</div><div class="hint">weakest tracked kana</div></div>'+
      '<div class="ma-kana-stat"><div class="label">Mastery map</div><div class="value">'+Math.max(s.readingKnown,s.writingKnown)+'/104</div><div class="hint">kana with saved history</div></div>'+
      '</div><div class="ma-kana-plan"><div><div class="label">Recommended flow</div><strong>Review → Practice → Test</strong><span>Start with weak kana, then complete a focused Reading or Writing session before checking results.</span></div><div><div class="label">Smart review</div><strong>'+(reviewText==='—'?'Build more history':reviewText)+'</strong><span>'+(reviewText==='—'?'Finish a few sessions to unlock stronger recommendations.':'Prioritise these kana first in your next session.')+'</span></div></div>'+
      '<div class="ma-action-row"><a class="primary" href="'+nextHref+'">Continue where you left off</a><a class="reading" href="default.html">Reading Practice</a><a class="writing" href="reverse.html">Writing Practice</a><a href="test.html">Results</a></div>';
    if(hero && hero.parentElement) hero.insertAdjacentElement('afterend', panel);
    const footer=$('.footer-note'); if(footer) footer.textContent='Kana Trainer dashboard reads from Reading, Writing, Results, and daily review progress.';
    updateExistingKanaNumbers(s);
  }
  function updateExistingKanaNumbers(s){
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('heroReadingHigh', s.readingHigh || 0); set('heroWritingHigh', s.writingHigh || 0);
    set('readingToughest', s.readingWorst); set('readingStrongest', s.readingBest); set('writingToughest', s.writingWorst); set('writingStrongest', s.writingBest);
  }

  function rememberKanaPage(){ if(['default.html','reverse.html','test.html'].includes(PAGE)) localStorage.setItem(LAST_PAGE_KEY, PAGE); }
  rememberKanaPage();

  function inferContent(prefix){
    const settings=obj(prefix==='reading'?'settings':'reverseSettings');
    const bits=[];
    const lower=JSON.stringify(settings||{}).toLowerCase();
    if(lower.includes('katakana')) bits.push('Katakana');
    if(lower.includes('dakuten')) bits.push('Dakuten');
    if(lower.includes('yoon')||lower.includes('yōon')) bits.push('Yōon');
    if(lower.includes('extended')||lower.includes('ext')) bits.push('Extended');
    return bits.length ? bits.join(' + ') : 'Current saved setup';
  }
  function addSessionPreview(){
    const old=$('#maSessionPreview'); if(old) old.remove();
  }


  function addResultFilters(){
    if(PAGE !== 'test.html') return;
    $all('#maResultFilterBar,.ma-result-filter-bar').forEach(el=>el.remove());
  }
  function applyResultFilter(filter){
    $all('.result-card,.test-card,.stored-test,.history-card,.result-row,.score-card,.card').forEach(c=>{ c.style.opacity=''; c.style.filter=''; });
  }

  function repairSaveData(){
    let changed=0;
    function dedupeArrayKey(key){
      const a=arr(key); if(!a.length) return;
      const seen=new Set(), out=[];
      a.forEach((item,i)=>{ const sig=(item&&typeof item==='object') ? (item.id||item.createdAt||item.completedAt||item.date||'')+'|'+JSON.stringify(item).slice(0,220) : String(item); if(!seen.has(sig)){seen.add(sig); out.push(item);} });
      if(out.length!==a.length){ writeJSON(key,out); changed += a.length-out.length; }
    }
    ['testModeResults','readingTestModeResults','kanaTrainerReadingTestModeResults','writingTestModeResults','kanaTrainerWritingTestModeResults'].forEach(dedupeArrayKey);
    if(!localStorage.getItem('modeAtlasDataVersion')){ localStorage.setItem('modeAtlasDataVersion', APP_VERSION); changed++; }
    try{ window.KanaCloudSync?.scheduleSync?.(500); }catch{}
    return { changed, summary: changed ? changed+' cleanup change(s)' : 'no problems found' };
  }
  window.ModeAtlas.repairSaveData = repairSaveData;

  function showWhatsNew(){
    showModal('What’s new', '<p>This build adds the professional QOL shell: shared appearance controls, Kana Trainer dashboard upgrades, session previews, result filtering, safer profile menu de-duping, toast messages, PWA/offline registration, and a protected dev diagnostics menu.</p><p>Reading pages keep the green theme, Writing pages keep the blue theme, and Light/Dark/System appearance changes the surrounding app shell.</p>');
  }
  function showModal(title, html){
    let b=$('#maSimpleModal'); if(!b){ b=document.createElement('div'); b.id='maSimpleModal'; b.className='ma-dev-backdrop'; b.innerHTML='<div class="ma-dev-modal"><div class="ma-dev-head"><h2></h2><button class="ma-qol-btn" type="button" data-ma-close-modal>Close</button></div><div class="ma-simple-body"></div></div>'; document.body.appendChild(b); b.addEventListener('click', e=>{ if(e.target===b||e.target.closest('[data-ma-close-modal]')) b.classList.remove('open'); }); }
    $('h2',b).textContent=title; $('.ma-simple-body',b).innerHTML=html; b.classList.add('open');
  }

  function openDevMenu(){
    const pin=prompt('Developer PIN'); if(pin!==DEV_PIN){ if(pin!==null) toast('Incorrect PIN.', 'err'); return; }
    const d=devData();
    let b=$('#maDevMenu'); if(!b){ b=document.createElement('div'); b.id='maDevMenu'; b.className='ma-dev-backdrop'; document.body.appendChild(b); }
    b.innerHTML='<div class="ma-dev-modal"><div class="ma-dev-head"><h2>Mode Atlas Dev Diagnostics</h2><button class="ma-qol-btn" type="button" data-ma-dev-close>Close</button></div><div class="ma-dev-actions"><button class="ma-qol-btn" data-ma-dev-copy>Copy diagnostics</button><button class="ma-qol-btn" data-ma-dev-repair>Repair save data</button><button class="ma-qol-btn" data-ma-dev-sync>Force sync</button><button class="ma-qol-btn" data-ma-dev-safe>Safe mode reload</button></div><div class="ma-dev-table">'+Object.entries(d).map(([k,v])=>'<div class="ma-dev-row"><div class="ma-dev-key">'+escapeHTML(k)+'</div><div class="ma-dev-val">'+escapeHTML(String(v))+'</div></div>').join('')+'</div></div>';
    b.classList.add('open');
    b.onclick=(e)=>{ if(e.target===b||e.target.closest('[data-ma-dev-close]')) b.classList.remove('open'); if(e.target.closest('[data-ma-dev-copy]')) navigator.clipboard?.writeText(JSON.stringify(devData(),null,2)).then(()=>toast('Diagnostics copied.')); if(e.target.closest('[data-ma-dev-repair]')){ const r=repairSaveData(); toast('Repair complete · '+r.summary); } if(e.target.closest('[data-ma-dev-sync]')){ window.KanaCloudSync?.syncNow?.(); toast('Sync requested.'); } if(e.target.closest('[data-ma-dev-safe]')){ sessionStorage.setItem('modeAtlasSafeMode','1'); location.reload(); } };
  }
  function devData(){
    const st=window.KanaCloudSync?.getSyncStatus?.() || {};
    let bytes=0; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); bytes += (k?.length||0)+(localStorage.getItem(k)?.length||0); }
    const s=kanaStats();
    return { version:APP_VERSION, page:PAGE, url:location.href, theme:getThemePref()+' / '+effectiveTheme(), online:navigator.onLine, cloudState:st.text||'n/a', cloudLastSync:fmtDate(st.lastSync||localStorage.getItem('modeAtlasLastCloudSyncAt')), signedIn:!!st.user, localStorageKeys:localStorage.length, approximateLocalBytes:bytes, safeMode:sessionStorage.getItem('modeAtlasSafeMode')==='1', readingAccuracy:s.readingAccuracy, writingAccuracy:s.writingAccuracy, readingAnswers:s.readingAnswers, writingAnswers:s.writingAnswers, readingTests:s.readingTests, writingTests:s.writingTests };
  }
  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  window.dev = openDevMenu;
  function installHiddenDevButton(){ if($('#maHiddenDevTrigger')) return; const btn=document.createElement('button'); btn.id='maHiddenDevTrigger'; btn.className='ma-hidden-dev-trigger'; btn.type='button'; btn.setAttribute('aria-label',''); btn.addEventListener('click', openDevMenu); document.body.appendChild(btn); }

  function registerPwa(){
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
    let deferred=null;
    window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferred=e; addInstallButton(()=>{ deferred.prompt(); deferred=null; }); });
  }
  function addInstallButton(onClick){
    $all('.profile-drawer,#profileDrawer,.profile-overlay aside').forEach(drawer=>{ if($('[data-ma-install]',drawer)) return; const tools=$('.ma-tools-panel .ma-qol-grid',drawer); if(!tools)return; const btn=document.createElement('button'); btn.className=buttonClassFor($('.drawer-actions,.profile-actions',drawer)); btn.type='button'; btn.dataset.maInstall='1'; btn.textContent='Install app'; btn.addEventListener('click', onClick); tools.appendChild(btn); });
  }

  function normalizeInputs(){
    $all('input[type="text"], input:not([type]), textarea').forEach((el,i)=>{
      el.setAttribute('autocomplete','off'); el.setAttribute('autocorrect','off'); el.setAttribute('autocapitalize','off'); el.setAttribute('spellcheck','false');
      const n=(el.getAttribute('name')||'').toLowerCase(); if(!n || ['name','email','address','card','location','password'].includes(n)) el.setAttribute('name','mode_atlas_input_'+i);
    });
  }

  function boot(){
    enhanceProfileMenus(); enhanceKanaDashboard(); addSessionPreview(); addResultFilters(); installHiddenDevButton(); normalizeInputs(); registerPwa(); dedupeProfileMenu();
    setTimeout(()=>{ enhanceProfileMenus(); dedupeProfileMenu(); syncProfileAuthButtons(); }, 400);
    setTimeout(()=>{ enhanceProfileMenus(); dedupeProfileMenu(); normalizeInputs(); syncProfileAuthButtons(); }, 1400);
    if(sessionStorage.getItem('modeAtlasSafeMode')==='1') toast('Safe mode is active for this page load.', 'warn', 4500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('pageshow', ()=>setTimeout(boot,50));
  window.addEventListener('kanaCloudSyncStatusChanged', ()=>setTimeout(()=>{ enhanceProfileMenus(); syncProfileAuthButtons(); },50));
  setInterval(syncProfileAuthButtons, 1200);
})();

/* QOL continuation: extra dashboard features, result insight panel, nav cleanup */
(function ModeAtlasQolContinuation(){
  if (window.__modeAtlasQolContinuationLoaded) return;
  window.__modeAtlasQolContinuationLoaded = true;
  const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const readJSON=(k,f)=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):f;}catch{return f;}};
  function obj(k){const v=readJSON(k,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}};
  function arr(k){const v=readJSON(k,[]);return Array.isArray(v)?v:[];}
  function statTotals(stats){let c=0,w=0;Object.values(stats||{}).forEach(s=>{if(s&&typeof s==='object'){c+=Number(s.correct||s.right||0);w+=Number(s.wrong||s.incorrect||0);}});return{c,w,t:c+w,acc:c+w?Math.round(c/(c+w)*100):0};}
  function difficult(stats){let worst=null;Object.entries(stats||{}).forEach(([k,s])=>{if(!s||typeof s!=='object')return;const c=Number(s.correct||s.right||0),w=Number(s.wrong||s.incorrect||0),t=c+w;if(!t)return;const score=(c/t)-(w*0.04);if(!worst||score<worst.score)worst={kana:k,score,t,c,w};});return worst;}
  function getStats(){
    const reading=obj('charStats'), writing=obj('reverseCharStats');
    const rt=statTotals(reading), wt=statTotals(writing);
    const rw=difficult(reading), ww=difficult(writing);
    return {reading,writing,rt,wt,rw,ww,known:Math.max(Object.keys(reading).length,Object.keys(writing).length),tests:arr('testModeResults').length+arr('readingTestModeResults').length+arr('writingTestModeResults').length+arr('kanaTrainerReadingTestModeResults').length+arr('kanaTrainerWritingTestModeResults').length};
  }
  function addKanaProFeatures(){
    if(PAGE!=='kana.html' || $('#maKanaProFeatures')) return;
    const dash=$('#maKanaProDashboard') || $('.ma-kana-pro-card');
    if(!dash) return;
    const s=getStats();
    const weak=[s.rw?.kana,s.ww?.kana].filter(Boolean).join(' / ') || 'More history needed';
    const known=s.known;
    const stages=[['A-row',known>=5],['Hiragana',known>=46],['Katakana',known>=92],['Dakuten',known>=104],['Yōon',known>=130],['Extended',known>=150]];
    const nextIdx=Math.max(0,stages.findIndex(x=>!x[1]));
    const wrap=document.createElement('section');
    wrap.id='maKanaProFeatures';
    wrap.className='ma-kana-pro-card';
    wrap.innerHTML='<div class="ma-kana-pro-head"><div><h2 class="ma-kana-pro-title">Trainer roadmap</h2><div class="ma-kana-pro-sub">A cleaner overview of what to practise next, without mixing in other Mode Atlas sections.</div></div><div class="ma-kana-pro-pills"><span class="ma-kana-pill reading">Review</span><span class="ma-kana-pill writing">Test</span></div></div>'+ 
      '<div class="ma-pro-feature-grid">'+
      '<div class="ma-pro-feature-card"><div class="label">Next best action</div><strong>'+(weak==='More history needed'?'Complete a short session':'Review '+weak)+'</strong><span>'+(weak==='More history needed'?'Finish a Reading and Writing session to unlock smarter recommendations.':'These are currently your weakest tracked kana across Reading/Writing.')+'</span></div>'+ 
      '<div class="ma-pro-feature-card"><div class="label">Confusable drill</div><strong>シ / ツ · ソ / ン</strong><span>A future focused drill area for kana that are visually easy to mix up.</span></div>'+ 
      '<div class="ma-pro-feature-card"><div class="label">Formal testing</div><strong>'+s.tests+' saved test'+(s.tests===1?'':'s')+'</strong><span>Use Results after a full test to compare speed, accuracy, and weak kana.</span></div>'+ 
      '</div><div class="ma-path-track">'+stages.map((st,i)=>'<div class="ma-path-step '+(st[1]?'done':i===nextIdx?'next':'')+'"><b>'+st[0]+'</b><small>'+(st[1]?'Tracked':i===nextIdx?'Next':'Locked')+'</small></div>').join('')+'</div>';
    dash.insertAdjacentElement('afterend',wrap);
  }
  function addResultInsights(){
    if(PAGE!=='test.html' || $('#maResultInsights')) return;
    const s=getStats();
    const weak=[s.rw?.kana&&('Reading: '+s.rw.kana),s.ww?.kana&&('Writing: '+s.ww.kana)].filter(Boolean).join(' · ') || 'Complete more sessions to build recommendations.';
    const panel=document.createElement('section');
    panel.id='maResultInsights';
    panel.className='ma-result-insights';
    panel.innerHTML='<h3>Result insights</h3><p>Reading accuracy: <strong>'+ (s.rt.t?s.rt.acc+'%':'—') +'</strong> from '+s.rt.t+' answers · Writing accuracy: <strong>'+ (s.wt.t?s.wt.acc+'%':'—') +'</strong> from '+s.wt.t+' answers.</p><p>Recommended review: <strong>'+weak+'</strong></p>';
    const filter=$('#maResultFilterBar');
    if(filter) filter.insertAdjacentElement('afterend',panel); else (document.querySelector('main,.shell,.app-shell')||document.body).prepend(panel);
  }
  function removeBadTopShowHandle(){
    const handle=$('#studyNavShowBtn');
    if(!handle) return;
    handle.setAttribute('aria-label','Show navigation');
    if(!document.body.classList.contains('study-nav-hidden')) handle.style.display='none';
    const sync=()=>{handle.style.display=document.body.classList.contains('study-nav-hidden')?'inline-flex':'none';};
    sync();
    if(!handle.dataset.maNavObserver){new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});handle.dataset.maNavObserver='1';}
  }
  function updateWhatsNewText(){
    const old=window.ModeAtlas && window.ModeAtlas.showWhatsNew;
  }
  function boot(){removeBadTopShowHandle();addKanaProFeatures();addResultInsights();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('pageshow',()=>setTimeout(boot,50));
})();


/* === Professional QOL patch: preset checklist, compact insights, data model, confusable helpers === */
(function ModeAtlasProfessionalPatch(){
  if (window.__modeAtlasProfessionalPatchLoaded) return;
  window.__modeAtlasProfessionalPatchLoaded = true;
  const PAGE=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const readJSON=(k,f)=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):f;}catch{return f;}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
  const HIRA='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
  const AROW='あいうえお'.split('');
  const KATA='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
  const DAK='がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ'.split('');
  const YOON='きゃきゅきょしゃしゅしょちゃちゅちょにゃにゅにょひゃひゅひょみゃみゅみょりゃりゅりょぎゃぎゅぎょじゃじゅじょびゃびゅびょぴゃぴゅぴょキャキュキョシャシュショチャチュチョニャニュニョヒャヒュヒョミャミュミョリャリュリョギャギュギョジャジュジョビャビュビョピャピュピョ'.match(/.{1,2}/gu)||[];
  const EXT='ヴファフィフェフォウィウェウォティディトゥドゥチェシェジェ'.match(/.{1,2}/gu)||[];
  const CONFUSABLE=['シ','ツ','ソ','ン','ぬ','め','れ','わ','ね','ク','ケ','タ','ナ','メ'];
  const PRESETS=[
    {id:'starter',name:'Starter',desc:'A-row with hints',chars:AROW,href:'default.html?starter=starter'},
    {id:'intermediate',name:'Intermediate',desc:'All Hiragana, no hints',chars:HIRA,href:'default.html?starter=intermediate'},
    {id:'advanced',name:'Advanced',desc:'Hiragana + Katakana + Dakuten',chars:[...HIRA,...KATA,...DAK],href:'default.html?starter=advanced'},
    {id:'pro',name:'Pro',desc:'Everything enabled',chars:[...HIRA,...KATA,...DAK,...YOON,...EXT],href:'default.html?starter=pro'}
  ];
  function icon(name){return ({speed:'Speed',mastery:'Mastery',review:'Review',warning:'Focus',practice:'Practice',test:'Test'}[name]||'');}
  function statObj(key){const v=readJSON(key,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
  function charCorrect(ch){const r=statObj('charStats')[ch]||{}, w=statObj('reverseCharStats')[ch]||{};return Number(r.correct||r.right||0)+Number(w.correct||w.right||0);}
  function charWrong(ch){const r=statObj('charStats')[ch]||{}, w=statObj('reverseCharStats')[ch]||{};return Number(r.wrong||r.incorrect||0)+Number(w.wrong||w.incorrect||0);}
  function charAvg(ch){const rt=statObj('charTimes')[ch], wt=statObj('reverseCharTimes')[ch];let vals=[];[rt,wt].forEach(v=>{if(typeof v==='number') vals.push(v); else if(v&&typeof v==='object'){const n=Number(v.avg||v.average||v.time||0); if(n) vals.push(n);}});return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;}
  function masteryLabel(ch){const c=charCorrect(ch), w=charWrong(ch), t=c+w, avg=charAvg(ch); if(!t) return 'New'; if(c>=20 && c/(t||1)>=.9 && (!avg || avg<=1000)) return 'Mastered'; if(c>=8 && c/(t||1)>=.75) return 'Reviewing'; return 'Learning';}
  function masteryCounts(chars=[...new Set([...HIRA,...KATA,...DAK,...CONFUSABLE])]){const out={New:0,Learning:0,Reviewing:0,Mastered:0}; chars.forEach(ch=>{out[masteryLabel(ch)]++;}); return out;}
  function formatMs(ms){return !ms?'—':ms<1000?Math.round(ms)+'ms':(ms/1000).toFixed(1)+'s';}
  function bestWeak(){let rows=[]; [...new Set([...HIRA,...KATA,...DAK,...CONFUSABLE])].forEach(ch=>{const c=charCorrect(ch),w=charWrong(ch),avg=charAvg(ch),t=c+w;if(t)rows.push({ch,c,w,t,avg,score:(c/(t||1))-(w*.05)-(avg?Math.min(avg/7000,.5):0)});}); rows.sort((a,b)=>a.score-b.score); return rows.slice(0,4);}
  function sectionTimestamps(){
    const now=Date.now();
    const map={settingsUpdatedAt:['settings','reverseSettings','modeAtlasThemePreference'],resultsUpdatedAt:['testModeResults','readingTestModeResults','writingTestModeResults','kanaTrainerReadingTestModeResults','kanaTrainerWritingTestModeResults','charStats','reverseCharStats','charTimes','reverseCharTimes'],srsUpdatedAt:['charSrs','reverseCharSrs'],dailyUpdatedAt:['dailyChallengeHistory','reverseDailyChallengeHistory'],profileUpdatedAt:['modeAtlasLastCloudSyncAt','modeAtlasLastUserId']};
    Object.entries(map).forEach(([tsKey,keys])=>{ if(!localStorage.getItem(tsKey)){ const any=keys.some(k=>localStorage.getItem(k)!==null); if(any) localStorage.setItem(tsKey,String(now)); }});
  }
  function normaliseResultArray(key){
    const list=readJSON(key,null); if(!Array.isArray(list)) return false; let changed=false;
    const seen=new Set();
    const cleaned=list.map((item,i)=>{ if(!item||typeof item!=='object') return item; const copy={...item};
      const baseTime=Date.parse(copy.createdAt||copy.completedAt||copy.date||copy.timestamp||'') || Number(copy.timestamp||copy.completedAtMs||0) || Date.now();
      if(!copy.id){copy.id='session_'+baseTime.toString(36)+'_'+i.toString(36); changed=true;}
      if(seen.has(copy.id)){copy.id=copy.id+'_'+i.toString(36); changed=true;} seen.add(copy.id);
      if(!copy.createdAt){copy.createdAt=new Date(baseTime).toISOString(); changed=true;}
      if(!copy.updatedAt){copy.updatedAt=new Date(baseTime).toISOString(); changed=true;}
      if(!copy.source){copy.source=PAGE.includes('reverse')?'writing':PAGE.includes('test')?'results':'reading'; changed=true;}
      return copy;
    });
    if(changed) writeJSON(key,cleaned); return changed;
  }
  function repairDataModel(){
    sectionTimestamps();
    ['testModeResults','readingTestModeResults','writingTestModeResults','kanaTrainerTestModeResults','kanaTrainerReadingTestModeResults','kanaTrainerWritingTestModeResults'].forEach(normaliseResultArray);
    const meta={settingsUpdatedAt:Number(localStorage.getItem('settingsUpdatedAt')||0),resultsUpdatedAt:Number(localStorage.getItem('resultsUpdatedAt')||0),srsUpdatedAt:Number(localStorage.getItem('srsUpdatedAt')||0),dailyUpdatedAt:Number(localStorage.getItem('dailyUpdatedAt')||0),profileUpdatedAt:Number(localStorage.getItem('profileUpdatedAt')||0)};
    writeJSON('modeAtlasSectionTimestamps',meta);
    window.dispatchEvent(new CustomEvent('modeAtlasDataModelRepaired',{detail:meta}));
  }
  window.ModeAtlas=window.ModeAtlas||{};
  window.ModeAtlas.repairDataModel=repairDataModel;
  window.ModeAtlas.getKanaMasteryLabel=masteryLabel;

  const nativeSet=Storage.prototype.setItem;
  if(!Storage.prototype.__maTimestampPatched){
    Storage.prototype.setItem=function(k,v){
      const out=nativeSet.apply(this,arguments);
      try{ if(this===localStorage){
        if(/^(settings|reverseSettings|modeAtlasThemePreference)$/.test(k)) nativeSet.call(localStorage,'settingsUpdatedAt',String(Date.now()));
        if(/(testModeResults|charStats|reverseCharStats|charTimes|reverseCharTimes|scoreHistory)/.test(k)) nativeSet.call(localStorage,'resultsUpdatedAt',String(Date.now()));
        if(/(charSrs|reverseCharSrs)/.test(k)) nativeSet.call(localStorage,'srsUpdatedAt',String(Date.now()));
        if(/dailyChallengeHistory/.test(k)) nativeSet.call(localStorage,'dailyUpdatedAt',String(Date.now()));
      }}catch{}
      return out;
    };
    Storage.prototype.__maTimestampPatched=true;
  }

  function applyPracticePreset(presetId){
    const presetKey=String(presetId||'').toLowerCase();
    const isWriting=PAGE==='reverse.html';
    const allHira=(typeof hiraganaRows==='object'&&hiraganaRows)?Object.keys(hiraganaRows):[];
    const allKata=(typeof katakanaRows==='object'&&katakanaRows)?Object.keys(katakanaRows):[];
    const presetMap={
      starter:{hint:true,dakuten:false,yoon:false,extendedKatakana:false,hiraganaRows:['h_a'].filter(r=>allHira.includes(r)),katakanaRows:[]},
      intermediate:{hint:false,dakuten:false,yoon:false,extendedKatakana:false,hiraganaRows:allHira,katakanaRows:[]},
      advanced:{hint:false,dakuten:true,yoon:false,extendedKatakana:false,hiraganaRows:allHira,katakanaRows:allKata},
      pro:{hint:false,dakuten:true,yoon:true,extendedKatakana:true,hiraganaRows:allHira,katakanaRows:allKata}
    };
    if(!presetMap[presetKey]) return false;
    try{
      const key=isWriting?'reverseSettings':'settings';
      if(typeof settings==='object' && settings){
        Object.assign(settings,{focusWeak:false,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,mobileMode:false,statsVisible:true,scoresVisible:true,activeBottomTab:'modifiers',optionsOpen:false},presetMap[presetKey]);
        localStorage.setItem(key,JSON.stringify(settings));
      }else{
        const current=readJSON(key,{});
        Object.assign(current,{focusWeak:false,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,statsVisible:true,scoresVisible:true,activeBottomTab:'modifiers'},presetMap[presetKey]);
        writeJSON(key,current);
      }
      localStorage.removeItem('modeAtlasConfusableMode');
      localStorage.setItem('modeAtlasActivePreset',presetKey);
      localStorage.setItem('settingsUpdatedAt',String(Date.now()));
      if(typeof onSettingsChanged==='function') onSettingsChanged();
      markActivePresetButtons();
      if(window.KanaCloudSync?.markSectionUpdated) window.KanaCloudSync.markSectionUpdated(isWriting?'writing':'reading');
      if(window.KanaCloudSync?.scheduleSync) window.KanaCloudSync.scheduleSync();
      toast((PRESETS.find(p=>p.id===presetKey)?.name||'Practice')+' preset applied.');
      return true;
    }catch(err){ console.warn('Preset apply failed',err); return false; }
  }

  function startConfusableMode(forceOn){
    const isWriting=PAGE==='reverse.html';
    const allHira=(typeof hiraganaRows==='object'&&hiraganaRows)?Object.keys(hiraganaRows):[];
    const allKata=(typeof katakanaRows==='object'&&katakanaRows)?Object.keys(katakanaRows):[];
    const currentlyOn=localStorage.getItem('modeAtlasConfusableMode')==='1';
    const turnOn=typeof forceOn==='boolean'?forceOn:!currentlyOn;
    try{
      const key=isWriting?'reverseSettings':'settings';
      const next=(typeof settings==='object'&&settings)?settings:readJSON(key,{});
      if(turnOn){
        Object.assign(next,{hint:false,dakuten:false,yoon:false,extendedKatakana:false,focusWeak:false,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,hiraganaRows:allHira,katakanaRows:allKata,activeBottomTab:'modifiers'});
        localStorage.setItem('modeAtlasConfusableMode','1');
        localStorage.removeItem('modeAtlasActivePreset');
      }else{
        localStorage.removeItem('modeAtlasConfusableMode');
      }
      if(typeof settings==='object'&&settings) Object.assign(settings,next);
      localStorage.setItem(key,JSON.stringify(next));
      localStorage.setItem('settingsUpdatedAt',String(Date.now()));
      if(typeof onSettingsChanged==='function') onSettingsChanged();
      
      markActivePresetButtons();
      
      return true;
    }catch(err){ console.warn('Confusable mode failed',err); return false; }
  }

  function appendConfusableModeButton(){ /* native mode button is used now */ }

  function patchModifierBuilder(){ /* no-op: native mode button is used now */ }

  function markActivePresetButtons(){
    const active=localStorage.getItem('modeAtlasActivePreset')||'';
    const confusable=localStorage.getItem('modeAtlasConfusableMode')==='1';
    $all('[data-preset]').forEach(btn=>{ const on=btn.dataset.preset===active && !confusable; btn.classList.toggle('active',on); btn.setAttribute('aria-pressed',on?'true':'false'); });
    $all('[data-confusable-start]').forEach(btn=>{ btn.classList.toggle('active',confusable); btn.setAttribute('aria-pressed',confusable?'true':'false'); });
  }

  function installPresetMenu(){
    if(!['default.html','reverse.html'].includes(PAGE)) return;
    const content=$('#modifiersContent'); if(!content || $('#maPresetMenu')) return;
    const panel=document.createElement('div'); panel.id='maPresetMenu'; panel.className='ma-preset-menu';
    panel.innerHTML='<div class="section-title">Practice presets</div><div class="ma-preset-grid">'+PRESETS.map(p=>'<button type="button" class="ma-preset-btn" data-preset="'+p.id+'"><span>'+p.name+'</span><small>'+p.desc+'</small></button>').join('')+'</div>';
    const stack=$('.options-stack',content)||content; stack.insertBefore(panel, stack.firstChild);
    panel.addEventListener('click',e=>{
      const preset=e.target.closest('[data-preset]');
      if(preset){ e.preventDefault(); e.stopPropagation(); applyPracticePreset(preset.dataset.preset); return; }
      const b=e.target.closest('[data-confusable-start]');
      if(b){ e.preventDefault(); e.stopPropagation(); startConfusableMode(); return; }
    },true);
    markActivePresetButtons();
  }

  function installConfusableModeNotice(){ /* no floating notice */ }

  function renderPresetChecklist(){
    if(PAGE!=='kana.html') return;
    $$('#maKanaProFeatures').forEach(x=>x.remove());
    if($('#maPresetChecklist')) return;
    const anchor=$('#maKanaProDashboard')||$('.ma-kana-pro-card')||$('.hero')||$('main'); if(!anchor) return;
    const sec=document.createElement('section'); sec.id='maPresetChecklist'; sec.className='ma-kana-pro-card ma-preset-checklist';
    sec.innerHTML='<div class="ma-kana-pro-head"><div><h2 class="ma-kana-pro-title">Preset checklist</h2><div class="ma-kana-pro-sub">Complete each setup by getting 100 correct answers over time. Nothing is locked behind this — it is just a clean progress tracker for the preset levels.</div></div></div>'+ 
      '<div class="ma-preset-track-grid">'+PRESETS.map(p=>{const correct=p.chars.reduce((sum,ch)=>sum+charCorrect(ch),0); const pct=Math.min(100,Math.round(correct)); const done=correct>=100; return '<a class="ma-preset-track '+(done?'done':'')+'" href="'+p.href+'"><div class="ma-preset-track-top"><strong>'+p.name+'</strong><span>'+(done?'Complete':'In progress')+'</span></div><p>'+p.desc+'</p><div class="ma-progress"><i style="width:'+pct+'%"></i></div><small>'+Math.min(correct,100)+' / 100 correct</small></a>';}).join('')+'</div>';
    anchor.insertAdjacentElement('afterend',sec);
    renderSpeedMasterySection(sec);
  }

  function renderSpeedMasterySection(afterEl){
    if(PAGE!=='kana.html' || $('#maSpeedMasteryPanel')) return;
    const counts=masteryCounts();
    const weak=bestWeak();
    const all=[...new Set([...HIRA,...KATA,...DAK,...CONFUSABLE])];
    const timed=all.map(ch=>({ch,avg:charAvg(ch),label:masteryLabel(ch)})).filter(x=>x.avg).sort((a,b)=>a.avg-b.avg);
    const fast=timed.filter(x=>x.avg<=2000).length;
    const fluent=timed.filter(x=>x.avg<=1000).length;
    const average=timed.length?timed.reduce((a,b)=>a+b.avg,0)/timed.length:0;
    const panel=document.createElement('section'); panel.id='maSpeedMasteryPanel'; panel.className='ma-kana-pro-card ma-speed-mastery';
    panel.innerHTML='<div class="ma-kana-pro-head"><div><h2 class="ma-kana-pro-title">Speed & mastery</h2><div class="ma-kana-pro-sub">Track how quickly you recognise kana and how stable each kana feels over time. Goal pace is under 2.0s; fluent pace is under 1.0s.</div></div></div>'+ 
      '<div class="ma-speed-grid"><div class="ma-speed-card"><span class="label">Average recognition</span><strong>'+(average?formatMs(average):'More data needed')+'</strong><small>Across kana with timing history</small></div><div class="ma-speed-card"><span class="label">At goal pace</span><strong>'+fast+'</strong><small>kana under 2.0s</small></div><div class="ma-speed-card"><span class="label">Fluent pace</span><strong>'+fluent+'</strong><small>kana under 1.0s</small></div><div class="ma-speed-card"><span class="label">Mastered</span><strong>'+counts.Mastered+'</strong><small>'+counts.Reviewing+' reviewing · '+counts.Learning+' learning</small></div></div>'+ 
      '<div class="ma-mastery-breakdown"><div><b>Mastery labels</b><span>New '+counts.New+' · Learning '+counts.Learning+' · Reviewing '+counts.Reviewing+' · Mastered '+counts.Mastered+'</span></div><div><b>What this means</b><span>Mastery combines accuracy, attempts, and speed so labels improve as answers become reliable.</span></div><div><b>Speed target</b><span>Under 2.0s is the current goal. Under 1.0s is fluent recognition.</span></div></div>'+ 
      '<div class="ma-practice-actions"><a class="ma-action-card reading" href="default.html?focusWeak=1" data-ma-weak-review><strong>Review weakest kana</strong><span>'+(weak.length?weak.map(x=>x.ch).join(' · '):'Build more history to unlock this')+'</span></a></div>';
    afterEl.insertAdjacentElement('afterend',panel);
  }

  function renderCompactResultInsights(){
    if(PAGE!=='test.html') return;
    $$('#maResultInsights').forEach(x=>x.remove());
    if($('#maCompactResultInsights')) return;
    const stats=(key)=>{const o=statObj(key);let c=0,w=0;Object.values(o).forEach(v=>{if(v&&typeof v==='object'){c+=Number(v.correct||v.right||0);w+=Number(v.wrong||v.incorrect||0);}});return{c,w,t:c+w,acc:c+w?Math.round(c/(c+w)*100):0};};
    const r=stats('charStats'), w=stats('reverseCharStats'), weak=bestWeak();
    const all=[...new Set([...HIRA,...KATA,...DAK,...CONFUSABLE])];
    const timed=all.map(ch=>({ch,avg:charAvg(ch)})).filter(x=>x.avg).sort((a,b)=>b.avg-a.avg);
    const avg=timed.length?timed.reduce((a,b)=>a+b.avg,0)/timed.length:0;
    const formal=(window.ModeAtlas?.formalTestCount?.() || 0);
    const panel=document.createElement('section'); panel.id='maCompactResultInsights'; panel.className='ma-compact-results';
    panel.innerHTML='<div class="ma-mini-result-card"><b>Reading accuracy</b><strong>'+(r.t?r.acc+'%':'—')+'</strong><span>'+r.t+' answers</span></div><div class="ma-mini-result-card"><b>Writing accuracy</b><strong>'+(w.t?w.acc+'%':'—')+'</strong><span>'+w.t+' answers</span></div><div class="ma-mini-result-card"><b>Average speed</b><strong>'+(avg?formatMs(avg):'—')+'</strong><span>'+(avg && avg < 2000 ? 'Next goal under 1.0s' : 'Goal under 2.0s')+'</span></div><div class="ma-mini-result-card"><b>Slowest tracked</b><strong>'+(timed[0]?.ch||weak[0]?.ch||'—')+'</strong><span>'+(timed[0]?formatMs(timed[0].avg):(weak.length?weak.map(x=>x.ch).join(' · '):'More data needed'))+'</span></div><div class="ma-mini-result-card"><b>Formal tests</b><strong>'+formal+'</strong><span>saved result cards</span></div>';
    const filter=$('#maResultFilterBar');
    if(filter) filter.insertAdjacentElement('afterend',panel); else ($('main,.shell,.app-shell')||document.body).prepend(panel);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-ma-confusable-link]')){ localStorage.setItem('modeAtlasConfusableMode','1'); localStorage.removeItem('modeAtlasActivePreset'); return; }
    if(e.target.closest('[data-ma-weak-review]')){ const current=readJSON('settings',{}); Object.assign(current,{focusWeak:true,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false}); writeJSON('settings',current); localStorage.removeItem('modeAtlasConfusableMode'); return; }
  },true);

  function enhanceIcons(){
    // No-op: remove the earlier decorative icons so buttons do not look cluttered or like placeholder boxes.
    $$('.ma-ui-icon').forEach(x=>x.remove());
  }
  function boot(){repairDataModel(); installPresetMenu(); patchModifierBuilder();  renderPresetChecklist(); renderCompactResultInsights(); enhanceIcons(); markActivePresetButtons(); updateThemeButtons();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('pageshow',()=>setTimeout(boot,80));
  setTimeout(boot,500); setTimeout(boot,1600);
})();


/* === Verified app shell repair: presets, confusable mode, light mode, page identity === */
(function ModeAtlasVerifiedRepair(){
  if(window.__modeAtlasVerifiedRepair) return;
  window.__modeAtlasVerifiedRepair=true;
  const PAGE=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const readJSON=(k,f)=>{try{const raw=localStorage.getItem(k);return raw?JSON.parse(raw):f;}catch{return f;}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
  const isTrainer=PAGE==='default.html'||PAGE==='reverse.html';
  const isWriting=PAGE==='reverse.html';
  const storeKey=isWriting?'reverseSettings':'settings';
  const hiraRows=['h_a','h_ka','h_sa','h_ta','h_na','h_ha','h_ma','h_ya','h_ra','h_wa'];
  const kataRows=['k_a','k_ka','k_sa','k_ta','k_na','k_ha','k_ma','k_ya','k_ra','k_wa'];
  const PRESETS={
    starter:{label:'Starter',desc:'A-row with hints',hint:true,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:['h_a'],katakanaRows:[]},
    intermediate:{label:'Intermediate',desc:'All Hiragana, no hints',hint:false,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:hiraRows,katakanaRows:[]},
    advanced:{label:'Advanced',desc:'Hiragana + Katakana + Dakuten',hint:false,dakuten:true,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:hiraRows,katakanaRows:kataRows},
    pro:{label:'Pro',desc:'Everything enabled',hint:false,dakuten:true,yoon:true,extendedKatakana:true,confusableKana:false,hiraganaRows:hiraRows,katakanaRows:kataRows}
  };
  function setPageClass(){
    document.body.classList.toggle('ma-reading-page',PAGE==='default.html');
    document.body.classList.toggle('ma-writing-page',PAGE==='reverse.html');
    document.body.classList.toggle('ma-index-page',PAGE==='index.html');
    document.body.classList.toggle('ma-kana-page',PAGE==='kana.html');
    document.body.classList.toggle('ma-results-page',PAGE==='test.html');
  }
  function getSettings(){
    let current=readJSON(storeKey,{});
    try{ if(typeof settings==='object'&&settings) current=Object.assign({},current,settings); }catch{}
    return current&&typeof current==='object'?current:{};
  }
  function persist(next){
    try{ if(typeof settings==='object'&&settings) Object.assign(settings,next); }catch{}
    writeJSON(storeKey,next);
    localStorage.setItem('settingsUpdatedAt',String(Date.now()));
    try{ if(window.KanaCloudSync?.markSectionUpdated) window.KanaCloudSync.markSectionUpdated(isWriting?'writing':'reading'); }catch{}
    try{ if(window.KanaCloudSync?.scheduleSync) window.KanaCloudSync.scheduleSync(); }catch{}
  }
  function refreshTrainerUi(){
    try{ if(typeof updateTrialConfigVisibility==='function') updateTrialConfigVisibility(); }catch{}
    try{ if(typeof updateTopStats==='function') updateTopStats(); }catch{}
    try{ if(typeof buildModifierButtons==='function') buildModifierButtons(); }catch{}
    try{ if(typeof onSettingsChanged==='function') onSettingsChanged(); }catch{}
    try{ if(typeof buildRows==='function' && typeof hiraganaRows==='object') { buildRows('rowOptions', hiraganaRows, 'hiraganaRows', 'h_'); buildRows('katakanaRowOptions', katakanaRows, 'katakanaRows', 'k_'); } }catch{}
    try{ if(typeof rebuildCharMap==='function') rebuildCharMap(); }catch{}
    try{ if(typeof renderHeatmap==='function') renderHeatmap(); }catch{}
    try{ if(typeof saveAll==='function') saveAll(); }catch{}
    setTimeout(markActiveControls,20);
  }
  function toast(msg,type='ok'){ try{ if(window.ModeAtlas?.toast) return window.ModeAtlas.toast(msg,type); }catch{} }
  function applyPreset(id, notify=true){
    id=String(id||'').toLowerCase();
    const preset=PRESETS[id]; if(!preset) return false;
    const next=Object.assign({},getSettings(),{focusWeak:false,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,mobileMode:false,statsVisible:true,scoresVisible:true,activeBottomTab:'modifiers',optionsOpen:false},preset);
    persist(next); localStorage.setItem('modeAtlasActivePreset',id); localStorage.removeItem('modeAtlasConfusableMode');
    refreshTrainerUi(); if(notify) toast(preset.label+' preset applied.'); return true;
  }
  function applyConfusableFromHub(){
    if(!isTrainer) return;
    const params=new URLSearchParams(location.search);
    if(params.get('confusable')!=='1' && localStorage.getItem('modeAtlasConfusableMode')!=='1') return;
    const next=Object.assign({},getSettings(),{hint:false,focusWeak:false,srs:true,endless:false,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:true,hiraganaRows:hiraRows,katakanaRows:kataRows,activeBottomTab:'modifiers',optionsOpen:false});
    persist(next); localStorage.removeItem('modeAtlasActivePreset'); localStorage.removeItem('modeAtlasConfusableMode');
    if(params.get('confusable')==='1' && history.replaceState) history.replaceState(null,'',location.pathname);
  }
  function ensurePresetPanel(){
    if(!isTrainer) return;
    $$('.ma-preset-menu.final-control,#maPresetMenuFinal').forEach(el=>el.remove());
    const content=$('#modifiersContent'); if(!content) return;
    let panel=$('#maPresetMenu');
    if(!panel){ panel=document.createElement('div'); panel.id='maPresetMenu'; panel.className='ma-preset-menu'; const stack=$('.options-stack',content)||content; stack.insertBefore(panel,stack.firstChild); }
    panel.innerHTML='<div class="section-title">Practice presets</div><div class="ma-preset-grid">'+Object.entries(PRESETS).map(([id,p])=>'<button type="button" class="ma-preset-btn" data-preset="'+id+'"><span>'+p.label+'</span><small>'+p.desc+'</small></button>').join('')+'</div>';
  }
  function normaliseConfusableButton(){
    if(!isTrainer) return;
    $$('[data-confusable-start],.ma-confusable-final,#maConfusableNotice').forEach(el=>el.remove());
    const container=$('#modifierOptions'); if(!container) return;
    const existing=$$('.toggle-btn',container).find(btn=>(btn.textContent||'').trim().toLowerCase()==='confusable kana');
    if(existing){ existing.classList.toggle('active',!!getSettings().confusableKana); existing.setAttribute('aria-pressed',getSettings().confusableKana?'true':'false'); }
  }
  function markActiveControls(){
    if(!isTrainer) return;
    const current=getSettings(); const activePreset=localStorage.getItem('modeAtlasActivePreset')||''; const conf=!!current.confusableKana;
    $$('[data-preset]').forEach(btn=>{const on=!conf&&btn.dataset.preset===activePreset; btn.classList.toggle('active',on); btn.setAttribute('aria-pressed',on?'true':'false');});
    $$('#modifierOptions .toggle-btn').forEach(btn=>{ const label=(btn.textContent||'').trim().toLowerCase(); if(label==='confusable kana'){ btn.classList.toggle('active',conf); btn.setAttribute('aria-pressed',conf?'true':'false'); } });
  }
  function bindClicks(){
    document.addEventListener('click',e=>{
      const preset=e.target.closest&&e.target.closest('[data-preset]');
      if(preset){ e.preventDefault(); e.stopPropagation(); applyPreset(preset.dataset.preset,true); return; }
      const modeBtn=e.target.closest&&e.target.closest('#modifierOptions .toggle-btn');
      if(modeBtn){ setTimeout(()=>{ const label=(modeBtn.textContent||'').trim().toLowerCase(); const current=getSettings(); if(label==='confusable kana'){ localStorage.removeItem('modeAtlasActivePreset'); localStorage.removeItem('modeAtlasConfusableMode'); } else if(!current.confusableKana){ localStorage.removeItem('modeAtlasActivePreset'); } markActiveControls(); },60); }
    },true);
  }
  function updateThemeButtons(){
    const pref=localStorage.getItem('modeAtlasThemePreference')||'system';
    $$('[data-ma-theme-choice],.ma-qol-theme-btn').forEach(btn=>{ const val=btn.getAttribute('data-ma-theme-choice')||btn.dataset.theme||btn.textContent.trim().toLowerCase(); const on=val===pref; btn.classList.toggle('active',on); btn.setAttribute('aria-pressed',on?'true':'false'); });
  }
  function cleanIcons(){
    $$('.ma-ui-icon').forEach(x=>x.remove());
    $$('a,button,.nav-link,.study-link,.branch-link,.drawer-action,.profile-action').forEach(el=>{ Array.from(el.childNodes).forEach(node=>{ if(node.nodeType===3 && /^[\s▦◉◆↻!]+$/.test(node.textContent||'')) node.textContent=''; }); });
  }
  function boot(){ setPageClass(); applyConfusableFromHub(); ensurePresetPanel(); normaliseConfusableButton(); markActiveControls(); updateThemeButtons(); cleanIcons(); }
  window.ModeAtlas=window.ModeAtlas||{}; window.ModeAtlas.applyPracticePreset=applyPreset;
  bindClicks();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('pageshow',()=>setTimeout(boot,80));
  setInterval(()=>{ if(isTrainer){ normaliseConfusableButton(); markActiveControls(); } updateThemeButtons(); },1000);
})();
