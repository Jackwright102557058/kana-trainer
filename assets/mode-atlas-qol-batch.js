
/* === Mode Atlas QOL batch: settings structure, achievements, mistake review, import preview, PWA, changelog, speed run, empty states === */
(function ModeAtlasQolBatch(){
  if (window.__modeAtlasQolBatchLoaded) return;
  window.__modeAtlasQolBatchLoaded = true;

  const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const IS_TRAINER = PAGE === 'default.html' || PAGE === 'reverse.html';
  const IS_WRITING = PAGE === 'reverse.html';
  const SETTINGS_KEY = IS_WRITING ? 'reverseSettings' : 'settings';
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const readJSON = (k,f)=>{ try{ const raw=localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch { return f; } };
  const writeJSON = (k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const now = ()=>Date.now();

  const HIRA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
  const KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフホマミムメモヤユヨラリルレロワヲン'.split('');
  const CONFUSABLE = ['シ','ツ','ソ','ン','ぬ','め','れ','わ','ね','ク','ケ','タ','ナ','メ'];
  const CONF_HIRA_ROWS = ['h_na','h_ma','h_ra','h_wa'];
  const CONF_KATA_ROWS = ['k_sa','k_ta','k_ka','k_na','k_ma','k_wa'];
  const HIRA_ROWS = ['h_a','h_ka','h_sa','h_ta','h_na','h_ha','h_ma','h_ya','h_ra','h_wa'];
  const KATA_ROWS = ['k_a','k_ka','k_sa','k_ta','k_na','k_ha','k_ma','k_ya','k_ra','k_wa'];

  function toast(message, type='info'){
    try { if (window.ModeAtlas?.toast) return window.ModeAtlas.toast(message, type, 2800); } catch {}
    let wrap = $('.ma-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className='ma-toast-wrap'; document.body.appendChild(wrap); }
    const node = document.createElement('div');
    node.className = 'ma-toast ' + type;
    node.textContent = message;
    wrap.appendChild(node);
    setTimeout(()=>{ node.style.opacity='0'; setTimeout(()=>node.remove(),260); }, 2800);
  }

  function sectionTS(key){ try{ localStorage.setItem(key, String(now())); }catch{} }
  function trainerSettings(){
    let s = readJSON(SETTINGS_KEY, {});
    try { if (typeof settings === 'object' && settings) s = Object.assign({}, s, settings); } catch {}
    return s || {};
  }
  function persistTrainerSettings(next){
    try { if (typeof settings === 'object' && settings) Object.assign(settings, next); } catch {}
    writeJSON(SETTINGS_KEY, next);
    sectionTS('settingsUpdatedAt');
    try { window.KanaCloudSync?.markSectionUpdated?.(IS_WRITING ? 'writing' : 'reading'); window.KanaCloudSync?.scheduleSync?.(); } catch {}
  }
  function refreshTrainer(){
    try{ if (typeof rebuildCharMap === 'function') rebuildCharMap(); }catch{}
    try{ if (typeof ensureDataObjects === 'function') ensureDataObjects(); }catch{}
    try{ if (typeof buildModifierButtons === 'function') buildModifierButtons(); }catch{}
    try{ if (typeof buildRows === 'function' && typeof hiraganaRows === 'object') { buildRows('rowOptions', hiraganaRows, 'hiraganaRows', 'h_'); buildRows('katakanaRowOptions', katakanaRows, 'katakanaRows', 'k_'); } }catch{}
    try{ if (typeof updateTrialConfigVisibility === 'function') updateTrialConfigVisibility(); }catch{}
    try{ if (typeof updateTopStats === 'function') updateTopStats(); }catch{}
    try{ if (typeof renderHeatmap === 'function') renderHeatmap(); }catch{}
    try{ if (typeof renderScoreHistory === 'function') renderScoreHistory(); }catch{}
    try{ if (typeof saveAll === 'function') saveAll(); }catch{}
    setTimeout(markPresetActive, 30);
  }

  function makeBtn(label, active, onClick, disabled=false){
    const b=document.createElement('button');
    b.type='button';
    b.className='toggle-btn ma-structured-toggle' + (active?' active':'') + (disabled?' disabled':'');
    b.textContent=label;
    b.setAttribute('aria-pressed', active?'true':'false');
    b.disabled=!!disabled;
    b.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); if(!disabled) onClick(); });
    return b;
  }

  function modeToggle(key){
    let s = trainerSettings();
    if(key === 'speedRun'){
      s.speedRun = !s.speedRun;
      if(s.speedRun){ s.endless=false; s.timeTrial=false; s.dailyChallenge=false; s.testMode=false; s.comboKana=false; }
    } else if (key === 'timeTrial') {
      s.timeTrial = !s.timeTrial;
      if(s.timeTrial){ s.endless=false; s.dailyChallenge=false; s.testMode=false; s.speedRun=false; }
    } else if (key === 'endless') {
      s.endless = !s.endless;
      if(s.endless){ s.timeTrial=false; s.dailyChallenge=false; s.testMode=false; s.speedRun=false; }
    } else if (key === 'dailyChallenge') {
      s.dailyChallenge = !s.dailyChallenge;
      if(s.dailyChallenge){ s.timeTrial=false; s.endless=false; s.testMode=false; s.comboKana=false; s.speedRun=false; s.hint=false; }
    } else if (key === 'testMode') {
      s.testMode = !s.testMode;
      if(s.testMode){ s.timeTrial=false; s.endless=false; s.dailyChallenge=false; s.comboKana=false; s.speedRun=false; s.hint=false; }
    } else if (key === 'comboKana') {
      s.comboKana = !s.comboKana;
      if(s.comboKana){ s.dailyChallenge=false; s.testMode=false; s.speedRun=false; }
    } else if (key === 'confusableKana') {
      s.confusableKana = !s.confusableKana;
      if(s.confusableKana){
        s.hiraganaRows = CONF_HIRA_ROWS.slice();
        s.katakanaRows = CONF_KATA_ROWS.slice();
        s.dakuten=false; s.yoon=false; s.extendedKatakana=false;
        s.dailyChallenge=false; s.testMode=false; s.comboKana=false;
      }
    } else {
      s[key] = !s[key];
    }
    localStorage.removeItem('modeAtlasActivePreset');
    persistTrainerSettings(s);
    refreshTrainer();
  }

  function applyPreset(id){
    const allHira = (typeof hiraganaRows === 'object' && hiraganaRows) ? Object.keys(hiraganaRows) : HIRA_ROWS;
    const allKata = (typeof katakanaRows === 'object' && katakanaRows) ? Object.keys(katakanaRows) : KATA_ROWS;
    const presets = {
      starter:{hint:true,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:['h_a'],katakanaRows:[]},
      intermediate:{hint:false,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:allHira,katakanaRows:[]},
      advanced:{hint:false,dakuten:true,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:allHira,katakanaRows:allKata},
      pro:{hint:false,dakuten:true,yoon:true,extendedKatakana:true,confusableKana:false,hiraganaRows:allHira,katakanaRows:allKata}
    };
    if(!presets[id]) return;
    const s = Object.assign({}, trainerSettings(), {
      srs:true, focusWeak:false, endless:false, timeTrial:false, dailyChallenge:false, testMode:false, comboKana:false, speedRun:false,
      statsVisible:true, scoresVisible:true, activeBottomTab:'modifiers', optionsOpen:false
    }, presets[id]);
    localStorage.setItem('modeAtlasActivePreset', id);
    localStorage.removeItem('modeAtlasConfusableMode');
    persistTrainerSettings(s);
    refreshTrainer();
    toast(`${presets[id].hint ? 'Starter' : id[0].toUpperCase()+id.slice(1)} preset applied.`, 'ok');
  }

  function matchesPreset(id){
    const s=trainerSettings();
    const allHira = (typeof hiraganaRows === 'object' && hiraganaRows) ? Object.keys(hiraganaRows) : HIRA_ROWS;
    const allKata = (typeof katakanaRows === 'object' && katakanaRows) ? Object.keys(katakanaRows) : KATA_ROWS;
    const presets = {
      starter:{hint:true,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:['h_a'],katakanaRows:[]},
      intermediate:{hint:false,dakuten:false,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:allHira,katakanaRows:[]},
      advanced:{hint:false,dakuten:true,yoon:false,extendedKatakana:false,confusableKana:false,hiraganaRows:allHira,katakanaRows:allKata},
      pro:{hint:false,dakuten:true,yoon:true,extendedKatakana:true,confusableKana:false,hiraganaRows:allHira,katakanaRows:allKata}
    };
    const p=presets[id]; if(!p) return false;
    const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.slice().sort().join('|')===b.slice().sort().join('|');
    return ['hint','dakuten','yoon','extendedKatakana','confusableKana'].every(k=>!!s[k]===!!p[k]) && same(s.hiraganaRows,p.hiraganaRows) && same(s.katakanaRows,p.katakanaRows);
  }

  function markPresetActive(){
    if(!IS_TRAINER) return;
    const active=localStorage.getItem('modeAtlasActivePreset') || '';
    $$('[data-preset]').forEach(btn=>{
      const on = active && btn.dataset.preset===active && matchesPreset(active);
      btn.classList.toggle('active', !!on);
      btn.setAttribute('aria-pressed', on?'true':'false');
    });
  }

  function installStructuredModifierMenu(){
    if(!IS_TRAINER) return;
    const content=$('#modifiersContent'); const stack=$('.options-stack', content); const mod=$('#modifierOptions');
    if(!content || !stack || !mod) return;
    const old=window.buildModifierButtons || (typeof buildModifierButtons === 'function' ? buildModifierButtons : null);

    window.buildModifierButtons = buildModifierButtons = function(){
      const s=trainerSettings();
      let presetPanel=$('#maPresetMenu');
      if(!presetPanel){
        presetPanel=document.createElement('div');
        presetPanel.id='maPresetMenu';
        presetPanel.className='ma-settings-section ma-preset-menu';
        stack.insertBefore(presetPanel, stack.firstChild);
      }
      presetPanel.innerHTML = `
        <div class="section-title">Practice presets</div>
        <div class="ma-preset-grid">
          ${[
            ['starter','Starter','A-row with hints'],
            ['intermediate','Intermediate','All Hiragana, no hints'],
            ['advanced','Advanced','Hiragana + Katakana + Dakuten'],
            ['pro','Pro','Everything enabled']
          ].map(([id,title,desc])=>`<button type="button" class="ma-preset-btn" data-preset="${id}"><span>${title}</span><small>${desc}</small></button>`).join('')}
        </div>`;

      const groups=[
        ['Question flow', [
          ['srs','SRS'], ['endless','Endless'], ['timeTrial','Time Trial'], ['speedRun','Speed Run'], ['dailyChallenge','Daily Challenge'], ['testMode','Test Mode']
        ]],
        ['Practice focus', [
          ['hint','Hint Mode'], ['comboKana','Combo Kana'], ['focusWeak','Focus Weak'], ['confusableKana','Confusable Kana']
        ]],
        ['Content modifiers', [
          ['dakuten','Dakuten'], ['yoon','Yōon'], ['extendedKatakana','Extended Katakana']
        ]]
      ];
      mod.innerHTML='';
      mod.classList.add('ma-structured-modifiers');
      groups.forEach(([title,items])=>{
        const section=document.createElement('div');
        section.className='ma-modifier-group';
        const head=document.createElement('div');
        head.className='ma-modifier-group-title';
        head.textContent=title;
        const grid=document.createElement('div');
        grid.className='ma-modifier-group-grid';
        items.forEach(([key,label])=>grid.appendChild(makeBtn(label, !!s[key], ()=>modeToggle(key))));
        section.append(head,grid);
        mod.appendChild(section);
      });
      markPresetActive();
    };

    document.addEventListener('click', e=>{
      const preset=e.target.closest?.('[data-preset]');
      if(preset){ e.preventDefault(); e.stopPropagation(); applyPreset(preset.dataset.preset); }
    }, true);

    try{ buildModifierButtons(); }catch{ if(old) old(); }
  }

  function currentWrongList(){
    try{
      const per = sessionStats?.perChar || {};
      return Object.entries(per).filter(([_,d])=>Number(d.wrong||0)>0).map(([ch])=>ch);
    }catch{return [];}
  }

  function installSessionUpgrades(){
    if(!IS_TRAINER) return;
    try{
      if(window.__maSessionUpgradesDone) return;
      window.__maSessionUpgradesDone=true;

      const originalNext = nextCharacter;
      const originalStart = startSession;
      const originalShowModal = showSessionModal;

      window.__maMistakeReview = {active:false, list:[], index:0};
      window.__maSpeedRunTarget = 20;

      nextCharacter = function(){
        const review=window.__maMistakeReview;
        const s=trainerSettings();
        if(review?.active){
          if(!sessionStarted) return;
          if(review.index >= review.list.length){
            review.active=false;
            endSession(true);
            return;
          }
          clearHint?.();
          closePopup?.();
          inputEl.value='';
          currentChar=review.list[review.index++];
          hiraganaEl.textContent=currentChar;
          hiraganaEl.classList.remove('flash-correct','flash-wrong');
          charStartTime=Date.now();
          gameOverTitleEl.textContent='Wrong';
          gameOverAnswerEl.textContent='';
          inputEl.disabled=false;
          inputEl.focus();
          return;
        }
        if(s.speedRun && sessionStarted && sessionStats && sessionStats.answered >= window.__maSpeedRunTarget){
          endSession(true);
          return;
        }
        return originalNext.apply(this, arguments);
      };

      startSession = function(){
        const s=trainerSettings();
        if(s.speedRun){
          const next=Object.assign({}, s, {endless:true,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false});
          persistTrainerSettings(next);
        }
        return originalStart.apply(this, arguments);
      };
      if(startBtn){
        startBtn.replaceWith(startBtn.cloneNode(true));
        const newStart=$('#startBtn');
        if(newStart) newStart.addEventListener('click', startSession);
      }

      showSessionModal = function(autoEnded=false){
        originalShowModal.call(this, autoEnded);
        renderSessionActions(autoEnded);
      };

      function renderSessionActions(autoEnded){
        const actions = sessionModalBackdrop?.querySelector('.modal-actions');
        if(!actions) return;
        let enhanced = $('#maSessionActionPanel', actions);
        if(!enhanced){
          enhanced=document.createElement('div');
          enhanced.id='maSessionActionPanel';
          enhanced.className='ma-session-actions-pro';
          actions.insertBefore(enhanced, actions.firstChild);
        }
        const wrong=currentWrongList();
        const title = trainerSettings().speedRun ? 'Speed run complete' : (autoEnded ? 'Session complete' : 'Session ended');
        enhanced.innerHTML = `
          <div class="ma-session-summary">
            <strong>${title}</strong>
            <span>${wrong.length ? `${wrong.length} kana to review from this session.` : 'No mistakes to review from this session.'}</span>
          </div>
          <div class="ma-session-action-grid">
            <button type="button" data-ma-try-again>Try again</button>
            <button type="button" data-ma-review-mistakes ${wrong.length?'':'disabled'}>Review mistakes</button>
            <button type="button" data-ma-change-settings>Change settings</button>
            <button type="button" data-ma-view-results>View results</button>
          </div>`;
      }

      document.addEventListener('click', e=>{
        if(e.target.closest?.('[data-ma-try-again]')){
          e.preventDefault(); sessionModalBackdrop.classList.remove('open'); window.__maMistakeReview.active=false; startSession();
        }
        if(e.target.closest?.('[data-ma-review-mistakes]')){
          e.preventDefault();
          const wrong=currentWrongList();
          if(!wrong.length) return;
          sessionModalBackdrop.classList.remove('open');
          window.__maMistakeReview={active:true,list:wrong.slice(),index:0};
          const s=Object.assign({}, trainerSettings(), {endless:true,timeTrial:false,dailyChallenge:false,testMode:false,comboKana:false,speedRun:false});
          persistTrainerSettings(s);
          startSession();
          toast('Mistake review started.', 'ok');
        }
        if(e.target.closest?.('[data-ma-change-settings]')){
          e.preventDefault(); sessionModalBackdrop.classList.remove('open'); 
          const s=Object.assign({}, trainerSettings(), {activeBottomTab:'modifiers'});
          persistTrainerSettings(s); refreshTrainer();
        }
        if(e.target.closest?.('[data-ma-view-results]')){
          e.preventDefault(); location.href='test.html';
        }
      }, true);
    }catch(err){ console.warn('Session upgrade install failed', err); }
  }

  function saveKeyStatsForPreset(){
    // Track preset achievement from accumulated Reading + Writing character correctness.
    const readingStats = readJSON('charStats',{});
    const writingStats = readJSON('reverseCharStats',{});
    const correctForChar = ch => Number((readingStats[ch]||{}).correct || (readingStats[ch]||{}).right || 0) + Number((writingStats[ch]||{}).correct || (writingStats[ch]||{}).right || 0);
    const countFor = chars => chars.reduce((sum,ch)=>sum + correctForChar(ch), 0);
    return {
      starter: Math.min(100, countFor('あいうえお'.split(''))),
      intermediate: Math.min(100, countFor(HIRA)),
      advanced: Math.min(100, countFor([...HIRA,...KATA])),
      pro: Math.min(100, countFor([...HIRA,...KATA, ...CONFUSABLE]))
    };
  }

  function installPresetChecklist(){
    if(PAGE !== 'kana.html') return;
    const anchor = $('#maPresetChecklist') || $('.ma-kana-pro-card') || $('main') || document.body;
    let panel=$('#maPresetChecklist');
    if(!panel){
      panel=document.createElement('section');
      panel.id='maPresetChecklist';
      panel.className='ma-kana-pro-card ma-preset-checklist';
      anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    }
    const progress=saveKeyStatsForPreset();
    const defs=[
      ['starter','Starter','A-row with hints'],
      ['intermediate','Intermediate','All Hiragana, no hints'],
      ['advanced','Advanced','Hiragana + Katakana + Dakuten'],
      ['pro','Pro','Everything enabled']
    ];
    panel.innerHTML=`
      <div class="ma-kana-pro-head">
        <div>
          <h2 class="ma-kana-pro-title">Preset achievements</h2>
          <div class="ma-kana-pro-sub">Get 100 correct answers over time in each preset. Nothing is locked — this is just a progress tracker.</div>
        </div>
      </div>
      <div class="ma-achievement-grid">
        ${defs.map(([id,title,desc])=>{
          const n=progress[id]||0; const done=n>=100;
          return `<article class="ma-achievement-card ${done?'done':''}">
            <div class="ma-achievement-top"><b>${title}</b><span>${n}/100</span></div>
            <small>${desc}</small>
            <div class="ma-progress-track"><span style="width:${Math.min(100,n)}%"></span></div>
            <em>${done?'Complete':'In progress'}</em>
          </article>`;
        }).join('')}
      </div>`;
  }

  function installNoDataStates(){
    if(PAGE === 'test.html'){
      const run=()=>{
        const possibleLists=['testModeResults','readingTestModeResults','writingTestModeResults','kanaTrainerReadingTestModeResults','kanaTrainerWritingTestModeResults'];
        const has=possibleLists.some(k=>Array.isArray(readJSON(k,null)) && readJSON(k,[]).length);
        if(has) return;
        if($('#maNoDataResults')) return;
        const target=$('.stored-tests, #storedTests, .results-list, main') || document.body;
        const box=document.createElement('section');
        box.id='maNoDataResults';
        box.className='ma-no-data-card';
        box.innerHTML='<h2>No formal test results yet</h2><p>Complete a Reading or Writing Test Mode run to unlock detailed score cards, speed trends, and weak-kana breakdowns.</p><div class="ma-no-data-actions"><a href="default.html">Start Reading Test</a><a href="reverse.html">Start Writing Test</a></div>';
        target.parentNode.insertBefore(box, target);
      };
      setTimeout(run,600); setTimeout(run,1800);
    }
    if(PAGE === 'kana.html'){
      const hasStats=Object.keys(readJSON('charStats',{})).length || Object.keys(readJSON('reverseCharStats',{})).length;
      if(!hasStats && !$('#maNoDataKana')){
        const main=$('main')||document.body;
        const box=document.createElement('section');
        box.id='maNoDataKana';
        box.className='ma-no-data-card ma-no-data-kana';
        box.innerHTML='<h2>Your Kana dashboard is ready</h2><p>Complete a few Reading or Writing sessions to fill this hub with streaks, mastery labels, speed goals, and review suggestions.</p>';
        main.appendChild(box);
      }
    }
  }

  function compareImportPayload(payload){
    const labels = [
      ['settings','Settings','settingsUpdatedAt'],
      ['stats','Reading stats','resultsUpdatedAt'],
      ['times','Speed data','resultsUpdatedAt'],
      ['srs','SRS progress','srsUpdatedAt'],
      ['dailyChallengeHistory','Daily challenge history','dailyUpdatedAt'],
      ['scoreHistory','Score history','resultsUpdatedAt'],
      ['readingTestModeResults','Reading test results','resultsUpdatedAt'],
      ['writingTestModeResults','Writing test results','resultsUpdatedAt']
    ];
    const importedAt = Date.parse(payload.exportedAt||payload.updatedAt||'') || Number(payload.exportedAt||0) || 0;
    return labels.filter(([key])=>payload[key] !== undefined || (key==='writingTestModeResults' && payload.testModeResults)).map(([key,label,ts])=>{
      const local=Number(localStorage.getItem(ts)||0);
      const incoming=Number(payload[ts]||payload.sectionTimestamps?.[ts]||importedAt||0);
      return {label, action: !local || incoming>=local ? 'Will update' : 'Local/cloud appears newer'};
    });
  }

  function showImportPreview(payload, onApply){
    let modal=$('#maImportPreview');
    if(!modal){
      modal=document.createElement('div');
      modal.id='maImportPreview';
      modal.className='ma-import-preview-backdrop';
      modal.innerHTML=`<div class="ma-import-preview-modal">
        <h2>Preview import</h2>
        <p>This checks the backup against your current local/cloud timestamps before applying it.</p>
        <div class="ma-import-preview-list"></div>
        <div class="ma-import-preview-actions">
          <button type="button" data-ma-import-cancel>Cancel</button>
          <button type="button" data-ma-import-apply>Import and merge</button>
        </div>
      </div>`;
      document.body.appendChild(modal);
    }
    const rows=compareImportPayload(payload);
    $('.ma-import-preview-list', modal).innerHTML = rows.length ? rows.map(r=>`<div><span>${r.label}</span><b>${r.action}</b></div>`).join('') : '<div><span>Backup data</span><b>Ready to import</b></div>';
    modal.classList.add('open');
    const close=()=>modal.classList.remove('open');
    $('[data-ma-import-cancel]', modal).onclick=close;
    $('[data-ma-import-apply]', modal).onclick=()=>{ close(); onApply(); toast('Backup imported and merged.', 'ok'); };
  }

  function installImportPreview(){
    // Native trainer import modal.
    document.addEventListener('click', e=>{
      const btn=e.target.closest?.('#confirmImportBtn');
      if(!btn) return;
      const txt=$('#importTextarea');
      if(!txt) return;
      const raw=txt.value.trim();
      if(!raw) return;
      e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
      try{
        const payload=JSON.parse(raw);
        showImportPreview(payload, ()=>{
          try{ if(typeof applyImportedData === 'function') applyImportedData(payload); else if(typeof importSaveObject === 'function') importSaveObject(payload); }catch(err){ alert('Import failed. Please use a valid Mode Atlas save file.'); return; }
          try{ $('#importModalBackdrop')?.classList.remove('open'); }catch{}
        });
      }catch{ alert('Import failed. Make sure the JSON is valid.'); }
    }, true);

    // Profile drawer import function hook, where available.
    setTimeout(()=>{
      try{
        if(typeof importSaveObject === 'function' && !window.__maImportHooked){
          const native=importSaveObject;
          window.__maImportHooked=true;
          importSaveObject=function(obj){
            showImportPreview(obj, ()=>{ native(obj); location.reload(); });
          };
        }
      }catch{}
    }, 1000);
  }

  function installWhatsNew(){
    const version='2.7.1-qol';
    const changes=[
      'Cleaner grouped modifier settings.',
      'Preset achievement progress toward 100 correct answers.',
      'Mistake review after sessions.',
      'Improved end-of-session actions.',
      'Import preview before applying backups.',
      'Speed Run mode.',
      'Better empty states and PWA install polish.',
      'Dashboard data fallback so Kana hub cards still populate when cloud scripts are blocked.'
    ];
    const signature = version + '::' + changes.join('|');
    const seenVersionKey = 'maWhatsNewSeenVersion';
    const seenSignatureKey = 'maWhatsNewSeenSignature';
    function markSeen(){
      try {
        localStorage.setItem(seenVersionKey, version);
        localStorage.setItem(seenSignatureKey, signature);
        localStorage.setItem('maWhatsNewSeen', version);
      } catch {}
    }
    function shouldAutoShow(){
      try {
        return localStorage.getItem(seenVersionKey) !== version || localStorage.getItem(seenSignatureKey) !== signature;
      } catch { return true; }
    }
    function open(){
      let modal=$('#maWhatsNew');
      if(!modal){
        modal=document.createElement('div');
        modal.id='maWhatsNew';
        modal.className='ma-whats-new-backdrop';
        modal.innerHTML=`<div class="ma-whats-new-modal">
          <h2>What’s new</h2>
          <p>Mode Atlas has a new QOL update focused on cleaner practice flow and safer data handling.</p>
          <ul>${changes.map(c=>`<li>${c}</li>`).join('')}</ul>
          <button type="button" data-ma-whats-new-close>Done</button>
        </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e=>{ if(e.target===modal || e.target.closest('[data-ma-whats-new-close]')) { modal.classList.remove('open'); markSeen(); } });
      }
      modal.classList.add('open');
      markSeen();
    }
    window.ModeAtlas=window.ModeAtlas||{};
    window.ModeAtlas.showWhatsNew=open;
    setTimeout(()=>{
      const drawer=$('#profileDrawer');
      if(false && drawer && !$('#maWhatsNewProfileBtn')){
        const btn=document.createElement('button');
        btn.id='maWhatsNewProfileBtn';
        btn.type='button';
        btn.className='profile-action';
        btn.textContent='What’s new';
        btn.addEventListener('click', open);
        const actions=$('.profile-actions', drawer) || drawer;
        actions.appendChild(btn);
      }
      if(shouldAutoShow() && ['index.html','kana.html'].includes(PAGE)) open();
    }, 1200);
  }

  function installPwaPolish(){
    let deferredPrompt=null;
    window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; showInstall(); });
    function showInstall(){
      if($('#maInstallPrompt') || !deferredPrompt) return;
      const prompt=document.createElement('div');
      prompt.id='maInstallPrompt';
      prompt.className='ma-install-prompt';
      prompt.innerHTML='<div><b>Install Mode Atlas</b><span>Use it like an app, including offline practice.</span></div><button type="button" data-ma-install>Install</button><button type="button" data-ma-install-close>Not now</button>';
      document.body.appendChild(prompt);
      prompt.addEventListener('click', async e=>{
        if(e.target.closest('[data-ma-install-close]')) prompt.remove();
        if(e.target.closest('[data-ma-install]') && deferredPrompt){ deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch{} deferredPrompt=null; prompt.remove(); }
      });
    }
    if('serviceWorker' in navigator && location.protocol !== 'file:'){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }

  function boot(){
    installStructuredModifierMenu();
    installSessionUpgrades();
    installPresetChecklist();
    installNoDataStates();
    installImportPreview();
    installWhatsNew();
    installPwaPolish();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('pageshow', ()=>setTimeout(boot,100));
})();
