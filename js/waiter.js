/**
 * INSTAOrder — MODO MESERO (teléfono)
 * ===================================
 * Rutas:
 *   #/mesero                 Mesas (o selección de mesero si no hay uno)
 *   #/mesero/identificar     Seleccionar / cambiar mesero
 *   #/mesero/mesa/7          Tomar pedido de la mesa 7
 *   #/mesero/mesa/7/resumen  Revisar y enviar a cocina
 *   #/mesero/enviado/ID      Resultado del envío
 *   #/mesero/pedidos         Mis pedidos activos (+ correcciones)
 *
 * Alertas "LISTO PARA SERVIR": capa global (startWaiterAlerts) visible en
 * cualquier pantalla del modo mesero, sólo para el mesero de cada orden.
 *
 * Recordatorio: los precios son REFERENCIALES. Aquí no se suma nada.
 */

import { dataService } from "../firebase-service.js";
import { state, subscribe, activeWaiters, categoryById } from "./state.js";
import { go, currentRoute } from "./router.js";
import { appHeader, demoNotice } from "./components.js";
import { submitOrder, outboxEntries, processOutbox } from "./outbox.js";
import {
  getWaiter, setWaiter, getDraft, saveDraft, clearDraft, getDrafts, deviceId, getPrefs, getLastMode,
  getDrinks, addDrinks, removeDrinks,
} from "./store.js";
import { playAlert, vibrate } from "./sound.js";
import {
  $, $$, esc, toast, dialog, confirmDialog, tableLabel, fmtRefPrice, fmtTime, orderLabel,
} from "./ui.js";

const QUICK_NOTES = ["Sin cebolla", "Salsa aparte", "Extra picante", "Sin guacamole", "Bien cocido", "Separar en dos platos", "Sin queso", "Para llevar"];
const QUICK_GENERAL = ["⚠️ Alergia: ", "Servir todo junto", "Niño en la mesa", "Urgente"];

export const TABLE_STATES = {
  available: { label: "Disponible", cls: "st-available" },
  pending: { label: "Pendiente de enviar", cls: "st-pending" },
  sent: { label: "Enviada a cocina", cls: "st-sent" },
  preparing: { label: "En preparación", cls: "st-preparing" },
  ready: { label: "Lista para servir", cls: "st-ready" },
};

const ORDER_STATUS = {
  NEW: { label: "Enviada a cocina", cls: "st-sent" },
  ACCEPTED: { label: "En preparación", cls: "st-preparing" },
  COMPLETED: { label: "Lista para servir", cls: "st-ready" },
};

/* ------------------------------------------------------------------ */
/* Bebidas: se quedan con el mesero (no van a cocina)                  */
/* ------------------------------------------------------------------ */

/**
 * true si el producto pertenece a una categoría marcada para el mesero
 * (station = "waiter": Bebidas, Cantaritos, Micheladas, Cócteles).
 * Se configura en Configuración › Catálogo.
 */
export function isDrink(item) {
  const prod = state.catalog.products.find((p) => p.id === item.productId);
  const cat = prod ? categoryById(prod.categoryId) : state.catalog.categories.find((c) => c.name === item.category);
  return cat?.station === "waiter";
}

function itemsText(items) {
  return items.map((i) => `${i.quantity}× ${esc(i.productName)}${i.notes ? ` <em>(${esc(i.notes)})</em>` : ""}`).join(" · ");
}

/* ------------------------------------------------------------------ */
/* Estado de las mesas                                                 */
/* ------------------------------------------------------------------ */

/** El estado depende de las órdenes activas, nunca bloquea una mesa. */
export function tableStatus(n) {
  const orders = state.activeOrders.filter((o) => o.tableNumber === n);
  if (orders.some((o) => o.status === "COMPLETED")) return { key: "ready", orders };
  if (orders.some((o) => o.status === "ACCEPTED")) return { key: "preparing", orders };
  if (orders.some((o) => o.status === "NEW")) return { key: "sent", orders };
  const draft = getDraft(n);
  const queued = outboxEntries().some((e) => e.order.tableNumber === n);
  if (queued || (draft && (draft.items?.length || draft.correctionOf))) return { key: "pending", orders };
  return { key: "available", orders };
}

/* ------------------------------------------------------------------ */
/* Pantalla principal del modo mesero                                  */
/* ------------------------------------------------------------------ */

let root = null;
let view = null;
let ui = { category: null, search: "", openNote: null };
let sending = false;

export const WaiterScreen = {
  mount(el, params) {
    root = el;
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    route(params);
  },
  update(params) {
    if (!root) return;
    if (view === "tables") renderTables();
    else if (view === "orders") renderMyOrders();
    else if (view === "builder") {
      renderTableInfo();
      if (ui.catalogRef !== state.catalog) { ui.catalogRef = state.catalog; renderCats(); renderProducts(); }
    }
    else if (view === "select" ) renderSelect();
  },
  unmount() {
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("input", onInput);
    root = null;
    view = null;
  },
};

function route(params) {
  const waiter = getWaiter();
  const [a, b, c] = params;
  if (!waiter || a === "identificar") return mountSelect();
  if (a === "mesa" && b) return c === "resumen" ? mountSummary(Number(b)) : mountBuilder(Number(b));
  if (a === "pedidos") return mountMyOrders();
  if (a === "enviado" && b) return mountSent(b);
  return mountTables();
}

function waiterHeader(back) {
  const w = getWaiter();
  return appHeader({
    subtitle: `${state.settings.restaurantName} – Mesero`,
    back,
    right: w ? `<button class="chip-btn" data-action="change-waiter" aria-label="Cambiar mesero">👤 ${esc(w.name)}</button>` : "",
  }) + demoNotice();
}

function bottomNav(active) {
  const pend = state.activeOrders.filter((o) => o.waiterId === getWaiter()?.id).length + outboxEntries().length + getDrinks().length;
  return `<nav class="bottom-nav">
    <button class="${active === "tables" ? "on" : ""}" data-action="nav-tables"><span>🍽️</span>Mesas</button>
    <button class="${active === "orders" ? "on" : ""}" data-action="nav-orders"><span>🧾</span>Mis pedidos${pend ? `<i class="badge">${pend}</i>` : ""}</button>
    <button data-action="nav-home"><span>🏠</span>Inicio</button>
  </nav>`;
}

/** Reemplaza el HTML sólo si cambió (evita perder toques en curso). */
function setHtml(el, html) {
  if (el._html !== html) { el.innerHTML = html; el._html = html; }
}

/* ---------- 1. Identificación del mesero ---------- */

function mountSelect() {
  view = "select";
  root.innerHTML = `${waiterHeader("nav-home")}
  <main class="screen waiter-select">
    <h2 class="screen-title">¿Quién está tomando las órdenes?</h2>
    <p class="muted">Selecciona tu nombre. Cada pedido guardará quién lo tomó.</p>
    <div class="waiter-grid" id="waiter-grid"></div>
    <p class="muted small">Cambiar de mesero no modifica las órdenes ya tomadas. Los nombres se editan en Configuración.</p>
  </main>`;
  renderSelect();
}

function renderSelect() {
  const g = $("#waiter-grid", root);
  if (!g) return;
  const cur = getWaiter();
  const ws = activeWaiters();
  g.innerHTML = ws.length ? ws.map((w) => `
    <button class="waiter-btn ${cur?.id === w.id ? "on" : ""}" data-action="pick-waiter" data-id="${esc(w.id)}">
      <span class="avatar">${esc(w.name.trim().charAt(0).toUpperCase())}</span>
      <span>${esc(w.name)}</span>
    </button>`).join("") : `<p class="empty">No hay meseros configurados. Agrégalos en Configuración.</p>`;
}

/* ---------- 2. Mesas ---------- */

function mountTables() {
  view = "tables";
  root.innerHTML = `${waiterHeader("nav-home")}
  <main class="screen tables-screen">
    <div class="legend">${Object.values(TABLE_STATES).map((s) => `<span class="lg ${s.cls}"><i></i>${s.label}</span>`).join("")}</div>
    <div class="table-grid" id="table-grid"></div>
  </main>${bottomNav("tables")}`;
  renderTables();
}

function renderTables() {
  const g = $("#table-grid", root);
  if (!g) return;
  let html = "";
  const drinksByTable = {};
  for (const d of getDrinks()) drinksByTable[d.table] = (drinksByTable[d.table] || 0) + d.items.reduce((a, i) => a + i.quantity, 0);
  for (let n = 1; n <= state.settings.tableCount; n++) {
    const st = tableStatus(n);
    const s = TABLE_STATES[st.key];
    const count = st.orders.length;
    html += `<button class="table-card ${s.cls}" data-action="open-table" data-table="${n}" aria-label="Mesa ${n}: ${s.label}">
      <span class="t-label">MESA</span>
      <span class="t-num">${tableLabel(n)}</span>
      <span class="t-state">${s.label}</span>
      ${count > 1 ? `<span class="t-count">${count} órdenes</span>` : ""}
      ${drinksByTable[n] ? `<span class="t-drinks" title="Bebidas por servir">🥤 ${drinksByTable[n]}</span>` : ""}
    </button>`;
  }
  setHtml(g, html);
  const nav = $(".bottom-nav", root);
  if (nav && nav.outerHTML !== bottomNav("tables")) nav.outerHTML = bottomNav("tables");
}

/* ---------- 3. Crear orden ---------- */

function draftFor(table) {
  return getDraft(table) || { items: [], generalNotes: "", waiterId: getWaiter().id };
}

function mountBuilder(table) {
  view = "builder";
  ui.table = table;
  const cats = state.catalog.categories.filter((c) => c.active !== false);
  if (!ui.category || !cats.some((c) => c.id === ui.category)) ui.category = cats[0]?.id || null;
  ui.search = "";
  ui.catalogRef = state.catalog;
  const d = draftFor(table);
  root.innerHTML = `${waiterHeader("nav-tables")}
  <main class="screen builder">
    <div class="builder-top">
      <div class="table-banner">
        <div><span class="tb-label">MESA</span><span class="tb-num">${tableLabel(table)}</span></div>
        <div class="tb-waiter">Mesero<br><b>${esc(getWaiter().name)}</b></div>
      </div>
      ${d.correctionOf ? `<div class="correction-banner">✏️ CORRECCIÓN de la orden ${esc(d.correctionOf.orderNumber ? "#" + d.correctionOf.orderNumber : d.correctionOf.orderId)} — explica el cambio en la nota general</div>` : ""}
      <div id="table-info"></div>
      <div class="search-wrap">
        <input class="field search" type="search" placeholder="🔎 Buscar producto…" data-input="search" autocomplete="off">
      </div>
      <div class="cat-chips" id="cat-chips"></div>
    </div>
    <div class="product-list" id="product-list"></div>
  </main>
  <div class="order-bar" id="order-bar"></div>`;
  renderTableInfo();
  renderCats();
  renderProducts();
  renderOrderBar();
}

function renderTableInfo() {
  const el = $("#table-info", root);
  if (!el) return;
  const orders = state.activeOrders.filter((o) => o.tableNumber === ui.table);
  el.innerHTML = orders.length ? `<div class="table-active">Esta mesa tiene ${orders.length} orden(es) activa(s): ${orders.map((o) =>
    `<span class="mini-chip ${ORDER_STATUS[o.status]?.cls}">${esc(orderLabel(o))} · ${ORDER_STATUS[o.status]?.label}</span>`).join(" ")}</div>` : "";
}

function renderCats() {
  const el = $("#cat-chips", root);
  const cats = state.catalog.categories.filter((c) => c.active !== false);
  el.innerHTML = cats.map((c) => `<button class="cat-chip ${!ui.search && ui.category === c.id ? "on" : ""}" data-action="cat" data-id="${esc(c.id)}">
      <span>${esc(c.icon || "🍴")}</span>${esc(c.name)}</button>`).join("");
}

function qtyOf(draft, productId) {
  return draft.items.filter((i) => i.productId === productId).reduce((n, i) => n + i.quantity, 0);
}

function normalize(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function renderProducts() {
  const el = $("#product-list", root);
  if (!el) return;
  const d = draftFor(ui.table);
  const q = normalize(ui.search.trim());
  let prods = state.catalog.products.filter((p) => p.active !== false && categoryById(p.categoryId)?.active !== false);
  // Búsqueda por palabras: "taco res" encuentra "Taco Carne de Res".
  const words = q.split(/\s+/).filter((x) => x && !["de", "con", "al", "la", "el"].includes(x));
  prods = q ? prods.filter((p) => { const t = normalize(p.name + " " + (p.description || "")); return words.every((x) => t.includes(x)); })
    : prods.filter((p) => p.categoryId === ui.category);
  if (!prods.length) { el.innerHTML = `<p class="empty">No se encontraron productos.</p>`; return; }
  el.innerHTML = prods.map((p) => {
    const qty = qtyOf(d, p.id);
    const cat = categoryById(p.categoryId);
    return `<div class="product-card ${qty ? "has-qty" : ""}" data-pid="${esc(p.id)}">
      <button class="p-main" data-action="add" data-pid="${esc(p.id)}">
        <span class="p-name">${esc(p.name)}</span>
        ${p.description ? `<span class="p-desc">${esc(p.description)}</span>` : ""}
        <span class="p-meta"><span class="p-cat">${esc(cat?.icon || "")} ${esc(cat?.name || "")}</span>
        ${typeof p.referencePrice === "number" ? `<span class="p-price" title="Precio referencial">Ref. ${fmtRefPrice(p.referencePrice)}</span>` : ""}</span>
      </button>
      <div class="qty-ctl">
        ${qty ? `<button class="qbtn minus" data-action="dec" data-pid="${esc(p.id)}" aria-label="Quitar uno">−</button>
        <span class="qty" aria-label="Cantidad">${qty}</span>` : ""}
        <button class="qbtn plus" data-action="add" data-pid="${esc(p.id)}" aria-label="Agregar uno">+</button>
      </div>
    </div>`;
  }).join("");
}

function renderOrderBar() {
  const el = $("#order-bar", root);
  if (!el) return;
  const d = draftFor(ui.table);
  const count = d.items.reduce((n, i) => n + i.quantity, 0);
  el.innerHTML = `<button class="btn btn-primary btn-xl order-bar-btn" data-action="review" ${count || d.correctionOf ? "" : "disabled"}>
    <span>🧾 Revisar pedido</span><span class="ob-count">${count} artículo${count === 1 ? "" : "s"}</span></button>`;
}

function changeQty(productId, delta) {
  const d = draftFor(ui.table);
  const p = state.catalog.products.find((x) => x.id === productId);
  if (!p) return;
  if (delta > 0) {
    const line = d.items.find((i) => i.productId === productId);
    if (line) line.quantity += 1;
    else d.items.push({
      productId: p.id, productName: p.name, category: categoryById(p.categoryId)?.name || "",
      referencePrice: p.referencePrice ?? null, quantity: 1, notes: "",
    });
  } else {
    const lines = d.items.filter((i) => i.productId === productId);
    const last = lines[lines.length - 1];
    if (!last) return;
    last.quantity -= 1;
    if (last.quantity <= 0) d.items.splice(d.items.indexOf(last), 1);
  }
  d.waiterId = getWaiter().id;
  saveDraft(ui.table, d);
  renderProducts();
  renderOrderBar();
}

/* ---------- 4. Resumen y envío ---------- */

function mountSummary(table) {
  view = "summary";
  ui.table = table;
  const d = draftFor(table);
  if (!d.items.length && !d.correctionOf) { go(`mesero/mesa/${table}`, { replace: true }); return; }
  root.innerHTML = `${waiterHeader(`back-builder`)}
  <main class="screen summary">
    <div class="ticket">
      <div class="ticket-head">
        <div class="tk-table">MESA ${tableLabel(table)}</div>
        <div class="tk-waiter">MESERO: <b>${esc(getWaiter().name)}</b></div>
        ${d.correctionOf ? `<div class="correction-banner">✏️ CORRECCIÓN de la orden ${esc(d.correctionOf.orderNumber ? "#" + d.correctionOf.orderNumber : d.correctionOf.orderId)}</div>` : ""}
      </div>
      <div id="sum-lines"></div>
      <div class="general-note">
        <label for="gnote">NOTA GENERAL ${d.correctionOf ? "(obligatoria: describe la corrección)" : ""}</label>
        <div class="quick-notes">${QUICK_GENERAL.map((n) => `<button class="qn" data-action="qgen" data-note="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        <textarea id="gnote" class="field" rows="3" data-input="gnote" placeholder="Ej.: Una persona es alérgica al aguacate.">${esc(d.generalNotes || "")}</textarea>
      </div>
      <p class="no-money">Los precios son sólo referenciales. INSTAOrder no calcula totales ni cobra.</p>
    </div>
  </main>
  <div class="summary-actions">
    <button class="btn btn-ghost" data-action="back-builder">✏️ EDITAR PEDIDO</button>
    <button class="btn btn-danger-ghost" data-action="cancel-draft">CANCELAR</button>
    <button class="btn btn-primary btn-send" data-action="send">🚀 ENVIAR A COCINA</button>
  </div>`;
  renderLines();
}

function lineDesc(it) {
  return state.catalog.products.find((p) => p.id === it.productId)?.description || "";
}

function renderLines() {
  const el = $("#sum-lines", root);
  if (!el) return;
  const d = draftFor(ui.table);
  if (!d.items.length) { el.innerHTML = `<p class="empty">Sin productos${d.correctionOf ? " (corrección sólo con nota)" : ""}.</p>`; return; }
  const lineHtml = (it, i) => `
    <div class="line ${isDrink(it) ? "line-drink" : ""}">
      <div class="line-row">
        <div class="line-qty">${it.quantity} ×</div>
        <div class="line-name">${esc(it.productName)}
          ${lineDesc(it) ? `<div class="line-desc">${esc(lineDesc(it))}</div>` : ""}
          ${it.notes ? `<div class="line-note">📝 ${esc(it.notes)}</div>` : ""}</div>
        <div class="line-ctl">
          <button class="qbtn sm" data-action="ldec" data-i="${i}" aria-label="Quitar uno">−</button>
          <button class="qbtn sm" data-action="linc" data-i="${i}" aria-label="Agregar uno">+</button>
        </div>
      </div>
      <div class="line-tools">
        <button class="tool" data-action="lnote" data-i="${i}">📝 ${it.notes ? "Editar nota" : "Agregar nota"}</button>
        ${it.quantity > 1 ? `<button class="tool" data-action="lsplit" data-i="${i}" title="Separa 1 unidad para darle otra nota">✂️ Separar 1</button>` : ""}
        <button class="tool danger" data-action="ldel" data-i="${i}">🗑 Eliminar</button>
      </div>
      ${ui.openNote === i ? `<div class="note-editor">
        <div class="quick-notes">${QUICK_NOTES.map((n) => `<button class="qn" data-action="qnote" data-i="${i}" data-note="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        <input class="field" data-input="lnote" data-i="${i}" value="${esc(it.notes)}" placeholder="Nota para cocina…">
        <button class="btn btn-sm btn-primary" data-action="lnote-done">Listo</button>
      </div>` : ""}
    </div>`;
  const food = d.items.map((it, i) => [it, i]).filter(([it]) => !isDrink(it));
  const drinks = d.items.map((it, i) => [it, i]).filter(([it]) => isDrink(it));
  el.innerHTML =
    (food.length ? `<div class="group-head group-kitchen">🍳 VA A COCINA</div>` + food.map(([it, i]) => lineHtml(it, i)).join("") : "")
    + (drinks.length ? `<div class="group-head group-drinks">🥤 BEBIDAS — NO VAN A COCINA · las sirves tú</div>` + drinks.map(([it, i]) => lineHtml(it, i)).join("") : "");
}

function editLine(i, fn) {
  const d = draftFor(ui.table);
  if (!d.items[i]) return;
  fn(d, d.items[i]);
  saveDraft(ui.table, d);
  renderLines();
}

async function sendDraft(btn) {
  if (sending) return; // anti doble toque
  const table = ui.table;
  const d = draftFor(table);
  if (!d.items.length && !d.correctionOf) return toast("Agrega al menos un producto", "error");
  if (d.correctionOf && !d.generalNotes.trim()) return toast("Describe la corrección en la nota general", "error");
  sending = true;
  btn.disabled = true;
  try {
    const food = d.items.filter((i) => !isDrink(i));
    const drinks = d.items.filter((i) => isDrink(i));
    const nFood = food.reduce((n, i) => n + i.quantity, 0);
    const nDrinks = drinks.reduce((n, i) => n + i.quantity, 0);
    const toKitchen = food.length > 0 || !!d.correctionOf;
    const ok = await confirmDialog(
      toKitchen ? `¿Enviar a cocina la Mesa ${tableLabel(table)}?` : `Mesa ${tableLabel(table)}: sólo bebidas`,
      (toKitchen ? `🍳 ${nFood} artículo(s) a cocina` : "No se envía nada a cocina.")
        + (nDrinks ? `\n🥤 ${nDrinks} bebida(s) para ti (no van a cocina)` : "")
        + (d.generalNotes && toKitchen ? "\nCon nota general" : "") + (d.correctionOf ? "\nEs una CORRECCIÓN" : "")
        + (toKitchen ? "\n\nUna vez enviada, la orden no se puede modificar (sólo con una corrección)." : ""),
      toKitchen ? "Sí, ENVIAR" : "Guardar bebidas", "primary");
    if (!ok) return;
    const waiter = getWaiter();
    if (drinks.length) {
      addDrinks({
        table, waiterId: waiter.id, waiterName: waiter.name,
        items: drinks.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, notes: i.notes || "" })),
      });
    }
    ui.lastDrinks = drinks.length ? { table, items: drinks } : null;
    if (!toKitchen) {
      clearDraft(table);
      go(`mesero/enviado/bebidas`, { replace: true });
      return;
    }
    const order = dataService.buildOrder({
      tableNumber: table, waiter, items: food, generalNotes: d.generalNotes,
      deviceId: deviceId(), correctionOf: d.correctionOf || null,
    });
    // submitOrder guarda la orden en la bandeja de forma síncrona antes de
    // navegar, así la pantalla de resultado nunca la muestra como enviada
    // hasta que el servidor confirme.
    const pending = submitOrder(order);
    clearDraft(table);
    go(`mesero/enviado/${order.orderId}`, { replace: true });
    await pending;
  } finally {
    sending = false;
    if (btn.isConnected) btn.disabled = false;
  }
}

/* ---------- 5. Resultado del envío ---------- */

function mountSent(orderId) {
  view = "sent";
  ui.sentId = orderId;
  root.innerHTML = `${waiterHeader("nav-tables")}<main class="screen sent-screen" id="sent-box"></main>`;
  renderSent();
}

function renderSent() {
  const el = $("#sent-box", root);
  if (!el) return;
  const id = ui.sentId;
  const drinksHtml = ui.lastDrinks ? `<div class="sent-drinks">
      <h3>🥤 Bebidas para servir tú · Mesa ${tableLabel(ui.lastDrinks.table)}</h3>
      <p>${itemsText(ui.lastDrinks.items)}</p>
      <p class="muted small">No se enviaron a cocina. Quedan en "Mis pedidos" hasta que las marques como servidas.</p></div>` : "";
  if (id === "bebidas") {
    el.innerHTML = drinksHtml + `<button class="btn btn-primary btn-xl" data-action="nav-tables">🍽️ Volver a mesas</button>
      <button class="btn btn-ghost btn-lg" data-action="nav-orders">🧾 Ver mis pedidos</button>`;
    return;
  }
  const q = outboxEntries().find((e) => e.order.orderId === id);
  const live = state.activeOrders.find((o) => o.orderId === id);
  let html;
  if (q) {
    const failed = q.state === "FAILED";
    const sendingNow = q.state === "SENDING";
    html = `<div class="sent-card ${failed ? "bad" : "wait"}">
      <div class="sent-ico">${failed ? "⚠️" : sendingNow ? "⏳" : "📵"}</div>
      <h2>${failed ? "ERROR AL ENVIAR" : sendingNow ? "ENVIANDO…" : "NO ENVIADA — SIN CONEXIÓN"}</h2>
      <p>Mesa ${tableLabel(q.order.tableNumber)} · ${q.order.itemCount} artículo(s)</p>
      <p class="muted">${failed ? esc(q.error || "Reintenta.") : "La orden está guardada en este teléfono y se enviará automáticamente al recuperar la conexión. Cocina AÚN NO la ha recibido."}</p>
      ${failed ? `<button class="btn btn-primary btn-lg" data-action="retry">Reintentar</button>` : ""}
    </div>`;
  } else {
    const label = live ? orderLabel(live) : "";
    html = `<div class="sent-card ok">
      <div class="sent-ico">✅</div>
      <h2>ORDEN ENVIADA A COCINA</h2>
      <p class="sent-num">${esc(label)}</p>
      <p>Mesa ${live ? tableLabel(live.tableNumber) : ""} · confirmada por el servidor</p>
    </div>`;
  }
  el.innerHTML = html + drinksHtml + `<button class="btn btn-primary btn-xl" data-action="nav-tables">🍽️ Volver a mesas</button>
    <button class="btn btn-ghost btn-lg" data-action="nav-orders">🧾 Ver mis pedidos</button>`;
}

/* ---------- 6. Mis pedidos ---------- */

function mountMyOrders() {
  view = "orders";
  root.innerHTML = `${waiterHeader("nav-tables")}
  <main class="screen my-orders"><h2 class="screen-title">Mis pedidos activos</h2><div id="my-orders"></div></main>
  ${bottomNav("orders")}`;
  renderMyOrders();
}

function renderMyOrders() {
  const el = $("#my-orders", root);
  if (!el) return;
  const w = getWaiter();
  const queued = outboxEntries();
  const mine = state.activeOrders.filter((o) => o.waiterId === w.id).sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
  const drafts = Object.entries(getDrafts()).filter(([, d]) => d.items?.length || d.correctionOf);
  let html = "";
  const drinkList = getDrinks().slice().sort((a, b) => a.createdAt - b.createdAt);
  if (drinkList.length) html += `<h3 class="sec">🥤 Bebidas por servir (no van a cocina)</h3>` + drinkList.map((dr) => `
    <div class="mo-card st-drinks">
      <div class="mo-top"><b>MESA ${tableLabel(dr.table)}</b><span class="status-chip st-drinks">Por servir</span></div>
      <div class="mo-items">${itemsText(dr.items)}</div>
      <div class="mo-meta">Pedidas ${fmtTime(dr.createdAt)} · hace <span data-since="${dr.createdAt}"></span>${dr.waiterName ? ` · ${esc(dr.waiterName)}` : ""}</div>
      <button class="btn btn-sm btn-success" data-action="drinks-served" data-id="${esc(dr.id)}">✅ Servidas</button>
    </div>`).join("");
  if (queued.length) html += `<h3 class="sec">⏳ Sin enviar (este teléfono)</h3>` + queued.map((e) => `
    <div class="mo-card st-pending">
      <div class="mo-top"><b>MESA ${tableLabel(e.order.tableNumber)}</b><span class="status-chip st-pending">${e.state === "FAILED" ? "Error" : e.state === "SENDING" ? "Enviando…" : "NO ENVIADA"}</span></div>
      <div class="mo-items">${e.order.items.map((i) => `${i.quantity}× ${esc(i.productName)}`).join(" · ") || "(sólo nota)"}</div>
      <button class="btn btn-sm btn-primary" data-action="retry">Reintentar envío</button>
    </div>`).join("");
  if (drafts.length) html += `<h3 class="sec">📝 Borradores</h3>` + drafts.map(([t, d]) => `
    <div class="mo-card st-pending" data-action="open-table" data-table="${t}">
      <div class="mo-top"><b>MESA ${tableLabel(t)}</b><span class="status-chip st-pending">Pendiente de enviar</span></div>
      <div class="mo-items">${d.items.map((i) => `${i.quantity}× ${esc(i.productName)}`).join(" · ") || "(corrección)"}</div>
    </div>`).join("");
  html += `<h3 class="sec">🍳 En cocina / listas</h3>`;
  html += mine.length ? mine.map((o) => {
    const s = ORDER_STATUS[o.status] || {};
    return `<div class="mo-card ${s.cls}">
      <div class="mo-top"><b>MESA ${tableLabel(o.tableNumber)}</b> <span class="mo-id">${esc(orderLabel(o))}</span>
        <span class="status-chip ${s.cls}">${s.label}</span></div>
      ${o.type === "CORRECTION" ? `<div class="mini-chip st-pending">Corrección de #${esc(o.correctionOf?.orderNumber || "")}</div>` : ""}
      <div class="mo-items">${o.items.map((i) => `${i.quantity}× ${esc(i.productName)}${i.notes ? ` <em>(${esc(i.notes)})</em>` : ""}`).join(" · ") || "(sólo nota)"}</div>
      <div class="mo-meta">Enviada ${fmtTime(o.sentAt)} · hace <span data-since="${o.sentAt || ""}"></span></div>
      ${o.status !== "COMPLETED" ? `<button class="btn btn-sm btn-ghost" data-action="correct" data-id="${esc(o.orderId)}">✏️ Enviar corrección</button>` : ""}
    </div>`;
  }).join("") : `<p class="empty">No tienes órdenes activas.</p>`;
  setHtml(el, html);
  const nav = $(".bottom-nav", root);
  if (nav && nav.outerHTML !== bottomNav("orders")) nav.outerHTML = bottomNav("orders");
}

async function startCorrection(orderId) {
  const o = state.activeOrders.find((x) => x.orderId === orderId);
  if (!o) return;
  const ok = await confirmDialog(`Corrección de ${orderLabel(o)}`,
    `Se creará una ORDEN DE CORRECCIÓN para la Mesa ${tableLabel(o.tableNumber)}.\nLa orden original NO se modifica: cocina verá ambas.\nPuedes agregar productos y debes explicar el cambio en la nota general (ej.: "Quitar 1 taco de pastor").`,
    "Crear corrección");
  if (!ok) return;
  const existing = getDraft(o.tableNumber);
  if (existing?.items?.length && !(await confirmDialog("Hay un borrador en esta mesa", "Se reemplazará el borrador actual de esta mesa por la corrección.", "Reemplazar", "danger"))) return;
  saveDraft(o.tableNumber, {
    items: [], generalNotes: "", waiterId: getWaiter().id,
    correctionOf: { orderId: o.orderId, orderNumber: o.orderNumber || null },
  });
  go(`mesero/mesa/${o.tableNumber}`);
}

/* ---------- Eventos ---------- */

async function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  switch (a) {
    case "nav-home": go("inicio"); break;
    case "nav-tables": go("mesero"); break;
    case "nav-orders": go("mesero/pedidos"); break;
    case "change-waiter": go("mesero/identificar"); break;
    case "pick-waiter": {
      const w = activeWaiters().find((x) => x.id === b.dataset.id);
      if (!w) return;
      const prev = getWaiter();
      setWaiter({ id: w.id, name: w.name });
      toast(prev && prev.id !== w.id ? `Mesero cambiado a ${w.name}. Las órdenes anteriores conservan su mesero.` : `Hola, ${w.name}`, "success", 3200);
      go("mesero", { replace: true });
      break;
    }
    case "open-table": go(`mesero/mesa/${b.dataset.table}`); break;
    case "cat": ui.category = b.dataset.id; ui.search = ""; const s = $("[data-input=search]", root); if (s) s.value = ""; renderCats(); renderProducts(); $("#product-list", root)?.scrollTo?.(0, 0); break;
    case "add": changeQty(b.dataset.pid, +1); break;
    case "dec": changeQty(b.dataset.pid, -1); break;
    case "review": go(`mesero/mesa/${ui.table}/resumen`); break;
    case "back-builder": go(`mesero/mesa/${ui.table}`, { replace: true }); break;
    case "linc": editLine(+b.dataset.i, (d, it) => { it.quantity++; }); break;
    case "ldec": editLine(+b.dataset.i, (d, it) => { it.quantity--; if (it.quantity <= 0) d.items.splice(+b.dataset.i, 1); }); ui.openNote = null; break;
    case "ldel": {
      const d = draftFor(ui.table);
      const it = d.items[+b.dataset.i];
      if (it && await confirmDialog("Eliminar producto", `¿Quitar ${it.quantity} × ${it.productName} del pedido?`, "Eliminar", "danger")) {
        ui.openNote = null;
        editLine(+b.dataset.i, (dd) => dd.items.splice(+b.dataset.i, 1));
      }
      break;
    }
    case "lsplit": editLine(+b.dataset.i, (d, it) => { it.quantity--; d.items.splice(+b.dataset.i + 1, 0, { ...it, quantity: 1, notes: "" }); }); ui.openNote = +b.dataset.i + 1; renderLines(); break;
    case "lnote": ui.openNote = ui.openNote === +b.dataset.i ? null : +b.dataset.i; renderLines(); $(`[data-input=lnote]`, root)?.focus(); break;
    case "lnote-done": ui.openNote = null; renderLines(); break;
    case "qnote": editLine(+b.dataset.i, (d, it) => { it.notes = it.notes ? `${it.notes}, ${b.dataset.note}` : b.dataset.note; }); break;
    case "qgen": {
      const ta = $("#gnote", root);
      ta.value = ta.value ? `${ta.value.trim()} ${b.dataset.note}` : b.dataset.note;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.focus();
      break;
    }
    case "cancel-draft":
      if (await confirmDialog("Cancelar pedido", "Se descartará este pedido (no se ha enviado a cocina).", "Descartar pedido", "danger")) {
        clearDraft(ui.table); toast("Pedido descartado"); go("mesero", { replace: true });
      }
      break;
    case "send": sendDraft(b); break;
    case "retry": processOutbox(); break;
    case "correct": startCorrection(b.dataset.id); break;
    case "drinks-served": removeDrinks(b.dataset.id); toast("Bebidas marcadas como servidas", "success"); renderMyOrders(); break;
  }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.input === "search") { ui.search = t.value; renderCats(); renderProducts(); }
  else if (t.dataset.input === "gnote") { const d = draftFor(ui.table); d.generalNotes = t.value; saveDraft(ui.table, d); }
  else if (t.dataset.input === "lnote") {
    const d = draftFor(ui.table);
    const it = d.items[+t.dataset.i];
    if (it) { it.notes = t.value; saveDraft(ui.table, d); }
  }
}

/* Refresca pantalla de resultado cuando cambia la bandeja de salida. */
subscribe(() => { if (root && view === "sent") renderSent(); });

/* ------------------------------------------------------------------ */
/* Alertas "LISTO PARA SERVIR" (capa global del modo mesero)           */
/* ------------------------------------------------------------------ */

const seenReady = new Set();
let repeatTimer = null;
let lastSound = 0;

function alertsEnabledHere() {
  const r = currentRoute()?.name;
  if (!getWaiter()) return false;
  // Siempre en pantallas del modo mesero; en inicio/configuración sólo si
  // este dispositivo se usa como teléfono de mesero.
  return r === "mesero" || ((r === "inicio" || r === "config") && getLastMode() === "mesero");
}

function pendingReady() {
  const w = getWaiter();
  if (!w) return [];
  return state.activeOrders.filter((o) => o.status === "COMPLETED" && o.waiterId === w.id
    && o.waiterNotification?.status !== "ACKNOWLEDGED");
}

function renderAlerts() {
  let layer = $("#ready-alerts");
  const list = alertsEnabledHere() ? pendingReady() : [];
  if (!list.length) { layer?.remove(); stopRepeat(); return; }
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "ready-alerts";
    layer.setAttribute("role", "alertdialog");
    layer.setAttribute("aria-label", "Pedidos listos para servir");
    document.body.appendChild(layer);
    layer.addEventListener("click", onAlertClick);
  }
  const blink = getPrefs().blinkStyle;
  layer.dataset.blink = blink;
  const html = `<div class="ra-inner">
    <div class="ra-head">${list.length > 1 ? `${list.length} PEDIDOS LISTOS` : "PEDIDO LISTO"}</div>
    ${list.map((o) => `<div class="ra-card" data-id="${esc(o.orderId)}">
      <div class="ra-table">🟢 MESA ${tableLabel(o.tableNumber)}</div>
      <div class="ra-msg">¡PEDIDO LISTO PARA SERVIR!</div>
      <div class="ra-order">ORDEN ${esc(orderLabel(o))} · ${o.itemCount || o.items.length} artículo(s)</div>
      <button class="btn btn-xl ra-btn" data-ack="${esc(o.orderId)}">ACEPTAR</button>
    </div>`).join("")}
  </div>`;
  // Re-render sólo si cambió la lista (no reinicia la animación).
  const sig = list.map((o) => o.orderId).join(",");
  if (layer.dataset.sig !== sig) { layer.innerHTML = html; layer.dataset.sig = sig; }

  // Nuevas alertas: sonido + vibración + registro de "entregada".
  let fresh = false;
  for (const o of list) {
    if (!seenReady.has(o.orderId)) {
      seenReady.add(o.orderId);
      fresh = true;
      if (o.waiterNotification?.status === "PENDING") dataService.markNotificationDelivered(o, getWaiter()).catch(() => {});
      systemNotify(o);
    }
  }
  if (fresh) { playAlert("ready"); vibrate(); lastSound = Date.now(); }
  startRepeat();
}

function startRepeat() {
  if (repeatTimer) return;
  repeatTimer = setInterval(() => {
    const secs = getPrefs().repeatSeconds;
    if (!secs || !pendingReady().length || !alertsEnabledHere()) return;
    if (Date.now() - lastSound >= secs * 1000) { playAlert("ready"); vibrate([200]); lastSound = Date.now(); }
  }, 1000);
}
function stopRepeat() { clearInterval(repeatTimer); repeatTimer = null; }

async function onAlertClick(e) {
  const b = e.target.closest("[data-ack]");
  if (!b) return;
  const o = state.activeOrders.find((x) => x.orderId === b.dataset.ack);
  if (!o) return;
  b.disabled = true;
  b.textContent = "Guardando…";
  try {
    await dataService.acknowledgeNotification(o, getWaiter());
    toast(`Mesa ${tableLabel(o.tableNumber)}: alerta aceptada`, "success");
  } catch (err) {
    b.disabled = false;
    b.textContent = "ACEPTAR";
    toast("Sin conexión: no se pudo registrar. Intenta de nuevo.", "error", 4000);
  }
}

/** Notificación del sistema si la app está en segundo plano (si hay permiso). */
function systemNotify(o) {
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  navigator.serviceWorker?.ready.then((reg) => reg.showNotification(`MESA ${tableLabel(o.tableNumber)} – LISTO PARA SERVIR`, {
    body: `Orden ${orderLabel(o)}`, tag: o.orderId, icon: "assets/icons/icon-192.png", renotify: true, requireInteraction: true,
  })).catch(() => {});
}

export function startWaiterAlerts() {
  subscribe(renderAlerts);
  window.addEventListener("hashchange", renderAlerts);
  renderAlerts();
}
