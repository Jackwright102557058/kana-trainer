(function ModeAtlasAbout(){
  if (window.__modeAtlasAboutLoaded) return;
  window.__modeAtlasAboutLoaded = true;

  const APP_VERSION = '2.8.0-about';
  const SAVE_SCHEMA_VERSION = '3';
  const BUILD_LABEL = 'QOL About Build';
  const BUILD_DATE = '2026-04-27';
  const DEVELOPER = 'Jack Wright';

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function fmtDate(ts){
    const n = Number(ts || 0);
    if (!Number.isFinite(n) || !n) return 'Never';
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return 'Never';
    return d.toLocaleString([], { hour:'numeric', minute:'2-digit', day:'numeric', month:'short', year:'numeric' });
  }
  function safeJSON(key, fallback){ try{ const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; } }
  function latestTimestamp(keys){
    let best = 0;
    keys.forEach(k=>{
      const n = Number(localStorage.getItem(k) || 0);
      if (Number.isFinite(n) && n > best) best = n;
    });
    return best;
  }
  function getCloudStatus(){
    const user = window.KanaCloudSync?.getUser?.() || window.currentUser || null;
    const signedIn = !!user;
    const online = navigator.onLine !== false;
    const lastSync = latestTimestamp([
      'modeAtlasLastCloudSyncAt','modeAtlasLastSyncCheck','cloudReadingUpdatedAt','cloudWritingUpdatedAt','testModeResultsUpdatedAt','readingTestModeResultsUpdatedAt','writingTestModeResultsUpdatedAt','kanaWordBankUpdatedAt'
    ]);
    let mode = 'Local only';
    let status = 'Local saving active';
    if (signedIn && online){ mode = 'Cloud + local'; status = 'Cloud available'; }
    else if (signedIn && !online){ mode = 'Cloud account offline'; status = 'No cloud access'; }
    return { signedIn, online, mode, status, lastSync };
  }
  function getAppInfo(){
    const cloud = getCloudStatus();
    return {
      version: APP_VERSION,
      saveSchema: SAVE_SCHEMA_VERSION,
      build: BUILD_LABEL,
      buildDate: BUILD_DATE,
      page: (location.pathname.split('/').pop() || 'index.html'),
      theme: localStorage.getItem('modeAtlasThemePreference') || 'dark',
      saveMode: cloud.mode,
      cloudStatus: cloud.status,
      signedIn: cloud.signedIn ? 'Yes' : 'No',
      online: cloud.online ? 'Yes' : 'No',
      lastCloudSync: fmtDate(cloud.lastSync),
      localSaveUpdated: fmtDate(latestTimestamp([
        'settingsUpdatedAt','resultsUpdatedAt','srsUpdatedAt','dailyUpdatedAt','profileUpdatedAt','modeAtlasLastSyncCheck','kanaWordBankUpdatedAt'
      ])),
      pwaReady: ('serviceWorker' in navigator) ? 'Supported' : 'Not supported in this browser',
      storage: (()=>{ try{ localStorage.setItem('__ma_probe','1'); localStorage.removeItem('__ma_probe'); return 'Available'; }catch{return 'Blocked';} })()
    };
  }

  const whatsNewItems = [
    'Added About Mode Atlas with version, save schema, app status, legal notes, and developer credit.',
    'Moved What’s New into About to keep the profile menu cleaner.',
    'Kept detailed diagnostics behind the protected dev menu.'
  ];

  function ensureAboutModal(){
    let backdrop = $('#maAboutBackdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'maAboutBackdrop';
    backdrop.className = 'ma-about-backdrop';
    backdrop.innerHTML = `
      <section class="ma-about-modal" role="dialog" aria-modal="true" aria-labelledby="maAboutTitle">
        <div class="ma-about-hero">
          <div class="ma-about-mark">かな</div>
          <div>
            <div class="ma-about-kicker">Mode Atlas</div>
            <h2 id="maAboutTitle">About Mode Atlas</h2>
            <p>Japanese study tools for kana recognition, recall, review, and future learning branches.</p>
          </div>
          <button type="button" class="ma-about-close" data-ma-about-close aria-label="Close About">Close</button>
        </div>

        <div class="ma-about-tabs" role="tablist" aria-label="About sections">
          <button type="button" class="active" data-ma-about-tab="overview">Overview</button>
          <button type="button" data-ma-about-tab="whatsnew">What’s new</button>
          <button type="button" data-ma-about-tab="legal">Legal</button>
        </div>

        <div class="ma-about-panel active" data-ma-about-panel="overview">
          <div class="ma-about-grid">
            <article class="ma-about-card"><span>App version</span><strong data-ma-info="version"></strong><small>Current app release installed in this build.</small></article>
            <article class="ma-about-card"><span>Save schema</span><strong data-ma-info="saveSchema"></strong><small>Used for local/cloud save migration compatibility.</small></article>
            <article class="ma-about-card"><span>Build</span><strong data-ma-info="build"></strong><small data-ma-info="buildDate"></small></article>
            <article class="ma-about-card"><span>PWA support</span><strong data-ma-info="pwaReady"></strong><small>Install/offline support depends on browser and hosting.</small></article>
          </div>

          <div class="ma-about-section">
            <h3>Save & sync status</h3>
            <div class="ma-about-table">
              <div><span>Save mode</span><strong data-ma-info="saveMode"></strong></div>
              <div><span>Cloud status</span><strong data-ma-info="cloudStatus"></strong></div>
              <div><span>Signed in</span><strong data-ma-info="signedIn"></strong></div>
              <div><span>Online</span><strong data-ma-info="online"></strong></div>
              <div><span>Last cloud sync</span><strong data-ma-info="lastCloudSync"></strong></div>
              <div><span>Local save updated</span><strong data-ma-info="localSaveUpdated"></strong></div>
              <div><span>Storage access</span><strong data-ma-info="storage"></strong></div>
              <div><span>Theme preference</span><strong data-ma-info="theme"></strong></div>
            </div>
          </div>

          <div class="ma-about-section ma-about-credit">
            <h3>Developer</h3>
            <p><strong>Created by ${DEVELOPER}</strong></p>
            <p>Designed and built as an evolving personal Japanese study ecosystem.</p>
            <p class="ma-about-muted">© 2026 ${DEVELOPER}. All rights reserved.</p>
          </div>
        </div>

        <div class="ma-about-panel" data-ma-about-panel="whatsnew">
          <div class="ma-about-section">
            <h3>What’s new in this build</h3>
            <p class="ma-about-muted">This panel replaces the old standalone Profile menu button. It can be opened any time from About.</p>
            <ul class="ma-about-list">${whatsNewItems.map(item=>`<li>${item}</li>`).join('')}</ul>
            <button type="button" class="ma-about-primary" data-ma-open-legacy-whats-new>Open full QOL changelog</button>
          </div>
        </div>

        <div class="ma-about-panel" data-ma-about-panel="legal">
          <div class="ma-about-section">
            <h3>Privacy & data</h3>
            <p>Mode Atlas stores learning progress locally on this device unless you sign in and enable cloud sync.</p>
            <p>Local backups are user-controlled exports. Importing a backup should merge with newer local/cloud sections rather than blindly replacing current progress.</p>
          </div>
          <div class="ma-about-section">
            <h3>Disclaimer</h3>
            <p>Mode Atlas is a study aid. It is not an official language certification tool and does not guarantee language proficiency outcomes.</p>
          </div>
          <div class="ma-about-section">
            <h3>Credits & ownership</h3>
            <p>Mode Atlas, its app structure, and learning interface are developed by ${DEVELOPER}. Japanese kana characters are part of the Japanese writing system and are not proprietary.</p>
          </div>
        </div>
      </section>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e)=>{
      if (e.target === backdrop || e.target.closest('[data-ma-about-close]')) closeAbout();
      const tab = e.target.closest('[data-ma-about-tab]');
      if (tab) switchAboutTab(tab.dataset.maAboutTab);
      if (e.target.closest('[data-ma-open-legacy-whats-new]')) {
        e.preventDefault();
        if (window.ModeAtlas?.showWhatsNew) window.ModeAtlas.showWhatsNew();
      }
    });
    return backdrop;
  }
  function switchAboutTab(name){
    const b = ensureAboutModal();
    $all('[data-ma-about-tab]', b).forEach(btn=>btn.classList.toggle('active', btn.dataset.maAboutTab === name));
    $all('[data-ma-about-panel]', b).forEach(panel=>panel.classList.toggle('active', panel.dataset.maAboutPanel === name));
  }
  function renderAbout(){
    const b = ensureAboutModal();
    const info = getAppInfo();
    Object.entries(info).forEach(([key,val])=>{
      $all(`[data-ma-info="${key}"]`, b).forEach(node=>{ node.textContent = String(val); });
    });
  }
  function openAbout(tab='overview'){
    renderAbout();
    switchAboutTab(tab);
    ensureAboutModal().classList.add('open');
  }
  function closeAbout(){ const b=$('#maAboutBackdrop'); if(b) b.classList.remove('open'); }

  function installProfileButton(){
    const drawers = $all('.profile-drawer,#profileDrawer,.profile-overlay aside,.drawer-panel');
    drawers.forEach(drawer=>{
      // Remove direct What’s New buttons where possible; About now owns it.
      $all('[data-ma-whats-new],#maWhatsNewProfileBtn', drawer).forEach(btn=>btn.remove());

      // The QOL profile App panel owns the visible About button. Older builds
      // injected a second standalone button near the top of the drawer, so keep
      // only About buttons that live inside the App/tools panel.
      $all('[data-ma-about-open]', drawer).forEach(btn=>{
        if (!btn.closest('.ma-tools-panel')) btn.remove();
      });
    });
  }

  document.addEventListener('click', (e)=>{
    if (e.target.closest('[data-ma-about-open]')) { e.preventDefault(); openAbout(); }
  }, true);

  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.openAbout = openAbout;
  window.ModeAtlas.appInfo = getAppInfo;

  function boot(){ installProfileButton(); setTimeout(installProfileButton, 800); setTimeout(installProfileButton, 1800); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  new MutationObserver(()=>installProfileButton()).observe(document.documentElement,{childList:true,subtree:true});
})();
