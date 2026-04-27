(function ModeAtlasSingleAuthButton(){
  if (window.__modeAtlasSingleAuthButtonLoaded) return;
  window.__modeAtlasSingleAuthButtonLoaded = true;

  const SIGN_IN_SELECTORS = '#profileSignInBtn,#studyProfileSignIn,#identitySignInBtn,[data-profile-sign-in],[data-ma-sign-in]';
  const SIGN_OUT_SELECTORS = '#profileSignOutBtn,#studyProfileSignOut,#identitySignOutBtn,[data-profile-sign-out],[data-ma-sign-out]';
  const DRAWER_SELECTORS = '.profile-drawer,#profileDrawer,.profile-overlay,.drawer-panel,.profile-modal,.profile-menu';

  function all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function getUser(){ try { return window.KanaCloudSync && typeof window.KanaCloudSync.getUser === 'function' ? window.KanaCloudSync.getUser() : null; } catch { return null; } }
  function signedIn(){ return !!getUser(); }
  function findByText(root, re){ return all('button,a', root).filter(el => re.test((el.textContent || '').replace(/\s+/g, ' ').trim())); }
  function hideAndDisable(el){
    if (!el) return;
    el.hidden = true;
    el.disabled = true;
    el.setAttribute('aria-hidden','true');
    el.setAttribute('tabindex','-1');
    el.style.setProperty('display','none','important');
    el.classList.add('ma-auth-removed');
  }
  function makeAuthButton(btn){
    if (!btn) return;
    btn.hidden = false;
    btn.disabled = false;
    btn.removeAttribute('aria-hidden');
    btn.removeAttribute('tabindex');
    btn.style.setProperty('display','inline-flex','important');
    btn.setAttribute('data-ma-auth-main','');
    btn.removeAttribute('data-profile-sign-in');
    btn.removeAttribute('data-profile-sign-out');
    btn.removeAttribute('data-ma-sign-in');
    btn.removeAttribute('data-ma-sign-out');
    btn.textContent = signedIn() ? 'Sign out' : 'Sign in';
    btn.classList.toggle('primary', !signedIn());
  }
  function chooseMainButton(root){
    const candidates = all(SIGN_IN_SELECTORS + ',[data-ma-auth-main]', root).filter(el => !el.classList.contains('ma-auth-removed'));
    if (candidates.length) return candidates[0];
    const textMatches = findByText(root, /^(sign in(?: with google)?|log in|login|sign out|logout|log out)$/i).filter(el => !el.classList.contains('ma-auth-removed'));
    return textMatches[0] || null;
  }
  function syncOne(root){
    const main = chooseMainButton(root);
    const removable = all(SIGN_OUT_SELECTORS, root).concat(findByText(root, /^(sign out|logout|log out)$/i));
    removable.forEach(el => { if (el !== main) hideAndDisable(el); });
    const extraSignIns = all(SIGN_IN_SELECTORS, root).concat(findByText(root, /^(sign in(?: with google)?|log in|login)$/i));
    extraSignIns.forEach(el => { if (main && el !== main) hideAndDisable(el); });
    if (main) makeAuthButton(main);
  }
  function sync(){
    const roots = all(DRAWER_SELECTORS);
    if (roots.length) roots.forEach(syncOne);
    else syncOne(document);
    try {
      const user = getUser();
      const name = user && (user.displayName || user.email);
      if (name) all('#profileName,#drawerName,#studyProfileName,#identityName').forEach(el => { el.textContent = name; });
      if (user && user.email) all('#profileEmail,#drawerEmail,#studyProfileEmail,#identityEmail').forEach(el => { el.textContent = user.email; });
    } catch {}
  }
  async function runAuthAction(){
    const cloud = window.KanaCloudSync;
    if (!cloud) return;
    try {
      if (signedIn()) await cloud.signOut?.();
      else await cloud.signInWithGoogle?.();
    } finally {
      setTimeout(sync, 80);
      setTimeout(sync, 600);
    }
  }
  document.addEventListener('click', function(e){
    const btn = e.target && e.target.closest && e.target.closest('[data-ma-auth-main]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    runAuthAction();
  }, true);

  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.syncSingleAuthButton = sync;
  function start(){
    sync();
    [80,250,750,1500,3000].forEach(t => setTimeout(sync, t));
    setInterval(sync, 1500);
    try { new MutationObserver(sync).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','hidden','class','aria-hidden'] }); } catch {}
    window.addEventListener('kanaCloudSyncStatusChanged', sync);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
