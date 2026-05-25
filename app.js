const STORAGE_KEY = "stavebnidennik_v1";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  trva:     "Trvá",
  otevreno: "Otevřeno",
  splneno:  "Splněno",
};
const STATUS_BADGE_CLASS = {
  trva:     "badge-trva",
  otevreno: "badge-otevreno",
  splneno:  "badge-splneno",
};

// ── State ─────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// state shape: { "kd-id/ukol-id": { status, poznamka, casPotvrzeni } }
let state = loadState();

function getUkolKey(kdId, ukolId) {
  return `${kdId}/${ukolId}`;
}

function getUkolStatus(kdId, ukol) {
  const key = getUkolKey(kdId, ukol.id);
  return state[key]?.status ?? ukol.status;
}

function getUkolPoznamka(kdId, ukolId) {
  const key = getUkolKey(kdId, ukolId);
  return state[key]?.poznamka ?? null;
}

function setUkolStatus(kdId, ukolId, status, poznamka) {
  const key = getUkolKey(kdId, ukolId);
  state[key] = {
    status,
    poznamka: poznamka || null,
    casPotvrzeni: new Date().toLocaleString("cs-CZ"),
  };
  saveState(state);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeStats() {
  let trva = 0, otevreno = 0, splneno = 0;
  ZAPISKY.forEach(kd => {
    kd.ukoly.forEach(u => {
      const s = getUkolStatus(kd.id, u);
      if (s === "trva")     trva++;
      else if (s === "splneno") splneno++;
      else otevreno++;
    });
  });
  return { trva, otevreno, splneno };
}

// ── Filter state ──────────────────────────────────────────────────────────────

let activeFilter = "vse";

// ── Dialog ────────────────────────────────────────────────────────────────────

let pendingConfirm = null;

function openDialog(kdId, ukolId, currentStatus) {
  const isSplneno = currentStatus !== "splneno";
  pendingConfirm = { kdId, ukolId, isSplneno };

  const overlay = document.getElementById("overlay");
  const title   = document.getElementById("dialog-title");
  const desc    = document.getElementById("dialog-desc");
  const noteEl  = document.getElementById("dialog-note");
  const okBtn   = document.getElementById("dialog-ok");

  title.textContent = isSplneno ? "Označit jako splněno" : "Znovu otevřít úkol";
  desc.textContent  = isSplneno
    ? "Volitelně uveďte poznámku k dokončení (datum, způsob řešení…)."
    : "Úkol bude znovu označen jako otevřený.";
  noteEl.value = "";
  noteEl.style.display = isSplneno ? "block" : "none";
  okBtn.textContent = isSplneno ? "Potvrdit splnění" : "Otevřít znovu";

  overlay.classList.remove("hidden");
  if (isSplneno) noteEl.focus();
}

function closeDialog() {
  document.getElementById("overlay").classList.add("hidden");
  pendingConfirm = null;
}

function confirmDialog() {
  if (!pendingConfirm) return;
  const { kdId, ukolId, isSplneno } = pendingConfirm;
  const note = document.getElementById("dialog-note").value.trim();
  const newStatus = isSplneno ? "splneno" : "otevreno";
  setUkolStatus(kdId, ukolId, newStatus, isSplneno ? note : null);
  closeDialog();
  render();
}

// ── Render ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function renderStats() {
  const { trva, otevreno, splneno } = computeStats();
  document.getElementById("stat-trva").textContent    = trva;
  document.getElementById("stat-otevreno").textContent= otevreno;
  document.getElementById("stat-splneno").textContent = splneno;
}

function renderUkoly(kd) {
  return kd.ukoly.map(u => {
    const status   = getUkolStatus(kd.id, u);
    const poznamka = getUkolPoznamka(kd.id, u.id);
    const key      = getUkolKey(kd.id, u.id);
    const cas      = state[key]?.casPotvrzeni;

    const isSplneno = status === "splneno";
    const hidden    = activeFilter !== "vse" && status !== activeFilter;

    let noteHtml = "";
    if (isSplneno && cas) {
      noteHtml = `<div class="task-note">
        <strong>Splněno:</strong> ${cas}${poznamka ? " – " + escHtml(poznamka) : ""}
      </div>`;
    } else if (poznamka) {
      noteHtml = `<div class="task-note">${escHtml(poznamka)}</div>`;
    }

    const btnLabel = isSplneno ? "Znovu otevřít" : "Označit jako splněno";
    const btnClass = isSplneno ? "otevrit" : "splnit";

    return `
      <div class="task-card${hidden ? " hidden" : ""}" data-status="${status}" data-kd="${kd.id}" data-ukol="${u.id}">
        <div class="task-top">
          <div>
            <div class="task-id-wrap">
              <span class="task-id">Úkol ${escHtml(u.id)}</span>
              <span class="status-badge ${STATUS_BADGE_CLASS[status]}">${STATUS_LABEL[status]}</span>
            </div>
            <div class="task-meta">
              <span>📅 Termín: ${formatDate(u.termin)}</span>
              <span>👤 ${escHtml(u.zodpovedny)}</span>
            </div>
          </div>
        </div>
        <div class="task-popis">${escHtml(u.popis)}</div>
        <div class="task-footer">
          ${noteHtml}
          <button class="btn-confirm ${btnClass}" data-kd="${kd.id}" data-ukol="${u.id}" data-status="${status}">
            ${btnLabel}
          </button>
        </div>
      </div>`;
  }).join("");
}

function renderPritomni(pritomni) {
  return pritomni.map(p =>
    `<li><span class="role-badge">${escHtml(p.role)}</span>${escHtml(p.jmeno)}${p.kontakt ? ` <span style="color:var(--text-muted);font-size:12px">(${escHtml(p.kontakt)})</span>` : ""}</li>`
  ).join("");
}

function renderZapisky() {
  const container = document.getElementById("zapisky");
  container.innerHTML = ZAPISKY.map(kd => {
    const openCount = kd.ukoly.filter(u => getUkolStatus(kd.id, u) !== "splneno").length;

    return `
      <section class="kd-section" id="kd-${kd.id}">
        <div class="kd-header" aria-expanded="true" data-kd="${kd.id}" role="button" tabindex="0">
          <div>
            <div class="kd-title">Kontrolní den ${kd.cislo} — ${formatDate(kd.datum)}</div>
            <div class="kd-meta">Otevřené úkoly: ${openCount} / ${kd.ukoly.length}</div>
          </div>
          <span class="kd-chevron">▼</span>
        </div>
        <div class="kd-body" id="body-${kd.id}">
          <div class="kd-info">
            <div class="kd-info-section">
              <h4>Přítomni</h4>
              <ul>${renderPritomni(kd.pritomni)}</ul>
            </div>
            <div class="kd-info-section">
              <h4>Průběh prací</h4>
              <ul>${kd.prubehy.map(p => `<li style="padding:2px 0;font-size:13px">• ${escHtml(p)}</li>`).join("")}</ul>
              <h4 style="margin-top:10px">Změny zadání</h4>
              <ul>${kd.zmeny.map(z => `<li style="padding:2px 0;font-size:13px">• ${escHtml(z)}</li>`).join("")}</ul>
            </div>
          </div>
          <div class="task-list">
            <div class="task-list-title">Úkoly</div>
            ${renderUkoly(kd)}
          </div>
        </div>
      </section>`;
  }).join("");
}

function renderEmptyState() {
  const allTasks = ZAPISKY.flatMap(kd => kd.ukoly);
  const visibleCount = allTasks.filter(u => {
    const kd = ZAPISKY.find(k => k.ukoly.includes(u));
    const s  = getUkolStatus(kd.id, u);
    return activeFilter === "vse" || s === activeFilter;
  }).length;

  const emptyEl = document.getElementById("empty-state");
  emptyEl.style.display = visibleCount === 0 ? "block" : "none";
}

function render() {
  renderStats();
  renderZapisky();
  renderEmptyState();
  attachCardListeners();
}

// ── Event delegation ──────────────────────────────────────────────────────────

function attachCardListeners() {
  document.querySelectorAll(".btn-confirm").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const { kd, ukol, status } = btn.dataset;
      openDialog(kd, ukol, status);
    });
  });

  document.querySelectorAll(".kd-header").forEach(header => {
    header.addEventListener("click", () => {
      const kdId  = header.dataset.kd;
      const body  = document.getElementById(`body-${kdId}`);
      const open  = header.getAttribute("aria-expanded") === "true";
      header.setAttribute("aria-expanded", String(!open));
      body.classList.toggle("hidden", open);
    });
    header.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); header.click(); }
    });
  });
}

function attachFilterListeners() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("projekt-nazev").textContent   = PROJEKT.nazev;
  document.getElementById("projekt-investor").textContent = "Investor: " + PROJEKT.investor;

  document.getElementById("dialog-ok").addEventListener("click", confirmDialog);
  document.getElementById("dialog-cancel").addEventListener("click", closeDialog);
  document.getElementById("overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("overlay")) closeDialog();
  });

  attachFilterListeners();
  render();
});
