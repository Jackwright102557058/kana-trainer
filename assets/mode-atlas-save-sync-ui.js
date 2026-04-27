(function ModeAtlasUnifiedSaveSyncUi(){
  if (window.__modeAtlasUnifiedSaveSyncUiLoaded) return;
  window.__modeAtlasUnifiedSaveSyncUiLoaded = true;

  const SECTION_HTML = '<div class="ma-save-title">Save / Load</div>' +
    '<div class="ma-save-grid">' +
      '<button class="drawer-action primary" type="button" data-ma-unified-export>Export save</button>' +
      '<button class="drawer-action" type="button" data-ma-unified-copy>Copy save</button>' +
      '<button class="drawer-action" type="button" data-ma-unified-import>Import save</button>' +
      '<button class="drawer-action danger" type="button" data-ma-unified-reset>Reset data</button>' +
    '</div>' +
    '<input type="file" accept=".json,application/json" data-ma-unified-file style="display:none" />' +
    '<div class="ma-save-note">Backups merge by newest section: newer backup data updates cloud/local data, but newer cloud data is kept.</div>';

  const RESET_WARNING = 'Reset all Mode Atlas data?\n\nThis clears local save data on this device. If you are signed in and cloud is available, it also clears the cloud save data for this account. This cannot be undone.';

  function fallbackBackup(){
    const data = {};
    const block = /^(firebase:|firestore|google|__|debug|devtools)/i;
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || block.test(k)) continue;
      data[k] = localStorage.getItem(k);
    }
    return { app: 'Mode Atlas', version: 2, exportedAt: new Date().toISOString(), data };
  }

  function getBackup(){
    try { return window.KanaCloudSync?.createBackup?.() || fallbackBackup(); }
    catch { return fallbackBackup(); }
  }

  function setStatus(message){
    document.querySelectorAll('#profileStatus,#studyProfileStatus,#identityStatus,#wordBankCloudStatus').forEach((el) => {
      if (el) el.textContent = message;
    });
  }

  function downloadBackup(){
    const backup = getBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mode-atlas-save-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Save exported.');
    refreshSyncPills();
  }

  async function copyBackup(){
    const txt = JSON.stringify(getBackup(), null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      setStatus('Save copied.');
    } catch {
      downloadBackup();
    }
    refreshSyncPills();
  }

  async function importBackupFile(file){
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text || '{}');
      setStatus('Checking backup against current save data...');
      let message = 'Save imported.';
      if (window.KanaCloudSync?.importLocalBackup) {
        const result = await window.KanaCloudSync.importLocalBackup(parsed);
        message = window.KanaCloudSync.describeImportResult?.(result) || message;
      } else {
        const data = parsed.data || parsed.localStorage || parsed;
        Object.entries(data || {}).forEach(([k,v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
        message = 'Save imported locally. Log in to cloud save after reload.';
      }
      alert(message);
      setStatus('Save imported. Reloading...');
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.warn('Save import failed.', error);
      alert('Import failed. Please choose a valid Mode Atlas save file.');
      setStatus('Import failed.');
    }
  }

  async function resetData(){
    if (!confirm(RESET_WARNING)) return;
    try {
      setStatus('Resetting save data...');
      if (window.KanaCloudSync?.ready) await window.KanaCloudSync.ready;
      if (window.KanaCloudSync?.resetAllData) await window.KanaCloudSync.resetAllData();
      else { localStorage.clear(); sessionStorage.clear(); }
      location.href = 'index.html';
    } catch (error) {
      console.warn('Reset failed.', error);
      alert('Reset failed. Please check your connection and try again.');
      setStatus('Reset failed.');
    }
  }

  function statusFallback(){
    const user = window.KanaCloudSync?.getUser?.();
    const lastSync = Number(localStorage.getItem('modeAtlasLastCloudSyncAt') || 0);
    if (!user) return { tone: 'local', text: 'Local saving · log in for cloud save' };
    if (navigator.onLine === false) return { tone: 'warning', text: 'No cloud access · last sync ' + (lastSync ? new Date(lastSync).toLocaleString([], { hour:'numeric', minute:'2-digit', day:'numeric', month:'numeric', year:'2-digit' }) : 'never') };
    return { tone: 'ok', text: 'Cloud save synced' };
  }

  function getSyncStatus(){
    try { return window.KanaCloudSync?.getSyncStatus?.() || statusFallback(); }
    catch { return statusFallback(); }
  }

  function refreshSyncPills(){
    const st = getSyncStatus();
    const targets = document.querySelectorAll('#profileStatus,#studyProfileStatus,#identityStatus');
    targets.forEach((target) => {
      if (!target) return;
      const parent = target.parentElement || document;
      const pills = Array.from(parent.querySelectorAll(':scope > .ma-sync-pill, :scope > #maSyncPill'));
      let pill = pills[0] || document.getElementById('maSyncPill') || null;
      pills.slice(1).forEach((extra) => extra.remove());
      if (!pill || !parent.contains(pill)) {
        pill = document.createElement('div');
        pill.className = 'ma-sync-pill';
        target.insertAdjacentElement('afterend', pill);
      }
      pill.id = 'maSyncPill';
      pill.classList.add('ma-sync-pill');
      if (pill.textContent !== st.text) pill.textContent = st.text;
      const tone = st.tone || st.state || 'neutral';
      if (!pill.classList.contains(tone)) {
        pill.classList.remove('ok','warning','local','neutral','cloud','offline');
        pill.classList.add(tone);
      }
    });
    const canonical = document.getElementById('maSyncPill');
    document.querySelectorAll('.ma-sync-pill').forEach((pill) => {
      if (canonical && pill !== canonical && pill.parentElement?.querySelector('#profileStatus,#studyProfileStatus,#identityStatus')) {
        pill.remove();
        return;
      }
      if (pill.textContent !== st.text) pill.textContent = st.text;
      const tone = st.tone || st.state || 'neutral';
      if (!pill.classList.contains(tone)) {
        pill.classList.remove('ok','warning','local','neutral','cloud','offline');
        pill.classList.add(tone);
      }
    });
  }

  function ensureStyle(){
    if (document.getElementById('ma-unified-save-sync-style')) return;
    const style = document.createElement('style');
    style.id = 'ma-unified-save-sync-style';
    style.textContent = '.ma-save-section{display:block!important;margin-top:14px!important;padding:14px!important;border-radius:18px!important;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.08)!important}.ma-save-title{font-weight:900;font-size:14px;margin-bottom:10px}.ma-save-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}.ma-save-grid button{width:100%;min-height:42px}.ma-save-grid .danger{border-color:rgba(255,107,107,.38)!important;color:#ffd6d6!important;background:rgba(255,107,107,.08)!important}.ma-save-note{margin-top:10px;color:var(--muted,#9aa3b8);font-size:12px;line-height:1.45}.ma-sync-pill{display:inline-flex;align-items:center;justify-content:center;margin-top:10px;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:var(--muted,#9aa3b8)}.ma-sync-pill.ok,.ma-sync-pill.cloud{border-color:rgba(89,210,120,.34);background:rgba(89,210,120,.12);color:#bcf7cb}.ma-sync-pill.warning,.ma-sync-pill.offline{border-color:rgba(255,176,64,.40);background:rgba(255,176,64,.12);color:#ffe0aa}.ma-sync-pill.local,.ma-sync-pill.neutral{border-color:rgba(102,168,255,.34);background:rgba(102,168,255,.11);color:#d7e8ff}@media(max-width:640px){.ma-save-grid{grid-template-columns:1fr!important}}';
    document.head.appendChild(style);
  }

  function rebuildSaveSections(){
    ensureStyle();
    const drawers = document.querySelectorAll('.profile-drawer,#profileDrawer,.profile-overlay aside');
    drawers.forEach((drawer) => {
      const existing = drawer.querySelector('.ma-save-section [data-ma-unified-export]')?.closest('.ma-save-section');
      if (existing) {
        drawer.querySelectorAll('.ma-save-section').forEach((old) => { if (old !== existing) old.remove(); });
        return;
      }
      drawer.querySelectorAll('.ma-save-section').forEach((old) => old.remove());
      const actions = drawer.querySelector('.profile-actions,.drawer-actions') || drawer;
      const section = document.createElement('div');
      section.className = 'ma-save-section';
      section.innerHTML = SECTION_HTML;
      const actionClass = actions.classList.contains('profile-actions') ? 'profile-action' : 'drawer-action';
      section.querySelectorAll('button').forEach((btn) => {
        btn.classList.remove('drawer-action','profile-action');
        btn.classList.add(actionClass);
        if (btn.hasAttribute('data-ma-unified-export')) btn.classList.add('primary');
        if (btn.hasAttribute('data-ma-unified-reset')) btn.classList.add('danger');
      });
      actions.insertAdjacentElement('afterend', section);
    });
    refreshSyncPills();
  }

  document.addEventListener('click', (event) => {
    const exportBtn = event.target.closest('[data-ma-unified-export]');
    const copyBtn = event.target.closest('[data-ma-unified-copy]');
    const importBtn = event.target.closest('[data-ma-unified-import]');
    const resetBtn = event.target.closest('[data-ma-unified-reset]');
    if (!exportBtn && !copyBtn && !importBtn && !resetBtn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (exportBtn) downloadBackup();
    if (copyBtn) copyBackup();
    if (importBtn) importBtn.closest('.ma-save-section')?.querySelector('[data-ma-unified-file]')?.click();
    if (resetBtn) resetData();
  }, true);

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-ma-unified-file]');
    if (!input) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    importBackupFile(input.files && input.files[0]);
    input.value = '';
  }, true);

  function boot(){
    rebuildSaveSections();
    setTimeout(rebuildSaveSections, 300);
    setTimeout(rebuildSaveSections, 1200);
    setTimeout(refreshSyncPills, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('kanaCloudSyncStatusChanged', refreshSyncPills);
  window.addEventListener('online', refreshSyncPills);
  window.addEventListener('offline', refreshSyncPills);
  setInterval(refreshSyncPills, 30000);
  // Profile drawers are built during initial page load; avoid a document-wide observer here, because status text updates can retrigger it continuously.
})();
