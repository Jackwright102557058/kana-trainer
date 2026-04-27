(function(){
  'use strict';
  function isPracticePage(){
    var p=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    return p==='default.html'||p==='reverse.html';
  }
  function setActive(active){
    try{
      window.ModeAtlasPracticeSessionActive=!!active;
      if(active) sessionStorage.setItem('modeAtlasPracticeSessionActive','1');
      else sessionStorage.removeItem('modeAtlasPracticeSessionActive');
    }catch(e){}
  }
  function installCloudGuard(){
    var cloud=window.KanaCloudSync;
    if(!cloud || cloud.__sessionDeferInstalled) return false;
    cloud.__sessionDeferInstalled=true;
    var originalSchedule=cloud.scheduleSync;
    var pending=false;
    cloud.scheduleSync=function(delay){
      var active=false;
      try{ active=!!window.ModeAtlasPracticeSessionActive || sessionStorage.getItem('modeAtlasPracticeSessionActive')==='1'; }catch(e){}
      if(active){ pending=true; return false; }
      return originalSchedule ? originalSchedule.call(cloud, delay) : false;
    };
    cloud.flushDeferredSessionSync=function(delay){
      setActive(false);
      if(pending){ pending=false; return cloud.scheduleSync(delay||350); }
      return false;
    };
    return true;
  }
  function bindSessionButtons(){
    if(!isPracticePage()) return;
    document.addEventListener('click', function(e){
      if(e.target.closest('#startBtn')) setActive(true);
      if(e.target.closest('#endSessionBtn,#closeSessionModalBtn')){
        setTimeout(function(){
          setActive(false);
          try{ window.KanaCloudSync&&window.KanaCloudSync.endPracticeSessionSyncPause&&window.KanaCloudSync.endPracticeSessionSyncPause(true); }catch(e){}
          try{ window.KanaCloudSync&&window.KanaCloudSync.flushDeferredSessionSync&&window.KanaCloudSync.flushDeferredSessionSync(350); }catch(e){}
        }, 0);
      }
    }, true);
  }
  function boot(){
    installCloudGuard();
    bindSessionButtons();
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(installCloudGuard() || tries>30) clearInterval(timer);
    }, 200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
