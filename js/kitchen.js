/**
 * INSTAOrder — MODO COCINA (tablet) e HISTORIAL
 * =============================================
 *  #/cocina     Kitchen Display System: columnas NUEVAS | EN PREPARACIÓN
 *  #/historial  Órdenes completadas (sólo lectura)
 *
 * Las tarjetas nuevas parpadean hasta que cocina presiona "ACEPTAR ORDEN".
 * Al completar, la orden sale del panel, queda en el historial y se avisa
 * al mesero que la tomó.
 */

import { dataService, dayKeyOf } from "../firebase-service.js";
import { state, activeCooks, allWaiters, can } from "./state.js";
import { go } from "./router.js";
import { appHeader, demoNotice } from "./components.js";
import { getCook, setCook, getPrefs } from "./store.js";
import { playAlert, audioReady, unlockAudio, keepScreenOn } from "./sound.js";
import {
  $, esc, toast, dialog, confirmDialog, tableLabel, fmtTime, fmtDateTime, fmtDuration, orderLabel,
  isExternal, orderTitle, PLATFORM_LABELS,
} from "./ui.js";

const expanded = new Set();     // tarjetas con detalle abierto
const collapsed = new Set();    // aceptadas que el cocinero contrajo
const seenNew = new Set();
let root = null;
let repeatTimer = null;
let lastSound = 0;
let unsub = null;

const cookBy = () => getCook() || { id: "", name: "Cocina" };

/* ------------------------------------------------------------------ */
/* Tarjeta de orden                                                    */
/* ------------------------------------------------------------------ */

function isDrinkItem(it) {
  const p = state.catalog.products.find((x) => x.id === it.productId);
  const c = p && state.catalog.categories.find((k) => k.id === p.categoryId);
  return c?.station === "waiter";
}

/** Contenido de promociones/combos: se toma del catálogo por productId. */
function productDesc(it) {
  return it.description || state.catalog.products.find((p) => p.id === it.productId)?.description || "";
}

function itemsHtml(o, interactive) {
  return `<ul class="k-items">${o.items.map((it, i) => `
    <li class="k-item ${interactive && it.prepared ? "done" : ""}">
      ${interactive ? `<button class="k-check" data-action="prep" data-id="${esc(o.orderId)}" data-i="${i}"
        aria-label="Marcar preparado" aria-pressed="${it.prepared ? "true" : "false"}">${it.prepared ? "✓" : ""}</button>` : ""}
      <div class="k-item-body">
        <div class="k-item-name"><b>${it.quantity} ×</b> ${esc(it.productName.toUpperCase())}${isDrinkItem(it) ? ' <span class="k-drink">🥤 bebida</span>' : ""}</div>
        ${productDesc(it) ? `<div class="k-desc">${esc(productDesc(it))}</div>` : ""}
        ${it.notes ? `<div class="k-note">➤ ${esc(it.notes)}</div>` : ""}
      </div>
    </li>`).join("")}</ul>
    ${o.generalNotes ? `<div class="k-general"><span>NOTA GENERAL</span>${esc(o.generalNotes).replace(/\n/g, "<br>")}</div>` : ""}`;
}

function cardHtml(o) {
  const isNew = o.status === "NEW";
  const open = isNew ? expanded.has(o.orderId) : !collapsed.has(o.orderId);
  const hasNotes = !!o.generalNotes || o.items.some((i) => i.notes);
  const allergy = /alerg/i.test(o.generalNotes || "") || o.items.some((i) => /alerg/i.test(i.notes || ""));
  const ext = isExternal(o);
  const wa = o.sourcePlatform === "WHATSAPP";
  return `<article class="k-card ${wa ? "k-wa" : ""} ${isNew ? "k-new" : "k-accepted"} ${o.type === "CORRECTION" ? "k-correction" : ""} ${ext ? "k-ext" : ""}" data-age="ok" data-key="${esc(o.orderId)}">
    <div class="k-head">
      ${ext
        ? `<div class="k-table k-ext-box"><small>${esc(PLATFORM_LABELS[o.sourcePlatform] || o.sourcePlatform)}</small>#${esc(o.platformOrderNumber)}</div>`
        : `<div class="k-table"><small>MESA</small>${tableLabel(o.tableNumber)}</div>`}
      <div class="k-info">
        <div class="k-num">${ext ? `${wa ? "💬" : "🛵"} ${esc(o.customerName || "Cliente")}` : `ORDEN ${esc(orderLabel(o))}`}</div>
        <div class="k-meta">🕒 ${fmtTime(o.sentAt)} · <b class="k-elapsed" data-since="${o.sentAt || ""}"></b></div>
        <div class="k-meta">👤 ${esc(o.waiterName)} · <b>${o.itemCount ?? o.items.length} artículo(s)</b></div>
      </div>
      ${isNew ? `<span class="k-badge new">NUEVA</span>` : `<span class="k-badge acc">EN PREPARACIÓN</span>`}
    </div>
    ${ext ? `<div class="k-target" data-urgency="ok">
        <span>${o.preparationMinutes ? `<b>${o.preparationMinutes} MIN</b> DE PREPARACIÓN` : "SIN TIEMPO ASIGNADO"}</span>
        ${o.targetReadyAt ? `<span>OBJETIVO <b>${fmtTime(o.targetReadyAt)}</b>${o.targetManual ? " (manual)" : ""}</span>
        <b class="k-remaining" data-until="${o.targetReadyAt}"></b>` : ""}
      </div>` : ""}
    ${o.type === "CORRECTION" ? `<div class="k-corr">✏️ CORRECCIÓN DE LA ORDEN #${esc(o.correctionOf?.orderNumber || o.correctionOf?.orderId || "")}</div>` : ""}
    ${hasNotes && !open ? `<div class="k-flag ${allergy ? "allergy" : ""}">${allergy ? "⚠️ ALERGIA / PRECAUCIÓN" : "📝 Tiene notas"}</div>` : ""}
    ${open ? `<div class="k-detail">${itemsHtml(o, !isNew)}</div>` : ""}
    ${!isNew && o.acceptedBy ? `<div class="k-accepted-by">Aceptada ${fmtTime(o.acceptedAt)} por ${esc(o.acceptedBy.name || "Cocina")}</div>` : ""}
    <div class="k-actions">
      <button class="btn btn-ghost" data-action="toggle" data-id="${esc(o.orderId)}">${open ? "▲ OCULTAR" : "▼ VER PEDIDO"}</button>
      ${isNew
        ? `<button class="btn btn-yellow k-accept" data-action="accept" data-id="${esc(o.orderId)}">✔ ACEPTAR ORDEN</button>`
        : `<button class="btn btn-success" data-action="complete" data-id="${esc(o.orderId)}">✅ MARCAR ORDEN COMPLETADA</button>`}
    </div>
  </article>`;
}

/** Reconciliación por clave: sólo reemplaza tarjetas que cambiaron (no reinicia el parpadeo de las demás). */
function reconcile(container, orders) {
  const existing = new Map([...container.children].filter((c) => c.dataset.key).map((c) => [c.dataset.key, c]));
  let prev = null;
  for (const o of orders) {
    const html = cardHtml(o);
    let el = existing.get(o.orderId);
    if (!el || el._html !== html) {
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      const fresh = tpl.content.firstElementChild;
      fresh._html = html;
      if (el) el.replaceWith(fresh);
      el = fresh;
    }
    existing.delete(o.orderId);
    const ref = prev ? prev.nextSibling : container.firstChild;
    if (el !== ref) container.insertBefore(el, ref);
    prev = el;
  }
  existing.forEach((el) => el.remove());
  const empty = container.parentElement.querySelector(".k-empty");
  if (empty) empty.hidden = orders.length > 0;
}

/* ------------------------------------------------------------------ */
/* Pantalla de cocina                                                  */
/* ------------------------------------------------------------------ */

export const KitchenScreen = {
  mount(el) {
    if (!can("kitchen")) { toast("Tu usuario no tiene el rol de Cocina", "error"); go("inicio", { replace: true }); return; }
    root = el;
    const cook = getCook();
    const fixedCook = state.usersMode && state.me && !state.me.shared;
    root.innerHTML = `${appHeader({
      subtitle: `${state.settings.restaurantName.toUpperCase()} – COCINA`,
      variant: "kitchen",
      center: `<div class="k-clock" data-clock="time"></div>`,
      right: `<div class="k-counters">
          <span class="kc kc-new"><b id="cnt-new">0</b> nuevas</span>
          <span class="kc kc-acc"><b id="cnt-acc">0</b> en preparación</span>
        </div>
        <button class="chip-btn" data-action="${fixedCook ? "account" : "cook"}">👨‍🍳 ${esc(cook?.name || "Identificarse")}</button>
        <button class="chip-btn" data-action="ingredients" id="k-ing-btn">🥫 Ingredientes</button>
        <button class="chip-btn" data-action="history">📚 Historial</button>
`,
    })}${demoNotice()}
    <div class="audio-strip" id="audio-strip" hidden><button data-action="unlock">🔈 Toca aquí para activar el sonido de alertas</button></div>
    <main class="kds" data-blink="${esc(getPrefs().blinkStyle)}">
      <section class="kds-col col-new">
        <h2 class="kds-title"><span class="dot dot-new"></span>NUEVAS</h2>
        <div class="kds-cards" id="col-new"></div>
        <p class="k-empty">Sin órdenes nuevas</p>
      </section>
      <section class="kds-col col-acc">
        <h2 class="kds-title"><span class="dot dot-acc"></span>ACEPTADAS / EN PREPARACIÓN</h2>
        <div class="kds-cards" id="col-acc"></div>
        <p class="k-empty">Sin órdenes en preparación</p>
      </section>
    </main>`;
    root.addEventListener("click", onClick);
    if (getPrefs().keepScreenOn) keepScreenOn(true);
    document.addEventListener("visibilitychange", onVisible);
    repeatTimer = setInterval(repeatTick, 1000);
    this.update();
  },

  update() {
    if (!root) return;
    const kitchenOrders = state.activeOrders.filter((o) => o.status === "NEW" || o.status === "ACCEPTED");
    const news = kitchenOrders.filter((o) => o.status === "NEW");
    // En preparación: primero lo que vence antes (hora objetivo de externos; aceptación para mesas).
    const acc = kitchenOrders.filter((o) => o.status === "ACCEPTED")
      .sort((a, b) => (a.targetReadyAt || a.acceptedAt || 0) - (b.targetReadyAt || b.acceptedAt || 0));
    reconcile($("#col-new", root), news);
    reconcile($("#col-acc", root), acc);
    $("#cnt-new", root).textContent = news.length;
    const outIng = Object.values(state.ingredients || {}).filter((i) => i.available === false && i.deleted !== true);
    const ib = $("#k-ing-btn", root);
    if (ib) { ib.textContent = outIng.length ? `🔴 ${outIng.length} agotado(s)` : "🥫 Ingredientes"; ib.classList.toggle("chip-alert", outIng.length > 0); }
    $("#cnt-acc", root).textContent = acc.length;
    document.title = news.length ? `(${news.length}) NUEVAS · INSTAOrder Cocina` : "INSTAOrder · Cocina";
    $("#audio-strip", root).hidden = !getPrefs().soundEnabled || audioReady();

    // Sonido para órdenes que acaban de llegar.
    let fresh = false;
    for (const o of news) if (!seenNew.has(o.orderId)) { seenNew.add(o.orderId); fresh = true; }
    if (fresh && state.ordersLoaded) { playAlert("new"); lastSound = Date.now(); }
  },

  unmount() {
    root?.removeEventListener("click", onClick);
    document.removeEventListener("visibilitychange", onVisible);
    clearInterval(repeatTimer);
    keepScreenOn(false);
    document.title = "INSTAOrder";
    root = null;
  },
};

function onVisible() { if (!document.hidden && getPrefs().keepScreenOn) keepScreenOn(true); }

function repeatTick() {
  const secs = getPrefs().repeatSeconds;
  const anyNew = state.activeOrders.some((o) => o.status === "NEW");
  if (root) $("#audio-strip", root).hidden = !getPrefs().soundEnabled || audioReady();
  if (!secs || !anyNew) return;
  if (Date.now() - lastSound >= secs * 1000) { playAlert("new"); lastSound = Date.now(); }
}

async function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const id = b.dataset.id;
  const o = id ? state.activeOrders.find((x) => x.orderId === id) : null;
  switch (b.dataset.action) {
    case "home": go("inicio"); break;
    case "account": go("config/cuenta"); break;
    case "history": go("historial"); break;
    case "ingredients": go("ingredientes"); break;
    case "unlock": unlockAudio(); setTimeout(() => KitchenScreen.update(), 200); toast("Sonido activado", "success"); break;
    case "cook": chooseCook(); break;
    case "toggle":
      if (!o) return;
      if (o.status === "NEW") expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      else collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      KitchenScreen.update();
      break;
    case "accept":
      if (!o) return;
      b.disabled = true;
      try {
        await dataService.acceptOrder(o, cookBy());
        expanded.delete(id);
        toast(`${orderTitle(o)} aceptada`, "success");
      } catch { b.disabled = false; toast("Sin conexión: no se pudo aceptar.", "error"); }
      break;
    case "prep": {
      if (!o) return;
      const i = Number(b.dataset.i);
      try { await dataService.setItemPrepared(o, i, !o.items[i]?.prepared, cookBy()); }
      catch { toast("Sin conexión.", "error"); }
      break;
    }
    case "complete": {
      if (!o) return;
      const ok = await confirmDialog(`¿${isExternal(o) ? orderTitle(o) : "Orden " + orderLabel(o)} completada?`,
        isExternal(o)
          ? `${orderTitle(o)} · ${o.customerName || ""}\nSe avisará a los meseros que el pedido está LISTO PARA DESPACHAR y la orden pasará al historial.`
          : `Mesa ${tableLabel(o.tableNumber)} · Mesero: ${o.waiterName}\nSe avisará al mesero que el pedido está LISTO PARA SERVIR y la orden pasará al historial.`,
        "Sí, COMPLETADA", "success");
      if (!ok) return;
      b.disabled = true;
      try {
        await dataService.completeOrder(o, cookBy());
        collapsed.delete(id);
        toast(`${orderTitle(o)} completada · mesero notificado`, "success");
      } catch { b.disabled = false; toast("Sin conexión: no se pudo completar.", "error"); }
      break;
    }
  }
}

async function chooseCook() {
  const cooks = activeCooks();
  const body = `<div class="pick-list">${cooks.map((c) => `<button class="waiter-btn" data-cook="${esc(c.id)}"><span class="avatar">${esc(c.name.charAt(0))}</span>${esc(c.name)}</button>`).join("")}
    <button class="waiter-btn" data-cook=""><span class="avatar">·</span>Sin identificar</button></div>`;
  const wrapPromise = dialog({ title: "¿Quién está en cocina?", body, html: true, confirmText: "Cerrar", cancelText: "" });
  document.querySelector(".modal .pick-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cook]");
    if (!btn) return;
    const c = cooks.find((x) => x.id === btn.dataset.cook);
    setCook(c ? { id: c.id, name: c.name } : null);
    toast(c ? `En cocina: ${c.name}` : "Cocina sin identificar");
    document.querySelector(".modal [data-r='1']")?.click();
    go("cocina", { replace: true });
  });
  await wrapPromise;
}

/* ------------------------------------------------------------------ */
/* HISTORIAL (sólo lectura, para todo el personal)                     */
/* ------------------------------------------------------------------ */
/* Las órdenes NUNCA se borran: aceptar la alerta del mesero sólo apaga
 * la alerta. El historial lee de Firebase por día, así que es el mismo
 * en todos los dispositivos autorizados. */

let hroot = null;
let hstate = { day: dayKeyOf(), q: "", waiter: "", type: "", status: "DONE", orders: [], loading: false, open: new Set() };

export const HistoryScreen = {
  mount(el, params) {
    hroot = el;
    if (params?.[0] === "externos") hstate.type = "THIRD_PARTY";
    if (params?.[0] === "whatsapp") hstate.type = "WHATSAPP";
    hstate.day = hstate.day || dayKeyOf();
    hroot.innerHTML = `${appHeader({ subtitle: "Historial de órdenes", back: "h-back" })}${demoNotice()}
    <main class="screen history">
      <div class="h-filters">
        <label>Fecha<input class="field" type="date" data-f="day" value="${esc(hstate.day)}"></label>
        <label class="h-q">Buscar<input class="field" type="search" data-f="q" placeholder="Mesa, # orden, cliente, producto, mesero…" value="${esc(hstate.q)}"></label>
        <label>Tipo<select class="field" data-f="type">
          <option value="" ${hstate.type === "" ? "selected" : ""}>Todas</option>
          <option value="DINE_IN" ${hstate.type === "DINE_IN" ? "selected" : ""}>🍽️ Mesa (internos)</option>
          <option value="THIRD_PARTY" ${hstate.type === "THIRD_PARTY" ? "selected" : ""}>🛵💬 Todos los externos</option>
          <option value="PEDIDOS_YA" ${hstate.type === "PEDIDOS_YA" ? "selected" : ""}>🛵 PedidosYa</option>
          <option value="WHATSAPP" ${hstate.type === "WHATSAPP" ? "selected" : ""}>💬 WhatsApp</option></select></label>
        <label>Mesero<select class="field" data-f="waiter"><option value="">Todos</option>
          ${allWaiters().map((w) => `<option value="${esc(w.id)}" ${hstate.waiter === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></label>
        <label>Estado<select class="field" data-f="status">
          <option value="DONE" ${hstate.status === "DONE" ? "selected" : ""}>Completadas</option>
          <option value="CLOSED" ${hstate.status === "CLOSED" ? "selected" : ""}>Servidas / despachadas</option>
          <option value="" ${hstate.status === "" ? "selected" : ""}>Todas (incluye en curso)</option></select></label>
        <button class="btn btn-primary" data-action="h-reload">↻ Actualizar</button>
      </div>
      <p class="muted small">Sólo lectura. Las órdenes nunca se borran y todos los dispositivos ven el mismo historial.</p>
      <div id="h-summary" class="h-summary"></div>
      <div id="h-list"></div>
    </main>`;
    hroot.addEventListener("click", onHistClick);
    hroot.addEventListener("input", onHistInput);
    load();
  },
  update() {},
  unmount() {
    hroot?.removeEventListener("click", onHistClick);
    hroot?.removeEventListener("input", onHistInput);
    hroot = null;
  },
};

async function load() {
  hstate.loading = true;
  renderHist();
  try {
    let orders = await dataService.getOrdersByDay(hstate.day);
    const idq = hstate.q.trim().toUpperCase();
    if (/^ORD-/.test(idq) && !orders.some((o) => o.orderId === idq)) {
      const one = await dataService.getOrder(idq);
      if (one) orders = [one];
    }
    hstate.orders = orders;
  } catch (e) {
    hstate.orders = [];
    toast("No se pudo cargar el historial (¿sin conexión?)", "error");
  }
  hstate.loading = false;
  renderHist();
}

const typeOf = (o) => (isExternal(o) ? "THIRD_PARTY" : "DINE_IN");

function haystack(o) {
  return norm([
    isExternal(o) ? `#${o.platformOrderNumber} ${o.platformOrderNumber} ${PLATFORM_LABELS[o.sourcePlatform] || ""} ${o.sourcePlatform === "WHATSAPP" ? "whatsapp" : "pedidosya"} ${o.customerName || ""} ${o.customerPhone || ""}`
      : `mesa ${o.tableNumber} mesa ${tableLabel(o.tableNumber)}`,
    o.orderNumber ? `#${o.orderNumber} ${o.orderNumber}` : "", o.orderId, o.waiterName,
    o.items.map((i) => i.productName).join(" "), o.generalNotes || "",
  ].join(" "));
}
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function filtered() {
  const q = norm(hstate.q.trim());
  const mesa = q.match(/^mesa\s*(\d+)$/);   // "mesa 3" → exactamente la mesa 3
  const num = q.match(/^#?\s*(\d+)$/);       // "148" / "#1002" → número de orden exacto
  const words = mesa || num ? [] : q.replace(/^#/, "").split(/\s+/).filter(Boolean);
  return hstate.orders.filter((o) => {
    if (hstate.status === "DONE" && o.status !== "COMPLETED") return false;
    if (hstate.status === "CLOSED" && !(o.status === "COMPLETED" && o.waiterNotification?.status === "ACKNOWLEDGED")) return false;
    if (hstate.type === "DINE_IN" || hstate.type === "THIRD_PARTY") { if (typeOf(o) !== hstate.type) return false; }
    else if (hstate.type && o.sourcePlatform !== hstate.type) return false;
    if (hstate.waiter && o.waiterId !== hstate.waiter) return false;
    if (mesa && (isExternal(o) || o.tableNumber !== Number(mesa[1]))) return false;
    if (num && !(String(o.platformOrderNumber || "") === num[1] || String(o.orderNumber || "") === num[1] || (!isExternal(o) && String(o.tableNumber) === num[1]))) return false;
    if (words.length) { const h = haystack(o); if (!words.every((w) => h.includes(w))) return false; }
    return true;
  }).sort((a, b) => (b.completedAt || b.sentAt || 0) - (a.completedAt || a.sentAt || 0));
}

const STATUS_TXT = { NEW: "Nueva", ACCEPTED: "En preparación", COMPLETED: "Completada" };
const NOTIF_TXT = { NONE: "—", PENDING: "Pendiente", DELIVERED: "Recibida por mesero", ACKNOWLEDGED: "Aceptada por mesero" };
const EVENT_TXT = {
  ORDER_CREATED: "Orden creada", ORDER_SENT: "Enviada a cocina", ORDER_ACCEPTED: "Aceptada por cocina",
  ITEM_PREPARED: "Producto preparado", ITEM_UNPREPARED: "Producto desmarcado", ORDER_COMPLETED: "Completada",
  NOTIFICATION_DELIVERED: "Alerta recibida por mesero", NOTIFICATION_ACKNOWLEDGED: "Alerta aceptada por mesero",
  DISPATCHED: "Despachada al motorizado", DUPLICATE_CONFIRMED: "Registrada como duplicado confirmado",
};

function finalLabel(o) {
  if (o.status !== "COMPLETED") return STATUS_TXT[o.status] || o.status;
  const acked = o.waiterNotification?.status === "ACKNOWLEDGED";
  if (isExternal(o)) return acked ? "COMPLETADA — DESPACHADA" : "COMPLETADA — POR DESPACHAR";
  return acked ? "COMPLETADA — SERVIDA" : "COMPLETADA — POR SERVIR";
}

function renderHist() {
  const list = $("#h-list", hroot);
  if (!list) return;
  if (hstate.loading) { list.innerHTML = `<p class="empty">Cargando…</p>`; return; }
  const rows = filtered();
  const prep = rows.filter((o) => o.completedAt && o.acceptedAt).map((o) => o.completedAt - o.acceptedAt);
  const ext = rows.filter(isExternal);
  const onTime = ext.filter((o) => o.targetReadyAt && o.completedAt && o.completedAt <= o.targetReadyAt).length;
  const withTarget = ext.filter((o) => o.targetReadyAt && o.completedAt).length;
  $("#h-summary", hroot).innerHTML = `<span><b>${rows.length}</b> orden(es)</span>
    <span>🍽️ ${rows.length - ext.length} · 🛵 ${ext.length}</span>
    ${prep.length ? `<span>Preparación promedio: <b>${fmtDuration(prep.reduce((a, b) => a + b, 0) / prep.length)}</b></span>` : ""}
    ${withTarget ? `<span>PedidosYa a tiempo: <b>${onTime}/${withTarget}</b></span>` : ""}`;
  list.innerHTML = rows.length ? rows.map((o) => {
    const open = hstate.open.has(o.orderId);
    const x = isExternal(o);
    const events = Object.values(o.events || {}).sort((a, b) => (a.at || 0) - (b.at || 0));
    const late = x && o.targetReadyAt && o.completedAt && o.completedAt > o.targetReadyAt;
    const wa = o.sourcePlatform === "WHATSAPP";
    return `<article class="h-card ${x ? "h-ext" : ""} ${wa ? "h-wa" : ""} ${open ? "open" : ""}">
      <button class="h-sum" data-action="h-toggle" data-id="${esc(o.orderId)}">
        <div class="h-title">${x ? `<span class="ext-pill ${wa ? "pill-wa" : ""}">${esc(PLATFORM_LABELS[o.sourcePlatform] || o.sourcePlatform)}</span>` : "🍽️"} <b>${esc(x ? "#" + o.platformOrderNumber : "MESA " + tableLabel(o.tableNumber))}</b>
          <span class="status-chip ${o.status === "COMPLETED" ? "st-ready" : "st-preparing"}">${finalLabel(o)}</span></div>
        <div class="h-lines">
          ${x && o.customerName ? `<span>Cliente: <b>${esc(o.customerName)}</b></span>` : ""}
          ${wa && typeof o.totalAmount === "number" ? `<span>Total: <b>$${o.totalAmount.toFixed(2)}</b></span>` : ""}
          <span>Mesero: ${esc(o.waiterName)}</span>
          <span>${fmtDateTime(o.sentAt)}</span>
          <span>Productos: ${o.itemCount ?? o.items.length}</span>
          ${x && o.preparationMinutes ? `<span>Preparación asignada: ${o.preparationMinutes} min</span>` : ""}
          ${late ? `<span class="txt-late">Atrasada ${fmtDuration(o.completedAt - o.targetReadyAt)}</span>` : ""}
        </div>
        <span class="h-more">${open ? "▲ OCULTAR" : "▼ VER DETALLES"}</span>
      </button>
      ${open ? `<div class="h-detail">
        ${o.type === "CORRECTION" ? `<div class="k-corr">✏️ Corrección de la orden #${esc(o.correctionOf?.orderNumber || o.correctionOf?.orderId || "")}</div>` : ""}
        ${o.duplicateOverride ? `<div class="k-corr">⚠️ Registrada como duplicado confirmado</div>` : ""}
        <div class="h-grid">
          <div><small>Tipo</small>${x ? `Externo · ${esc(PLATFORM_LABELS[o.sourcePlatform] || o.sourcePlatform)}` : "Interno · Mesa"}</div>
          ${x ? `<div><small>Orden externa</small>#${esc(o.platformOrderNumber)}</div><div><small>Cliente</small>${esc(o.customerName || "—")}${o.customerPhone ? ` · ${esc(o.customerPhone)}` : ""}</div>
                 ${wa && typeof o.totalAmount === "number" ? `<div><small>Total cobrado</small><b>$${o.totalAmount.toFixed(2)}</b>${o.extraCharge ? ` (incluye $${Number(o.extraCharge).toFixed(2)} de envío/desechables)` : ""}${o.totalText ? `<br><small>${esc(o.totalText)}</small>` : ""}</div>` : ""}`
            : `<div><small>Mesa</small>${tableLabel(o.tableNumber)}</div>`}
          <div><small>ID INSTAOrder</small>${esc(o.orderId)}${o.orderNumber ? ` (#${o.orderNumber})` : ""}</div>
          <div><small>${x ? "Ingresada por" : "Mesero"}</small>${esc(o.enteredBy?.name || o.waiterName)}</div>
          <div><small>Creada</small>${fmtDateTime(o.createdAt)}</div>
          ${x ? `<div><small>Recibida</small>${fmtDateTime(o.receivedAt)}</div>` : ""}
          <div><small>Enviada a cocina</small>${fmtDateTime(o.sentAt)}</div>
          ${x ? `<div><small>Tiempo asignado</small>${o.preparationMinutes ? o.preparationMinutes + " min" : "—"}</div>
                 <div><small>Hora objetivo</small>${fmtDateTime(o.targetReadyAt)}${o.targetManual ? " (manual)" : ""}</div>` : ""}
          <div><small>Aceptada en cocina</small>${fmtDateTime(o.acceptedAt)}${o.acceptedBy?.name ? ` · ${esc(o.acceptedBy.name)}` : ""}</div>
          <div><small>Completada</small>${fmtDateTime(o.completedAt)}${o.completedBy?.name ? ` · ${esc(o.completedBy.name)}` : ""}</div>
          <div><small>Tiempo de preparación</small>${o.completedAt && o.acceptedAt ? fmtDuration(o.completedAt - o.acceptedAt) : "—"}</div>
          <div><small>${x ? "Despacho confirmado" : "Alerta aceptada por mesero"}</small>${o.waiterNotification?.acknowledgedAt ? `${fmtDateTime(o.waiterNotification.acknowledgedAt)}${o.waiterNotification.acknowledgedBy?.name ? ` · ${esc(o.waiterNotification.acknowledgedBy.name)}` : ""}` : NOTIF_TXT[o.waiterNotification?.status] || "—"}</div>
        </div>
        ${itemsHtml(o, false)}
        <details class="h-events"><summary>Registro de eventos (${events.length})</summary>
          <ol>${events.map((ev) => `<li><b>${fmtDateTime(ev.at)}</b> · ${EVENT_TXT[ev.type] || esc(ev.type)}${ev.byName ? ` · ${esc(ev.byName)}` : ""}</li>`).join("")}</ol>
        </details>
      </div>` : ""}
    </article>`;
  }).join("") : `<p class="empty">No hay órdenes para estos filtros.</p>`;
}

function onHistClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  if (b.dataset.action === "h-back") history.length > 1 ? history.back() : go("inicio");
  else if (b.dataset.action === "h-reload") load();
  else if (b.dataset.action === "h-toggle") {
    const id = b.dataset.id;
    hstate.open.has(id) ? hstate.open.delete(id) : hstate.open.add(id);
    renderHist();
  }
}

let idTimer = null;
function onHistInput(e) {
  const f = e.target.dataset.f;
  if (!f) return;
  hstate[f] = e.target.value;
  if (f === "day") load();
  else if (f === "q" && /^ORD-.{10,}/i.test(e.target.value)) { clearTimeout(idTimer); idTimer = setTimeout(load, 400); }
  else renderHist();
}
