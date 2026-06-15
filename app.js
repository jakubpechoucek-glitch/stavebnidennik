// ── Firebase init ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyBzG0C5IKTBVsur6bgoKN0De7--IKQn7oQ",
  authDomain: "stavebnidennik-81b75.firebaseapp.com",
  projectId: "stavebnidennik-81b75",
  storageBucket: "stavebnidennik-81b75.firebasestorage.app",
  messagingSenderId: "334005961723",
  appId: "1:334005961723:web:f8e02885774b174038015e",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL      = { trva: "Trvá", otevreno: "Otevřeno", splneno: "Splněno" };
const STATUS_BADGE_CLASS = { trva: "badge-trva", otevreno: "badge-otevreno", splneno: "badge-splneno" };

// ── Live state ────────────────────────────────────────────────────────────────

let ZAPISKY = [];
let activeFilters     = new Set(["vse"]);
let activePersonFilter = "vse";

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// ── Firestore operations ──────────────────────────────────────────────────────

async function fsUpdateUkolStatus(kdId, ukolId, status, poznamka) {
  const ref = db.collection("zapisky").doc(kdId);
  const snap = await ref.get();
  const ukoly = snap.data().ukoly.map(u =>
    u.id === ukolId
      ? { ...u, status, poznamka: poznamka || null, casPotvrzeni: new Date().toLocaleString("cs-CZ") }
      : u
  );
  await ref.update({ ukoly });
}

async function fsSaveUkol(kdId, ukolId, fields) {
  const ref = db.collection("zapisky").doc(kdId);
  const snap = await ref.get();
  let ukoly = snap.data().ukoly;
  if (ukolId) {
    ukoly = ukoly.map(u => u.id === ukolId ? { ...u, ...fields } : u);
  } else {
    ukoly = [...ukoly, { poznamka: null, casPotvrzeni: null, ...fields }];
  }
  await ref.update({ ukoly });
}

async function fsAddKD(kd) {
  await db.collection("zapisky").doc(kd.id).set(kd);
}

// ── Confirm dialog (status change) ───────────────────────────────────────────

let pendingConfirm = null;

function openConfirmDialog(kdId, ukolId, currentStatus) {
  const isSplneno = currentStatus !== "splneno";
  pendingConfirm = { kdId, ukolId, isSplneno };
  document.getElementById("dialog-title").textContent  = isSplneno ? "Označit jako splněno" : "Znovu otevřít úkol";
  document.getElementById("dialog-desc").textContent   = isSplneno
    ? "Volitelně uveďte poznámku k dokončení (datum, způsob řešení…)."
    : "Úkol bude znovu označen jako otevřený.";
  const noteEl = document.getElementById("dialog-note");
  noteEl.value = "";
  noteEl.style.display = isSplneno ? "block" : "none";
  document.getElementById("dialog-ok").textContent = isSplneno ? "Potvrdit splnění" : "Otevřít znovu";
  document.getElementById("overlay").classList.remove("hidden");
  if (isSplneno) noteEl.focus();
}

function closeConfirmDialog() {
  document.getElementById("overlay").classList.add("hidden");
  pendingConfirm = null;
}

async function confirmDialog() {
  if (!pendingConfirm) return;
  const { kdId, ukolId, isSplneno } = pendingConfirm;
  const note      = document.getElementById("dialog-note").value.trim();
  const newStatus = isSplneno ? "splneno" : "otevreno";
  closeConfirmDialog();
  await fsUpdateUkolStatus(kdId, ukolId, newStatus, isSplneno ? note : null);
}

// ── Edit / Add task dialog ────────────────────────────────────────────────────

let pendingEdit = null;

function openEditDialog(kdId, ukolId) {
  const kd   = ZAPISKY.find(k => k.id === kdId);
  const ukol = ukolId ? kd?.ukoly.find(u => u.id === ukolId) : null;
  pendingEdit = { kdId, ukolId };

  document.getElementById("edit-dialog-title").textContent = ukol ? "Upravit úkol" : "Přidat úkol";
  document.getElementById("edit-id").value          = ukol?.id ?? "";
  document.getElementById("edit-id").readOnly       = !!ukol;
  document.getElementById("edit-termin").value      = ukol?.termin ?? "";
  document.getElementById("edit-zodpovedny").value  = ukol?.zodpovedny ?? "";
  document.getElementById("edit-status").value      = ukol?.status ?? "otevreno";
  document.getElementById("edit-popis").value       = ukol?.popis ?? "";
  document.getElementById("edit-dalsi-krok").value  = ukol?.dalsiKrok ?? "";

  document.getElementById("edit-overlay").classList.remove("hidden");
  document.getElementById(ukol ? "edit-popis" : "edit-id").focus();
}

function closeEditDialog() {
  document.getElementById("edit-overlay").classList.add("hidden");
  pendingEdit = null;
}

async function confirmEditDialog() {
  if (!pendingEdit) return;
  const id         = document.getElementById("edit-id").value.trim();
  const termin     = document.getElementById("edit-termin").value;
  const zodpovedny = document.getElementById("edit-zodpovedny").value.trim();
  const status     = document.getElementById("edit-status").value;
  const popis      = document.getElementById("edit-popis").value.trim();
  const dalsiKrok  = document.getElementById("edit-dalsi-krok").value.trim();

  if (!id || !termin || !zodpovedny || !popis) {
    alert("Vyplňte prosím ID, termín, zodpovědného a popis.");
    return;
  }

  const { kdId, ukolId } = pendingEdit;
  closeEditDialog();
  await fsSaveUkol(kdId, ukolId, { id, termin, zodpovedny, status, popis, dalsiKrok });
}

// ── Add KD dialog ─────────────────────────────────────────────────────────────

function openKDDialog() {
  const nextCislo = ZAPISKY.length > 0 ? Math.max(...ZAPISKY.map(k => k.cislo)) + 1 : 1;
  document.getElementById("kd-cislo").value    = nextCislo;
  document.getElementById("kd-datum").value    = "";
  document.getElementById("kd-pritomni").value =
    "INV: manželé Pěchoučkovi\nAD: Ing. Arch. Jakub Žák\nTDI: Jakub Bednář\nTDI: Jan Nekola (737 283 324)\nZhotovitel: Michal Lohoyda";
  document.getElementById("kd-prubehy").value  = "";
  document.getElementById("kd-zmeny").value    = "";
  document.getElementById("kd-overlay").classList.remove("hidden");
  document.getElementById("kd-datum").focus();
}

function closeKDDialog() {
  document.getElementById("kd-overlay").classList.add("hidden");
}

function parsePritomni(text) {
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const ci = line.indexOf(":");
    if (ci === -1) return { role: "?", jmeno: line };
    const role = line.slice(0, ci).trim();
    const rest = line.slice(ci + 1).trim();
    const m = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { role, jmeno: m[1].trim(), kontakt: m[2].trim() } : { role, jmeno: rest };
  });
}

async function confirmKDDialog() {
  const cislo = parseInt(document.getElementById("kd-cislo").value);
  const datum = document.getElementById("kd-datum").value;
  if (!datum) { alert("Zadejte datum KD."); return; }

  const kd = {
    id:       "kd-" + datum,
    cislo,
    datum,
    pritomni: parsePritomni(document.getElementById("kd-pritomni").value),
    prubehy:  document.getElementById("kd-prubehy").value.split("\n").map(l => l.trim()).filter(Boolean),
    zmeny:    document.getElementById("kd-zmeny").value.split("\n").map(l => l.trim()).filter(Boolean),
    ukoly:    [],
  };
  closeKDDialog();
  await fsAddKD(kd);
}

// ── Person filter helpers ─────────────────────────────────────────────────────

function splitRoles(z) { return z.split(/\s*[+\/]\s*/).map(s => s.trim()).filter(Boolean); }
function personInZodpovedny(z, p) { return splitRoles(z).includes(p); }

function uniqueRoles() {
  const roles = new Set();
  ZAPISKY.forEach(kd => kd.ukoly.forEach(u => splitRoles(u.zodpovedny).forEach(r => roles.add(r))));
  const order = ["Zhotovitel", "AD", "TDI", "INV"];
  return order.filter(r => roles.has(r)).concat([...roles].filter(r => !order.includes(r)));
}

// ── Render ────────────────────────────────────────────────────────────────────

function computeStats() {
  let trva = 0, otevreno = 0, splneno = 0;
  ZAPISKY.forEach(kd => kd.ukoly.forEach(u => {
    if (u.status === "trva") trva++;
    else if (u.status === "splneno") splneno++;
    else otevreno++;
  }));
  return { trva, otevreno, splneno };
}

function renderStats() {
  const { trva, otevreno, splneno } = computeStats();
  document.getElementById("stat-trva").textContent     = trva;
  document.getElementById("stat-otevreno").textContent = otevreno;
  document.getElementById("stat-splneno").textContent  = splneno;
}

function renderSummaryTable() {
  const rows = {};
  ZAPISKY.forEach(kd => kd.ukoly.forEach(u => {
    if (!rows[u.zodpovedny]) rows[u.zodpovedny] = { trva: 0, otevreno: 0, splneno: 0 };
    rows[u.zodpovedny][u.status]++;
  }));
  const order  = ["Zhotovitel", "AD", "TDI / AD", "AD + INV", "Zhotovitel + AD"];
  const sorted = order.filter(k => rows[k]).concat(Object.keys(rows).filter(k => !order.includes(k)));
  const numCell = (v, cls) => v > 0 ? `<td class="${cls}">${v}</td>` : `<td class="num-zero">–</td>`;
  let tot = { trva: 0, otevreno: 0, splneno: 0 };
  const bodyRows = sorted.map(k => {
    const r = rows[k];
    tot.trva += r.trva; tot.otevreno += r.otevreno; tot.splneno += r.splneno;
    return `<tr><td>${escHtml(k)}</td>${numCell(r.trva,"num-trva")}${numCell(r.otevreno,"num-otevreno")}${numCell(r.splneno,"num-splneno")}<td style="font-weight:600">${r.trva+r.otevreno+r.splneno}</td></tr>`;
  }).join("");
  document.getElementById("summary-table").innerHTML = `
    <table class="summary-table">
      <thead><tr><th>Zodpovědný</th><th style="color:var(--red)">Trvá</th><th style="color:var(--orange)">Otevřeno</th><th style="color:var(--green)">Splněno</th><th>Celkem</th></tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr class="tfoot"><td>Celkem</td><td class="num-trva">${tot.trva}</td><td class="num-otevreno">${tot.otevreno}</td><td class="num-splneno">${tot.splneno}</td><td>${tot.trva+tot.otevreno+tot.splneno}</td></tr></tfoot>
    </table>`;
}

function renderPersonFilters() {
  const container = document.getElementById("person-filters");
  container.innerHTML = [
    `<button class="filter-btn${activePersonFilter === "vse" ? " active" : ""}" data-person="vse">Vše</button>`,
    ...uniqueRoles().map(r =>
      `<button class="filter-btn${activePersonFilter === r ? " active" : ""}" data-person="${escHtml(r)}">${escHtml(r)}</button>`),
  ].join("");
  container.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activePersonFilter = btn.dataset.person;
      renderPersonFilters();
      renderZapisky();
      renderEmptyState();
    });
  });
}

function renderUkoly(kd) {
  const cards = kd.ukoly.map(u => {
    const { status, poznamka, casPotvrzeni } = u;
    const isSplneno   = status === "splneno";
    const statusMatch = activeFilters.has("vse") || activeFilters.has(status);
    const personMatch = activePersonFilter === "vse" || personInZodpovedny(u.zodpovedny, activePersonFilter);
    const hidden      = !statusMatch || !personMatch;

    let noteHtml = "";
    if (isSplneno && casPotvrzeni) {
      noteHtml = `<div class="task-note"><strong>Splněno:</strong> ${escHtml(casPotvrzeni)}${poznamka ? " – " + escHtml(poznamka) : ""}</div>`;
    } else if (poznamka) {
      noteHtml = `<div class="task-note">${escHtml(poznamka)}</div>`;
    }

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
          <button class="btn-edit-task" data-kd="${kd.id}" data-ukol="${u.id}" title="Upravit úkol">✏️</button>
        </div>
        <div class="task-popis">${escHtml(u.popis)}</div>
        ${u.dalsiKrok ? `<div class="task-dalsi-krok"><span class="dalsi-krok-label">${isSplneno ? "✓ Výsledek" : "→ Další krok"}</span>${escHtml(u.dalsiKrok)}</div>` : ""}
        <div class="task-footer">
          ${noteHtml}
          <button class="btn-confirm ${isSplneno ? "otevrit" : "splnit"}" data-kd="${kd.id}" data-ukol="${u.id}" data-status="${status}">
            ${isSplneno ? "Znovu otevřít" : "Označit jako splněno"}
          </button>
        </div>
      </div>`;
  }).join("");

  return cards + `<button class="btn-add-task" data-kd="${kd.id}">+ Přidat úkol</button>`;
}

function renderPritomni(pritomni) {
  return pritomni.map(p =>
    `<li><span class="role-badge">${escHtml(p.role)}</span>${escHtml(p.jmeno)}${p.kontakt ? ` <span style="color:var(--text-muted);font-size:12px">(${escHtml(p.kontakt)})</span>` : ""}</li>`
  ).join("");
}

function renderZapisky() {
  const container = document.getElementById("zapisky");
  container.innerHTML = ZAPISKY.map(kd => {
    const openCount = kd.ukoly.filter(u => u.status !== "splneno").length;
    const kdMeta    = kd.ukoly.length === 0
      ? "Bez nových úkolů – viz předchozí KD"
      : `Otevřené úkoly: ${openCount} / ${kd.ukoly.length}`;

    return `
      <section class="kd-section" id="kd-${kd.id}">
        <div class="kd-header" aria-expanded="true" data-kd="${kd.id}" role="button" tabindex="0">
          <div>
            <div class="kd-title">Kontrolní den ${kd.cislo} — ${formatDate(kd.datum)}</div>
            <div class="kd-meta">${kdMeta}</div>
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
  const hasVisible = ZAPISKY.some(kd => kd.ukoly.some(u => {
    const sm = activeFilters.has("vse") || activeFilters.has(u.status);
    const pm = activePersonFilter === "vse" || personInZodpovedny(u.zodpovedny, activePersonFilter);
    return sm && pm;
  }));
  document.getElementById("empty-state").style.display = hasVisible ? "none" : "block";
}

function render() {
  renderStats();
  renderSummaryTable();
  renderPersonFilters();
  renderZapisky();
  renderEmptyState();
  attachListeners();
}

// ── Listeners ─────────────────────────────────────────────────────────────────

function attachListeners() {
  document.querySelectorAll(".btn-confirm").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openConfirmDialog(btn.dataset.kd, btn.dataset.ukol, btn.dataset.status);
    });
  });
  document.querySelectorAll(".btn-edit-task").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openEditDialog(btn.dataset.kd, btn.dataset.ukol);
    });
  });
  document.querySelectorAll(".btn-add-task").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openEditDialog(btn.dataset.kd, null);
    });
  });
  document.querySelectorAll(".kd-header").forEach(header => {
    header.addEventListener("click", () => {
      const body = document.getElementById(`body-${header.dataset.kd}`);
      const open = header.getAttribute("aria-expanded") === "true";
      header.setAttribute("aria-expanded", String(!open));
      body.classList.toggle("hidden", open);
    });
    header.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); header.click(); }
    });
  });
}

function syncFilterBtnClasses() {
  document.querySelectorAll(".filter-btn[data-filter]").forEach(b => {
    b.classList.toggle("active", activeFilters.has(b.dataset.filter));
  });
}

function attachFilterListeners() {
  document.querySelectorAll(".filter-btn[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      if (f === "vse") {
        activeFilters = new Set(["vse"]);
      } else {
        activeFilters.delete("vse");
        if (activeFilters.has(f)) {
          activeFilters.delete(f);
          if (activeFilters.size === 0) activeFilters = new Set(["vse"]);
        } else {
          activeFilters.add(f);
        }
      }
      syncFilterBtnClasses();
      renderPersonFilters();
      renderZapisky();
      renderEmptyState();
      attachListeners();
    });
  });
}

// ── Migration (runs once when Firestore is empty) ─────────────────────────────

const SEED_DATA = [
  {
    id: "kd-2026-05-19", cislo: 1, datum: "2026-05-19",
    pritomni: [
      { role: "INV", jmeno: "manželé Pěchoučkovi" },
      { role: "AD",  jmeno: "Ing. Arch. Jakub Žák" },
      { role: "TDI", jmeno: "Jakub Bednář" },
      { role: "TDI", jmeno: "Jan Nekola", kontakt: "737 283 324" },
      { role: "Zhotovitel", jmeno: "Michal Lohoyda" },
    ],
    prubehy: [
      "Provádí se: vyzdívání příček, montáž hrubých rozvodů ZTI",
      "Následné práce: betonáž stropu – dokončení, hydroizolace střechy, vyzdívky příček, rozvody ZTI",
      "BOZP: nutno kontrolovat zábradlí, otvory ve stropu a úklid",
    ],
    zmeny: [
      "Změna rozměrů interiérových dveří",
      "Poptat změnu světlíku",
      "Vyjasněn rozpor mezi PD ARCH a STAT ohledně použitých materiálů",
    ],
    ukoly: [
      { id: "3.1", termin: "2026-06-07", zodpovedny: "Zhotovitel", status: "trva",
        popis: "Předloží aktualizovaný HMG s následným postupem prací. Fáze stavby neodpovídá smluveným termínům – RPT z 22.3.2026 nesplněn. Na KD 26.5. zhotovitel potvrdil, že si je situace vědom.",
        dalsiKrok: "Zhotovitel dodá aktualizovaný harmonogram postupu prací nejpozději do 7.6.2026.", poznamka: null, casPotvrzeni: null },
      { id: "3.3", termin: "2026-04-28", zodpovedny: "Zhotovitel", status: "splneno",
        popis: "U plotu na záp. straně zjištěno kanalizační vedení od sousedního objektu – hrozila kolize s oplocením.",
        dalsiKrok: "Úkol zrušen: jde o staré potrubí souseda z doby výstavby, lze likvidovat – kolize s oplocením odpadá.", poznamka: null, casPotvrzeni: null },
      { id: "3.4", termin: "2026-04-28", zodpovedny: "TDI / AD", status: "splneno",
        popis: "Zhotovitel se dotazoval na způsob ukončení drenáže okolo objektu.",
        dalsiKrok: "Vyřešeno: drenáž bude provedena dle PD a ukončena pod opěrnou stěnou.", poznamka: null, casPotvrzeni: null },
      { id: "3.5", termin: "2026-04-28", zodpovedny: "AD", status: "splneno",
        popis: "AD doplnil přesné pozice koncových prvků ZTI a elektro.",
        dalsiKrok: "Splněno: pozice doplněny do pohledů PD. V případě nejasností zašle zhotovitel dotaz AD.", poznamka: null, casPotvrzeni: null },
      { id: "3.6", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "otevreno",
        popis: "Rozvody ZTI – kanalizace provedena nesprávně: redukce zkrácenou místo klasickou metodou, izolace neprovedeny v celém rozsahu. Materiál vody zaměněn od Viega na Concept. Kotvení potrubí neodpovídá TL výrobce.",
        dalsiKrok: "Zhotovitel potvrdil nápravu (2.6: 'OK napravíme'). Doplnění: excentrické redukce v ležatém potrubí instalovat rovným povrchem nahoře. Zhotovitel doloží provedení všech oprav: (1) klasické redukce, (2) izolace v plném rozsahu, (3) tech. parametry Viega vs. Concept, (4) kotvení a izolace v objímkách.", poznamka: null, casPotvrzeni: null },
      { id: "3.7", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "splneno",
        popis: "Otvory skrz ŽB konstrukce provádět dle PD pouze odvrty. Prostupy a rozvody na podkladu dokumentace DPS a INT současně.",
        dalsiKrok: "Splněno: prostupy zabetonovány. Případné další prostupy budou řešeny dle potřeby.", poznamka: null, casPotvrzeni: null },
      { id: "3.8", termin: "2026-06-20", zodpovedny: "Zhotovitel", status: "otevreno",
        popis: "Zhotovitel provede 2× vzorek omítky: štuková omítka / sádrová stěrka + malba dle zadání. Termín vzorků do 20.6.",
        dalsiKrok: "Zhotovitel se propojí s firmou KEIM ohledně dodání materiálu pro vzorky. Před objednávkou potvrdit typ omítky a platnost interiérového projektu (viz samostatná komunikace).", poznamka: null, casPotvrzeni: null },
      { id: "3.9", termin: "2026-05-19", zodpovedny: "AD", status: "trva",
        popis: "AD zkonzultuje výběr spotřebičů v kuchyňské lince pro ověření správnosti rozvodů voda, odpady a elektro.",
        dalsiKrok: "28.5. zaslán vývodový plán instalací od dodavatele kuchyně. Stále otevřeno: nutno dořešit provedení odtahu digestoře na fasádě – AD upřesní řešení, zhotovitel upraví rozvody.", poznamka: null, casPotvrzeni: null },
      { id: "3.10", termin: "2026-05-19", zodpovedny: "AD + INV", status: "otevreno",
        popis: "AD + INV potvrdí povrchové úpravy – zejména koupelny, ale i ostatní místnosti. Upřesnění, zda platí PD nebo jsou změny.",
        dalsiKrok: "AD zadá konkrétní stěrky (typ a barevnost). Stavba zajistí vzorky keramiky a vnitřních povrchů. Specifikace v projektu INT včetně ref. výrobců – AD zašle seznam v samostatném mailu.", poznamka: null, casPotvrzeni: null },
      { id: "3.11", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "splneno",
        popis: "Zhotovitel provádí polohy koncových prvků ZTI, UT a ELE dle PD interiéru.",
        dalsiKrok: "Splněno: úkol se vypouští ze sledování, zhotovitel pokračuje průběžně dle PD.", poznamka: null, casPotvrzeni: null },
      { id: "3.12", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "splneno",
        popis: "Veškerá světla bez provedené kabeláže budou provedena kabelem 5×1,5. Upřesnění (26.5): 1. NP již provedeno v 3×1,5 – tento úkol platí pouze pro 1. PP.",
        dalsiKrok: "Splněno (2.6.2026): kabeláž světel v 1. PP kabelem 5×1,5 provedena. Úkol se vypouští ze sledování.", poznamka: null, casPotvrzeni: null },
      { id: "3.13", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "otevreno",
        popis: "Ověřit alternativu ke světlíku v pracovně – dosud předložena pouze úspora ve stávající nabídce, nikoliv nabídka jiného dodavatele.",
        dalsiKrok: "Zhotovitel vyčká na cenovou nabídku od firmy Značková okna (poptávka odeslána 26.5.). Stav 2.6: CN dosud nedoručena, úkol stále trvá. Po obdržení CN předloží INV k rozhodnutí.", poznamka: null, casPotvrzeni: null },
      { id: "3.14", termin: "2026-05-19", zodpovedny: "AD + INV", status: "otevreno",
        popis: "AD + INV vyberou odstíny a strukturu fasád, zhotovitel následně provede vzorky.",
        dalsiKrok: "AD + INV potvrdí typ fasády (viz samostatná komunikace). KEIM dodá materiál pro vzorky – zhotovitel se propojí s KEIM ohledně objednávky a logistiky.", poznamka: null, casPotvrzeni: null },
      { id: "3.15", termin: "2026-05-19", zodpovedny: "Zhotovitel", status: "otevreno",
        popis: "Vnitřní schody – vyjasnit stav objednávky. Dosud pouze CN od firmy JAP.",
        dalsiKrok: "Zhotovitel objedná technika na zaměření a kontrolu připravenosti stavby dle PD. Pokud nesplňuje požadavky, schody se provedou dle PD INT.", poznamka: null, casPotvrzeni: null },
      { id: "3.16", termin: "2026-05-19", zodpovedny: "AD + INV", status: "trva",
        popis: "Venkovní rozvody elektro – chybí návrh specifikace: okruhy světel, systém a pozice ovládání, zásuvky pro zahradu (sekačka, závlaha, vířivka, bazén, gril…).",
        dalsiKrok: "AD + INV definují a odsouhlasí specifikaci venkovního elektra, AD zpracuje zadání pro zhotovitele.", poznamka: null, casPotvrzeni: null },
      { id: "3.17", termin: "2026-05-19", zodpovedny: "Zhotovitel + AD", status: "trva",
        popis: "Fyzická kontrola objednaných oken – ověření shody s PD (rozměry, napojení na ostatní kce).",
        dalsiKrok: "Zhotovitel + AD provedou kontrolu objednaných oken oproti PD a doloží výsledek (případné odchylky ihned řeší s výrobcem).", poznamka: null, casPotvrzeni: null },
      { id: "3.18", termin: "2026-05-19", zodpovedny: "Zhotovitel + AD", status: "trva",
        popis: "Konzultace s dodavatelem dveří ohledně otvorů. Sondy pro zasekání zárubní v monolitické konstrukci – bez přerušení výztuže.",
        dalsiKrok: "Sondy provedeny (2.6.2026) – zjištěna možná úprava konstrukce. Zhotovitel zajistí návštěvu dodavatele dveří na stavbě za účelem zaměření a potvrzení řešení zárubní.", poznamka: null, casPotvrzeni: null },
    ],
  },
  {
    id: "kd-2026-05-26", cislo: 2, datum: "2026-05-26",
    pritomni: [
      { role: "INV", jmeno: "manželé Pěchoučkovi" },
      { role: "AD",  jmeno: "Ing. Arch. Jakub Žák" },
      { role: "TDI", jmeno: "Jakub Bednář" },
      { role: "TDI", jmeno: "Jan Nekola", kontakt: "737 283 324" },
      { role: "Zhotovitel", jmeno: "Michal Lohoyda" },
    ],
    prubehy: [
      "Provádí se: vyzdívání příček, montáž hrubých rozvodů ZTI, montáž HI soklu, parotěsné zábrany střechy, rozvody ELEKTRO",
      "Následné práce: vyzdívky příček, rozvody ELEKTRO",
      "BOZP: kontrola zábradlí, otvory ve stropu a úklid – OK",
    ],
    zmeny: [
      "Světlík: poptávka odeslána firmě Značková okna",
      "25.5: zaslán dotaz objednateli na platnost interiérů",
      "Kabeláž pro trafa do rozvaděče – navíc rozvaděč = větší",
      "Vyjma 1. NP všude kabel 5×1,5 místo 3×1,5",
    ],
    ukoly: [],
  },
  {
    id: "kd-2026-06-02", cislo: 3, datum: "2026-06-02",
    pritomni: [
      { role: "INV", jmeno: "manželé Pěchoučkovi" },
      { role: "AD",  jmeno: "Ing. Arch. Jakub Žák" },
      { role: "TDI", jmeno: "Jakub Bednář" },
      { role: "TDI", jmeno: "Jan Nekola", kontakt: "737 283 324" },
      { role: "Zhotovitel", jmeno: "Michal Lohoyda" },
    ],
    prubehy: [
      "Provádí se: vyzdívání příček, montáž HI soklu, parotěsné zábrany střechy, rozvody ELEKTRO",
      "Následné práce: rozvody ELEKTRO, SLABOPROUD, EZS apod.",
      "BOZP: nutno kontrolovat zábradlí, otvory ve stropu a úklid – OK",
    ],
    zmeny: [
      "Poptávka světlíku u Značková okna – probíhá",
      "25.5: zaslán dotaz objednateli na platnost interiérů",
      "Kabeláž pro trafa do rozvaděče – navíc rozvaděč = větší",
      "Vyjma 1. NP všude kabel 5×1,5 místo 3×1,5",
    ],
    ukoly: [],
  },
];

async function maybeMigrate() {
  const snap = await db.collection("zapisky").limit(1).get();
  if (!snap.empty) return;
  const batch = db.batch();
  SEED_DATA.forEach(kd => batch.set(db.collection("zapisky").doc(kd.id), kd));
  await batch.commit();
  console.log("Migrace dokončena.");
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("projekt-nazev").textContent    = "Rekonstrukce a přestavba rodinného domu – Podolanka";
  document.getElementById("projekt-investor").textContent = "Investor: manželé Pěchoučkovi";

  // Confirm dialog
  document.getElementById("dialog-ok").addEventListener("click", confirmDialog);
  document.getElementById("dialog-cancel").addEventListener("click", closeConfirmDialog);
  document.getElementById("overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("overlay")) closeConfirmDialog();
  });

  // Edit task dialog
  document.getElementById("edit-ok").addEventListener("click", confirmEditDialog);
  document.getElementById("edit-cancel").addEventListener("click", closeEditDialog);
  document.getElementById("edit-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("edit-overlay")) closeEditDialog();
  });

  // Add KD dialog
  document.getElementById("kd-ok").addEventListener("click", confirmKDDialog);
  document.getElementById("kd-cancel").addEventListener("click", closeKDDialog);
  document.getElementById("kd-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("kd-overlay")) closeKDDialog();
  });
  document.getElementById("btn-add-kd").addEventListener("click", openKDDialog);

  attachFilterListeners();

  // Show loading state
  document.getElementById("zapisky").innerHTML = '<p style="padding:40px;color:var(--text-muted);text-align:center">Načítám data…</p>';

  await maybeMigrate();

  db.collection("zapisky").orderBy("cislo").onSnapshot(snapshot => {
    ZAPISKY = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  });
});
