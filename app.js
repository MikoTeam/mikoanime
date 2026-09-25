/* ==================== GLOBAL STATE ==================== */
let animeList = [];
let historyList = [];
let favoriteList = [];
let dummyComments = [];
let userProfile = {};
let notificationsList = [];
let diskusiList = [];
let topGiveawayData = [];
let topLevelData = [];
let topRankData = [];
let topClanData = [];
let premiumPlans = [];
let allUsers = [];

/* ==================== UPLOAD STATE ==================== */
let pendingAvatarFile = null;
let pendingBannerFile = null;
let pendingBannerType = null;

/* ==================== UI STATE ==================== */
let currentTab = "home";
let currentDay = getTodayName();
let currentProfileTab = "komentar";
let currentAnimeSlug = null;
let currentEpisode = 1;
let searchQuery = "";
let searchGenre = "";
let watchOpen = false;
let watchFromTab = "home";
let currentTopSlide = 0;
let autoSlideTimer = null;
let currentFavSort = "terbaru";
let currentPublicUser = null;
let currentPublicTab = "info";
let replyToComment = null;
let currentNotifTab = "semua";

/* ==================== LOAD DATA FROM FIREBASE ==================== */
async function loadAllData() {
  showLoading("Memuat data...");
  try {
    const [animeDocs, topDocs, notifDocs, diskusiDocs, premiumDocs, userDocs] = await Promise.all([
      fbGetAll(COLLECTIONS.ANIME),
      fbGetAll(COLLECTIONS.TOP),
      fbGetAll(COLLECTIONS.NOTIFS),
      fbGetAll(COLLECTIONS.DISKUSI),
      fbGetAll(COLLECTIONS.PREMIUM),
      fbGetAll(COLLECTIONS.USERS)
    ]);

    console.log("📥 Firebase response:", {
      anime: animeDocs.length, top: topDocs.length, notif: notifDocs.length,
      diskusi: diskusiDocs.length, premium: premiumDocs.length, users: userDocs.length
    });

    animeList = (animeDocs || []).map(a => ({
      id: a.id, slug: a.slug || a.id, title: a.title || a.judul || "-",
      cover: a.cover || a.sampul || "", banner: a.banner || a.spanduk || "",
      rating: a.rating || a.peringkat || 0, studio: a.studio || "",
      type: a.type || a.tipe || "TV", totalEpisodes: a.totalEpisodes || a.jumlah_episode || 0,
      views: a.views || a.pandangan || 0, year: a.year || a.tahun || 0,
      genres: a.genres || a.genre || [], synopsis: a.synopsis || a.sinopsis || "",
      status: a.status || "ongoing", updateDay: a.updateDay || a["hari update"] || "Senin",
      updateTime: a.updateTime || a["waktu update"] || ""
    }));

    allUsers = (userDocs || []).map(u => {
      const xp = Math.min(Math.max(u.xp || 0, 0), 999999999);
      const level = u.level || calculateLevel(xp);
      const rankObj = calculateRank(level);
      return {
        id: u.id, userId: u.userId || u["user id"] || "#?",
        username: u.username || u.nama || "-", avatar: u.avatar || u.foto || "",
        xp: xp, level: level, rank: u.rank || rankObj.name,
        rankColor: u.rankColor || rankObj.color,
        followers: Math.min(Math.max(u.followers || 0, 0), 99999999),
        watchMinutes: Math.min(Math.max(u.watchMinutes || 0, 0), 99999999),
        comments: Math.min(Math.max(u.comments || 0, 0), 99999999),
        historyCount: Math.min(Math.max(u.historyCount || 0, 0), 99999999),
        joinedMonths: Math.min(Math.max(u.joinedMonths || 1, 1), 999),
        badges: u.badges || u.lencana || [], isDefault: u.isDefault || false,
        bannerUrl: u.bannerUrl || "", bannerType: u.bannerType || ""
      };
    });

    const sortedByJoin = [...allUsers].sort((a, b) => (b.joinedMonths || 0) - (a.joinedMonths || 0));
    topGiveawayData = sortedByJoin.slice(0, 20).map((u, i) => {
      const days = Math.floor((u.joinedMonths || 0) * 30);
      return { rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Member", score: days + "D", userId: u.userId, username: u.username };
    });

    const sortedByLevel = [...allUsers].sort((a, b) => (b.level || 0) - (a.level || 0));
    topLevelData = sortedByLevel.slice(0, 20).map((u, i) => ({
      rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Member", score: "Lvl " + (u.level || 1), userId: u.userId, username: u.username
    }));

    const rankOrder = { "Mythic": 1000, "Legend": 900, "Grandmaster": 800, "Master": 700, "Diamond": 600, "Platinum": 500, "Gold": 400, "Silver": 300, "Bronze": 200, "Rookie": 100 };
    const sortedByRank = [...allUsers].sort((a, b) => {
      const ra = rankOrder[a.rank] || 0;
      const rb = rankOrder[b.rank] || 0;
      if (rb !== ra) return rb - ra;
      return (b.xp || 0) - (a.xp || 0);
    });
    topRankData = sortedByRank.slice(0, 20).map((u, i) => ({
      rank: i + 1, name: u.username, avatar: u.avatar, tag: u.rank || "Rookie", score: u.rank || "Rookie", userId: u.userId, username: u.username
    }));

    topClanData = (topDocs || []).filter(t => t.type === "clan").sort((a, b) => a.rank - b.rank);
    notificationsList = notifDocs || [];
    diskusiList = diskusiDocs || [];
    premiumPlans = premiumDocs || [];

    const miko = allUsers.find(u => u.isDefault === true) || allUsers[0];
    if (miko) {
      userProfile = miko;
    } else {
      userProfile = {
        username: "Miko", userId: "#1",
        avatar: "https://i.pravatar.cc/150?img=47",
        xp: 0, level: 1, rank: "Rookie",
        joinedMonths: 1, comments: 0, historyCount: 0,
        watchMinutes: 0, followers: 0,
        badges: ["Rookie"], isDefault: true,
        bannerUrl: "", bannerType: ""
      };
    }

    favoriteList = loadFromStorage(STORAGE_KEYS.FAVORITES, []);
    historyList = loadFromStorage(STORAGE_KEYS.HISTORY, []);
    dummyComments = loadFromStorage(STORAGE_KEYS.COMMENTS, []);
    window.__notifRead = loadFromStorage(STORAGE_KEYS.NOTIF_READ, []);
    window.__watchProgress = loadFromStorage(STORAGE_KEYS.PROGRESS, {});

    hideLoading();
    console.log(`✅ Loaded: ${animeList.length} anime, ${allUsers.length} users`);
    return true;
  } catch (e) {
    console.error("❌ Gagal load data:", e);
    hideLoading();
    showToast("Gagal memuat data. Cek koneksi internet.");
    return false;
  }
}

/* ==================== HELPERS ==================== */
function getAnimeBySlug(slug) { return animeList.find(a => a.slug === slug); }
function isFavorited(slug) { return favoriteList.some(f => f.animeSlug === slug); }

function getPublicUser(username) {
  const found = allUsers.find(u => u.username === username);
  if (found) return found;
  return {
    username: username, userId: "#" + Math.floor(Math.random() * 999999),
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(username)}`,
    xp: Math.floor(Math.random() * 5000), level: Math.floor(Math.random() * 20) + 1,
    rank: "Rookie", clan: "—", joinedMonths: Math.floor(Math.random() * 24) + 1,
    comments: Math.floor(Math.random() * 500), historyCount: Math.floor(Math.random() * 300),
    watchMinutes: Math.floor(Math.random() * 20000), followers: Math.floor(Math.random() * 5000),
    badges: ["Member"], bannerUrl: "", bannerType: ""
  };
}

/* ==================== HELPER KOMENTAR PER EPISODE ==================== */
function getCommentsByEpisode(slug, ep) {
  if (!slug || !ep) return [];
  return dummyComments.filter(c => 
    String(c.animeSlug) === String(slug) && 
    Number(c.episode) === Number(ep)
  );
}

/* ==================== UNLOCK SCROLL ==================== */
function unlockScroll() {
  document.querySelectorAll(".afinitas-page, .watch-page").forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.height = "";
  document.documentElement.style.overflow = "";
}

/* ==================== UPLOAD ==================== */
function changeAvatar() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("File harus gambar"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Max 5MB"); return; }
    pendingAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => showAvatarPreviewModal(ev.target.result);
    reader.readAsDataURL(file);
  };
  input.click();
}

function showAvatarPreviewModal(previewUrl) {
  document.getElementById("modal-title").textContent = "Preview Avatar";
  document.getElementById("modal-body").innerHTML = `
    <div class="upload-preview-wrap">
      <img class="upload-preview-img round" src="${previewUrl}" alt="Preview">
    </div>
    <div class="form-hint" style="text-align:center;margin-top:10px;">
      Ukuran: ${(pendingAvatarFile.size / 1024).toFixed(1)} KB
    </div>
    <div class="form-actions">
      <button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button>
      <button class="form-btn form-btn-save" onclick="confirmAvatarUpload()">Simpan</button>
    </div>
  `;
  openModal();
}

async function confirmAvatarUpload() {
  if (!pendingAvatarFile) return;
  showLoading("Mengupload avatar...");

  try {
    const formData = new FormData();
    formData.append("file", pendingAvatarFile);
    formData.append("type", "avatar");
    formData.append("userId", userProfile.userId || "user");

    const res = await fetch(`${UPLOAD_API}/upload/avatar`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Upload gagal");
    }

    userProfile.avatar = data.url;
    saveProfile();

    if (userProfile.id) {
      try {
        await fbUpdate(COLLECTIONS.USERS, userProfile.id, {
          avatar: data.url,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Gagal update Firestore:", err);
      }
    }

    closeModal();
    showToast("Avatar berhasil diupload!");
    renderPage();
    pendingAvatarFile = null;
  } catch (err) {
    console.error("Upload error:", err);
    showToast("Gagal upload: " + err.message);
  } finally {
    hideLoading();
  }
}

function changeBanner() {
  const level = userProfile.level || calculateLevel(userProfile.xp || 0);
  const rank = calculateRank(level);
  if (rank.name.toLowerCase() !== "mythic") { showToast("Banner cuma buat rank Mythic"); return; }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/mp4,video/webm,image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { showToast("File harus video atau gambar"); return; }
    if (isVideo && file.size > 5 * 1024 * 1024) { showToast("Video max 5MB"); return; }
    if (isImage && file.size > 2 * 1024 * 1024) { showToast("Gambar max 2MB"); return; }
    if (isVideo) {
      showLoading("Cek video...");
      const duration = await getVideoDuration(file);
      hideLoading();
      if (duration > 3.5) { showToast(`Video ${duration.toFixed(1)}s — max 3 detik`); return; }
    }
    pendingBannerFile = file;
    pendingBannerType = isVideo ? "video" : "image";
    const reader = new FileReader();
    reader.onload = (ev) => showBannerPreviewModal(ev.target.result, isVideo);
    reader.readAsDataURL(file);
  };
  input.click();
}

function showBannerPreviewModal(previewUrl, isVideo) {
  document.getElementById("modal-title").textContent = "Preview Banner";
  document.getElementById("modal-body").innerHTML = `
    <div class="upload-preview-wrap banner">
      ${isVideo ? `<video class="upload-preview-media" src="${previewUrl}" autoplay loop muted playsinline></video>` : `<img class="upload-preview-media" src="${previewUrl}" alt="Preview">`}
    </div>
    <div class="form-hint" style="text-align:center;margin-top:10px;">
      ${isVideo ? "Video" : "Gambar"} • ${(pendingBannerFile.size / 1024).toFixed(1)} KB
    </div>
    <div class="form-actions">
      <button class="form-btn form-btn-cancel" onclick="cancelUpload()">Batal</button>
      <button class="form-btn form-btn-save" onclick="confirmBannerUpload()">Simpan</button>
    </div>
  `;
  openModal();
}

async function confirmBannerUpload() {
  if (!pendingBannerFile) return;
  showLoading("Mengupload banner...");

  try {
    const formData = new FormData();
    formData.append("file", pendingBannerFile);
    formData.append("type", "banner");
    formData.append("userId", userProfile.userId || "user");

    const res = await fetch(`${UPLOAD_API}/upload/banner`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Upload gagal");
    }

    userProfile.bannerUrl = data.url;
    userProfile.bannerType = pendingBannerType;
    saveProfile();

    if (userProfile.id) {
      try {
        await fbUpdate(COLLECTIONS.USERS, userProfile.id, {
          bannerUrl: data.url,
          bannerType: pendingBannerType,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Gagal update Firestore:", err);
      }
    }

    closeModal();
    showToast("Banner berhasil diupload!");
    renderPage();
    pendingBannerFile = null;
    pendingBannerType = null;
  } catch (err) {
    console.error("Upload error:", err);
    showToast("Gagal upload: " + err.message);
  } finally {
    hideLoading();
  }
}

function cancelUpload() {
  pendingAvatarFile = null;
  pendingBannerFile = null;
  pendingBannerType = null;
  closeModal();
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

function renderProfileBanner(u) {
  const isMythic = (u.rank || "").toLowerCase() === "mythic";
  if (!isMythic || !u.bannerUrl) {
    return `<div class="profile-banner profile-banner-default"><div class="profile-banner-gradient"></div></div>`;
  }
  if (u.bannerType === "video") {
    return `<div class="profile-banner"><video class="profile-banner-media" src="${u.bannerUrl}" autoplay loop muted playsinline preload="auto" oncontextmenu="return false"></video><div class="profile-banner-overlay"></div></div>`;
  }
  return `<div class="profile-banner"><img class="profile-banner-media" src="${u.bannerUrl}" alt=""><div class="profile-banner-overlay"></div></div>`;
}

/* ==================== MODAL HELPERS ==================== */
function openModal() {
  const m = document.getElementById("modal");
  if (m) m.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const m = document.getElementById("modal");
  if (m) m.style.display = "none";
  document.body.style.overflow = "";
}

/* ==================== ROUTER ==================== */
function switchTab(tab) {
  unlockScroll();
  currentTab = tab;
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  renderPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPage() {
  const main = document.getElementById("app-main");
  const nav = document.getElementById("bottom-nav");
  const miniHeader = document.getElementById("mini-header");
  main.innerHTML = "";
  if (miniHeader) miniHeader.style.display = "none";
  if (watchOpen) { nav.style.display = "none"; renderWatch(main); return; }
  nav.style.display = "flex";
  if (currentTab === "home") renderMiniHeader();
  if (currentTab === "home") renderHome(main);
  else if (currentTab === "search") renderSearch(main);
  else if (currentTab === "jadwal") renderJadwal(main);
  else if (currentTab === "favorit") renderFavorit(main);
  else if (currentTab === "riwayat") renderRiwayat(main);
  else if (currentTab === "profil") renderProfil(main);
  else if (currentTab === "notifikasi") renderNotifikasi(main);
  else if (currentTab === "premium") renderPremium(main);
  else if (currentTab === "diskusi") renderDiskusi(main);
  else if (currentTab === "peliharaan") renderPeliharaan(main);
  else if (currentTab === "afinitas") renderAfinitas(main);
  else if (currentTab === "public-profile") renderPublicProfile(main);
  else if (currentTab === "detail") renderDetail(main);
}

/* ==================== MINI HEADER ==================== */
function renderMiniHeader() {
  const miniHeader = document.getElementById("mini-header");
  if (!miniHeader) return;
  const readList = window.__notifRead || [];
  const unreadCount = notificationsList.filter(n => !readList.includes(n.id)).length;
  miniHeader.innerHTML = `
    <div class="mini-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-18"><polygon points="6 3 20 12 6 21 6 3"/></svg>
      <span>MikoAnime</span>
    </div>
    <div class="mini-actions">
      <button class="mini-icon-btn" onclick="openSearch()" aria-label="Cari">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
      <button class="mini-icon-btn" onclick="openNotifikasi()" aria-label="Notifikasi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        ${unreadCount > 0 ? `<span class="mini-badge">${unreadCount}</span>` : ""}
      </button>
    </div>
  `;
  miniHeader.style.display = "flex";
}

function pageHeaderHTML(title, backFn = "switchTab('home')") {
  return `
    <div class="page-header fade-up">
      <button class="page-back" onclick="${backFn}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="page-header-title">${title}</div>
    </div>
  `;
}

/* ==================== PREMIUM BAR ==================== */
function premiumBarHTML() {
  return `
    <button class="premium-bar fade-up" onclick="openPremium()">
      <div class="premium-bar-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-16"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </div>
      <div class="premium-bar-text">
        <div class="premium-bar-title">Beli Premium</div>
        <div class="premium-bar-sub">Nonton tanpa iklan & akses 1080p</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-16"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `;
}

/* ==================== TOP CAROUSEL ==================== */
function topCarouselHTML() {
  const slides = [
    { title: "TOP GIVEAWAY USERS", icon: "crown", data: topGiveawayData },
    { title: "TOP LEVEL", icon: "star", data: topLevelData },
    { title: "TOP RANK", icon: "trophy", data: topRankData },
    { title: "TOP CLAN", icon: "shield", data: topClanData }
  ];
  return `
    <section class="card-section giveaway-section fade-up d1" id="top-carousel">
      <div class="top-carousel-head">
        <div class="top-carousel-title" id="top-title">${iconCrown()}<span>TOP GIVEAWAY USERS</span></div>
        <div class="top-nav-btns">
          <button class="top-nav-btn" onclick="prevTopSlide()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M15 18l-6-6 6-6"/></svg></button>
          <button class="top-nav-btn" onclick="nextTopSlide()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M9 18l6-6-6-6"/></svg></button>
        </div>
      </div>
      <div class="top-slider" id="top-slider">
        ${slides.map((s, i) => `
          <div class="top-slide ${i === 0 ? "active" : ""}">
            ${s.data.length >= 3 ? `<div class="giveaway-podium">${podiumItemHTML(s.data[1], 2)}${podiumItemHTML(s.data[0], 1)}${podiumItemHTML(s.data[2], 3)}</div>` : ""}
            <div class="giveaway-list">
              ${s.data.length > 0 ? s.data.slice(0, 10).map(item => giveawayRowHTML(item)).join("") : `<p style="text-align:center;color:var(--text-mute);padding:20px 0;font-size:12px;">Belum ada data</p>`}
            </div>
          </div>
        `).join("")}
      </div>
      <div class="giveaway-dots" id="top-dots">${slides.map((_, i) => `<span class="${i === 0 ? "dot-active" : ""}" onclick="goTopSlide(${i})"></span>`).join("")}</div>
    </section>
  `;
}

function podiumItemHTML(item, rank) {
  const safeName = String(item.name || "").replace(/'/g, "\\'");
  return `<div class="podium-item rank-${rank}" onclick="openPublicProfile('${safeName}')"><img src="${item.avatar || 'https://i.pravatar.cc/150'}" alt=""><span class="podium-badge">${rank}</span></div>`;
}

function giveawayRowHTML(item) {
  const safeName = String(item.name || "").replace(/'/g, "\\'");
  return `
    <div class="giveaway-row" onclick="openPublicProfile('${safeName}')">
      <span class="gw-rank">#${item.rank}</span>
      <img class="gw-avatar" src="${item.avatar || 'https://i.pravatar.cc/150'}" alt="">
      <span class="gw-name">${item.name}</span>
      ${item.tag ? `<span class="gw-tag">${item.tag}</span>` : ""}
      <span class="gw-score">${item.score}</span>
    </div>
  `;
}

function goTopSlide(index) {
  const slides = document.querySelectorAll(".top-slide");
  const dots = document.querySelectorAll("#top-dots span");
  if (!slides.length) return;
  currentTopSlide = index;
  slides.forEach((s, i) => s.classList.toggle("active", i === index));
  dots.forEach((d, i) => d.classList.toggle("dot-active", i === index));
  updateTopTitle(index);
}

function nextTopSlide() {
  const slides = document.querySelectorAll(".top-slide");
  if (!slides.length) return;
  goTopSlide((currentTopSlide + 1) % slides.length);
}

function prevTopSlide() {
  const slides = document.querySelectorAll(".top-slide");
  if (!slides.length) return;
  goTopSlide((currentTopSlide - 1 + slides.length) % slides.length);
}

function updateTopTitle(index) {
  const titles = [
    { text: "TOP GIVEAWAY USERS", icon: iconCrown },
    { text: "TOP LEVEL", icon: iconStar },
    { text: "TOP RANK", icon: iconTrophy },
    { text: "TOP CLAN", icon: iconShield }
  ];
  const t = titles[index];
  const el = document.getElementById("top-title");
  if (el) el.innerHTML = `${t.icon()}<span>${t.text}</span>`;
}

function startAutoSlide() { stopAutoSlide(); autoSlideTimer = setInterval(() => nextTopSlide(), 5000); }
function stopAutoSlide() { if (autoSlideTimer) { clearInterval(autoSlideTimer); autoSlideTimer = null; } }

function initSwipe() {
  const slider = document.getElementById("top-slider");
  if (!slider) return;
  let startX = 0, startY = 0, isDragging = false;
  slider.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; isDragging = true; stopAutoSlide(); }, { passive: true });
  slider.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > dx) isDragging = false;
  }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) { if (diff < 0) nextTopSlide(); else prevTopSlide(); }
    startAutoSlide();
  }, { passive: true });
}

/* ==================== HOME ==================== */
function renderHome(main) {
  renderMiniHeader();
  main.innerHTML = `
    ${topCarouselHTML()}
    ${premiumBarHTML()}
    <div class="diskusi-bar fade-up d2" onclick="openDiskusi()">
      <div class="diskusi-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico-14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Public Diskusi</span>
      </div>
      <div class="diskusi-right">
        <svg viewBox="0 0 24 24" fill="currentColor" class="ico-12 heart-red"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span class="diskusi-text">${diskusiList[0] ? diskusiList[0].user + ": " + diskusiList[0].message : "Belum ada diskusi"}</span>
        ${icons.chevronRight}
      </div>
    </div>
    <section class="section fade-up d3">
      <div class="section-head">
        <h2 class="section-title">Terakhir Ditonton</h2>
        <a class="section-link" onclick="switchTab('riwayat')">Selengkapnya ${icons.chevronRight}</a>
      </div>
      <div class="horizontal-scroll">
        ${historyList.length > 0 ? historyList.slice(0, 5).map(cwCardHTML).join("") : `<p style="color:var(--text-mute);font-size:12px;padding:10px 0;">Belum ada riwayat</p>`}
      </div>
    </section>
    <section class="section fade-up d4">
      <div class="section-head">
        <h2 class="section-title">New Anime Update</h2>
        <a class="section-link" onclick="switchTab('jadwal')">Lihat Jadwal ${icons.chevronRight}</a>
      </div>
      <div class="anime-grid-3">
        ${animeList.length > 0 ? animeList.slice(0, 6).map(animeCardHTML).join("") : `<p style="color:var(--text-mute);font-size:12px;grid-column:1/-1;text-align:center;padding:20px 0;">Belum ada anime</p>`}
      </div>
    </section>
    ${animeList.length > 6 ? `<section class="section fade-up"><div class="anime-grid-3">${animeList.slice(6, 12).map(animeCardHTML).join("")}</div></section>` : ""}
  `;
  setTimeout(() => { initSwipe(); startAutoSlide(); }, 100);
}

function cwCardHTML(item) {
  const percent = item.duration ? (item.progress / item.duration) * 100 : 0;
  return `
    <div class="cw-card" onclick="openWatch('${item.animeSlug}', ${item.episode})">
      <div class="cw-thumb">
        <img src="${item.thumb || item.cover}" alt="">
        <span class="cw-eps">Eps ${item.episode}</span>
        <div class="cw-progress"><div class="cw-progress-fill" style="width:${percent}%"></div></div>
      </div>
      <div class="cw-title">${item.animeTitle}</div>
      <div class="cw-time">${icons.clock}<span>${formatTime(item.progress)} / ${formatTime(item.duration)}</span></div>
    </div>
  `;
}

function animeCardHTML(anime) {
  const fav = isFavorited(anime.slug);
  return `
    <div class="anime-card" onclick="openAnime('${anime.slug}')">
      <div class="anime-thumb">
        <img src="${anime.cover}" alt="" loading="lazy">
        <span class="anime-badge">NEW</span>
        <span class="anime-rating">${icons.star}${Number(anime.rating || 0).toFixed(1)}</span>
        <span class="anime-eps">${anime.totalEpisodes || 0} Eps</span>
        <button class="anime-fav-btn ${fav ? "active" : ""}" onclick="event.stopPropagation(); toggleFav('${anime.slug}')">${fav ? icons.heartFill : icons.heart}</button>
      </div>
      <div class="anime-title">${anime.title}</div>
      <div class="anime-views">${icons.eye}<span>${formatViews(anime.views)}</span></div>
    </div>
  `;
}

function toggleFav(slug) {
  const anime = getAnimeBySlug(slug);
  if (!anime) return;
  const idx = favoriteList.findIndex(f => f.animeSlug === slug);
  if (idx > -1) { favoriteList.splice(idx, 1); showToast("Dihapus dari Favorite"); }
  else {
    favoriteList.push({ animeSlug: anime.slug, animeTitle: anime.title, cover: anime.cover, episode: 1, rating: anime.rating, totalEpisodes: anime.totalEpisodes, lastUpdate: "baru saja" });
    showToast("Ditambahkan ke Favorite");
  }
  saveFavorites();
  renderPage();
}

/* ==================== SEARCH ==================== */
function openSearch() {
  watchFromTab = currentTab;
  currentTab = "search";
  watchOpen = false;
  searchQuery = "";
  searchGenre = "";
  stopAutoSlide();
  unlockScroll();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("bottom-nav").style.display = "flex";
  renderPage();
  setTimeout(() => { const inp = document.getElementById("search-bar"); if (inp) inp.focus(); }, 100);
}

function renderSearch(main) {
  const allGenres = [...new Set(animeList.flatMap(a => a.genres || []))].sort();
  let results = animeList;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    results = results.filter(a => a.title.toLowerCase().includes(q) || (a.studio || "").toLowerCase().includes(q) || (a.genres || []).some(g => g.toLowerCase().includes(q)));
  }
  if (searchGenre) results = results.filter(a => (a.genres || []).includes(searchGenre));

  main.innerHTML = `
    <div class="search-header fade-up">
      <button class="search-back" onclick="switchTab('home')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
      <div class="search-bar-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="search-bar" class="search-bar-input" placeholder="Cari anime, studio, genre..." value="${searchQuery}" oninput="onSearchInput(this.value)">
      </div>
    </div>
    <div class="search-tags fade-up d1">
      <span class="search-tag ${searchGenre === "" ? "active" : ""}" onclick="setGenre('')">Semua</span>
      ${allGenres.map(g => `<span class="search-tag ${searchGenre === g ? "active" : ""}" onclick="setGenre('${g}')">${g}</span>`).join("")}
    </div>
    <div class="search-result-count fade-up d2" id="search-result-count">${results.length} anime ditemukan</div>
    <div class="fade-up d3" id="search-results-wrap">
      ${results.length === 0 ? `<div class="search-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Anime "${searchQuery}" tidak ditemukan</p></div>` : `<div class="search-grid">${results.map(animeCardHTML).join("")}</div>`}
    </div>
  `;
}

function onSearchInput(val) {
  searchQuery = val;
  const countEl = document.getElementById("search-result-count");
  const resultsWrap = document.getElementById("search-results-wrap");
  if (!countEl || !resultsWrap) return;

  let results = animeList;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    results = results.filter(a => a.title.toLowerCase().includes(q) || (a.studio || "").toLowerCase().includes(q) || (a.genres || []).some(g => g.toLowerCase().includes(q)));
  }
  if (searchGenre) results = results.filter(a => (a.genres || []).includes(searchGenre));

  countEl.textContent = `${results.length} anime ditemukan`;
  resultsWrap.innerHTML = results.length === 0
    ? `<div class="search-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Anime "${searchQuery}" tidak ditemukan</p></div>`
    : `<div class="search-grid">${results.map(animeCardHTML).join("")}</div>`;
}

function setGenre(g) {
  searchGenre = g;
  document.querySelectorAll(".search-tag").forEach(el => {
    el.classList.toggle("active", el.textContent.trim() === (g || "Semua"));
  });
  onSearchInput(searchQuery);
}

/* ==================== JADWAL ==================== */
function renderJadwal(main) {
  const list = animeList.filter(a => a.updateDay === currentDay);
  main.innerHTML = `
    <h1 class="page-title fade-up">Jadwal Tayang</h1>
    <div class="jadwal-tabs fade-up d1">
      ${DAYS_OF_WEEK.map(d => `<button class="day-tab ${d === currentDay ? "active" : ""}" onclick="setDay('${d}')">${d}</button>`).join("")}
    </div>
    <div class="schedule-count fade-up d2">${list.length} Anime</div>
    <div class="schedule-list fade-up d3">
      ${list.length === 0 ? `<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada jadwal hari ${currentDay}</p>` : list.map(scheduleItemHTML).join("")}
    </div>
  `;
}

function setDay(day) { currentDay = day; renderPage(); }

function scheduleItemHTML(anime) {
  return `
    <div class="schedule-item" onclick="openAnime('${anime.slug}')">
      <div class="schedule-time">${anime.updateTime || "—"}</div>
      <div class="schedule-thumb"><img src="${anime.cover}" alt=""></div>
      <div class="schedule-info">
        <div class="schedule-title">${anime.title}</div>
        <div class="schedule-ep">Episode ${anime.totalEpisodes || 0}</div>
        <div class="schedule-status">Menunggu Update</div>
        <div class="schedule-meta">${icons.eye}<span>${formatViews(anime.views)}</span><span>•</span><span>★ ${Number(anime.rating || 0).toFixed(1)}</span></div>
      </div>
    </div>
  `;
}

/* ==================== FAVORITE ==================== */
function renderFavorit(main) {
  let list = [...favoriteList];
  if (currentFavSort === "rating") list.sort((a, b) => b.rating - a.rating);
  else if (currentFavSort === "az") list.sort((a, b) => a.animeTitle.localeCompare(b.animeTitle));

  main.innerHTML = `
    <div class="fav-header fade-up">
      <div>
        <div class="fav-title">Favorite Saya</div>
        <div class="fav-count">${list.length} anime tersimpan</div>
      </div>
      <button class="fav-sort" onclick="cycleFavSort()">
        ${currentFavSort === "terbaru" ? "Terbaru" : currentFavSort === "rating" ? "Rating" : "A-Z"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    ${list.length === 0 ? `<div class="fav-empty fade-up d1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><p>Belum ada anime favorite</p></div>` : `<div class="fav-list fade-up d1">${list.map(favItemHTML).join("")}</div>`}
  `;
}

function cycleFavSort() {
  if (currentFavSort === "terbaru") currentFavSort = "rating";
  else if (currentFavSort === "rating") currentFavSort = "az";
  else currentFavSort = "terbaru";
  renderPage();
}

function favItemHTML(fav) {
  return `
    <div class="fav-item" onclick="openWatch('${fav.animeSlug}', ${fav.episode})">
      <div class="fav-thumb">
        <img src="${fav.cover}" alt="">
        <span class="fav-badge">Eps ${fav.episode}</span>
      </div>
      <div class="fav-info">
        <div class="fav-anime-title">${fav.animeTitle}</div>
        <div class="fav-ep">Episode ${fav.episode} / ${fav.totalEpisodes}</div>
        <div class="fav-meta"><span>★ ${Number(fav.rating || 0).toFixed(1)}</span><span>•</span><span>${fav.lastUpdate}</span></div>
      </div>
      <button class="fav-remove" onclick="event.stopPropagation(); removeFav('${fav.animeSlug}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `;
}

function removeFav(slug) {
  const idx = favoriteList.findIndex(f => f.animeSlug === slug);
  if (idx > -1) { favoriteList.splice(idx, 1); saveFavorites(); showToast("Dihapus dari Favorite"); renderPage(); }
}

/* ==================== NONTON ==================== */
function openAnime(slug) {
  unlockScroll();
  watchFromTab = currentTab;
  currentAnimeSlug = slug;
  currentTab = "detail";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage();
  window.scrollTo({ top: 0 });
}

function openWatch(slug, episode) {
  unlockScroll();
  watchFromTab = currentTab;
  currentAnimeSlug = slug;
  currentEpisode = episode;
  watchOpen = true;
  stopAutoSlide();
  renderPage();
  window.scrollTo({ top: 0 });
}

function closeWatch() {
  const v = document.getElementById("video-player");
  if (v) { saveWatchProgressForCurrent(v.currentTime); v.pause(); v.src = ""; }
  watchOpen = false;
  unlockScroll();
  renderPage();
  window.scrollTo({ top: 0 });
}

function saveWatchProgressForCurrent(time) {
  if (!currentAnimeSlug) return;
  const key = `${currentAnimeSlug}-ep${currentEpisode}`;
  window.__watchProgress = window.__watchProgress || {};
  window.__watchProgress[key] = time;
  saveWatchProgress();

  const anime = getAnimeBySlug(currentAnimeSlug);
  if (!anime) return;
  const histIdx = historyList.findIndex(h => h.animeSlug === currentAnimeSlug && h.episode === currentEpisode);
  const duration = 1460;
  if (histIdx > -1) {
    historyList[histIdx].progress = Math.floor(time);
    historyList[histIdx].watchedAt = new Date().toISOString();
  } else {
    historyList.unshift({ animeSlug: anime.slug, animeTitle: anime.title, cover: anime.cover, episode: currentEpisode, progress: Math.floor(time), duration: duration, thumb: anime.cover, watchedAt: new Date().toISOString() });
    if (historyList.length > 20) historyList.pop();
  }
  saveHistory();
}

async function renderWatch(main) {
  const anime = getAnimeBySlug(currentAnimeSlug) || animeList[0];
  if (!anime) { switchTab("home"); return; }
  const ep = currentEpisode;
  const fav = isFavorited(anime.slug);

  showLoading("Memuat episode...");
  let episodes = [];
  try { episodes = await fbGetSubcollection("anime", anime.slug, "episode"); } catch (e) { console.error(e); }
  hideLoading();

  const currentEpData = episodes.find(e => Number(e.id) === ep);
  const videoUrl = currentEpData?.videoUrl || "";
  const progressKey = `${anime.slug}-ep${ep}`;
  const savedTime = (window.__watchProgress || {})[progressKey] || 0;
  const episodeComments = getCommentsByEpisode(anime.slug, ep);

  main.innerHTML = `
    <div class="watch-page">
      <div class="watch-topbar">
        <button class="watch-back" onclick="closeWatch()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <div class="watch-title-top">${anime.title}</div>
        <button class="watch-share-btn" onclick="shareAnime('${anime.slug}', '${anime.title}')">${icons.share}</button>
      </div>
      <div class="watch-player">
        ${videoUrl ? `<video id="video-player" class="watch-video" src="${videoUrl}" poster="${anime.banner}" preload="metadata" playsinline controls controlsList="nodownload" oncontextmenu="return false"></video>` : `<div class="watch-player-placeholder">${icons.play}<p style="color:var(--text-mute);font-size:13px;">Video episode ${ep} belum tersedia</p></div>`}
      </div>
      ${savedTime > 5 ? `<div class="resume-hint fade-up">Lanjut dari ${formatTime(savedTime)}</div>` : ""}
      <div class="watch-info-card">
        <div class="watch-info-cover"><img src="${anime.cover}" alt=""></div>
        <div class="watch-info-meta">
          <div class="watch-info-title">${anime.title}</div>
          <div class="watch-info-row"><span>Episode ${ep}</span>${icons.eye}<span>${formatViews(anime.views)}</span></div>
          <div class="watch-info-synopsis">${anime.synopsis}</div>
        </div>
      </div>
      <div class="watch-actions">
        <button class="watch-action" onclick="downloadVideo('${videoUrl}')">${icons.download}<span>Download</span></button>
        <button class="watch-action" onclick="reportVideo()">${icons.report}<span>Report</span></button>
        <button class="watch-action" onclick="shareAnime('${anime.slug}', '${anime.title}')">${icons.share}<span>Share</span></button>
        <button class="watch-action" onclick="toggleFav('${anime.slug}')">${fav ? icons.heartFill : icons.heart}<span>Favorite</span></button>
      </div>
      <h3 class="watch-section-title">Episode List</h3>
      <div class="episode-grid">
        ${episodes.length > 0 ? episodes.map(e => `<div class="ep-item ${Number(e.id) === ep ? "active" : ""}" onclick="changeEpisode(${Number(e.id)})">${e.id}</div>`).join("") : `<p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Belum ada episode</p>`}
      </div>
      <h3 class="watch-section-title">Komentar Episode ${ep} (<span id="comment-count">${episodeComments.length}</span>)</h3>
      <div class="comment-input-wrap">
        <img class="comment-input-avatar" src="${userProfile.avatar || 'https://i.pravatar.cc/150'}" alt="">
        <input id="comment-input" class="comment-input" placeholder="Tulis komentar di Episode ${ep}..." onkeydown="if(event.key==='Enter')sendComment()">
        <button class="comment-send-btn" onclick="sendComment()">${icons.send}</button>
      </div>
      <div id="comment-list">
        ${episodeComments.length === 0
          ? `<div class="comment-empty-black">
              <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p>Belum ada komentar di Episode ${ep}</p>
            </div>`
          : episodeComments.map(watchCommentHTML).join("")}
      </div>
    </div>
  `;

  setTimeout(() => {
    const v = document.getElementById("video-player");
    if (v && savedTime > 5) v.currentTime = savedTime;
    if (v) {
      v.addEventListener("timeupdate", () => {
        if (Math.floor(v.currentTime) % 5 === 0) {
          window.__watchProgress[progressKey] = Math.floor(v.currentTime);
          saveWatchProgress();
        }
      });
      v.addEventListener("ended", () => {
        const nextEp = ep + 1;
        if (episodes.find(e => Number(e.id) === nextEp)) {
          showToast(`Lanjut ke Episode ${nextEp}...`);
          setTimeout(() => changeEpisode(nextEp), 1500);
        }
      });
    }
  }, 100);
}

function changeEpisode(n) {
  const v = document.getElementById("video-player");
  if (v) { saveWatchProgressForCurrent(v.currentTime); v.pause(); v.src = ""; }
  currentEpisode = n;
  renderPage();
  window.scrollTo({ top: 0 });
}

function downloadVideo(url) {
  if (!url) { showToast("Video tidak tersedia"); return; }
  const a = document.createElement("a");
  a.href = url;
  a.download = "mikoanime-video.mp4";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Download dimulai...");
}

function reportVideo() {
  if (confirm("Laporkan video ini bermasalah?")) showToast("Laporan dikirim. Terima kasih!");
}

function sendComment() {
  const input = document.getElementById("comment-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (replyToComment) {
    const parent = dummyComments.find(c => c.id === replyToComment);
    if (parent) {
      if (!parent.replies) parent.replies = [];
      parent.replies.push({
        id: "r" + Date.now(), user: userProfile.username, userId: userProfile.userId,
        avatar: userProfile.avatar, content: text, createdAt: "baru saja"
      });
    }
    replyToComment = null;
  } else {
    dummyComments.unshift({
      id: "c" + Date.now(),
      animeSlug: currentAnimeSlug, episode: Number(currentEpisode),
      user: userProfile.username, userId: userProfile.userId,
      avatar: userProfile.avatar, level: userProfile.level,
      content: text, createdAt: "baru saja",
      tag: "Normal", likes: 0, liked: false, replies: []
    });
  }

  input.value = "";
  input.placeholder = `Tulis komentar di Episode ${currentEpisode}...`;
  saveComments();
  renderCommentSection();
  showToast("Komentar terkirim");
}

function renderCommentSection() {
  const list = document.getElementById("comment-list");
  const count = document.getElementById("comment-count");
  if (!list) return;

  const episodeComments = getCommentsByEpisode(currentAnimeSlug, currentEpisode);
  if (count) count.textContent = episodeComments.length;

  if (episodeComments.length === 0) {
    list.innerHTML = `
      <div class="comment-empty-black">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p>Belum ada komentar di Episode ${currentEpisode}</p>
      </div>
    `;
  } else {
    list.innerHTML = episodeComments.map(watchCommentHTML).join("");
  }
}

function replyComment(id) {
  replyToComment = id;
  const input = document.getElementById("comment-input");
  if (input) { input.focus(); input.placeholder = "Balas komentar..."; }
  showToast("Balas komentar");
}

function likeComment(id) {
  const c = dummyComments.find(x => x.id === id);
  if (!c) return;
  c.liked = !c.liked;
  c.likes = (c.likes || 0) + (c.liked ? 1 : -1);
  saveComments();
  renderCommentSection();
}

function deleteComment(id) {
  if (!confirm("Hapus komentar ini?")) return;
  const idx = dummyComments.findIndex(c => c.id === id);
  if (idx > -1) {
    dummyComments.splice(idx, 1);
    saveComments();
    renderCommentSection();
    showToast("Komentar dihapus");
  }
}

function shareAnime(slug, title) {
  const url = `${window.location.origin}${window.location.pathname}#watch/${slug}`;
  const shareData = { title: `Nonton ${title} di MikoAnime`, text: `Streaming ${title} subtitle Indonesia di MikoAnime!`, url: url };
  if (navigator.share) navigator.share(shareData).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast("Link disalin!")).catch(() => showToast("Link: " + url));
  else showToast("Link: " + url);
}

function watchCommentHTML(c) {
  const isOwn = c.user === userProfile.username;
  const commenterUser = allUsers.find(u => u.username === c.user);
  const commenterLevel = commenterUser?.level || c.level || 1;
  const commenterRank = commenterUser?.rank || calculateRank(commenterLevel).name;
  const rankInfo = calculateRank(commenterLevel);
  const safeName = String(c.user || "").replace(/'/g, "\\'");

  return `
    <div class="watch-comment">
      <img class="comment-avatar comment-avatar-clickable" src="${c.avatar}" alt="" onclick="openPublicProfile('${safeName}')">
      <div class="watch-comment-body">
        <div class="watch-comment-name-row">
          <span class="watch-comment-name comment-name-clickable" onclick="openPublicProfile('${safeName}')">${c.user}</span>
          <span class="watch-comment-id">${c.userId}</span>
          <span class="watch-comment-level">Lvl ${commenterLevel}</span>
          <span class="watch-comment-rank" style="color:${rankInfo.color};border-color:${rankInfo.color};">${commenterRank}</span>
          <span class="watch-comment-time">${c.createdAt}</span>
        </div>
        <div class="watch-comment-text">${escapeHtml(c.content)}</div>
        <div class="watch-comment-footer">
          <div class="comment-actions">
            <span class="watch-comment-reply" onclick="replyComment('${c.id}')">${icons.reply} Reply</span>
            <span class="watch-comment-like ${c.liked ? "liked" : ""}" onclick="likeComment('${c.id}')">${c.liked ? icons.heartFill : icons.heart}<span>${c.likes || 0}</span></span>
            ${isOwn ? `<span class="watch-comment-del" onclick="deleteComment('${c.id}')">${icons.trash}</span>` : ""}
          </div>
          <span class="watch-comment-tag ${c.tag === "Epic" ? "tag-epic" : "tag-normal"}">${c.tag || "Normal"}</span>
        </div>
        ${c.replies && c.replies.length > 0 ? `
          <div class="comment-replies-list">
            ${c.replies.map(r => {
              const safeReplyName = String(r.user || "").replace(/'/g, "\\'");
              return `
                <div class="comment-reply-item">
                  <img class="comment-reply-avatar comment-avatar-clickable" src="${r.avatar}" alt="" onclick="openPublicProfile('${safeReplyName}')">
                  <div>
                    <div class="comment-reply-name comment-name-clickable" onclick="openPublicProfile('${safeReplyName}')">${r.user}</div>
                    <div class="comment-reply-text">${escapeHtml(r.content)}</div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

/* ==================== RIWAYAT ==================== */
function renderRiwayat(main) {
  const groups = {};
  historyList.forEach(h => {
    const key = formatDate(h.watchedAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(h);
  });

  main.innerHTML = `
    <h1 class="page-title fade-up">Riwayat Menonton</h1>
    <p style="text-align:center;font-size:12px;color:var(--text-mute);margin-bottom:20px;">Tahan series untuk pilih & hapus</p>
    ${Object.entries(groups).length === 0 ? `<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada riwayat</p>` : Object.entries(groups).map(([date, items], idx) => `
      <div class="history-group fade-up" style="animation-delay:${idx * 0.05}s">
        <div class="history-date">${date}</div>
        ${items.map(historyItemHTML).join("")}
      </div>
    `).join("")}
  `;
}

function historyItemHTML(item) {
  const percent = item.duration ? (item.progress / item.duration) * 100 : 0;
  return `
    <div class="history-item" onclick="openWatch('${item.animeSlug}', ${item.episode})" ontouchstart="startHoldTimer('${item.animeSlug}', ${item.episode})" ontouchend="clearHoldTimer()">
      <div class="history-thumb"><img src="${item.cover}" alt=""></div>
      <div class="history-info">
        <div class="history-title">${item.animeTitle}</div>
        <div class="history-ep">Episode ${item.episode}</div>
        <div class="history-progress-bar"><div class="history-progress-fill" style="width:${percent}%"></div></div>
        <div class="history-progress-time"><span>${formatTime(item.progress)}</span><span>${formatTime(item.duration)}</span></div>
      </div>
    </div>
  `;
}

let holdTimer = null;

function startHoldTimer(slug, ep) {
  holdTimer = setTimeout(() => {
    if (confirm("Hapus dari riwayat?")) {
      const idx = historyList.findIndex(h => h.animeSlug === slug && h.episode === ep);
      if (idx > -1) { historyList.splice(idx, 1); saveHistory(); showToast("Dihapus dari riwayat"); renderPage(); }
    }
  }, 800);
}

function clearHoldTimer() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }

/* ==================== PROFIL ==================== */
function renderProfil(main) {
  const u = userProfile;
  const level = u.level || calculateLevel(u.xp || 0);
  const rank = calculateRank(level);
  const isMythic = rank.name.toLowerCase() === "mythic";

  main.innerHTML = `
    <div class="profile-hero-wa fade-up">
      <div class="profile-banner-wrap">
        ${renderProfileBanner(u)}
        <div class="profile-avatar-center">
          <img class="profile-avatar-big" src="${u.avatar}" alt="">
          <div class="profile-cam" onclick="changeAvatar()">${icons.camera}</div>
        </div>
      </div>
      <div class="profile-info-below">
        <div class="profile-name-big">${u.username} <span>${u.userId}</span></div>
        <div class="profile-badges">
          <span class="profile-badge">${icons.star2} Lvl. ${level}</span>
          <span class="profile-badge" style="color:${rank.color};">${icons.trophy} ${rank.name}</span>
        </div>
      </div>
    </div>
    <div class="profile-stats-5 fade-up d2">
      <div class="stat-box"><div class="stat-value">${Math.min(u.joinedMonths || 0, 999)}</div><div class="stat-label">bulan</div></div>
      <div class="stat-box"><div class="stat-value gradient-text">${formatXP(u.xp || 0)}</div><div class="stat-label">XP</div></div>
      <div class="stat-box"><div class="stat-value">${u.comments || 0}</div><div class="stat-label">komentar</div></div>
      <div class="stat-box"><div class="stat-value">${u.historyCount || 0}</div><div class="stat-label">riwayat</div></div>
      <div class="stat-box"><div class="stat-value">${u.watchMinutes || 0}</div><div class="stat-label">menit</div></div>
    </div>
    ${isMythic ? `<div class="profile-banner-btn-wrap fade-up d2"><button class="profile-banner-btn" onclick="changeBanner()">${icons.camera} Ganti Banner</button></div>` : ""}
    <div class="profile-actions fade-up d2">
      <button class="profile-action-btn" onclick="openPeliharaan()">${icons.paw} Peliharaan</button>
      <button class="profile-action-btn" onclick="openAfinitas()">${icons.star2} Afinitas</button>
    </div>
    <div class="profile-tabs fade-up d3">
      <button class="profile-tab ${currentProfileTab === "komentar" ? "active" : ""}" onclick="setProfileTab('komentar')">Komentar</button>
      <button class="profile-tab ${currentProfileTab === "favorit" ? "active" : ""}" onclick="setProfileTab('favorit')">Favorite</button>
      <button class="profile-tab ${currentProfileTab === "histori" ? "active" : ""}" onclick="setProfileTab('histori')">Histori</button>
    </div>
    <div class="profile-content fade-up d4">${renderProfileContent()}</div>
  `;
}

function setProfileTab(tab) { currentProfileTab = tab; renderPage(); }

function renderProfileContent() {
  if (currentProfileTab === "komentar") {
    const myComments = dummyComments.filter(c => c.user === userProfile.username);
    return myComments.length === 0
      ? `<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada komentar</p>`
      : myComments.slice(0, 5).map(c => {
          const safeName = String(c.user || "").replace(/'/g, "\\'");
          return `
            <div class="comment-item">
              <img class="comment-avatar comment-avatar-clickable" src="${c.avatar}" alt="" onclick="openPublicProfile('${safeName}')">
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-name comment-name-clickable" onclick="openPublicProfile('${safeName}')">${c.user}</span>
                  <span class="comment-time">${c.createdAt}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content)}</div>
                <div style="font-size:10px;color:var(--text-mute);margin-top:4px;">📺 ${c.animeSlug || "Anime"} • Episode ${c.episode || "-"}</div>
              </div>
            </div>
          `;
        }).join("");
  }
  if (currentProfileTab === "favorit") {
    return favoriteList.length === 0
      ? `<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada Favorite</p>`
      : favoriteList.map(favItemHTML).join("");
  }
  if (currentProfileTab === "histori") {
    return historyList.length === 0
      ? `<p style="text-align:center;color:var(--text-mute);padding:30px 0;">Belum ada riwayat</p>`
      : historyList.slice(0, 5).map(historyItemHTML).join("");
  }
}

/* ==================== HALAMAN BARU ==================== */
function openNotifikasi() {
  unlockScroll();
  watchFromTab = currentTab;
  currentTab = "notifikasi"; watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage(); window.scrollTo({ top: 0 });
}

function openPremium() {
  unlockScroll();
  watchFromTab = currentTab;
  currentTab = "premium"; watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage(); window.scrollTo({ top: 0 });
}

function openDiskusi() {
  unlockScroll();
  watchFromTab = currentTab;
  currentTab = "diskusi"; watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage(); window.scrollTo({ top: 0 });
}

function openPeliharaan() {
  unlockScroll();
  watchFromTab = currentTab;
  currentTab = "peliharaan"; watchOpen = false;
  stopAutoSlide();
  renderPage(); window.scrollTo({ top: 0 });
}

function openAfinitas() {
  unlockScroll();
  watchFromTab = currentTab;
  currentTab = "afinitas"; watchOpen = false;
  stopAutoSlide();
  renderPage(); window.scrollTo({ top: 0 });
}

function renderNotifikasi(main) {
  const readList = window.__notifRead || [];
  const unread = notificationsList.filter(n => !readList.includes(n.id)).length;
  const list = currentNotifTab === "belum" ? notificationsList.filter(n => !readList.includes(n.id)) : notificationsList;

  main.innerHTML = `
    ${pageHeaderHTML("Notifikasi", "switchTab('home')")}
    <div class="notif-tabs fade-up">
      <button class="notif-tab ${currentNotifTab === "semua" ? "active" : ""}" onclick="setNotifTab('semua')">Semua</button>
      <button class="notif-tab ${currentNotifTab === "belum" ? "active" : ""}" onclick="setNotifTab('belum')">Belum Dibaca ${unread > 0 ? `(${unread})` : ""}</button>
    </div>
    <div class="fade-up d1">
      ${list.length === 0 ? `<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Tidak ada notifikasi</p>` : list.map(n => `
        <div class="notif-item ${readList.includes(n.id) ? "" : "unread"}" onclick="markNotifRead('${n.id}')">
          <div class="notif-icon type-${n.type}">${n.type === "update" ? icons.play : n.type === "comment" ? icons.chat : icons.star}</div>
          <div class="notif-body">
            <div class="notif-title">${n.title}</div>
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function setNotifTab(tab) { currentNotifTab = tab; renderPage(); }

function markNotifRead(id) {
  window.__notifRead = window.__notifRead || [];
  if (!window.__notifRead.includes(id)) {
    window.__notifRead.push(id);
    saveNotifRead();
    renderPage();
  }
}

function renderPremium(main) {
  main.innerHTML = `
    ${pageHeaderHTML("Premium", "switchTab('home')")}
    <div class="premium-hero fade-up d1">
      <div class="premium-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
      <div class="premium-hero-title">MikoAnime Premium</div>
      <div class="premium-hero-sub">Nikmati pengalaman nonton tanpa gangguan. Bebas iklan, kualitas 1080p, dan download offline.</div>
    </div>
    <div class="plan-list fade-up d2">
      ${premiumPlans.length === 0 ? `<p style="text-align:center;color:var(--text-mute);padding:20px 0;">Belum ada paket premium</p>` : premiumPlans.map(p => `
        <div class="plan-card ${p.popular ? "popular" : ""}" onclick="buyPremium('${p.name}')">
          ${p.popular ? `<span class="plan-popular-tag">Populer</span>` : ""}
          <div class="plan-name">${p.name}</div>
          <div class="plan-price">${p.price}</div>
          <div class="plan-period">${p.period}</div>
          <div class="plan-features">${(p.features || []).map(f => `<div class="plan-feature">${icons.check}<span>${f}</span></div>`).join("")}</div>
        </div>
      `).join("")}
    </div>
    <button class="premium-buy-btn fade-up d3" onclick="buyPremium('Pilihanmu')">Beli Premium Sekarang</button>
  `;
}

function buyPremium(plan) { showToast(`Paket ${plan} dipilih. Pembayaran segera hadir!`); }

function renderDiskusi(main) {
  main.innerHTML = `
    ${pageHeaderHTML("Public Diskusi", "switchTab('home')")}
    <div class="fade-up d1">
      ${diskusiList.length === 0 ? `<p style="text-align:center;color:var(--text-mute);padding:40px 0;">Belum ada diskusi</p>` : diskusiList.map(d => `
        <div class="chat-item" onclick="showToast('Chat dengan ${d.user} belum tersedia')">
          <img class="chat-avatar" src="${d.avatar}" alt="">
          <div class="chat-body">
            <div class="chat-name-row"><span class="chat-name">${d.user}</span><span class="chat-time">${d.time}</span></div>
            <div class="chat-msg">${d.message}</div>
          </div>
          ${d.unread ? `<span class="chat-unread"></span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderPeliharaan(main) {
  main.innerHTML = `
    ${pageHeaderHTML("Peliharaan", "switchTab('profil')")}
    <div class="feature-hero fade-up d1">
      <div class="feature-icon-big">${icons.paw}</div>
      <div class="feature-title">Peliharaan</div>
      <div class="feature-sub">Kumpulkan karakter anime favoritmu dan rawat mereka di sini. Fitur segera hadir!</div>
    </div>
  `;
}

/* ==================== AFINITAS ==================== */
function renderAfinitas(main) {
  const u = userProfile;
  const level = u.level || calculateLevel(u.xp || 0);
  const rank = calculateRank(level);

  const userGenres = {};
  favoriteList.forEach(f => {
    const anime = getAnimeBySlug(f.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(g => { userGenres[g] = (userGenres[g] || 0) + 2; });
  });
  historyList.forEach(h => {
    const anime = getAnimeBySlug(h.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(g => { userGenres[g] = (userGenres[g] || 0) + 1; });
  });

  const characters = animeList.slice(0, 20).map(anime => {
    let matchScore = 0;
    const totalGenres = (anime.genres || []).length;
    if (totalGenres > 0 && Object.keys(userGenres).length > 0) {
      let hitGenres = 0;
      anime.genres.forEach(g => { if (userGenres[g]) hitGenres += userGenres[g]; });
      const maxPossible = Math.max(...Object.values(userGenres)) * totalGenres;
      matchScore = maxPossible > 0 ? Math.min(100, Math.round((hitGenres / maxPossible) * 100)) : 0;
    }
    if (matchScore === 0) matchScore = Math.round((anime.rating || 7) * 10);
    matchScore = Math.max(50, matchScore);
    const colors = ["#a855f7", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6"];
    return { id: anime.slug, name: anime.title, role: anime.studio || anime.type || "Anime", match: matchScore, avatar: anime.cover, color: colors[anime.title.length % colors.length], genres: anime.genres || [] };
  });

  const topCharacters = characters.sort((a, b) => b.match - a.match).slice(0, 4);

  const similarUsers = allUsers
    .filter(x => x.username !== u.username)
    .map(x => {
      const levelDiff = Math.abs((x.level || 1) - level);
      const match = Math.max(40, Math.min(99, 100 - levelDiff * 2));
      return { ...x, match };
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 5);

  const totalMatch = topCharacters.length > 0 ? Math.round(topCharacters.reduce((sum, c) => sum + c.match, 0) / topCharacters.length) : 0;

  main.innerHTML = `
    <div class="afinitas-page">
      <div class="afinitas-topbar">
        <button class="afinitas-back" onclick="switchTab('profil')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
        <div class="afinitas-title">Afinitas</div>
        <button class="afinitas-help" onclick="showToast('Afinitas dihitung dari genre anime favoritmu')">?</button>
      </div>
      <div class="afinitas-hero">
        <img class="afinitas-hero-avatar" src="${u.avatar}" alt="">
        <div class="afinitas-hero-name">${u.username}</div>
        <div class="afinitas-hero-rank" style="color:${rank.color};">${rank.name} • Lvl ${level}</div>
        <div class="afinitas-hero-score">${totalMatch}%</div>
        <div class="afinitas-hero-label">Total Afinitas</div>
        <div class="afinitas-hero-bar"><div class="afinitas-hero-bar-fill" id="afinitas-hero-fill" style="width:0%"></div></div>
      </div>
      <div class="afinitas-section">
        <div class="afinitas-section-head">
          <div class="afinitas-section-title">Karakter Afinitas</div>
          <div class="afinitas-section-count">${topCharacters.length} karakter</div>
        </div>
        ${topCharacters.length === 0 ? `<div class="afinitas-empty"><p>Belum ada data anime</p></div>` : topCharacters.map((c, i) => `
          <div class="afinitas-card" onclick="openAfinitasCharModal(${i})">
            <div class="afinitas-card-avatar">
              <img src="${c.avatar}" alt="">
              <div class="afinitas-card-badge" style="background:${c.color};">${c.match}%</div>
            </div>
            <div class="afinitas-card-info">
              <div class="afinitas-card-name">${c.name}</div>
              <div class="afinitas-card-role">${c.role}</div>
              <div class="afinitas-card-bar"><div class="afinitas-card-bar-fill" style="width:0%; background:${c.color};" data-width="${c.match}%"></div></div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="afinitas-section">
        <div class="afinitas-section-head">
          <div class="afinitas-section-title">User dengan Level Mirip</div>
          <div class="afinitas-section-count">${similarUsers.length} user</div>
        </div>
        ${similarUsers.length === 0 ? `<div class="afinitas-empty"><p>Belum ada user lain</p></div>` : similarUsers.map(x => `
          <div class="afinitas-user" onclick="openPublicProfile('${x.username}')">
            <img class="afinitas-user-avatar" src="${x.avatar}" alt="">
            <div class="afinitas-user-info">
              <div class="afinitas-user-name">${x.username}</div>
              <div class="afinitas-user-rank">${x.rank || "Rookie"} • Lvl ${x.level || 1}</div>
            </div>
            <div class="afinitas-user-match">${x.match}%</div>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="afinitas-modal" id="afinitas-modal"><div class="afinitas-modal-card" id="afinitas-modal-card"></div></div>
  `;

  window.__afinitasChars = topCharacters;
  setTimeout(() => {
    const heroFill = document.getElementById("afinitas-hero-fill");
    if (heroFill) heroFill.style.width = totalMatch + "%";
    document.querySelectorAll(".afinitas-card-bar-fill").forEach(el => { el.style.width = el.dataset.width; });
  }, 200);
}

function openAfinitasCharModal(index) {
  const chars = window.__afinitasChars || [];
  const c = chars[index];
  if (!c) return;
  const modal = document.getElementById("afinitas-modal");
  const card = document.getElementById("afinitas-modal-card");
  if (!modal || !card) return;

  const userGenres = {};
  favoriteList.forEach(f => {
    const anime = getAnimeBySlug(f.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(g => userGenres[g] = true);
  });
  historyList.forEach(h => {
    const anime = getAnimeBySlug(h.animeSlug);
    if (anime && anime.genres) anime.genres.forEach(g => userGenres[g] = true);
  });
  const matchedGenres = (c.genres || []).filter(g => userGenres[g]);

  card.innerHTML = `
    <img class="afinitas-modal-avatar" src="${c.avatar}" alt="" style="border-color:${c.color};">
    <div class="afinitas-modal-name">${c.name}</div>
    <div class="afinitas-modal-role">${c.role}</div>
    <div class="afinitas-modal-match">${c.match}%</div>
    <div class="afinitas-modal-match-label">Cocok</div>
    <div class="afinitas-modal-desc">
      ${matchedGenres.length > 0 ? `Kamu cocok dengan <b>${c.name}</b> karena genre: <b>${matchedGenres.join(", ")}</b>` : `Tonton lebih banyak anime ${c.role} biar afinitasmu makin tinggi!`}
    </div>
    <button class="afinitas-modal-close" onclick="closeAfinitasModal()">Tutup</button>
  `;
  modal.classList.add("show");
}

function closeAfinitasModal() {
  const modal = document.getElementById("afinitas-modal");
  if (modal) modal.classList.remove("show");
}

/* ==================== PROFIL PUBLIK ==================== */
function openPublicProfile(username) {
  unlockScroll();
  currentPublicUser = getPublicUser(username);
  currentPublicTab = "info";
  watchFromTab = currentTab;
  currentTab = "public-profile";
  watchOpen = false;
  stopAutoSlide();
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  renderPage();
  window.scrollTo({ top: 0 });
}

function renderPublicProfile(main) {
  const u = currentPublicUser;
  if (!u) { switchTab("home"); return; }
  const level = u.level || calculateLevel(u.xp || 0);
  const rank = calculateRank(level);

  main.innerHTML = `
    <div class="page-header fade-up">
      <button class="page-back" onclick="goBackFromProfile()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
      <div class="page-header-title">Profil ${u.username}</div>
    </div>
    <div class="profile-hero-wa fade-up d1">
      <div class="profile-banner-wrap">
        ${renderProfileBanner(u)}
        <div class="profile-avatar-center"><img class="profile-avatar-big" src="${u.avatar}" alt=""></div>
      </div>
      <div class="profile-info-below">
        <div class="profile-name-big">${u.username} <span>${u.userId}</span></div>
        <div class="profile-badges">
          <span class="profile-badge">${icons.star2} Lvl. ${level}</span>
          <span class="profile-badge" style="color:${rank.color};">${icons.trophy} ${rank.name}</span>
        </div>
      </div>
    </div>
    <div class="profile-stats-5 fade-up d2">
      <div class="stat-box"><div class="stat-value">${Math.min(u.joinedMonths || 0, 999)}</div><div class="stat-label">bulan</div></div>
      <div class="stat-box"><div class="stat-value gradient-text">${formatXP(u.xp || 0)}</div><div class="stat-label">XP</div></div>
      <div class="stat-box"><div class="stat-value">${formatViews(u.comments || 0)}</div><div class="stat-label">komentar</div></div>
      <div class="stat-box"><div class="stat-value">${formatViews(u.historyCount || 0)}</div><div class="stat-label">riwayat</div></div>
      <div class="stat-box"><div class="stat-value">${formatViews(u.followers || 0)}</div><div class="stat-label">follower</div></div>
    </div>
    <div class="profile-actions fade-up d2">
      <button class="profile-action-btn" onclick="followUser('${u.username}')">${icons.heart} Ikuti</button>
      <button class="profile-action-btn" onclick="shareProfile('${u.username}')">${icons.share} Bagikan</button>
    </div>
    <div class="public-info-card fade-up d3">
      <div class="public-info-row"><span class="public-info-label">Total Nonton</span><span class="public-info-value">${formatViews(u.watchMinutes || 0)} menit</span></div>
      <div class="public-info-row"><span class="public-info-label">Rank</span><span class="public-info-value" style="color:${rank.color};">${rank.name}</span></div>
      <div class="public-info-row"><span class="public-info-label">Followers</span><span class="public-info-value">${formatViews(u.followers || 0)}</span></div>
      <div class="public-info-row"><span class="public-info-label">Bergabung</span><span class="public-info-value">${u.joinedMonths || 0} bulan lalu</span></div>
    </div>
  `;
}

function goBackFromProfile() {
  if (watchFromTab === "search") openSearch();
  else switchTab(watchFromTab || "home");
}

function followUser(username) { showToast(`Kamu sekarang mengikuti ${username}!`); }

function shareProfile(username) {
  const u = getPublicUser(username);
  const url = `${window.location.origin}${window.location.pathname}#profile/${username}`;
  const shareData = { title: `Profil ${username} di MikoAnime`, text: `Cek profil ${username} (Lvl ${u.level}) di MikoAnime!`, url: url };
  if (navigator.share) navigator.share(shareData).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast("Link disalin!")).catch(() => showToast("Link: " + url));
  else showToast("Link: " + url);
}

/* ==================== DETAIL ANIME ==================== */
function renderDetail(main) {
  const anime = getAnimeBySlug(currentAnimeSlug) || animeList[0];
  if (!anime) { switchTab("home"); return; }
  const fav = isFavorited(anime.slug);
  const related = animeList.filter(a => a.slug !== anime.slug && (a.genres || []).some(g => (anime.genres || []).includes(g))).slice(0, 6);

  main.innerHTML = `
    <div class="detail-page">
      <div class="detail-banner">
        <img src="${anime.banner}" alt="">
        <div class="detail-banner-overlay"></div>
        <button class="detail-back" onclick="goBackFromDetail()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
      </div>
      <div class="detail-info">
        <div class="detail-poster">
          <img src="${anime.cover}" alt="">
          <span class="detail-poster-badge">${anime.type || "TV"}</span>
        </div>
        <div class="detail-meta">
          <h1 class="detail-title">${anime.title}</h1>
          <div class="detail-stats">
            <span class="detail-stat">${icons.star}<span>${Number(anime.rating || 0).toFixed(1)}</span></span>
            <span class="detail-stat">${icons.eye}<span>${formatViews(anime.views)}</span></span>
          </div>
          <div class="detail-info-row">
            <span class="detail-info-chip">${anime.studio || "—"}</span>
            <span class="detail-info-chip">${anime.year || "—"}</span>
            <span class="detail-info-chip ${anime.status === "ongoing" ? "chip-live" : ""}">${anime.status === "ongoing" ? "Ongoing" : "Completed"}</span>
          </div>
        </div>
      </div>
      <div class="detail-genres">${(anime.genres || []).map(g => `<span class="detail-genre" onclick="openGenreFromDetail('${g}')">${g}</span>`).join("")}</div>
      <div class="detail-actions">
        <button class="detail-btn-primary" onclick="openWatch('${anime.slug}', 1)">${icons.play} Tonton Sekarang</button>
        <button class="detail-btn-secondary ${fav ? "active" : ""}" onclick="toggleFav('${anime.slug}')">${fav ? icons.heartFill : icons.heart} ${fav ? "Favorit" : "Tambah Favorite"}</button>
      </div>
      <div class="detail-section">
        <h3 class="detail-section-title">Sinopsis</h3>
        <p class="detail-synopsis" id="detail-synopsis">${anime.synopsis}</p>
        <button class="detail-more" id="detail-more-btn" onclick="toggleSynopsis()">Selengkapnya</button>
      </div>
      <div class="detail-section">
        <h3 class="detail-section-title">Episode</h3>
        <div class="episode-grid" id="detail-episode-grid"><p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Memuat episode...</p></div>
      </div>
      ${related.length > 0 ? `<div class="detail-section"><h3 class="detail-section-title">Anime Terkait</h3><div class="anime-grid-3">${related.map(animeCardHTML).join("")}</div></div>` : ""}
    </div>
  `;

  setTimeout(() => {
    const syn = document.getElementById("detail-synopsis");
    const btn = document.getElementById("detail-more-btn");
    if (syn && btn) { if (syn.scrollHeight <= syn.clientHeight + 10) btn.style.display = "none"; }
  }, 50);

  (async () => {
    const eps = await fbGetSubcollection("anime", anime.slug, "episode");
    const grid = document.getElementById("detail-episode-grid");
    if (grid) {
      grid.innerHTML = eps.length > 0
        ? eps.map(e => `<div class="ep-item" onclick="openWatch('${anime.slug}', ${Number(e.id)})">${e.id}</div>`).join("")
        : `<p style="color:var(--text-mute);font-size:12px;padding:8px 0;">Belum ada episode</p>`;
    }
  })();
}

function goBackFromDetail() {
  if (watchFromTab === "search") openSearch();
  else switchTab(watchFromTab || "home");
}

function toggleSynopsis() {
  const syn = document.getElementById("detail-synopsis");
  const btn = document.getElementById("detail-more-btn");
  if (!syn || !btn) return;
  if (syn.classList.contains("expanded")) { syn.classList.remove("expanded"); btn.textContent = "Selengkapnya"; }
  else { syn.classList.add("expanded"); btn.textContent = "Sembunyikan"; }
}

function openGenreFromDetail(genre) {
  unlockScroll();
  searchGenre = genre;
  currentTab = "search";
  searchQuery = "";
  document.getElementById("bottom-nav").style.display = "flex";
  renderPage();
  window.scrollTo({ top: 0 });
}

/* ==================== BOTTOM NAV ==================== */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => { switchTab(btn.dataset.tab); });
});

/* ==================== INIT ==================== */
(async function init() {
  await loadAllData();
  renderPage();
})();
