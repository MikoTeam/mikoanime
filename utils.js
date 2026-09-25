/* ==================== FORMAT ==================== */
function formatViews(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatTime(sec) {
  sec = Math.floor(Number(sec) || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function getTodayName() {
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  return hari[new Date().getDay()];
}

function getVideoUrl(slug, episode) {
  return DUMMY_VIDEOS[(String(slug).length + episode) % DUMMY_VIDEOS.length];
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[m]);
}

/* ==================== XP / LEVEL / RANK ==================== */
function calculateLevel(xp) {
  xp = Number(xp) || 0;
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level) {
  level = Number(level) || 1;
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 100;
}

function xpToNextLevel(xp) {
  const currentLevel = calculateLevel(xp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const currentLevelXp = xpForLevel(currentLevel);
  const needed = nextLevelXp - currentLevelXp;
  const progress = xp - currentLevelXp;
  return { needed, progress, percent: Math.round((progress / needed) * 100) };
}

function calculateRank(level) {
  level = Number(level) || 1;
  if (level >= 1000) return { name: "Mythic", color: "#ef4444" };
  if (level >= 500) return { name: "Legend", color: "#fbbf24" };
  if (level >= 200) return { name: "Grandmaster", color: "#f97316" };
  if (level >= 100) return { name: "Master", color: "#a855f7" };
  if (level >= 70) return { name: "Diamond", color: "#06b6d4" };
  if (level >= 40) return { name: "Platinum", color: "#10b981" };
  if (level >= 20) return { name: "Gold", color: "#fbbf24" };
  if (level >= 10) return { name: "Silver", color: "#94a3b8" };
  if (level >= 5) return { name: "Bronze", color: "#b45309" };
  return { name: "Rookie", color: "#6b7280" };
}

function formatXP(xp) {
  xp = Number(xp) || 0;
  if (xp >= 1000000) return (xp / 1000000).toFixed(1) + "M";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return xp.toString();
}

/* ==================== LOCALSTORAGE ==================== */
const STORAGE_KEYS = {
  FAVORITES: "miko_favorites",
  HISTORY: "miko_history",
  COMMENTS: "miko_comments",
  NOTIF_READ: "miko_notif_read",
  PROGRESS: "miko_watch_progress",
  PROFILE: "miko_user_profile"
};

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    let data = JSON.parse(raw);

    // Migrasi komentar lama → tambahin animeSlug & episode
    if (key === STORAGE_KEYS.COMMENTS && Array.isArray(data)) {
      data = data.map(c => ({
        ...c,
        animeSlug: c.animeSlug || "unknown-anime",
        episode: Number(c.episode) || 1
      }));
    }

    return data;
  } catch (e) { return fallback; }
}

function saveFavorites() { saveToStorage(STORAGE_KEYS.FAVORITES, favoriteList); }
function saveHistory() { saveToStorage(STORAGE_KEYS.HISTORY, historyList); }
function saveComments() { saveToStorage(STORAGE_KEYS.COMMENTS, dummyComments); }
function saveNotifRead() { saveToStorage(STORAGE_KEYS.NOTIF_READ, window.__notifRead || []); }
function saveProfile() { saveToStorage(STORAGE_KEYS.PROFILE, userProfile); }
function saveWatchProgress() { saveToStorage(STORAGE_KEYS.PROGRESS, window.__watchProgress || {}); }

/* ==================== LOADING ==================== */
function showLoading(message = "Memuat data...") {
  let overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text" id="loading-text">${message}</div>
    `;
    document.body.appendChild(overlay);
  } else {
    const textEl = document.getElementById("loading-text");
    if (textEl) textEl.textContent = message;
  }
  overlay.classList.add("show");
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.classList.remove("show");
}

/* ==================== TOAST ==================== */
function showToast(message, duration = 2000) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  toast.classList.remove("toast-loading", "toast-success", "toast-error");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

/* ==================== TOAST VARIANTS ==================== */
function showLoadingToast(message = "Memproses...") {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  toast.classList.remove("toast-success", "toast-error");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div class="toast-spinner"></div>
      <span>${message}</span>
    </div>
  `;
  toast.classList.add("show", "toast-loading");
  clearTimeout(window.__toastTimer);
}

function showSuccessToast(message = "Berhasil!") {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  toast.classList.remove("toast-loading", "toast-error");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:#10b981;font-size:16px;font-weight:700;">✓</span>
      <span>${message}</span>
    </div>
  `;
  toast.classList.add("show", "toast-success");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show", "toast-success");
  }, 2500);
}

function showErrorToast(message = "Terjadi kesalahan") {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  toast.classList.remove("toast-loading", "toast-success");
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:#ef4444;font-size:16px;font-weight:700;">✕</span>
      <span>${message}</span>
    </div>
  `;
  toast.classList.add("show", "toast-error");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show", "toast-error");
  }, 3000);
}

/* ==================== ICONS ==================== */
const icons = {
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-10"><path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-11"><path d="M9 18l6-6-6-6"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a2 2 0 0 1-4 0V15a5 5 0 0 1-1-4z"/></svg>`,
  star2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  heartFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 18h20l-2-9-5 3-3-8-3 8-5-3z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`
};

function iconCrown() { return `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-14"><path d="M2 18h20l-2-9-5 3-3-8-3 8-5-3z"/></svg>`; }
function iconStar() { return `<svg viewBox="0 0 24 24" fill="currentColor" class="ico-14"><path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`; }
function iconTrophy() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`; }
function iconShield() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`; }
