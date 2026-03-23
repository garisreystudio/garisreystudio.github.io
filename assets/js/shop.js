/**
 * GARISREY — shop.js
 * Logic halaman Shop: filter, search, sort, grid, modal
 */

/* ── STATE ── */
let allProducts = [];
let filtered    = [];
let wishlist    = getWishlist();
let activeChip  = 'semua';
let searchQ     = '';
let sortVal     = 'newest';

/* ── LOAD PRODUCTS ── */
async function loadProducts() {
  const { data, error } = await sb.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) throw error;
  allProducts = data || [];
}

/* ── BUILD FILTER CHIPS ── */
function buildChips() {
  const cats = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const container = document.getElementById('chipsWrap');
  if (!container) return;

  // Reset: pertahankan chip "Semua"
  container.innerHTML = `<button class="chip${activeChip === 'semua' ? ' on' : ''}" onclick="setChip('semua')">Semua</button>`;

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `chip${activeChip === cat ? ' on' : ''}`;
    btn.textContent = cat;
    btn.onclick = () => setChip(cat);
    container.appendChild(btn);
  });
}

function setChip(cat) {
  activeChip = cat;
  buildChips();
  applyFilter();
}

/* ── SEARCH ── */
function handleSearch(e) {
  searchQ = e.target.value.trim().toLowerCase();
  const clr = document.getElementById('searchClr');
  if (clr) clr.classList.toggle('show', searchQ.length > 0);
  applyFilter();
}

function clearSearch() {
  const inp = document.getElementById('searchInp');
  const clr = document.getElementById('searchClr');
  if (inp) { inp.value = ''; }
  if (clr) clr.classList.remove('show');
  searchQ = '';
  applyFilter();
}

/* ── SORT ── */
function handleSort(e) {
  sortVal = e.target.value;
  applyFilter();
}

/* ── APPLY FILTER + SORT ── */
function applyFilter() {
  filtered = allProducts.filter(p => {
    const matchCat = activeChip === 'semua' || p.category === activeChip;
    const matchQ   = !searchQ || p.name.toLowerCase().includes(searchQ) || (p.tagline || '').toLowerCase().includes(searchQ) || (p.description || '').toLowerCase().includes(searchQ);
    return matchCat && matchQ;
  });

  // Sort
  if (sortVal === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortVal === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortVal === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortVal === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortVal === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update count
  const countEl = document.getElementById('pgCount');
  const resInfo = document.getElementById('resInfo');
  if (countEl) countEl.textContent = `${allProducts.length} produk tersedia`;
  if (resInfo) resInfo.innerHTML = `Menampilkan <strong>${filtered.length}</strong> dari ${allProducts.length} produk`;

  renderGrid();
}

/* ── RENDER GRID ── */
/* ── SHOP CARD SLIDESHOW ── */
var _sST = {};
function _initSS(id, imgs) {
  if (!imgs || imgs.length < 2) return;
  var idx = 0;
  _sST[id] = setInterval(function() {
    idx = (idx + 1) % imgs.length;
    var el = document.getElementById('simg_' + id);
    if (el) {
      el.style.opacity = '0';
      var s = imgs[idx];
      setTimeout(function() { el.src = s; el.style.opacity = '1'; }, 180);
    }
    document.querySelectorAll('.sdot_' + id).forEach(function(d, i) {
      d.style.background = i === idx ? '#fff' : 'rgba(255,255,255,.4)';
      d.style.width = i === idx ? '14px' : '5px';
    });
  }, 2500);
}
function _clearSS() {
  Object.keys(_sST).forEach(function(id) { clearInterval(_sST[id]); });
  _sST = {};
}

function renderGrid() {
  var grid  = document.getElementById('prodsGrid');
  var empty = document.getElementById('emptyEl');
  if (!grid) return;

  wishlist = getWishlist();
  _clearSS();

  if (!allProducts.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="ei">👕</div><h3>Belum Ada Produk</h3><p>Cek kembali nanti!</p></div>';
    if (empty) empty.style.display = 'none';
    return;
  }

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  var parts = [];
  filtered.forEach(function(p) {
    var imgs = p.images || [];
    var firstImg = imgs[0] || '';
    var isWished = wishlist.includes(p.id);
    var pid = p.id;

    var priceHtml = '<span class="price-main"><sup style="font-size:.55em;vertical-align:super">Rp</sup>' + fmt(p.price) + '</span>';
    if (p.price_ori > p.price) priceHtml += '<span class="price-ori">Rp' + fmt(p.price_ori) + '</span><span class="price-disc">-' + disc(p) + '%</span>';

    var card = [
      '<div class="card" onclick="openDetail(\'' + pid + '\')">',
      '<div class="card-img">',
      '<img id="simg_' + pid + '" src="' + firstImg + '" alt="' + p.name + '" loading="lazy" style="transition:opacity .2s" onerror="this.style.minHeight=\'200px\'"/>',
      (p.badge ? '<span class="card-badge b-' + p.badge + '">' + p.badge + '</span>' : ''),
      '<button class="card-wish' + (isWished ? ' wished' : '') + '" onclick="event.stopPropagation();handleToggleWish(\'' + pid + '\')">' + (isWished ? '♥' : '♡') + '</button>',
      '<div class="card-overlay"></div>',
      /* Button di tengah gambar */
      '<div class="card-quick centered" onclick="event.stopPropagation()">',
      '<button style="font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;padding:11px 32px;background:rgba(8,8,8,.78);border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:2px;cursor:pointer;font-family:\'Space Mono\',monospace;backdrop-filter:blur(8px);transition:all .2s;white-space:nowrap" onmouseover="this.style.background=\'var(--red)\';this.style.borderColor=\'var(--red)\'" onmouseout="this.style.background=\'rgba(8,8,8,.78)\';this.style.borderColor=\'rgba(255,255,255,.35)\'" onclick="openDetail(\'' + pid + '\')">Lihat Detail</button>',
      '</div>',
      /* Dots selalu di bawah gambar */
      (imgs.length > 1 ? '<div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:4;pointer-events:none">' + imgs.map(function(_, i){ return '<span class="sdot_' + pid + '" style="display:block;height:5px;border-radius:3px;transition:all .3s;background:' + (i===0?'#fff':'rgba(255,255,255,.4)') + ';width:' + (i===0?'14px':'5px') + '"></span>'; }).join('') + '</div>' : ''),
      '</div>',
      '<div class="card-body">',
      '<p class="card-brand">' + (p.brand || 'Garisrey') + '</p>',
      '<h3 class="card-name">' + p.name + '</h3>',
      '<p class="card-sub">' + (p.tagline || '') + '</p>',
      '<div class="card-price">' + priceHtml + '</div>',
      '</div></div>'
    ].join('');
    parts.push(card);
  });

  grid.innerHTML = parts.join('');

  filtered.forEach(function(p) {
    if ((p.images || []).length > 1) _initSS(p.id, p.images);
  });
}


/* ── HANDLERS ── */
function handleToggleWish(id) {
  toggleWishlistItem(id, () => {
    wishlist = getWishlist();
    renderGrid();
    const wb = document.getElementById('wishBtn');
    if (wb && modalState.product?.id === id) {
      wb.textContent = wishlist.includes(id) ? '♥ Disimpan' : '♡ Simpan';
    }
  });
}

function handleQuickWA(id) {
  const p = allProducts.find(x => x.id === id);
  if (p) quickWA(p.name);
}

function openDetail(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  openProductModal(p, getWishlist());
}

function modalToggleWish() {
  if (!modalState.product) return;
  handleToggleWish(modalState.product.id);
}

/* ── EXPOSE ── */
window.openDetail       = openDetail;
window.handleToggleWish = handleToggleWish;
window.handleQuickWA    = handleQuickWA;
window.setChip          = setChip;
window.handleSearch     = handleSearch;
window.clearSearch      = clearSearch;
window.handleSort       = handleSort;
window.modalToggleWish  = modalToggleWish;

/* ── INIT ── */
async function init() {
  initNavScroll('navbar');
  initAccDropdownClose();
  initAuth();

  await loadSosialData();
  await loadKontenShop();

  try {
    await loadProducts();
  } catch (e) {
    console.error('[shop] loadProducts error:', e);
  }

  buildChips();
  applyFilter();
  renderFooterProducts(allProducts);

  const loadingEl = document.getElementById('loadingEl');
  const prodsCont = document.getElementById('prodsCont');
  if (loadingEl) loadingEl.style.display = 'none';
  if (prodsCont) prodsCont.style.display = 'block';

  // Realtime: produk
  sb.channel('products-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
      await loadProducts();
      buildChips();
      applyFilter();
    })
    .subscribe();

  // Realtime: settings sosial — auto-update tanpa refresh
  sb.channel('settings-shop')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, async (payload) => {
      const key = payload.new?.key || payload.old?.key;
      if (key === 'sosial' || key === 'sosial_v2') loadSosialData();
      if (key === 'konten_beranda') loadKontenShop();
    })
    .subscribe();
}

async function loadKontenShop() {
  try {
    const { data } = await Promise.race([
      sb.from('settings').select('value').eq('key', 'konten_beranda').maybeSingle(),
      new Promise(r => setTimeout(() => r({ data: null }), 3000))
    ]);
    if (!data?.value) { buildMarquee('mqTrack'); return; }
    const k = data.value;

    // Pesan WA
    if (k.wa_pesan_umum) {
      WA_PESAN_UMUM = k.wa_pesan_umum;
      document.querySelectorAll('a[href*="wa.me"]:not([data-wa-order])').forEach(el => {
        const base = el.href.split('?')[0];
        el.href = base + '?text=' + encodeURIComponent(k.wa_pesan_umum);
      });
    }
    if (k.wa_pesan_order) {
      WA_PESAN_ORDER = k.wa_pesan_order;
      document.querySelectorAll('a[data-wa-order]').forEach(el => {
        const base = el.href.split('?')[0];
        el.href = base + '?text=' + encodeURIComponent(k.wa_pesan_order);
      });
    }

    // Marquee
    const items = k.marquee_items
      ? k.marquee_items.split('·').map(s => s.trim()).filter(Boolean)
      : null;
    buildMarquee('mqTrack', items);
  } catch (_) {
    buildMarquee('mqTrack');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  sb = initSupabase();
  if (!sb) { console.error('Supabase tidak terinitalisasi'); return; }
  init().catch(console.error);
});
