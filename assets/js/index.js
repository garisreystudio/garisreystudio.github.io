/**
 * GARISREY — index.js
 * Logic halaman Beranda
 * Urutan section: Koleksi Terkini → Hero → About → CTA → Sticker → Footer
 */

/* ── STATE ── */
let products = [];
let wishlist = getWishlist();

/* ══════════════════════════════════════
   LOADING SCREEN CONTROLLER (2 detik)
══════════════════════════════════════ */
function runLoadingScreen() {
  const loader = document.getElementById("pageLoader");
  const pctEl = document.getElementById("plPct");
  if (!loader) return;

  // Counter persen 0→100 dalam 1.8 detik, easing cubic
  const duration = 1800;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    if (pctEl) pctEl.textContent = Math.floor(eased * 100) + "%";
    if (progress < 1) requestAnimationFrame(tick);
    else if (pctEl) pctEl.textContent = "100%";
  };
  requestAnimationFrame(tick);

  // Hapus dari DOM setelah CSS animation selesai (2s delay + 0.55s fade)
  setTimeout(() => {
    loader.addEventListener(
      "animationend",
      () => {
        loader.style.display = "none";
      },
      { once: true },
    );
    setTimeout(() => {
      loader.style.display = "none";
    }, 700);
  }, 2000);
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init() {
  runLoadingScreen();

  buildMarquee("mqTrack"); // show default items immediately; rebuilt by loadKontenBeranda if custom items exist
  initNavScroll("navbar");
  initAccDropdownClose();
  loadLogoAssets();
  loadAboutImages();
  initAuth();

  // Load konten teks beranda dari Supabase
  loadKontenBeranda();
  loadSosialData();

  // Load produk dengan timeout 5 detik
  try {
    await Promise.race([
      loadProducts(),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  } catch (_) {}

  renderGrid();

  // Load hero background non-blocking
  loadHero();

  // Realtime: produk
  sb.channel("products-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      async () => {
        await loadProducts();
        renderGrid();
      },
    )
    .subscribe();

  // Realtime: settings (beranda, konten, sosial) — auto-update tanpa refresh
  sb.channel("settings-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settings" },
      async (payload) => {
        const key = payload.new?.key || payload.old?.key;
        if (key === "konten_beranda") {
          loadKontenBeranda();
        } else if (key === 'beranda') {
          loadHero();
        } else if (key === 'sosial' || key === 'sosial_v2') {
          loadSosialData();
        }
      },
    )
    .subscribe();
}

/* ══════════════════════════════════════
   LOGO ASSETS
   Hanya muat stiker (satu gambar di sticker-sec)
   dan logo footer
══════════════════════════════════════ */
function loadLogoAssets() {
  // Sembunyikan wordmark jika logo nav ada
  const wm = document.getElementById("navWordmark");
  if (wm) wm.style.display = "none";

  // Stiker (satu-satunya asset di sticker-sec)
  loadAssetWithFallback(
    document.getElementById("lgStiker"),
    "assets/logo/stiker.png",
    "logo/stiker.png",
  );

  // Footer logo
  loadAssetWithFallback(
    document.getElementById("footLogo"),
    "assets/logo/logo.png",
    "logo/logo.png",
  );
}

/* ══════════════════════════════════════
   ABOUT IMAGES FALLBACK
══════════════════════════════════════ */
function loadAboutImages() {
  const a1 = document.getElementById("aboutImg1");
  const a2 = document.getElementById("aboutImg2");
  if (a1) {
    a1.onerror = () => {
      const imgs = products.flatMap((p) => p.images || []);
      if (imgs[0]) {
        a1.src = imgs[0];
        a1.onerror = null;
      }
    };
  }
  if (a2) {
    a2.onerror = () => {
      const imgs = products.flatMap((p) => p.images || []);
      if (imgs[1]) {
        a2.src = imgs[1];
        a2.onerror = null;
      }
    };
  }
}

/* ══════════════════════════════════════
   HERO LOADER
   Isi background hero section (section 2)
   dari Supabase settings → video lokal → gambar lokal
══════════════════════════════════════ */
async function loadHero() {
  const bg = document.getElementById("heroBg");
  if (!bg) return;
  let cfg = {};

  try {
    const { data } = await Promise.race([
      sb.from("settings").select("value").eq("key", "beranda").maybeSingle(),
      new Promise((r) => setTimeout(() => r({ data: null }), 3000)),
    ]);
    cfg = data?.value || {};
  } catch (_) {}

  const heroVid = cfg.heroVideo || null;
  const heroImgs = cfg.heroImages || [];

  if (heroVid) {
    bg.innerHTML = `<video src="${heroVid}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;opacity:.55"></video>`;
    return;
  }

  if (heroImgs.length) {
    bg.innerHTML = `<img src="${heroImgs[0]}" alt="Garisrey" style="width:100%;height:100%;object-fit:cover;opacity:.65"/>`;
    if (heroImgs.length > 1) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % heroImgs.length;
        const im = bg.querySelector("img");
        if (im) {
          im.style.opacity = 0;
          setTimeout(() => {
            im.src = heroImgs[idx];
            im.style.opacity = ".65";
          }, 400);
        }
      }, 5000);
    }
    return;
  }

  // Fallback: video lokal → gambar lokal → gambar produk
  tryLoadVideo(
    [
      "assets/vid/1.MOV",
      "assets/vid/2.mp4",
      "assets/vid/1.mp4",
      "assets/vid/2.MOV",
    ],
    bg,
    [
      "assets/img/1.jpeg",
      "assets/img/2.jpeg",
      "assets/img/3.jpeg",
      "assets/img/4.jpeg",
    ],
  );
}

function tryLoadVideo(vids, container, imgFallbacks, vidIdx = 0) {
  if (vidIdx >= vids.length) {
    tryLoadImg(imgFallbacks, container, 0);
    return;
  }
  const v = document.createElement("video");
  v.autoplay = true;
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.style.cssText = "width:100%;height:100%;object-fit:cover;opacity:.55";
  v.oncanplay = () => container.appendChild(v);
  v.onerror = () => tryLoadVideo(vids, container, imgFallbacks, vidIdx + 1);
  v.src = vids[vidIdx];
}

function tryLoadImg(imgs, container, imgIdx) {
  if (imgIdx >= imgs.length) {
    if (products.length) {
      const src = (products[0].images || [])[0];
      if (src)
        container.innerHTML = `<img src="${src}" alt="Garisrey" style="width:100%;height:100%;object-fit:cover;opacity:.6"/>`;
    }
    return;
  }
  const el = document.createElement("img");
  el.style.cssText = "width:100%;height:100%;object-fit:cover;opacity:.65";
  el.alt = "Garisrey";
  el.onload = () => container.appendChild(el);
  el.onerror = () => tryLoadImg(imgs, container, imgIdx + 1);
  el.src = imgs[imgIdx];
}

/* ══════════════════════════════════════
   LOAD & APPLY KONTEN BERANDA
══════════════════════════════════════ */
async function loadKontenBeranda() {
  try {
    const { data } = await Promise.race([
      sb
        .from("settings")
        .select("value")
        .eq("key", "konten_beranda")
        .maybeSingle(),
      new Promise((r) => setTimeout(() => r({ data: null }), 3000)),
    ]);
    if (!data?.value) return; // marquee already built with defaults in init()
    const k = data.value;

    // Section 2 — Hero
    const eyebrow = document.querySelector(".hero-eyebrow");
    if (eyebrow && k.s2_eyebrow)
      eyebrow.childNodes[eyebrow.childNodes.length - 1].textContent =
        k.s2_eyebrow;

    const heroSub = document.querySelector(".hero-sub");
    if (heroSub && k.s2_sub)
      heroSub.innerHTML = k.s2_sub.replace(/\n/g, "<br>");

    // Section 3 — About
    const sectionTag = document.querySelector(".about-sec .section-tag");
    if (sectionTag && k.s3_tag)
      sectionTag.childNodes[sectionTag.childNodes.length - 1].textContent =
        k.s3_tag;

    const sectionTitle = document.querySelector(".about-sec .section-title");
    if (sectionTitle && k.s3_title) {
      const lines = k.s3_title.split("\n");
      sectionTitle.innerHTML =
        lines[0] + (lines[1] ? "<br><em>" + lines[1] + "</em>" : "");
    }

    const aboutDesc = document.querySelector(".about-desc");
    if (aboutDesc && k.s3_desc) aboutDesc.textContent = k.s3_desc;

    // Section 3 — Stats
    // Stat 1: kosong = otomatis pakai jumlah produk (diisi oleh animateCounter di renderGrid)
    if (k.s3_stat1_num) {
      const el = document.getElementById("statProds");
      if (el) el.textContent = k.s3_stat1_num;
    }
    const lbl1 = document.getElementById("statProdsLbl");
    if (lbl1 && k.s3_stat1_lbl) lbl1.textContent = k.s3_stat1_lbl;

    const num2 = document.getElementById("stat2Num");
    if (num2 && k.s3_stat2_num) num2.textContent = k.s3_stat2_num;
    const lbl2 = document.getElementById("stat2Lbl");
    if (lbl2 && k.s3_stat2_lbl) lbl2.textContent = k.s3_stat2_lbl;

    const num3 = document.getElementById("stat3Num");
    if (num3 && k.s3_stat3_num) num3.textContent = k.s3_stat3_num;
    const lbl3 = document.getElementById("stat3Lbl");
    if (lbl3 && k.s3_stat3_lbl) lbl3.textContent = k.s3_stat3_lbl;

    // Section 4 — Pesan WA
    if (k.wa_pesan_umum) {
      WA_PESAN_UMUM = k.wa_pesan_umum;
      // Update link WA umum (footer, sosial) — skip tombol order
      document
        .querySelectorAll('a[href*="wa.me"]:not([data-wa-order])')
        .forEach((el) => {
          const base = el.href.split("?")[0];
          el.href = base + "?text=" + encodeURIComponent(k.wa_pesan_umum);
        });
    }
    if (k.wa_pesan_order) {
      WA_PESAN_ORDER = k.wa_pesan_order;
      // Update tombol order popup WA saja
      document.querySelectorAll("a[data-wa-order]").forEach((el) => {
        const base = el.href.split("?")[0];
        el.href = base + "?text=" + encodeURIComponent(k.wa_pesan_order);
      });
    }

    // Section 4 — Marquee
    if (k.marquee_items) {
      const items = k.marquee_items
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length) buildMarquee("mqTrack", items);
    }
  } catch (_) {
    // ensure marquee has content if init default somehow missed
    const track = document.getElementById("mqTrack");
    if (track && !track.children.length) buildMarquee("mqTrack");
  }
}

async function loadProducts() {
  const { data } = await sb
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  products = data || [];
}

/* ══════════════════════════════════════
   RENDER GRID (4 produk terbaru)
══════════════════════════════════════ */
/* ── CARD SLIDESHOW ── */
var _cST = {};
function _initCS(id, imgs) {
  if (!imgs || imgs.length < 2) return;
  var idx = 0;
  _cST[id] = setInterval(function () {
    idx = (idx + 1) % imgs.length;
    var el = document.getElementById("cimg_" + id);
    if (el) {
      el.style.opacity = "0";
      var s = imgs[idx];
      setTimeout(function () {
        el.src = s;
        el.style.opacity = "1";
      }, 180);
    }
    document.querySelectorAll(".cdot_" + id).forEach(function (d, i) {
      d.style.background = i === idx ? "#fff" : "rgba(255,255,255,.4)";
      d.style.width = i === idx ? "14px" : "5px";
    });
  }, 2500);
}
function _clearCS() {
  Object.keys(_cST).forEach(function (id) {
    clearInterval(_cST[id]);
  });
  _cST = {};
}

function renderGrid() {
  var grid = document.getElementById("prodsGrid");
  var state = document.getElementById("loadingState");
  if (!grid) return;
  if (state) state.style.display = "none";
  grid.style.display = "grid";
  _clearCS();

  if (!products.length) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px 0"><p style="font-size:11px;color:var(--gray);letter-spacing:.2em;text-transform:uppercase">Belum ada produk</p></div>';
    return;
  }

  wishlist = getWishlist();
  var show = products.slice(0, 4);
  var parts = [];

  show.forEach(function (p) {
    var imgs = p.images || [];
    var firstImg = imgs[0] || "";
    var isWished = wishlist.includes(p.id);
    var pid = p.id;

    var priceHtml =
      '<div class="prod-card-price"><span class="price-main"><sup style="font-size:.55em;vertical-align:super">Rp</sup>' +
      fmt(p.price) +
      "</span>";
    if (p.price_ori > p.price) {
      priceHtml +=
        '<span class="price-ori">Rp' +
        fmt(p.price_ori) +
        '</span><span class="price-disc">-' +
        disc(p) +
        "%</span>";
    }
    priceHtml += "</div>";

    var card = [
      '<div class="prod-card" onclick="openDetail(\'' + pid + "')\">",
      '<div class="prod-card-img">',
      '<img id="cimg_' +
        pid +
        '" src="' +
        firstImg +
        '" alt="' +
        p.name +
        '" loading="lazy" style="transition:opacity .2s" onerror="this.style.minHeight=\'200px\'"/>',
      p.badge
        ? '<span class="prod-card-badge b-' +
          p.badge +
          '">' +
          p.badge +
          "</span>"
        : "",
      '<button class="prod-card-wish' +
        (isWished ? " wished" : "") +
        '" onclick="event.stopPropagation();handleToggleWish(\'' +
        pid +
        "')\">" +
        (isWished ? "♥" : "♡") +
        "</button>",
      '<div class="prod-card-overlay"></div>',
      '<div class="prod-card-quick centered" onclick="event.stopPropagation()">',
      "<button style=\"font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;padding:11px 32px;background:rgba(8,8,8,.78);border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:2px;cursor:pointer;font-family:'Space Mono',monospace;backdrop-filter:blur(8px);transition:all .2s;white-space:nowrap\" onmouseover=\"this.style.background='var(--red)';this.style.borderColor='var(--red)'\" onmouseout=\"this.style.background='rgba(8,8,8,.78)';this.style.borderColor='rgba(255,255,255,.35)'\" onclick=\"openDetail('" +
        pid +
        "')\">Lihat Detail</button>",
      "</div>",
      /* Dots selalu tampil di bawah gambar, bukan di tengah */
      imgs.length > 1
        ? '<div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:4;pointer-events:none">' +
          imgs
            .map(function (_, i) {
              return (
                '<span class="cdot_' +
                pid +
                '" style="display:block;height:5px;border-radius:3px;transition:all .3s;background:' +
                (i === 0 ? "#fff" : "rgba(255,255,255,.4)") +
                ";width:" +
                (i === 0 ? "14px" : "5px") +
                '"></span>'
              );
            })
            .join("") +
          "</div>"
        : "",
      "</div>",
      '<div class="prod-card-body">',
      '<p class="prod-card-brand">' + (p.brand || "Garisrey") + "</p>",
      '<h3 class="prod-card-name">' + p.name + "</h3>",
      '<p class="prod-card-sub">' + (p.tagline || "") + "</p>",
      priceHtml,
      "</div></div>",
    ].join("");

    parts.push(card);
  });

  grid.innerHTML = parts.join("");

  show.forEach(function (p) {
    if ((p.images || []).length > 1) _initCS(p.id, p.images);
  });

  renderFooterProducts(products);
  // Only animate counter if admin hasn't set a custom stat1 value
  const statEl = document.getElementById("statProds");
  if (statEl && (statEl.textContent === "0" || statEl.textContent === "")) {
    animateCounter("statProds", products.length);
  }
}

/* ══════════════════════════════════════
   HANDLERS
══════════════════════════════════════ */
function handleToggleWish(id) {
  toggleWishlistItem(id, () => {
    wishlist = getWishlist();
    renderGrid();
    const wb = document.getElementById("wishBtn");
    if (wb && modalState.product?.id === id) {
      wb.textContent = wishlist.includes(id) ? "♥ Disimpan" : "♡ Simpan";
    }
  });
}

function handleQuickWA(id) {
  const p = products.find((x) => x.id === id);
  if (p) quickWA(p.name);
}

function openDetail(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  openProductModal(p, getWishlist());
}

function modalToggleWish() {
  if (!modalState.product) return;
  handleToggleWish(modalState.product.id);
}

/* ── EXPOSE ── */
window.openDetail = openDetail;
window.handleToggleWish = handleToggleWish;
window.handleQuickWA = handleQuickWA;
window.modalToggleWish = modalToggleWish;

/* ── START ── */
document.addEventListener("DOMContentLoaded", () => {
  sb = initSupabase();
  if (!sb) {
    console.error("[Garisrey] Supabase tidak terinitalisasi");
    return;
  }
  init().catch(console.error);
});
