/* ============================================
   ÁLBUM MUNDIAL — app.js
   ============================================ */

'use strict';

// ============================================
// CONFIGURACIÓN
// ============================================

const TOTAL       = 387;
const PAGE_SIZE   = 50;

const PRIZES = [
  { name: 'Medias de Fútbol',  icon: '🧦', from: 1,   to: 27  },
  { name: 'Camiseta',          icon: '👕', from: 28,  to: 54  },
  { name: 'Balón de Fútbol',   icon: '⚽', from: 55,  to: 90  },
  { name: 'Celular',           icon: '📱', from: 91,  to: 117 },
  { name: 'Premio Sorpresa',   icon: '🎁', from: 118, to: 153 },
  { name: 'Reloj',             icon: '⌚', from: 154, to: 180 },
  { name: 'Billetera',         icon: '👛', from: 181, to: 216 },
  { name: 'Ajedrez',           icon: '♟️', from: 217, to: 252 },
  { name: 'Dominó',            icon: '🎲', from: 253, to: 279 },
  { name: 'Muñeco',            icon: '🪆', from: 280, to: 315 },
  { name: 'Bicicleta',         icon: '🚲', from: 316, to: 342 },
  { name: 'Parlante',          icon: '🔊', from: 343, to: 387 },
];

// Páginas generadas automáticamente de 50 en 50
const PAGES = (() => {
  const pages = [];
  for (let start = 1; start <= TOTAL; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, TOTAL);
    pages.push({ from: start, to: end, label: `${start} – ${end}` });
  }
  return pages;
})();

// ============================================
// ESTADO
// ============================================

let obtained      = new Set();
let currentPage   = 0;          // índice de página activa (0-based)
let currentFilter = 'all';      // 'all' | 'obtained' | 'missing'
let searchValue   = '';
let prevUnlocked  = new Set();
let currentTab    = 'figuritas';

// ============================================
// PERSISTENCIA (localStorage)
// ============================================

const STORAGE_KEY = 'albumMundial_v1';

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ obtained: [...obtained] }));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      obtained = new Set(data.obtained || []);
    }
  } catch (e) {
    console.warn('No se pudo cargar desde localStorage:', e);
  }
}

// ============================================
// UTILIDADES DE PREMIOS
// ============================================

function getPrizeStatus(prize) {
  const tot = prize.to - prize.from + 1;
  let got = 0;
  for (let i = prize.from; i <= prize.to; i++) {
    if (obtained.has(i)) got++;
  }
  return { got, tot, missing: tot - got, pct: Math.round((got / tot) * 100) };
}

function getUnlockedCount() {
  return PRIZES.filter(p => getPrizeStatus(p).pct === 100).length;
}

// Premio incompleto con mayor porcentaje (el más cercano a completarse)
function getClosestPrize() {
  const incomplete = PRIZES.filter(p => getPrizeStatus(p).pct < 100);
  if (!incomplete.length) return null;
  return incomplete.reduce((best, p) => {
    return getPrizeStatus(p).pct > getPrizeStatus(best).pct ? p : best;
  }, incomplete[0]);
}

// ============================================
// RENDER: SIDEBAR NAV DE PÁGINAS
// ============================================

function renderPageNav() {
  const ul = document.getElementById('pageNav');
  ul.innerHTML = '';
  PAGES.forEach((page, idx) => {
    // contar obtenidas en esta página
    let gotInPage = 0;
    for (let i = page.from; i <= page.to; i++) {
      if (obtained.has(i)) gotInPage++;
    }
    const total = page.to - page.from + 1;

    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = '#';
    if (idx === currentPage && currentTab === 'figuritas') a.classList.add('active');
    a.innerHTML = `
      Pág. ${idx + 1} <small style="color:rgba(255,255,255,0.3);font-size:10px">${page.label}</small>
      <span class="nav-page-badge">${gotInPage}/${total}</span>
    `;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(idx);
      if (window.innerWidth <= 768) closeSidebar();
    });
    li.appendChild(a);
    ul.appendChild(li);
  });
}

// ============================================
// RENDER: FIGURITAS
// ============================================

function renderStickers() {
  const grid       = document.getElementById('stickersGrid');
  const noResults  = document.getElementById('noResults');
  const page       = PAGES[currentPage];

  grid.innerHTML = '';
  let count = 0;

  for (let i = page.from; i <= page.to; i++) {
    const isObt = obtained.has(i);

    // Filtros
    if (currentFilter === 'obtained' && !isObt) continue;
    if (currentFilter === 'missing'  && isObt)  continue;
    if (searchValue && i !== parseInt(searchValue)) continue;

    count++;
    const el = document.createElement('div');
    el.className = 'sticker' + (isObt ? ' obtained' : '');
    el.textContent = String(i).padStart(3, '0');
    el.dataset.num = i;
    el.addEventListener('click', () => toggleSticker(i, el));
    grid.appendChild(el);
  }

  noResults.style.display = count === 0 ? 'block' : 'none';
}

function goToPage(idx) {
  currentPage = idx;
  updatePageHeader();
  renderStickers();
  renderPageNav();
  updatePageNavButtons();
  // cambiar a figuritas si no está ahí
  if (currentTab !== 'figuritas') switchTab('figuritas');
}

function updatePageHeader() {
  const page = PAGES[currentPage];
  document.getElementById('pageTitle').textContent    = `Figuritas ${page.label}`;
  document.getElementById('pageSubtitle').textContent = `Página ${currentPage + 1} de ${PAGES.length}`;
  document.getElementById('pageIndicator').textContent = `${currentPage + 1} / ${PAGES.length}`;
}

function updatePageNavButtons() {
  document.getElementById('btnPrevPage').disabled = currentPage === 0;
  document.getElementById('btnNextPage').disabled = currentPage === PAGES.length - 1;
}

// ============================================
// TOGGLE FIGURITA
// ============================================

function toggleSticker(num, el) {
  if (obtained.has(num)) {
    obtained.delete(num);
    el.classList.remove('obtained');
  } else {
    obtained.add(num);
    el.classList.add('obtained');
  }

  // animación
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');

  saveData();
  updateAll();
  checkUnlocks();
}

// ============================================
// MARCAR / DESMARCAR
// ============================================

function markPage() {
  const page = PAGES[currentPage];
  const allObt = Array.from({ length: page.to - page.from + 1 }, (_, k) => page.from + k)
    .every(n => obtained.has(n));

  for (let i = page.from; i <= page.to; i++) {
    if (allObt) obtained.delete(i);
    else        obtained.add(i);
  }
  saveData();
  updateAll();
  renderStickers();
  renderPageNav();
  checkUnlocks();
}

function markAll() {
  for (let i = 1; i <= TOTAL; i++) obtained.add(i);
  saveData();
  updateAll();
  renderStickers();
  renderPageNav();
  checkUnlocks();
}

function resetAlbum() {
  obtained.clear();
  prevUnlocked.clear();
  saveData();
  updateAll();
  renderStickers();
  renderPageNav();
}

// ============================================
// RENDER: PREMIOS
// ============================================

function renderPremios() {
  ['premiosGrid', 'statsPreview'].forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';

    PRIZES.forEach(p => {
      const s          = getPrizeStatus(p);
      const isUnlocked = s.pct === 100;
      const isProgress = s.pct > 0 && s.pct < 100;

      const card     = document.createElement('div');
      card.className = 'premio-card' + (isUnlocked ? ' unlocked' : isProgress ? ' in-progress' : '');

      const badgeCls = isUnlocked ? 'badge-unlocked' : isProgress ? 'badge-progress' : 'badge-locked';
      const badgeTxt = isUnlocked ? '✅ Desbloqueado' : isProgress ? `${s.pct}%` : '🔒 Bloqueado';
      const barCls   = isUnlocked ? 'unlocked-fill' : isProgress ? 'progress-fill' : 'locked-fill';
      const pctColor = isUnlocked ? 'var(--gold)' : isProgress ? 'var(--green-light)' : 'rgba(255,255,255,0.3)';

      card.innerHTML = `
        <div class="premio-top">
          <div class="premio-icon">${p.icon}</div>
          <div class="premio-info">
            <div class="premio-name">${p.name}</div>
            <div class="premio-range">Figuritas ${p.from} – ${p.to}</div>
          </div>
          <div class="premio-badge ${badgeCls}">${badgeTxt}</div>
        </div>
        <div class="premio-bar-wrap">
          <div class="premio-bar-fill ${barCls}" style="width:${s.pct}%"></div>
        </div>
        <div class="premio-footer">
          <span class="premio-pct" style="color:${pctColor}">${s.got} / ${s.tot}</span>
          <span class="premio-missing">${isUnlocked ? '¡Completo!' : s.missing + ' faltantes'}</span>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

// ============================================
// RENDER: PRÓXIMO PREMIO (el más cercano)
// ============================================

function renderNextPrize() {
  const card = document.getElementById('nextPrizeCard');
  const allDone = PRIZES.every(p => getPrizeStatus(p).pct === 100);

  if (allDone) {
    card.innerHTML = `
      <div class="next-prize-label">🎯 Próximo Premio</div>
      <div class="next-prize-row">
        <div class="next-prize-icon">🎉</div>
        <div>
          <div class="next-prize-name">¡Álbum completado!</div>
          <div class="next-prize-sub">Todos los premios desbloqueados</div>
        </div>
      </div>
    `;
    return;
  }

  const next = getClosestPrize();
  const s    = getPrizeStatus(next);

  card.innerHTML = `
    <div class="next-prize-label">🎯 Premio más cercano</div>
    <div class="next-prize-row">
      <div class="next-prize-icon">${next.icon}</div>
      <div>
        <div class="next-prize-name">${next.name}</div>
        <div class="next-prize-sub">Figuritas ${next.from} – ${next.to} · ${s.tot} en total</div>
      </div>
    </div>
    <div class="next-prize-bar-wrap">
      <div class="next-prize-bar-fill" style="width:${s.pct}%"></div>
    </div>
    <div class="next-prize-footer">
      <span class="next-prize-pct">${s.pct}% completado</span>
      <span class="next-prize-missing">Faltan ${s.missing} figuritas</span>
    </div>
  `;
}

// ============================================
// ACTUALIZAR TODO EL UI
// ============================================

function updateAll() {
  const got     = obtained.size;
  const missing = TOTAL - got;
  const pct     = Math.round((got / TOTAL) * 100);
  const prizes  = getUnlockedCount();

  // Sidebar
  document.getElementById('sbObtained').textContent   = got;
  document.getElementById('sbProgressBar').style.width = pct + '%';
  document.getElementById('sbPct').textContent         = `${pct}% completado`;

  // Topbar móvil
  document.getElementById('topbarPct').textContent = pct + '%';

  // Stats
  document.getElementById('statObtained').textContent = got;
  document.getElementById('statMissing').textContent  = missing;
  document.getElementById('statPct').textContent      = pct + '%';
  document.getElementById('statPrizes').textContent   = prizes + ' / 12';

  renderPremios();
  renderNextPrize();
}

// ============================================
// DESBLOQUEOS (TOASTS)
// ============================================

function checkUnlocks() {
  PRIZES.forEach(p => {
    const s   = getPrizeStatus(p);
    const key = p.name;
    if (s.pct === 100 && !prevUnlocked.has(key)) {
      prevUnlocked.add(key);
      showToast(`🏆 ${p.icon} ${p.name} desbloqueado!`);
    }
    if (s.pct < 100) prevUnlocked.delete(key);
  });
}

function showToast(msg) {
  const toast = document.getElementById('unlockToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ============================================
// TABS
// ============================================

function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.stab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'sec-' + tabName);
  });

  // Resaltar nav de páginas solo cuando está en figuritas
  renderPageNav();
}

// ============================================
// SIDEBAR MÓVIL
// ============================================

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

// ============================================
// MODAL DE REINICIO
// ============================================

function openModal() {
  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// ============================================
// BÚSQUEDA GLOBAL POR NÚMERO
// ============================================

function handleSearch(value) {
  searchValue = value.trim();

  if (searchValue) {
    const num = parseInt(searchValue);
    if (num >= 1 && num <= TOTAL) {
      // Ir a la página que contiene ese número
      const pageIdx = Math.floor((num - 1) / PAGE_SIZE);
      if (pageIdx !== currentPage) {
        currentPage = pageIdx;
        updatePageHeader();
        updatePageNavButtons();
        renderPageNav();
      }
    }
  }
  renderStickers();
}

// ============================================
// FILTROS
// ============================================

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStickers();
}

// ============================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ============================================

function init() {
  loadData();

  // Inicializar prevUnlocked con los ya desbloqueados
  PRIZES.forEach(p => {
    if (getPrizeStatus(p).pct === 100) prevUnlocked.add(p.name);
  });

  // Render inicial
  renderPageNav();
  updatePageHeader();
  updatePageNavButtons();
  renderStickers();
  updateAll();

  // ----- SIDEBAR -----
  document.getElementById('btnMenuOpen').addEventListener('click', openSidebar);
  document.getElementById('btnSidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // ----- TABS -----
  document.querySelectorAll('.stab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ----- FILTROS -----
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter, btn));
  });

  // ----- BÚSQUEDA -----
  document.getElementById('searchInput').addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  // ----- ACCIONES -----
  document.getElementById('btnMarkPage').addEventListener('click', markPage);
  document.getElementById('btnMarkAll').addEventListener('click', markAll);
  document.getElementById('btnReset').addEventListener('click', openModal);

  // ----- MODAL -----
  document.getElementById('btnCancelReset').addEventListener('click', closeModal);
  document.getElementById('btnConfirmReset').addEventListener('click', () => {
    resetAlbum();
    closeModal();
  });
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // ----- PAGINACIÓN -----
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (currentPage > 0) goToPage(currentPage - 1);
  });
  document.getElementById('btnNextPage').addEventListener('click', () => {
    if (currentPage < PAGES.length - 1) goToPage(currentPage + 1);
  });

  // ----- TECLADO -----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft'  && currentTab === 'figuritas') goToPage(Math.max(0, currentPage - 1));
    if (e.key === 'ArrowRight' && currentTab === 'figuritas') goToPage(Math.min(PAGES.length - 1, currentPage + 1));
    if (e.key === 'Escape') { closeModal(); closeSidebar(); }
  });
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);