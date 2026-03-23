/**
 * GARISREY — global.js
 * Shared utilities: Supabase, Auth, Nav, Toast, Modal, Cart
 */

/* ── SUPABASE CONFIG ── */
const SUPABASE_URL  = 'https://lpkbbrjyscwmdowxexbx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_7Pl3BeLfdECmKoyi1bqMtA_SA1CoCsv';
const ADMIN_EMAIL   = 'garisrey8@gmail.com';
const WA_NUMBER     = '628131003247';

// Inisialisasi Supabase client (ESM sudah di-import di HTML)
let sb;
function initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return sb;
}

/* ── FORMAT HELPERS ── */
const fmt  = n => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const disc = p => p.price_ori > p.price ? Math.round((1 - p.price / p.price_ori) * 100) : 0;

/* ── WISHLIST (localStorage) ── */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem('gr_wishlist') || '[]'); } catch { return []; }
}

function saveWishlist(list) {
  localStorage.setItem('gr_wishlist', JSON.stringify(list));
}

function toggleWishlistItem(id, onSuccess) {
  const list = getWishlist();
  const idx  = list.indexOf(id);
  if (idx === -1) {
    list.push(id);
    showToast('Ditambahkan ke wishlist ♥', 'ok');
  } else {
    list.splice(idx, 1);
    showToast('Dihapus dari wishlist', 'info');
  }
  saveWishlist(list);
  if (onSuccess) onSuccess(list);
}

/* ── TOAST ── */
function showToast(msg, type = 'info') {
  const icons = { ok: '✅', err: '❌', info: 'ℹ️' };
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.textContent = (icons[type] || '') + ' ' + msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ── MARQUEE ── */
/* Global WA message overrides — diisi oleh loadKontenBeranda / loadKontenShop */
let WA_PESAN_UMUM  = 'Halo Garisrey! 👋 Saya ingin bertanya tentang produk kalian.';
let WA_PESAN_ORDER = 'Halo Garisrey! 👋 Saya ingin order. Boleh info produk yang tersedia?';

/* Global social media items cache — loaded from Supabase sosial_v2 */
let _sosialData = null;

async function loadSosialData() {
  if (!sb) return;
  try {
    var result = await Promise.race([
      sb.from('settings').select('value').eq('key','sosial_v2').maybeSingle(),
      new Promise(function(r){ setTimeout(function(){ r({data:null}); }, 3000); })
    ]);
    if (result && result.data && Array.isArray(result.data.value)) {
      _sosialData = result.data.value;
    } else {
      /* Fallback to legacy key */
      var r2 = await Promise.race([
        sb.from('settings').select('value').eq('key','sosial').maybeSingle(),
        new Promise(function(r){ setTimeout(function(){ r({data:null}); }, 2000); })
      ]);
      if (r2 && r2.data && r2.data.value) {
        var s = r2.data.value;
        var arr = [];
        if (s.shopee) arr.push({ id:'shopee', label:'Shopee',    url:s.shopee, icon:'🛍', color:'#ff5f00' });
        if (s.wa)     arr.push({ id:'wa',     label:'WhatsApp',  url:s.wa,     icon:'📱', color:'#25d366', isWa:true });
        if (s.ig)     arr.push({ id:'ig',     label:'Instagram', url:s.ig,     icon:'📸', color:'#e1306c' });
        if (s.tiktok) arr.push({ id:'tiktok', label:'TikTok',    url:s.tiktok, icon:'🎵', color:'#ffffff' });
        if (arr.length) _sosialData = arr;
      }
    }
  } catch(e) { /* keep defaults */ }
  /* Apply to all surfaces */
  _applyAllSosial();
}

function _getSosialData() {
  var items = _sosialData || [
    { id:'shopee', label:'Shopee',    url:'https://shopee.co.id/garisrey',        icon:'🛍', iconType:'emoji' },
    { id:'wa',     label:'WhatsApp',  url:'https://wa.me/628131003247',            icon:'📱', iconType:'emoji', isWa:true },
    { id:'ig',     label:'Instagram', url:'https://instagram.com/garisrey.studio', icon:'📸', iconType:'emoji' },
    { id:'tiktok', label:'TikTok',    url:'https://tiktok.com/@garisrey',          icon:'🎵', iconType:'emoji' },
  ];
  /* Only return active items (active: false = hidden) */
  return items.filter(function(i) { return i.active !== false; });
}

function _isWaItem(item) {
  return item.isWa || (item.url && item.url.includes('wa.me'));
}
function _makeWaUrl(item) {
  if (!_isWaItem(item)) return item.url;
  var base = item.url.split('?')[0];
  return base + '?text=' + encodeURIComponent(WA_PESAN_UMUM);
}
function _makeWaOrderUrl(item) {
  if (!_isWaItem(item)) return item.url;
  var base = item.url.split('?')[0];
  return base + '?text=' + encodeURIComponent(WA_PESAN_ORDER);
}

function _applyAllSosial() {
  _buildOrderPopups();
  _buildFooterLinks();
}

/* ── Helper: render icon element (emoji or image) ── */
function _iconHtml(item, size) {
  size = size || 22;
  if (item.iconType === 'image' && item.iconImg) {
    return '<img src="'+item.iconImg+'" style="width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:3px;display:block;flex-shrink:0" onerror="this.style.display=\'none\'">';
  }
  /* Use line-height:1 + exact font-size so emoji takes predictable space */
  return '<span style="font-size:'+size+'px;line-height:1;display:block;text-align:center;width:'+size+'px;flex-shrink:0">'+(item.icon || '🔗')+'</span>';
}

/* ── Rebuild all .order-popup-links containers ── */
function _buildOrderPopups() {
  var items = _getSosialData();
  document.querySelectorAll('.order-popup-links').forEach(function(container) {
    container.innerHTML = items.map(function(item) {
      var href = item.isWa ? _makeWaOrderUrl(item) : item.url;
      return '<a href="'+href+'" target="_blank" ' +
        'style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(255,255,255,.04);' +
        'border:1px solid rgba(255,255,255,.08);border-radius:8px;text-decoration:none;transition:background .18s" ' +
        'onmouseover="this.style.background=\'rgba(255,255,255,.08)\'" onmouseout="this.style.background=\'rgba(255,255,255,.04)\'">' +
        '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+_iconHtml(item, 24)+'</div>' +
        '<div style="text-align:left">' +
          '<div style="font-size:11px;font-weight:700;color:#f0ebe3">'+item.label+'</div>' +
          '<div style="font-size:9px;color:rgba(255,255,255,.3);margin-top:2px">'+(item.isWa ? 'Chat langsung dengan kami' : 'Order via '+item.label)+'</div>' +
        '</div>' +
        '<span style="margin-left:auto;color:rgba(255,255,255,.25)">→</span>' +
      '</a>';
    }).join('');
  });
}

/* ── Rebuild footer contact links ── */
function _buildFooterLinks() {
  var items = _getSosialData();
  document.querySelectorAll('.footer-sosial-links').forEach(function(container) {
    container.innerHTML = items.map(function(item) {
      var href = item.isWa ? _makeWaUrl(item) : item.url;
      return '<a href="'+href+'" target="_blank" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;color:rgba(255,255,255,.35);transition:color .2s;text-decoration:none" onmouseover="this.style.color=\'#fafafa\'" onmouseout="this.style.color=\'rgba(255,255,255,.35)\'">' +
        '<span style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1">'+_iconHtml(item, 14)+'</span>' +
        '<span>'+item.label+'</span>' +
      '</a>';
    }).join('');
  });
}

/* ── Build Linktree list ── */
function buildLinktreeLinks(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var items = _getSosialData();
  container.innerHTML = items.map(function(item, idx) {
    var href  = item.isWa ? _makeWaUrl(item) : item.url;
    var col   = item.color || '#ffffff';
    var delay = (0.15 + idx * 0.07).toFixed(2);
    var sub   = href.replace(/^https?:\/\//, '').replace(/\?.*/, '').replace(/\/$/, '');
    return '<a href="'+href+'" target="_blank" rel="noopener" class="link-item" style="--link-accent:'+col+';animation-delay:'+delay+'s">' +
      '<div class="link-icon">'+_iconHtml(item, 22)+'</div>' +
      '<div class="link-text">' +
        '<div class="link-label">'+item.label+'</div>' +
        '<div class="link-sub">'+sub+'</div>' +
      '</div>' +
      '<span class="link-arrow">→</span>' +
    '</a>';
  }).join('');
}
window.buildLinktreeLinks = buildLinktreeLinks;
window.loadSosialData     = loadSosialData;

function buildMarquee(containerId, customItems) {
  containerId = containerId || 'mqTrack';
  var defaultItems = ['Garisrey', 'From East to Peace', 'Made in Indonesia', 'Baggy Build', 'Local Pride', 'Denim Culture', 'SS 2025', '#GarisreyID'];
  var items = customItems && customItems.length ? customItems : defaultItems;
  var track = document.getElementById(containerId);
  if (!track) return;
  track.innerHTML = '';

  /* Buat 4 set identik agar loop seamless di semua ukuran layar.
     Animasi geser -50% = tepat 2 set, lalu reset ke 0 tanpa jank */
  for (var set = 0; set < 4; set++) {
    items.forEach(function(item) {
      var s = document.createElement('span');
      s.className = 'mq-item';
      s.textContent = item;
      track.appendChild(s);
      var d = document.createElement('span');
      d.className = 'mq-sep';
      d.textContent = '✦';
      track.appendChild(d);
    });
  }

  /* Paksa animasi mulai dari posisi 0 */
  track.style.transform = 'translateX(0)';
}

/* ── HAMBURGER / DRAWER ── */
function toggleDrawer() {
  const drawer  = document.getElementById('drawer');
  const hamBtn  = document.getElementById('hamBtn');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (hamBtn) hamBtn.classList.toggle('open');
}

function closeDrawer() {
  const drawer = document.getElementById('drawer');
  const hamBtn = document.getElementById('hamBtn');
  if (drawer) drawer.classList.remove('open');
  if (hamBtn) hamBtn.classList.remove('open');
}

/* ── NAV SCROLL EFFECT ── */
function initNavScroll(navId = 'navbar') {
  const nav = document.getElementById(navId);
  if (!nav) return;
  const handler = () => nav.classList.toggle('solid', scrollY > 60);
  window.addEventListener('scroll', handler, { passive: true });
}

/* ── ACCOUNT DROPDOWN ── */
function toggleAccMenu() {
  const menu = document.getElementById('accMenu');
  if (menu) menu.classList.toggle('open');
}

function initAccDropdownClose() {
  document.addEventListener('click', e => {
    const wrap = document.getElementById('accWrap');
    const menu = document.getElementById('accMenu');
    if (wrap && menu && !wrap.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

/* ── AUTH INIT (update nav berdasarkan sesi) ── */
async function initAuth(options = {}) {
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return;
    const u    = session.user;
    const name = u.user_metadata?.full_name?.split(' ')[0] || u.email.split('@')[0];

    // Update nav
    const accWrap = document.getElementById('accWrap');
    const navAuth = document.getElementById('navAuthBtn');
    const accName  = document.getElementById('accMenuName');
    const accEmail = document.getElementById('accMenuEmail');
    const drLogin  = document.getElementById('drLogin');
    const drLogout = document.getElementById('drLogout');

    if (accWrap) accWrap.style.display = 'block';
    if (navAuth) navAuth.style.display = 'none';
    if (accName)  accName.textContent  = name;
    if (accEmail) accEmail.textContent = u.email;
    if (drLogin)  drLogin.style.display  = 'none';
    if (drLogout) drLogout.style.display = 'block';

    if (options.onSession) options.onSession(session.user);
  } catch (e) {
    console.warn('[initAuth]', e);
  }
}

async function doLogout() {
  if (!sb) return;
  await sb.auth.signOut();
  window.location.reload();
}

/* ── REDIRECT AFTER LOGIN ── */
function redirectAfterLogin(email) {
  // Tentukan base path secara dinamis agar kompatibel semua halaman
  const isInPages = window.location.pathname.includes('/pages/');
  const base = isInPages ? '' : 'pages/';
  if (email === ADMIN_EMAIL) {
    window.location.href = base + 'admin.html';
  } else {
    window.location.href = base + 'shop.html';
  }
}

/* ── LOAD ASSET (logo, img) dengan fallback Supabase ── */
function loadAssetWithFallback(el, localPath, storagePath) {
  if (!el) return;
  el.src = localPath;
  el.onerror = () => {
    if (!sb) { el.onerror = null; return; }
    const { data } = sb.storage.from('assets').getPublicUrl(storagePath);
    el.src = data.publicUrl;
    el.onerror = null;
  };
}

/* ─── POPUP SLIDESHOW STATE ─── */
let _slideIdx  = 0;
let _slideTimer = null;
let _slideImgs  = [];
let modalState  = { product: null, imgIdx: 0, selSize: '', qty: 1 };

function _startSlide() {
  _clearSlide();
  if (_slideImgs.length < 2) return;
  _slideTimer = setInterval(function() {
    _slideIdx = (_slideIdx + 1) % _slideImgs.length;
    _applySlide(_slideIdx);
  }, 3000);
}

function _clearSlide() {
  if (_slideTimer) { clearInterval(_slideTimer); _slideTimer = null; }
}

function _applySlide(i, restart) {
  _slideIdx = i;
  var main = document.getElementById('mSlideImg');
  if (main) {
    main.style.opacity = '0';
    setTimeout(function() {
      main.src = _slideImgs[i] || '';
      main.style.opacity = '1';
    }, 200);
  }
  /* Dots */
  document.querySelectorAll('.m-dot').forEach(function(d, idx) {
    d.style.background = idx === i ? '#fff' : 'rgba(255,255,255,.3)';
    d.style.width      = idx === i ? '20px' : '6px';
  });
  /* Counter */
  var ctr = document.getElementById('mSlideCounter');
  if (ctr && _slideImgs.length > 1) ctr.textContent = (i + 1) + ' / ' + _slideImgs.length;
  /* Restart timer dari awal saat manual */
  if (restart) { _clearSlide(); _startSlide(); }
}

function mSlidePrev() { _applySlide((_slideIdx - 1 + _slideImgs.length) % _slideImgs.length, true); }
function mSlideNext() { _applySlide((_slideIdx + 1) % _slideImgs.length, true); }
function mSlideTo(i)  { _applySlide(i, true); }

window.mSlidePrev = mSlidePrev;
window.mSlideNext = mSlideNext;
window.mSlideTo   = mSlideTo;

function openProductModal(product, wishlistArr) {
  modalState = { product: product, imgIdx: 0, selSize: '', qty: 1 };
  _clearSlide();
  _slideImgs = product.images || [];
  _slideIdx  = 0;
  renderProductModal(wishlistArr || []);
  var bg = document.getElementById('modalBg');
  if (bg) { bg.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  _startSlide();
}

function closeProductModal() {
  _clearSlide();
  var bg = document.getElementById('modalBg');
  if (bg) bg.style.display = 'none';
  document.body.style.overflow = '';
}

function renderProductModal(wishlistArr) {
  wishlistArr = wishlistArr || [];
  var p   = modalState.product;
  var box = document.getElementById('modalBox');
  if (!box || !p) return;

  var imgs = p.images || [];
  var fmtN = function(n) { return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var discPct = p.price_ori > p.price ? Math.round((1 - p.price / p.price_ori) * 100) : 0;

  /* Dots HTML */
  var dotsHtml = imgs.length > 1 ? imgs.map(function(_, i) {
    return '<button class="m-dot" onclick="mSlideTo(' + i + ')" style="height:6px;border-radius:3px;border:none;cursor:pointer;transition:all .3s;background:' + (i===0?'#fff':'rgba(255,255,255,.3)') + ';width:' + (i===0?'20px':'6px') + '"></button>';
  }).join('') : '';

  /* Sizes HTML */
  var sizesHtml = p.sizes && p.sizes.length ? `
    <div style="margin-bottom:18px">
      <div class="m-sec-lbl"><span>Pilih Ukuran</span><span id="mSizeLbl" style="color:var(--red)"></span></div>
      <div class="m-sizes">${p.sizes.map(s => `<button class="m-sz" onclick="selectModalSize('${s}')">${s}</button>`).join('')}</div>
    </div>` : '';

  /* Specs HTML */
  var specsHtml = '';
  if (p.specs && Object.values(p.specs).some(function(v){return v;})) {
    specsHtml = '<div style="margin-bottom:18px"><div class="m-sec-lbl"><span>Spesifikasi</span></div>' +
      Object.entries(p.specs).filter(function(e){return e[1];}).map(function(e) {
        return '<div style="display:flex;gap:10px;font-size:10px;margin-bottom:5px"><span style="color:rgba(255,255,255,.3);width:80px;flex-shrink:0">' + e[0] + '</span><span style="color:rgba(255,255,255,.65)">' + e[1] + '</span></div>';
      }).join('') + '</div>';
  }

  box.innerHTML =
    '<button class="modal-close" onclick="closeProductModal()">×</button>' +

    /* ── KIRI: Slideshow ── */
    '<div class="modal-gal" style="position:relative;background:#111;overflow:hidden">' +
      '<img id="mSlideImg" src="' + (imgs[0]||'') + '" alt="' + p.name + '"' +
        ' style="width:100%;height:100%;object-fit:cover;transition:opacity .25s;display:block"/>' +

      /* Prev / Next */
      (imgs.length > 1 ?
        '<button onclick="mSlidePrev()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:32px;height:32px;background:rgba(0,0,0,.6);border:none;border-radius:50%;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5">‹</button>' +
        '<button onclick="mSlideNext()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);width:32px;height:32px;background:rgba(0,0,0,.6);border:none;border-radius:50%;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5">›</button>'
      : '') +

      /* Dots */
      (imgs.length > 1 ?
        '<div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:5">' + dotsHtml + '</div>'
      : '') +

      /* Counter */
      (imgs.length > 1 ?
        '<div style="position:absolute;top:12px;left:12px;font-size:8px;font-weight:700;letter-spacing:.12em;background:rgba(0,0,0,.6);padding:3px 8px;border-radius:100px;color:rgba(255,255,255,.7)" id="mSlideCounter">1 / ' + imgs.length + '</div>'
      : '') +
    '</div>' +

    /* ── KANAN: Info ── */
    '<div class="modal-info">' +
      '<p class="m-brand">' + (p.brand || 'Garisrey') + '</p>' +
      '<h2 class="m-name">' + p.name + '</h2>' +
      (p.tagline ? '<p class="m-tag">' + p.tagline + '</p>' : '') +
      (p.description ? '<p class="m-desc">' + p.description + '</p>' : '') +

      (p.features && p.features.length ? '<div class="m-feats">' + p.features.map(function(f){return '<span class="m-feat">'+f+'</span>';}).join('') + '</div>' : '') +

      /* Harga */
      '<div style="margin-bottom:18px;padding:12px 14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:4px">' +
        '<div class="m-price-lbl">Harga</div>' +
        '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
          '<span class="m-price"><sup>Rp</sup>' + fmtN(p.price) + '</span>' +
          (p.price_ori > p.price ?
            '<span class="m-price-ori">Rp' + fmtN(p.price_ori) + '</span>' +
            '<span style="font-size:8px;font-weight:700;background:rgba(204,0,0,.12);color:#ff6666;border:1px solid rgba(204,0,0,.2);padding:2px 8px;border-radius:100px">-' + discPct + '%</span>'
          : '') +
        '</div>' +
      '</div>' +

      sizesHtml +
      specsHtml +

      /* Tombol */
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:auto">' +
        '<button class="btn btn-red" style="width:100%;justify-content:center" onclick="closeProductModal();openOrderPopupProduct()">' +
          'ORDER NOW' +
        '</button>' +
        '<button class="btn btn-outline" id="wishBtn" style="width:100%;justify-content:center" onclick="modalToggleWish()">' +
          (wishlistArr.includes(p.id) ? '♥ Disimpan' : '♡ Simpan ke Wishlist') +
        '</button>' +
        '<button class="btn btn-outline" style="width:100%;justify-content:center;opacity:.5;font-size:8px" onclick="var _id=modalState.product&&modalState.product.id;closeProductModal();if(_id&&typeof openDetailPage===\'function\')openDetailPage(_id);">' +
          'Lihat Detail →' +
        '</button>' +
      '</div>' +
    '</div>';

  /* Counter update: handled inside _applySlide base via mSlideCounter element check */
}

/* ORDER NOW dari popup produk */
function openOrderPopupProduct() {
  var popup = document.getElementById('orderPopup');
  if (!popup) {
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(WA_PESAN_ORDER), '_blank');
    return;
  }
  popup.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
window.openOrderPopupProduct = openOrderPopupProduct;

/* renderProductModal dan openOrderPopupProduct sudah didefinisikan di atas bersama slideshow state */

function setModalImg(i) {
  modalState.imgIdx = i;
  const main = document.getElementById('mMain');
  if (main) main.src = modalState.product.images[i] || '';
  document.querySelectorAll('.modal-thumb').forEach((t, idx) => t.classList.toggle('on', idx === i));
}

function selectModalSize(s) {
  modalState.selSize = s;
  document.querySelectorAll('.m-sz').forEach(b => b.classList.toggle('on', b.textContent === s));
  const lbl = document.getElementById('mSizeLbl');
  if (lbl) lbl.textContent = s;
}

function changeModalQty(d) {
  modalState.qty = Math.max(1, Math.min(10, modalState.qty + d));
  const el = document.getElementById('mQty');
  if (el) el.textContent = modalState.qty;
}

function buyViaWA() {
  const p = modalState.product;
  if (p.sizes?.length && !modalState.selSize) { showToast('Pilih ukuran dulu!', 'err'); return; }
  const txt = `Halo Garisrey! 👋\n\nSaya mau order:\n\n🛍 Produk: ${p.name}\n📏 Ukuran: ${modalState.selSize || '—'}\n🔢 Jumlah: ${modalState.qty}\n💰 Total: Rp${fmt(p.price * modalState.qty)}\n\nMohon info ketersediaan. Terima kasih!`;
  window.open(`https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(txt), '_blank');
}

function quickWA(productName) {
  const base = `Halo Garisrey! 👋\nSaya tertarik dengan *${productName}*.\nBoleh info ketersediaan dan cara order?`;
  window.open(`https://wa.me/${WA_NUMBER}?text=` + encodeURIComponent(base), '_blank');
}

/* ── DETAIL PAGE (fullscreen) — tampilkan SEMUA foto dalam grid ── */
function openDetailPage(id) {
  var allProds = (typeof allProducts !== 'undefined' ? allProducts : (typeof products !== 'undefined' ? products : []));
  var p = allProds.find(function(x){ return x.id === id; });
  if (!p) return;
  _clearSlide();
  closeProductModal();

  var overlay = document.getElementById('detailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'detailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:var(--black);overflow-y:auto';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';

  var imgs   = p.images || [];
  var fmtN   = function(n){ return (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); };
  var discPct = p.price_ori > p.price ? Math.round((1 - p.price/p.price_ori)*100) : 0;

  overlay.innerHTML =
    '<div style="max-width:1100px;margin:0 auto;padding:24px 20px 80px">' +

    /* Back */
    '<button onclick="closeDetailPage()" style="display:flex;align-items:center;gap:8px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:28px;background:none;border:none;cursor:pointer;transition:color .2s;padding:0" onmouseover="this.style.color=\'#f0ebe3\'" onmouseout="this.style.color=\'rgba(255,255,255,.35)\'">' +
      '← Kembali' +
    '</button>' +

    '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:start">' +

    /* ── KIRI: SEMUA FOTO GRID ── */
    '<div>' +
      /* Foto utama besar */
      '<div style="aspect-ratio:3/4;background:#111;border-radius:6px;overflow:hidden;margin-bottom:10px;border:1px solid rgba(255,255,255,.06)">' +
        '<img id="dpMain" src="' + (imgs[0]||'') + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in" onclick="dpZoom(this.src)"/>' +
      '</div>' +

      /* Grid semua foto lainnya */
      (imgs.length > 1 ?
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px">' +
          imgs.map(function(img, i) {
            return '<div onclick="dpSetImg(' + i + ')" id="dpThumb' + i + '" style="aspect-ratio:1;border-radius:4px;overflow:hidden;cursor:pointer;border:2px solid ' + (i===0?'var(--red)':'rgba(255,255,255,.06)') + ';transition:border-color .18s">' +
              '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;display:block"/>' +
            '</div>';
          }).join('') +
        '</div>'
      : '') +
    '</div>' +

    /* ── KANAN: INFO ── */
    '<div style="position:sticky;top:24px">' +
      '<p style="font-size:7px;font-weight:700;letter-spacing:.35em;text-transform:uppercase;color:var(--red);margin-bottom:8px">' + (p.brand||'Garisrey') + '</p>' +
      '<h1 style="font-family:\'DM Serif Display\',serif;font-size:clamp(26px,3.5vw,40px);line-height:1;color:#f0ebe3;margin-bottom:8px">' + p.name + '</h1>' +
      (p.tagline ? '<p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--red);margin-bottom:18px">' + p.tagline + '</p>' : '') +
      (p.description ? '<p style="font-size:12px;color:rgba(255,255,255,.45);line-height:1.9;margin-bottom:20px">' + p.description + '</p>' : '') +

      /* Fitur */
      (p.features && p.features.length ?
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">' +
          p.features.map(function(f){ return '<span style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);padding:4px 10px;border-radius:2px;color:rgba(255,255,255,.5)">' + f + '</span>'; }).join('') +
        '</div>'
      : '') +

      /* Harga */
      '<div style="margin-bottom:20px;padding:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:6px">' +
        '<div style="font-size:7px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:8px">Harga</div>' +
        '<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">' +
          '<span style="font-family:\'DM Serif Display\',serif;font-size:32px;color:var(--red)">Rp' + fmtN(p.price) + '</span>' +
          (p.price_ori > p.price ?
            '<span style="font-size:14px;color:rgba(255,255,255,.3);text-decoration:line-through">Rp' + fmtN(p.price_ori) + '</span>' +
            '<span style="font-size:9px;font-weight:700;background:rgba(204,0,0,.12);color:#ff6666;border:1px solid rgba(204,0,0,.2);padding:3px 9px;border-radius:100px">-' + discPct + '%</span>'
          : '') +
        '</div>' +
      '</div>' +

      /* Ukuran */
      (p.sizes && p.sizes.length ?
        '<div style="margin-bottom:20px">' +
          '<div style="font-size:7px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:10px">Pilih Ukuran <span id="dpSizeLbl" style="color:var(--red)"></span></div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
            p.sizes.map(function(s) {
              return '<button onclick="dpSelSize(\'' + s + '\')" id="dpSz_' + s + '" style="min-width:44px;height:44px;border-radius:3px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:rgba(255,255,255,.5);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s;padding:0 12px">' + s + '</button>';
            }).join('') +
          '</div>' +
        '</div>'
      : '') +

      /* Spesifikasi */
      (p.specs && Object.values(p.specs).some(function(v){return v;}) ?
        '<div style="margin-bottom:20px;border:1px solid rgba(255,255,255,.06);border-radius:6px;overflow:hidden">' +
          '<div style="padding:9px 14px;background:rgba(255,255,255,.015);font-size:7px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.28)">Spesifikasi</div>' +
          Object.entries(p.specs).filter(function(e){return e[1];}).map(function(e){
            return '<div style="display:flex;padding:9px 14px;border-top:1px solid rgba(255,255,255,.04)"><span style="font-size:10px;color:rgba(255,255,255,.3);width:100px;flex-shrink:0">' + e[0] + '</span><span style="font-size:10px;color:rgba(255,255,255,.65)">' + e[1] + '</span></div>';
          }).join('') +
        '</div>'
      : '') +

      /* Tombol */
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button onclick="dpOrder()" style="display:flex;align-items:center;justify-content:center;padding:14px 24px;background:var(--red);color:#fff;border:none;border-radius:3px;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:background .18s" onmouseover="this.style.background=\'#e00000\'" onmouseout="this.style.background=\'var(--red)\'">ORDER NOW</button>' +
        '<button onclick="dpToggleWish(\'' + p.id + '\')" id="dpWishBtn" style="display:flex;align-items:center;justify-content:center;padding:12px 24px;background:transparent;color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.12);border-radius:3px;font-family:inherit;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:all .18s">' +
          ((typeof getWishlist === 'function' && getWishlist().includes(p.id)) ? '♥ Disimpan' : '♡ Simpan ke Wishlist') +
        '</button>' +
      '</div>' +
    '</div>' +

    '</div></div>';

  /* Update tombol wish */
  var _dpProdId = p.id;

  window.dpSetImg = function(i) {
    var m = document.getElementById('dpMain');
    if (m) { m.style.opacity='0'; setTimeout(function(){m.src=imgs[i];m.style.opacity='1';},180); }
    document.querySelectorAll('[id^="dpThumb"]').forEach(function(el,idx){ el.style.borderColor=idx===i?'var(--red)':'rgba(255,255,255,.06)'; });
  };

  window.dpZoom = function(src) {
    var z = document.createElement('div');
    z.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    z.onclick = function(){ document.body.removeChild(z); };
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px';
    z.appendChild(img);
    document.body.appendChild(z);
  };

  var _dpSelSz = '';
  window.dpSelSize = function(s) {
    _dpSelSz = s;
    document.querySelectorAll('[id^="dpSz_"]').forEach(function(btn){
      var on = btn.id === 'dpSz_'+s;
      btn.style.background   = on ? 'var(--red)' : 'rgba(255,255,255,.03)';
      btn.style.borderColor  = on ? 'var(--red)' : 'rgba(255,255,255,.1)';
      btn.style.color        = on ? '#fff' : 'rgba(255,255,255,.5)';
    });
    var lbl = document.getElementById('dpSizeLbl');
    if (lbl) lbl.textContent = s;
  };

  window.dpOrder = function() {
    var popup = document.getElementById('orderPopup');
    if (popup) { popup.style.display='flex'; document.body.style.overflow='hidden'; }
    else {
      var txt = 'Halo Garisrey! 👋\nSaya tertarik dengan *' + p.name + '*.\nBoleh info ketersediaan?';
      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(txt), '_blank');
    }
  };

  window.dpToggleWish = function(id) {
    if (typeof toggleWishlistItem === 'function') {
      toggleWishlistItem(id, function() {
        var btn = document.getElementById('dpWishBtn');
        var wl  = typeof getWishlist === 'function' ? getWishlist() : [];
        if (btn) btn.textContent = wl.includes(id) ? '♥ Disimpan' : '♡ Simpan ke Wishlist';
      });
    }
  };
}

function closeDetailPage() {
  _clearSlide();
  var o = document.getElementById('detailOverlay');
  if (o) o.style.display = 'none';
  document.body.style.overflow = '';
}

window.openDetailPage  = openDetailPage;
window.closeDetailPage = closeDetailPage;

/* ── ANIMATE COUNTER ── */
function animateCounter(elId, target, duration) {
  duration = duration || 1500;
  var el = document.getElementById(elId);
  if (!el) return;
  var start = performance.now();
  var step = function(ts) {
    var progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

/* ── FOOTER PRODUCTS ── */
function renderFooterProducts(products, limit) {
  limit = limit || 5;
  var fp = document.getElementById('footProds');
  if (!fp || !products.length) return;
  fp.innerHTML = products.slice(0, limit).map(function(p) {
    return '<a style="cursor:pointer" onclick="openDetail(\'' + p.id + '\')">' + p.name + '</a>';
  }).join('');
}

/* ── EXPOSE globals ── */
window.showToast             = showToast;
window.toggleDrawer          = toggleDrawer;
window.closeDrawer           = closeDrawer;
window.toggleAccMenu         = toggleAccMenu;
window.doLogout              = doLogout;
window.closeProductModal     = closeProductModal;
window.setModalImg           = setModalImg;
window.selectModalSize       = selectModalSize;
window.changeModalQty        = changeModalQty;
window.buyViaWA              = buyViaWA;
window.openOrderPopupProduct = openOrderPopupProduct;
window.mSlidePrev            = mSlidePrev;
window.mSlideNext            = mSlideNext;
window.mSlideTo              = mSlideTo;
/* WA message globals — writable so index.js/shop.js can update from Supabase */
Object.defineProperty(window, 'WA_PESAN_UMUM',  { get: () => WA_PESAN_UMUM,  set: v => { WA_PESAN_UMUM  = v; }, configurable: true });
Object.defineProperty(window, 'WA_PESAN_ORDER', { get: () => WA_PESAN_ORDER, set: v => { WA_PESAN_ORDER = v; }, configurable: true });
