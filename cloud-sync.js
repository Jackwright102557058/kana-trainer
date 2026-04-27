
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js';

const CONFIG = window.KANA_FIREBASE_CONFIG || null;
const CONFIG_READY = !!(CONFIG && CONFIG.apiKey && CONFIG.apiKey !== 'REPLACE_ME' && CONFIG.projectId && CONFIG.projectId !== 'REPLACE_ME' && CONFIG.appId && CONFIG.appId !== 'REPLACE_ME');
const DOC_PATH = ['users', null, 'appData', 'kanaTrainer'];
const LOCAL_IMPORT_GUARD_KEY = 'modeAtlasLocalImportGuardUntil';
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const SECTION_DEFS = {
  reading: {
    updatedAtKey: 'cloudReadingUpdatedAt',
    scalar: { highScore: 'highScore' },
    json: {
      settings: 'settings',
      stats: 'charStats',
      times: 'charTimes',
      srs: 'charSrs',
      scoreHistory: 'scoreHistory',
      dailyChallengeHistory: 'dailyChallengeHistory'
    }
  },
  writing: {
    updatedAtKey: 'cloudWritingUpdatedAt',
    scalar: { highScore: 'reverseHighScore' },
    json: {
      settings: 'reverseSettings',
      stats: 'reverseCharStats',
      times: 'reverseCharTimes',
      srs: 'reverseCharSrs',
      scoreHistory: 'reverseScoreHistory',
      dailyChallengeHistory: 'reverseDailyChallengeHistory'
    }
  },
  readingTests: {
    updatedAtKey: 'testModeResultsUpdatedAt',
    scalar: {},
    json: {
      primary: 'testModeResults',
      backup: 'kanaTrainerTestModeResults',
      altPrimary: 'readingTestModeResults',
      altBackup: 'kanaTrainerReadingTestModeResults'
    }
  },
  writingTests: {
    updatedAtKey: 'writingTestModeResultsUpdatedAt',
    scalar: {},
    json: {
      primary: 'writingTestModeResults',
      backup: 'kanaTrainerWritingTestModeResults'
    }
  },
  wordBank: {
    updatedAtKey: 'kanaWordBankUpdatedAt',
    scalar: {},
    json: {
      items: 'kanaWordBank'
    }
  }
};

const SECTION_TIMESTAMP_KEYS = {
  reading: 'settingsUpdatedAt',
  writing: 'settingsUpdatedAt',
  readingTests: 'resultsUpdatedAt',
  writingTests: 'resultsUpdatedAt',
  wordBank: 'profileUpdatedAt'
};
const SECTION_EXTRA_TIMESTAMP_KEYS = {
  reading: ['srsUpdatedAt', 'dailyUpdatedAt'],
  writing: ['srsUpdatedAt', 'dailyUpdatedAt'],
  readingTests: [],
  writingTests: [],
  wordBank: []
};
function setSectionTimestampAliases(sectionName, updatedAt) {
  try {
    const ts = String(normalizeTimestamp(updatedAt) || Date.now());
    const primary = SECTION_TIMESTAMP_KEYS[sectionName];
    if (primary) localStorage.setItem(primary, ts);
    (SECTION_EXTRA_TIMESTAMP_KEYS[sectionName] || []).forEach((key) => { if (!localStorage.getItem(key)) localStorage.setItem(key, ts); });
    const meta = readJSON('modeAtlasSectionTimestamps', {});
    if (primary) meta[primary] = normalizeTimestamp(ts);
    localStorage.setItem('modeAtlasSectionTimestamps', JSON.stringify(meta));
  } catch {}
}
function ensureResultIdsInSectionData(sectionName, data) {
  if (sectionName !== 'readingTests' && sectionName !== 'writingTests') return data;
  const copy = { ...(data || {}) };
  Object.keys(copy).forEach((field) => {
    if (!Array.isArray(copy[field])) return;
    const seen = new Set();
    copy[field] = copy[field].map((item, index) => {
      if (!item || typeof item !== 'object') return item;
      const row = { ...item };
      const base = Date.parse(row.createdAt || row.completedAt || row.date || row.timestamp || '') || Number(row.timestamp || 0) || Date.now();
      if (!row.id) row.id = 'session_' + base.toString(36) + '_' + index.toString(36);
      if (seen.has(row.id)) row.id = row.id + '_' + index.toString(36);
      seen.add(row.id);
      if (!row.createdAt) row.createdAt = new Date(base).toISOString();
      if (!row.updatedAt) row.updatedAt = new Date(base).toISOString();
      if (!row.source) row.source = sectionName === 'writingTests' ? 'writing' : 'reading';
      return row;
    });
  });
  return copy;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readNumber(key) {
  const raw = localStorage.getItem(key);
  const num = Number(raw || 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeTimestamp(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function snapshotSection(sectionName) {
  const def = SECTION_DEFS[sectionName];
  const data = {};
  Object.entries(def.scalar).forEach(([field, key]) => {
    data[field] = localStorage.getItem(key) || '0';
  });
  Object.entries(def.json).forEach(([field, key]) => {
    data[field] = readJSON(key, field === 'items' ? [] : field.includes('History') || field === 'settings' || field === 'stats' || field === 'times' || field === 'srs' ? {} : []);
  });
  return {
    updatedAt: normalizeTimestamp(localStorage.getItem(def.updatedAtKey)),
    data
  };
}

function snapshotSectionFixed(sectionName) {
  const def = SECTION_DEFS[sectionName];
  const data = {};
  Object.entries(def.scalar).forEach(([field, key]) => {
    data[field] = localStorage.getItem(key) || '0';
  });
  Object.entries(def.json).forEach(([field, key]) => {
    let fallback = {};
    if (sectionName === 'readingTests' || sectionName === 'writingTests') fallback = [];
    if (sectionName === 'wordBank') fallback = [];
    data[field] = readJSON(key, fallback);
  });
  return {
    updatedAt: normalizeTimestamp(localStorage.getItem(def.updatedAtKey)) || normalizeTimestamp(localStorage.getItem(SECTION_TIMESTAMP_KEYS[sectionName])),
    data: ensureResultIdsInSectionData(sectionName, data)
  };
}


function readJSONFromMap(map, key, fallback) {
  if (!map || typeof map !== 'object' || !(key in map)) return fallback;
  const value = map[key];
  if (typeof value !== 'string') return value == null ? fallback : clone(value);
  try { return JSON.parse(value); } catch { return value == null ? fallback : value; }
}

function readStringFromMap(map, key, fallback = '0') {
  if (!map || typeof map !== 'object' || !(key in map)) return fallback;
  const value = map[key];
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value : String(value);
}

function normalizeLegacyStorageMap(input) {
  const data = { ...(input || {}) };
  const mapLegacyKey = (from, to) => {
    if (data[from] !== undefined && data[to] === undefined) data[to] = data[from];
  };
  mapLegacyKey('stats', 'charStats');
  mapLegacyKey('times', 'charTimes');
  mapLegacyKey('srs', 'charSrs');
  mapLegacyKey('reverseStats', 'reverseCharStats');
  mapLegacyKey('reverseTimes', 'reverseCharTimes');
  mapLegacyKey('reverseSrs', 'reverseCharSrs');
  mapLegacyKey('writingStats', 'reverseCharStats');
  mapLegacyKey('writingTimes', 'reverseCharTimes');
  mapLegacyKey('writingSrs', 'reverseCharSrs');
  mapLegacyKey('wordBank', 'kanaWordBank');
  try {
    const tests = readJSONFromMap(data, 'testModeResults', null);
    if (Array.isArray(tests) && data.readingTestModeResults === undefined && data.writingTestModeResults === undefined) {
      data.readingTestModeResults = JSON.stringify(tests.filter((item) => (item && (item.mode || 'reading')) === 'reading'));
      data.writingTestModeResults = JSON.stringify(tests.filter((item) => item && item.mode === 'writing'));
    }
  } catch {}
  return data;
}

function snapshotFromStorageMap(rawMap, fallbackTimestamp = 0) {
  const map = normalizeLegacyStorageMap(rawMap || {});
  const fallbackTs = normalizeTimestamp(fallbackTimestamp) || Date.now();
  const sections = {};
  Object.entries(SECTION_DEFS).forEach(([sectionName, def]) => {
    const data = {};
    Object.entries(def.scalar).forEach(([field, key]) => {
      data[field] = readStringFromMap(map, key, '0');
    });
    Object.entries(def.json).forEach(([field, key]) => {
      const fallback = sectionName === 'wordBank' || sectionName === 'readingTests' || sectionName === 'writingTests' ? [] : {};
      data[field] = readJSONFromMap(map, key, fallback);
    });
    sections[sectionName] = {
      updatedAt: normalizeTimestamp(map[def.updatedAtKey]) || fallbackTs,
      data
    };
  });
  return { version: 'mode-atlas-import-snapshot-v2', updatedAt: fallbackTs, sections };
}

function buildLocalSnapshot() {
  const sections = {};
  Object.keys(SECTION_DEFS).forEach((name) => {
    sections[name] = snapshotSectionFixed(name);
  });
  const now = Date.now();
  Object.keys(sections).forEach((name) => setSectionTimestampAliases(name, sections[name].updatedAt || now));
  return {
    version: 'cloud-v2-restore-guard',
    updatedAt: now,
    sectionTimestamps: {
      settingsUpdatedAt: normalizeTimestamp(localStorage.getItem('settingsUpdatedAt')),
      resultsUpdatedAt: normalizeTimestamp(localStorage.getItem('resultsUpdatedAt')),
      srsUpdatedAt: normalizeTimestamp(localStorage.getItem('srsUpdatedAt')),
      dailyUpdatedAt: normalizeTimestamp(localStorage.getItem('dailyUpdatedAt')),
      profileUpdatedAt: normalizeTimestamp(localStorage.getItem('profileUpdatedAt'))
    },
    sections
  };
}

function buildEmptySnapshot() {
  const now = Date.now();
  const empty = {
    reading: { highScore: '0', settings: {}, stats: {}, times: {}, srs: {}, scoreHistory: {}, dailyChallengeHistory: {} },
    writing: { highScore: '0', settings: {}, stats: {}, times: {}, srs: {}, scoreHistory: {}, dailyChallengeHistory: {} },
    readingTests: { primary: [], backup: [], altPrimary: [], altBackup: [] },
    writingTests: { primary: [], backup: [] },
    wordBank: { items: [] }
  };
  const sections = {};
  Object.keys(SECTION_DEFS).forEach((name) => { sections[name] = { updatedAt: now, data: empty[name] || {} }; });
  return { version: 'cloud-v2-reset', updatedAt: now, sections };
}

function clearLocalAppData() {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
}

function writeSectionToLocal(sectionName, payload, updatedAt) {
  const def = SECTION_DEFS[sectionName];
  const data = ensureResultIdsInSectionData(sectionName, payload || {});
  Object.entries(def.scalar).forEach(([field, key]) => {
    localStorage.setItem(key, String(data[field] ?? '0'));
  });
  Object.entries(def.json).forEach(([field, key]) => {
    const fallback = sectionName === 'wordBank' || sectionName === 'readingTests' || sectionName === 'writingTests' ? [] : {};
    writeJSON(key, data[field] ?? fallback);
  });
  localStorage.setItem(def.updatedAtKey, String(normalizeTimestamp(updatedAt)));
  setSectionTimestampAliases(sectionName, updatedAt);
}

function objectHasKeys(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function arrayHasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function numberStringIsPositive(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0;
}

function deepHasProgress(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(deepHasProgress);
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
  }
  if (typeof value === 'object') return Object.values(value).some(deepHasProgress);
  return false;
}

function hasLocalImportGuard() {
  const until = Number(localStorage.getItem(LOCAL_IMPORT_GUARD_KEY) || 0);
  return Number.isFinite(until) && Date.now() < until;
}

function beginLocalImport(ms = 10 * 60 * 1000) {
  localStorage.setItem(LOCAL_IMPORT_GUARD_KEY, String(Date.now() + ms));
}

function clearLocalImportGuard() {
  localStorage.removeItem(LOCAL_IMPORT_GUARD_KEY);
}

function sectionHasMeaningfulData(sectionName, data = {}) {
  if (!data || typeof data !== 'object') return false;
  if (sectionName === 'wordBank') return arrayHasItems(data.items);
  if (sectionName === 'readingTests' || sectionName === 'writingTests') {
    return arrayHasItems(data.primary) || arrayHasItems(data.backup) || arrayHasItems(data.altPrimary) || arrayHasItems(data.altBackup);
  }
  if (sectionName === 'reading' || sectionName === 'writing') {
    return deepHasProgress(data.stats) || deepHasProgress(data.times) || deepHasProgress(data.srs) || deepHasProgress(data.scoreHistory) || deepHasProgress(data.dailyChallengeHistory) || numberStringIsPositive(data.highScore);
  }
  return deepHasProgress(data);
}

function getLocalSectionData(sectionName) {
  return snapshotSectionFixed(sectionName).data || {};
}

function mergeCloudIntoLocal(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.sections) return { localPreferred: false };
  const forceRemote = !!options.forceRemote && !hasLocalImportGuard();
  let localPreferred = false;
  Object.keys(SECTION_DEFS).forEach((name) => {
    const remoteSection = snapshot.sections[name];
    if (!remoteSection) return;
    const localUpdatedAt = normalizeTimestamp(localStorage.getItem(SECTION_DEFS[name].updatedAtKey));
    const remoteUpdatedAt = normalizeTimestamp(remoteSection.updatedAt);
    const remoteData = remoteSection.data || {};
    const localData = getLocalSectionData(name);
    const remoteHasData = sectionHasMeaningfulData(name, remoteData);
    const localHasData = sectionHasMeaningfulData(name, localData);

    // Repair for earlier builds that stamped a fresh timestamp onto blank/default local data.
    // If forceRemote is requested, trust Firestore for any section that contains real data.
    if (forceRemote && remoteHasData) {
      writeSectionToLocal(name, remoteData, remoteUpdatedAt || Date.now());
      return;
    }

    if (remoteHasData && !localHasData) {
      writeSectionToLocal(name, remoteData, remoteUpdatedAt || Date.now());
      return;
    }

    if (remoteUpdatedAt > localUpdatedAt) {
      writeSectionToLocal(name, remoteData, remoteUpdatedAt);
    } else if (localUpdatedAt > remoteUpdatedAt && localHasData) {
      localPreferred = true;
    }
  });
  return { localPreferred };
}


let app = null;
let auth = null;
let db = null;
let currentUser = null;
let authResolved = false;
let resolveAuthReady;
const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});
let hydratedForUserId = null;
let syncTimeout = null;
let lastStatus = '';
const uiBindings = new Set();
const LAST_CLOUD_SYNC_KEY = 'modeAtlasLastCloudSyncAt';
const CLOUD_STATE_KEY = 'modeAtlasCloudAccessState';
const CLOUD_ERROR_KEY = 'modeAtlasLastCloudErrorAt';
const CLOUD_ERROR_MESSAGE_KEY = 'modeAtlasLastCloudErrorMessage';
const SECTION_LABELS = {
  reading: 'Reading Practice',
  writing: 'Writing Practice',
  readingTests: 'Reading Test Results',
  writingTests: 'Writing Test Results',
  wordBank: 'Word Bank'
};

function formatDateTime(ts) {
  const n = Number(ts || 0);
  if (!Number.isFinite(n) || !n) return 'never';
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return 'never';
  return d.toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'numeric', year: '2-digit' });
}

function setCloudState(ok, message = '') {
  try {
    if (ok) {
      localStorage.setItem(LAST_CLOUD_SYNC_KEY, String(Date.now()));
      localStorage.setItem(CLOUD_STATE_KEY, 'ok');
      localStorage.removeItem(CLOUD_ERROR_KEY);
      localStorage.removeItem(CLOUD_ERROR_MESSAGE_KEY);
    } else {
      localStorage.setItem(CLOUD_STATE_KEY, 'offline');
      localStorage.setItem(CLOUD_ERROR_KEY, String(Date.now()));
      if (message) localStorage.setItem(CLOUD_ERROR_MESSAGE_KEY, String(message).slice(0, 180));
    }
  } catch {}
  emitStatus();
  try { window.dispatchEvent(new CustomEvent('kanaCloudSyncStatusChanged', { detail: getSyncStatus() })); } catch {}
}

function getSyncStatus() {
  const user = currentUser;
  const lastSync = normalizeTimestamp(localStorage.getItem(LAST_CLOUD_SYNC_KEY));
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  const state = localStorage.getItem(CLOUD_STATE_KEY) || '';
  if (!CONFIG_READY) {
    return { state: 'local', tone: 'neutral', text: 'Local saving · cloud setup missing', lastSync, user };
  }
  if (!user) {
    return { state: 'local', tone: 'neutral', text: 'Local saving · log in for cloud save', lastSync, user };
  }
  if (!online || state === 'offline') {
    return { state: 'offline', tone: 'warning', text: 'No cloud access · last sync ' + formatDateTime(lastSync), lastSync, user };
  }
  return { state: 'cloud', tone: 'ok', text: 'Cloud save synced', lastSync, user };
}

function statusText() {
  const st = getSyncStatus();
  if (st.state === 'cloud') return 'Signed in. Your cloud save is active and will use the newest data.';
  if (st.state === 'offline') return 'Signed in, but cloud saving is currently unavailable. Local changes will sync when cloud access returns.';
  return st.text;
}

function emitStatus() {
  lastStatus = statusText();
  uiBindings.forEach(updateUiBinding);
  try { window.dispatchEvent(new CustomEvent('kanaCloudSyncStatusChanged', { detail: getSyncStatus() })); } catch {}
}

function updateUiBinding(binding) {
  const user = currentUser;
  if (binding.statusEl) binding.statusEl.textContent = binding.customStatus || lastStatus;
  if (binding.nameEl) binding.nameEl.textContent = user?.displayName || user?.email || 'Guest';
  if (binding.emailEl) binding.emailEl.textContent = user?.email || (CONFIG_READY ? 'Not signed in' : 'Firebase config missing');
  if (binding.photoEl) {
    if (user?.photoURL) {
      binding.photoEl.src = user.photoURL;
      binding.photoEl.alt = user.displayName || 'Google profile';
      binding.photoEl.style.display = 'block';
    } else {
      binding.photoEl.removeAttribute('src');
      binding.photoEl.alt = '';
      binding.photoEl.style.display = binding.hidePhotoIfNoUser ? 'none' : 'block';
    }
  }
  if (binding.signInBtn) binding.signInBtn.style.display = user ? 'none' : 'inline-flex';
  if (binding.signOutBtn) binding.signOutBtn.style.display = user ? 'inline-flex' : 'none';
  if (binding.signedInEls) binding.signedInEls.forEach((el) => { el.style.display = user ? '' : 'none'; });
  if (binding.signedOutEls) binding.signedOutEls.forEach((el) => { el.style.display = user ? 'none' : ''; });
}

function bindUi(options = {}) {
  const binding = {
    signInBtn: options.signInBtn || null,
    signOutBtn: options.signOutBtn || null,
    statusEl: options.statusEl || null,
    nameEl: options.nameEl || null,
    emailEl: options.emailEl || null,
    photoEl: options.photoEl || null,
    signedInEls: options.signedInEls || null,
    signedOutEls: options.signedOutEls || null,
    hidePhotoIfNoUser: options.hidePhotoIfNoUser !== false,
    customStatus: options.customStatus || ''
  };
  if (binding.signInBtn) binding.signInBtn.addEventListener('click', signInWithGoogle);
  if (binding.signOutBtn) binding.signOutBtn.addEventListener('click', signOutUser);
  uiBindings.add(binding);
  updateUiBinding(binding);
  return binding;
}

async function setupFirebase() {
  if (!CONFIG_READY) {
    authResolved = true;
    resolveAuthReady?.();
    emitStatus();
    return false;
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    try { await getRedirectResult(auth); } catch (error) { console.warn('Redirect sign-in result was not available.', error); }
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      authResolved = true;
      resolveAuthReady?.();
      emitStatus();
    });
  }
  return true;
}

function getDocRef(uid) {
  return doc(db, 'users', uid, 'appData', 'kanaTrainer');
}

async function hydrateFromCloud(force = false) {
  await authReady;
  if (!CONFIG_READY || !currentUser || !db) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setCloudState(false, 'Browser is offline');
    return false;
  }
  if (!force && hydratedForUserId === currentUser.uid) return true;
  try {
    const snap = await getDoc(getDocRef(currentUser.uid));
    if (snap.exists()) {
      const { localPreferred } = mergeCloudIntoLocal(snap.data(), { forceRemote: !!force });
      hydratedForUserId = currentUser.uid;
      setCloudState(true);
      if (localPreferred || hasLocalImportGuard()) scheduleSync(250);
    } else {
      hydratedForUserId = currentUser.uid;
      setCloudState(true);
      scheduleSync(250);
    }
    return true;
  } catch (error) {
    console.warn('Cloud save hydrate failed.', error);
    setCloudState(false, error?.message || 'Cloud hydrate failed');
    return false;
  }
}


async function beforePageLoad() {
  await setupFirebase();
  await authReady;
  if (currentUser) {
    await hydrateFromCloud();
  }
}

async function signInWithGoogle() {
  await setupFirebase();
  if (!CONFIG_READY || !auth) {
    alert('Add your Firebase project details to firebase-config.js before using Google sign-in.');
    return;
  }
  try {
    await signInWithPopup(auth, provider);
    await hydrateFromCloud(false);
    await syncNow();
  } catch (error) {
    const code = String(error?.code || '');
    if (code.includes('popup') || code.includes('cancelled')) {
      await signInWithRedirect(auth, provider);
      return;
    }
    console.error('Google sign-in failed.', error);
    alert('Google sign-in failed. Check the console and your Firebase Auth setup.');
  }
}

async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
  hydratedForUserId = null;
}

async function syncNow() {
  await authReady;
  if (!CONFIG_READY || !currentUser || !db) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setCloudState(false, 'Browser is offline');
    return false;
  }
  const snapshot = buildLocalSnapshot();

  try {
    const snap = await getDoc(getDocRef(currentUser.uid));
    if (snap.exists()) {
      const existing = snap.data() || {};
      const existingSections = existing.sections || {};
      Object.keys(SECTION_DEFS).forEach((name) => {
        const localSection = snapshot.sections?.[name];
        const localData = localSection?.data || {};
        const remoteSection = existingSections[name];
        const remoteData = remoteSection?.data || {};
        const localUpdatedAt = normalizeTimestamp(localSection?.updatedAt);
        const remoteUpdatedAt = normalizeTimestamp(remoteSection?.updatedAt);
        if (!sectionHasMeaningfulData(name, localData) && sectionHasMeaningfulData(name, remoteData)) {
          snapshot.sections[name] = remoteSection;
        } else if (remoteUpdatedAt > localUpdatedAt && sectionHasMeaningfulData(name, remoteData)) {
          snapshot.sections[name] = remoteSection;
          writeSectionToLocal(name, remoteData, remoteUpdatedAt);
        }
      });
    }
    await setDoc(getDocRef(currentUser.uid), snapshot, { merge: true });
    if (hasLocalImportGuard()) clearLocalImportGuard();
    setCloudState(true);
    return true;
  } catch (error) {
    console.warn('Cloud save sync failed.', error);
    setCloudState(false, error?.message || 'Cloud sync failed');
    return false;
  }
}


function scheduleSync(delay = 800) {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncNow().catch((error) => {
      console.warn('Cloud save sync failed.', error);
      setCloudState(false, error?.message || 'Cloud sync failed');
    });
  }, delay);
}

function markSectionUpdated(sectionName) {
  const def = SECTION_DEFS[sectionName];
  if (!def) return;
  const now = Date.now();
  localStorage.setItem(def.updatedAtKey, String(now));
  setSectionTimestampAliases(sectionName, now);
}

function getUser() {
  return currentUser;
}


function collectExportStorage() {
  const allow = /^(kana|reverse|test|reading|writing|modeAtlas|cloud|char|score|daily|highScore|settings|wordBank|srs|timeTrial|combo|selected|display|sound)/i;
  const block = /^(firebase:|firestore|google|__|debug|devtools)/i;
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || block.test(key)) continue;
    if (allow.test(key) || key.includes('Kana') || key.includes('kana') || key.includes('ModeAtlas') || key.includes('modeAtlas')) {
      data[key] = localStorage.getItem(key);
    }
  }
  Object.values(SECTION_DEFS).forEach((def) => {
    if (def.updatedAtKey && localStorage.getItem(def.updatedAtKey) !== null) data[def.updatedAtKey] = localStorage.getItem(def.updatedAtKey);
  });
  return data;
}

function createBackup() {
  return {
    app: 'Mode Atlas',
    version: 2,
    exportedAt: new Date().toISOString(),
    origin: typeof location !== 'undefined' ? location.origin : '',
    syncStatus: getSyncStatus(),
    snapshot: buildLocalSnapshot(),
    data: collectExportStorage()
  };
}

function getImportMapAndSnapshot(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Invalid save file');
  const exportedAt = Date.parse(obj.exportedAt || '') || Date.now();
  if (obj.snapshot && obj.snapshot.sections) return { snapshot: obj.snapshot, map: obj.data || obj.localStorage || {}, exportedAt };
  if (obj.sections) return { snapshot: obj, map: obj.data || obj.localStorage || {}, exportedAt: normalizeTimestamp(obj.updatedAt) || exportedAt };
  const map = obj.localStorage || obj.data || obj;
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('Invalid save file');
  return { snapshot: snapshotFromStorageMap(map, exportedAt), map, exportedAt };
}

async function importLocalBackup(obj) {
  await authReady;
  const { snapshot } = getImportMapAndSnapshot(obj);
  const result = { updated: [], keptCloud: [], keptLocal: [], cloudSynced: false, usedCloud: false };
  let remoteSnapshot = null;
  if (CONFIG_READY && currentUser && db && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      const snap = await getDoc(getDocRef(currentUser.uid));
      remoteSnapshot = snap.exists() ? snap.data() : null;
      result.usedCloud = true;
      setCloudState(true);
    } catch (error) {
      console.warn('Could not compare import with cloud save.', error);
      setCloudState(false, error?.message || 'Cloud unavailable during import');
    }
  }

  Object.keys(SECTION_DEFS).forEach((name) => {
    const incoming = snapshot.sections?.[name];
    if (!incoming) return;
    const cloud = remoteSnapshot?.sections?.[name] || null;
    const current = snapshotSectionFixed(name);
    const incomingTs = normalizeTimestamp(incoming.updatedAt);
    const cloudTs = normalizeTimestamp(cloud?.updatedAt);
    const currentTs = normalizeTimestamp(current.updatedAt);
    const incomingHasData = sectionHasMeaningfulData(name, incoming.data || {});
    const cloudHasData = sectionHasMeaningfulData(name, cloud?.data || {});

    if (cloud && cloudHasData && cloudTs > incomingTs) {
      writeSectionToLocal(name, cloud.data || {}, cloudTs);
      result.keptCloud.push(name);
      return;
    }
    if (incomingHasData && incomingTs >= Math.max(cloudTs, currentTs)) {
      writeSectionToLocal(name, incoming.data || {}, incomingTs || Date.now());
      result.updated.push(name);
      return;
    }
    if (cloud && cloudHasData && cloudTs >= currentTs) {
      writeSectionToLocal(name, cloud.data || {}, cloudTs);
      result.keptCloud.push(name);
      return;
    }
    result.keptLocal.push(name);
  });

  beginLocalImport(2 * 60 * 1000);
  if (CONFIG_READY && currentUser && db && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      await setDoc(getDocRef(currentUser.uid), buildLocalSnapshot(), { merge: true });
      clearLocalImportGuard();
      result.cloudSynced = true;
      setCloudState(true);
    } catch (error) {
      console.warn('Imported save could not be synced to cloud yet.', error);
      setCloudState(false, error?.message || 'Cloud unavailable after import');
    }
  }
  emitStatus();
  return result;
}

function describeImportResult(result) {
  const names = (list) => (list || []).map((name) => SECTION_LABELS[name] || name).join(', ');
  const lines = ['Save import checked by newest data.'];
  if (result.updated?.length) lines.push('Updated from backup: ' + names(result.updated) + '.');
  if (result.keptCloud?.length) lines.push('Kept newer cloud data: ' + names(result.keptCloud) + '.');
  if (result.keptLocal?.length) lines.push('Kept newer local data: ' + names(result.keptLocal) + '.');
  lines.push(result.cloudSynced ? 'This is now the definitive cloud save.' : (currentUser ? 'Cloud was unavailable, so local data will sync when cloud access returns.' : 'You are using local save data. Log in to sync this to cloud.'));
  return lines.join('\n');
}

async function resetAllData() {
  await authReady;
  if (CONFIG_READY && currentUser && db) {
    await setDoc(getDocRef(currentUser.uid), buildEmptySnapshot());
    hydratedForUserId = currentUser.uid;
  }
  clearLocalAppData();
  return true;
}

setupFirebase().catch((error) => {
  console.warn('Firebase setup failed.', error);
  authResolved = true;
  resolveAuthReady?.();
  setCloudState(false, error?.message || 'Firebase setup failed');
});

try {
  window.addEventListener('online', () => { emitStatus(); if (currentUser) scheduleSync(200); });
  window.addEventListener('offline', () => setCloudState(false, 'Browser is offline'));
} catch {}

window.KanaCloudSync = {
  ready: authReady,
  beforePageLoad,
  hydrateFromCloud,
  bindUi,
  signInWithGoogle,
  signOut: signOutUser,
  scheduleSync,
  syncNow,
  markSectionUpdated,
  beginLocalImport,
  getUser,
  isConfigured: () => CONFIG_READY,
  getSyncStatus,
  createBackup,
  importLocalBackup,
  describeImportResult,
  debugLocalSnapshot: buildLocalSnapshot,
  resetAllData
};
