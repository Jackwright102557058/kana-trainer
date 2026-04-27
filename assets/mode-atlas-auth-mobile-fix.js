(function ModeAtlasAuthMobileFix(){
  if (window.__modeAtlasAuthMobileFixLoaded) return;
  window.__modeAtlasAuthMobileFixLoaded = true;

  function all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function isSignedIn(){
    try { if (window.KanaCloudSync && typeof window.KanaCloudSync.getUser === 'function' && window.KanaCloudSync.getUser()) return true; } catch {}
    try {
      const names = all('#profileName,#drawerName,#studyProfileName,#identityName').map(function(el){ return (el.textContent || '').trim().toLowerCase(); });
      const emails = all('#profileEmail,#drawerEmail,#studyProfileEmail,#identityEmail').map(function(el){ return (el.textContent || '').trim().toLowerCase(); });
      if (emails.some(function(t){ return /@/.test(t) && !/not signed/.test(t); })) return true;
      if (names.some(function(t){ return t && t !== 'guest' && t !== 'user'; })) return true;
    } catch {}
    return false;
  }
  function classifyButton(el){
    if (!el || !el.textContent) return '';
    const txt = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    if (/^sign\s*in(\s+with\s+google)?$/.test(txt) || txt === 'login' || txt === 'log in') return 'in';
    if (/^sign\s*out$/.test(txt) || txt === 'logout' || txt === 'log out') return 'out';
    return '';
  }
  function setVisible(el, visible){
    if (!el) return;
    el.hidden = !visible;
    el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) {
      el.style.removeProperty('display');
      const tag = (el.tagName || '').toLowerCase();
      const wantsInline = tag === 'button' || tag === 'a';
      el.style.setProperty('display', wantsInline ? 'inline-flex' : 'block', 'important');
    } else {
      el.style.setProperty('display', 'none', 'important');
    }
  }
  function syncAuthButtons(){
    const signed = isSignedIn();
    document.documentElement.dataset.maSignedIn = signed ? 'true' : 'false';
    const signIn = all('#profileSignInBtn,#studyProfileSignIn,#identitySignInBtn,[data-profile-sign-in],[data-ma-sign-in]');
    const signOut = all('#profileSignOutBtn,#studyProfileSignOut,#identitySignOutBtn,[data-profile-sign-out],[data-ma-sign-out]');
    all('.profile-drawer button,#profileDrawer button,.drawer-panel button,.profile-overlay button,.drawer-actions button,.profile-actions button').forEach(function(btn){
      const kind = classifyButton(btn);
      if (kind === 'in' && signIn.indexOf(btn) === -1) signIn.push(btn);
      if (kind === 'out' && signOut.indexOf(btn) === -1) signOut.push(btn);
    });
    signIn.forEach(function(el){ el.setAttribute('data-profile-sign-in',''); setVisible(el, !signed); });
    signOut.forEach(function(el){ el.setAttribute('data-profile-sign-out',''); setVisible(el, signed); });
  }
  window.ModeAtlas = window.ModeAtlas || {};
  window.ModeAtlas.syncAuthButtons = syncAuthButtons;
  function start(){
    syncAuthButtons();
    setTimeout(syncAuthButtons, 120);
    setTimeout(syncAuthButtons, 650);
    setTimeout(syncAuthButtons, 1600);
    setInterval(syncAuthButtons, 1200);
    try {
      new MutationObserver(function(){ syncAuthButtons(); }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','hidden','class','aria-hidden'] });
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
  window.addEventListener('load', function(){ setTimeout(syncAuthButtons, 80); });
  window.addEventListener('online', syncAuthButtons);
  window.addEventListener('offline', syncAuthButtons);
})();
