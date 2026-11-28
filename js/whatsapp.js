/**
 * INSTAOrder — PEDIDOS POR WHATSAPP
 * =================================
 * Rutas:
 *   #/whatsapp           Menú (Ingreso manual · continuar borrador)
 *   #/whatsapp/nuevo     Datos del cliente + productos por categorías (como en mesa)
 *   #/whatsapp/resumen   Precios, TOTAL, nota, imagen para el cliente y envío a cocina
 *
 * ÚNICO módulo de INSTAOrder que maneja precios y total (los pedidos de mesa
 * y de PedidosYa siguen sin montos). El precio de cada producto es el del
 * catálogo (Configuración › Catálogo); se puede sumar un cargo de envío o
 * ajuste, y el texto del total que ve el cliente es editable.
 *
 * El pedido viaja a cocina igual que un pedido externo (THIRD_PARTY,
 * sourcePlatform "WHATSAPP"): cuenta regresiva, alerta de despacho, historial.
 * Cocina nunca ve precios.
 */

import { dataService } from "../firebase-service.js";
import { state, can, categoryById, logoSrc } from "./state.js";
import { go } from "./router.js";
import { appHeader, demoNotice } from "./components.js";
import { submitOrder } from "./outbox.js";
import { getWaiter, deviceId } from "./store.js";
import { productStatus, checkItems, blockedDialog, optionalNote } from "./availability.js";
import { $, esc, toast, confirmDialog, fmtTime } from "./ui.js";

const DRAFT_KEY = "instaorder.waDraft";
const LAST_KEY = "instaorder.waLast";
const money = (n) => "$" + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ---------- Promociones del día (sólo WhatsApp) ----------
 * Precio especial únicamente para los productos listados (por id del catálogo).
 */
export const PROMOS = {
  mon: { label: "Lunes de Quesadilla", short: "Lunes", icon: "🧀", price: 2,
    ids: ["p-quesadilla-queso", "p-quesadilla-res", "p-quesadilla-pollo", "p-quesadilla-pastor", "p-quesadilla-campechano"] },
  tue: { label: "Martes de Burritos", short: "Martes", icon: "🌯", price: 2,
    ids: ["p-burrito-clasico-res", "p-burrito-clasico-pollo", "p-burrito-clasico-pastor"] },
  wed: { label: "Miércoles de Tacos", short: "Miércoles", icon: "🌮", price: 1,
    ids: ["p-taco-carne-de-res", "p-taco-pollo", "p-taco-al-pastor"] },
};
const todayPromo = () => ({ 1: "mon", 2: "tue", 3: "wed" })[new Date().getDay()] || "";
const basePrice = (pid) => { const p = state.catalog.products.find((x) => x.id === pid); return typeof p?.referencePrice === "number" ? p.referencePrice : 0; };
const promoFor = (pid, day) => (PROMOS[day] && PROMOS[day].ids.includes(pid) ? PROMOS[day] : null);
export const priceFor = (pid, day) => (promoFor(pid, day) ? promoFor(pid, day).price : basePrice(pid));
/** Recalcula el precio de cada línea según la promo elegida. */
function repriceAll(d) {
  for (const i of d.items) { i.basePrice = basePrice(i.productId); i.unitPrice = priceFor(i.productId, d.promoDay); i.promo = !!promoFor(i.productId, d.promoDay); }
}

let root = null;
let view = null;
let ui = { category: null, search: "" };
let sending = false;

/* ---------- Borrador ---------- */

function emptyDraft() {
  return { phone: "", customerName: "", preparationMinutes: 20, receivedAt: Date.now(), items: [], generalNotes: "",
    extraCharge: 0, extraLabel: "Envío", disposablesCharge: 0, disposablesLabel: "Desechables", totalText: "", totalTextCustom: false, promoDay: todayPromo() };
}
const getDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null; } catch { return null; } };
const saveDraft = (d) => localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
const clearDraft = () => localStorage.removeItem(DRAFT_KEY);
const draft = () => getDraft() || emptyDraft();

export const getLastWa = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY)) || null; } catch { return null; } };

/** Subtotal de productos + envío + desechables. extra = envío + desechables (lo que se guarda como extraCharge). */
export function totals(d) {
  const sub = round2(d.items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * i.quantity, 0));
  const ship = round2(d.extraCharge);
  const disp = round2(d.disposablesCharge);
  const extra = round2(ship + disp);
  return { sub, ship, disp, extra, total: round2(sub + extra) };
}
const defaultTotalText = (d) => `TOTAL: ${money(totals(d).total)}`;
const totalText = (d) => (d.totalTextCustom && d.totalText ? d.totalText : defaultTotalText(d));
const targetOf = (d) => (d.preparationMinutes ? d.receivedAt + d.preparationMinutes * 60000 : null);

/* ---------- Pantalla ---------- */

export const WhatsAppScreen = {
  mount(el, params) {
    if (!can("waiter")) { toast("Tu usuario no tiene el rol de Mesero", "error"); go("inicio", { replace: true }); return; }
    root = el;
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    const [a] = params;
    if (a === "nuevo") mountBuilder();
    else if (a === "resumen") mountSummary();
    else mountMenu();
  },
  update() {
    if (!root) return;
    if (view === "builder" && (ui.catRef !== state.catalog || ui.ingRef !== state.ingredients)) {
      ui.catRef = state.catalog; ui.ingRef = state.ingredients; renderCats(); renderProducts();
    }
    if (view === "summary" && ui.ingRef !== state.ingredients) {
      ui.ingRef = state.ingredients;
      const a = document.activeElement;
      if (!(a && root.contains(a) && a.matches("input,textarea"))) renderSummary();
    }
  },
  unmount() {
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("input", onInput);
    root = null; view = null;
  },
};

const header = (back) => appHeader({ subtitle: "Pedidos por WhatsApp", back }) + demoNotice();

/* ---------- Menú ---------- */

function mountMenu() {
  view = "menu";
  const d = getDraft();
  root.innerHTML = `${header("w-ext")}
  <main class="screen ext-panel">
    <section class="ext-hero wa-hero">
      <div class="ext-badge-lg wa-color">💬 PEDIDOS POR WHATSAPP</div>
      <button class="btn btn-wa btn-xl" data-action="w-new">✍️ INGRESO MANUAL</button>
      ${d && (d.items.length || d.customerName || d.phone) ? `<button class="btn btn-yellow" data-action="w-resume">↩︎ Continuar pedido de ${esc(d.customerName || d.phone || "cliente")}</button>` : ""}
      <p class="muted small">Con precios del catálogo y total. Puedes enviar al cliente la imagen del pedido con el logo de Takolandia.</p>
    </section>
    <button class="btn btn-ghost btn-lg ext-hist" data-action="w-hist">📚 Historial de pedidos por WhatsApp</button>
  </main>`;
}

/* ---------- Datos + productos ---------- */

function mountBuilder() {
  view = "builder";
  if (!getDraft()) saveDraft(emptyDraft());
  const d = draft();
  const cats = state.catalog.categories.filter((c) => c.active !== false);
  if (!ui.category || !cats.some((c) => c.id === ui.category)) ui.category = cats[0]?.id || null;
  ui.search = ""; ui.catRef = state.catalog; ui.ingRef = state.ingredients;
  root.innerHTML = `${header("w-menu")}
  <main class="screen builder wa-builder">
    <section class="s-card wa-client">
      <div class="x-grid">
        <label>Número de celular<input class="field" type="tel" inputmode="tel" autocomplete="off" data-w="phone" value="${esc(d.phone)}" placeholder="09XXXXXXXX"></label>
        <label>Nombre del cliente<input class="field" autocomplete="off" data-w="customerName" value="${esc(d.customerName)}" placeholder="Nombre" maxlength="80"></label>
      </div>
      <div class="wa-time">
        <span class="x-lbl">TIEMPO ASIGNADO</span>
        <div class="x-stepper">
          <button class="qbtn minus" data-action="w-min" data-d="-5" aria-label="Menos 5 minutos">−</button>
          <input class="field x-min" data-w="preparationMinutes" inputmode="numeric" autocomplete="off" value="${d.preparationMinutes ?? ""}">
          <button class="qbtn plus" data-action="w-min" data-d="5" aria-label="Más 5 minutos">+</button>
          <span class="x-unit">MIN</span>
        </div>
        <span class="wa-target" id="wa-target"></span>
      </div>
      <div class="wa-promo">
        <span class="x-lbl">PROMOCIÓN DEL DÍA</span>
        <div class="wa-promo-chips" id="w-promos"></div>
      </div>
    </section>
    <div class="builder-top">
      <div class="search-wrap"><input class="field search" type="search" placeholder="🔎 Buscar producto…" data-w="search" autocomplete="off"></div>
      <div class="cat-chips" id="w-cats"></div>
    </div>
    <div class="product-list" id="w-products"></div>
  </main>
  <div class="order-bar" id="w-bar"></div>`;
  renderPromos(); renderTarget(); renderCats(); renderProducts(); renderBar();
}

function renderPromos() {
  const el = $("#w-promos", root); if (!el) return;
  const d = draft();
  const today = todayPromo();
  el.innerHTML = `<button class="wa-pchip ${!d.promoDay ? "on" : ""}" data-action="w-promo" data-day="">Sin promo</button>` +
    Object.entries(PROMOS).map(([k, p]) => `<button class="wa-pchip ${d.promoDay === k ? "on" : ""}" data-action="w-promo" data-day="${k}">
      <span>${p.icon} ${p.short}${k === today ? " · hoy" : ""}</span><small>${esc(p.label.replace(/^\S+ de /, ""))} a ${money(p.price)}</small></button>`).join("");
}

function renderTarget() {
  const el = $("#wa-target", root); if (!el) return;
  const t = targetOf(draft());
  el.innerHTML = t ? `Listo aprox. <b>${fmtTime(t)}</b>` : "";
}

function renderCats() {
  const el = $("#w-cats", root); if (!el) return;
  el.innerHTML = state.catalog.categories.filter((c) => c.active !== false).map((c) =>
    `<button class="cat-chip ${!ui.search && ui.category === c.id ? "on" : ""}" data-action="w-cat" data-id="${esc(c.id)}"><span>${esc(c.icon || "🍴")}</span>${esc(c.name)}</button>`).join("");
}

const nrm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const qtyOf = (d, pid) => d.items.filter((i) => i.productId === pid).reduce((n, i) => n + i.quantity, 0);

function renderProducts() {
  const el = $("#w-products", root); if (!el) return;
  const d = draft();
  const words = nrm(ui.search.trim()).split(/\s+/).filter((x) => x && !["de", "con", "al", "la", "el"].includes(x));
  let prods = state.catalog.products.filter((p) => p.active !== false && categoryById(p.categoryId)?.active !== false);
  prods = words.length ? prods.filter((p) => { const t = nrm(p.name + " " + (p.description || "")); return words.every((w) => t.includes(w)); })
    : prods.filter((p) => p.categoryId === ui.category);
  el.innerHTML = prods.length ? prods.map((p) => {
    const q = qtyOf(d, p.id);
    const st = productStatus(p);
    return `<div class="product-card ${q ? "has-qty" : ""} ${st.available ? "" : "p-off"}">
      <button class="p-main" data-action="w-add" data-pid="${esc(p.id)}" ${st.available ? "" : 'aria-disabled="true"'}>
        <span class="p-name">${esc(p.name)}</span>
        ${p.description ? `<span class="p-desc">${esc(p.description)}</span>` : ""}
        <span class="p-meta">${promoFor(p.id, d.promoDay)
          ? `<span class="p-price wa-price wa-was">${money(p.referencePrice)}</span><span class="p-price wa-price wa-promo-price">🎉 ${money(promoFor(p.id, d.promoDay).price)}</span>`
          : `<span class="p-price wa-price">${typeof p.referencePrice === "number" ? money(p.referencePrice) : "Sin precio"}</span>`}</span>
        ${!st.available ? `<span class="p-unavail">🔴 Producto no disponible · Agotado: ${esc(st.missing.join(", "))}</span>` : ""}
        ${st.available && st.optionalMissing.length ? `<span class="p-limited">⚠️ Sin ${esc(st.optionalMissing.join(", ").toLowerCase())} (agotado)</span>` : ""}
      </button>
      <div class="qty-ctl">
        ${q ? `<button class="qbtn minus" data-action="w-dec" data-pid="${esc(p.id)}" aria-label="Quitar uno">−</button><span class="qty">${q}</span>` : ""}
        <button class="qbtn plus" data-action="w-add" data-pid="${esc(p.id)}" aria-label="Agregar uno" ${st.available ? "" : "disabled"}>+</button>
      </div></div>`;
  }).join("") : `<p class="empty">No se encontraron productos.</p>`;
}

function renderBar() {
  const el = $("#w-bar", root); if (!el) return;
  const d = draft();
  const n = d.items.reduce((s, i) => s + i.quantity, 0);
  el.innerHTML = `<button class="btn btn-wa btn-xl order-bar-btn" data-action="w-review" ${n ? "" : "disabled"}>
    <span>🧾 Ver pedido · ${n} artículo${n === 1 ? "" : "s"}</span><span class="ob-count">${money(totals(d).total)}</span></button>`;
}

function changeQty(pid, delta) {
  const d = draft();
  const p = state.catalog.products.find((x) => x.id === pid);
  if (!p) return;
  if (delta > 0) {
    const st = productStatus(p);
    if (!st.available) { toast(`Producto no disponible · Agotado: ${st.missing.join(", ")}`, "error"); return; }
    const line = d.items.find((i) => i.productId === pid);
    if (line) line.quantity++;
    else d.items.push({ productId: p.id, productName: p.name, category: categoryById(p.categoryId)?.name || "",
      basePrice: basePrice(p.id), unitPrice: priceFor(p.id, d.promoDay), promo: !!promoFor(p.id, d.promoDay), quantity: 1, notes: "" });
  } else {
    const lines = d.items.filter((i) => i.productId === pid);
    const last = lines[lines.length - 1];
    if (!last) return;
    if (--last.quantity <= 0) d.items.splice(d.items.indexOf(last), 1);
  }
  saveDraft(d); renderProducts(); renderBar();
}

/* ---------- Resumen: precios, total, imagen y envío ---------- */

function mountSummary() {
  view = "summary"; ui.ingRef = state.ingredients;
  if (!getDraft()?.items?.length) { go("whatsapp/nuevo", { replace: true }); return; }
  root.innerHTML = `${header("w-back")}
  <main class="screen summary wa-summary"><div class="ticket" id="w-ticket"></div></main>
  <div class="summary-actions wa-actions">
    <button class="btn btn-ghost" data-action="w-back">✏️ EDITAR</button>
    <button class="btn btn-danger-ghost" data-action="w-discard">DESCARTAR</button>
    <button class="btn btn-wa wa-share" data-action="w-share">📲 ENVIAR AL CLIENTE</button>
    <button class="btn btn-primary btn-send" data-action="w-send">🚀 ENVIAR A COCINA</button>
  </div>`;
  renderSummary();
}

function renderSummary() {
  const el = $("#w-ticket", root); if (!el) return;
  const d = draft();
  const t = totals(d);
  const tgt = targetOf(d);
  el.innerHTML = `
    <div class="ticket-head">
      <div class="tk-table wa-color">💬 WHATSAPP</div>
      <div class="tk-waiter"><b>${esc(d.customerName || "Sin nombre")}</b> · ${esc(d.phone || "sin número")}</div>
      <div class="tk-waiter">⏱ ${d.preparationMinutes || "?"} min${tgt ? ` · listo aprox. <b>${fmtTime(tgt)}</b>` : ""}</div>
      ${PROMOS[d.promoDay] ? `<div class="wa-promo-tag">${PROMOS[d.promoDay].icon} ${esc(PROMOS[d.promoDay].label)} · ${money(PROMOS[d.promoDay].price)}</div>` : ""}
    </div>
    ${d.items.map((it, i) => {
      const p = state.catalog.products.find((x) => x.id === it.productId);
      const st = p ? productStatus(p) : null;
      return `<div class="line ${st && !st.available ? "line-off" : ""}">
        ${st && !st.available ? `<div class="line-unavail">🔴 NO DISPONIBLE · Agotado: ${esc(st.missing.join(", ").toUpperCase())}</div>` : ""}
        ${st && st.available && st.optionalMissing.length ? `<div class="line-limited">⚠️ Se enviará ${esc(optionalNote(st.optionalMissing))}</div>` : ""}
        <div class="line-row">
          <div class="line-qty">${it.quantity} ×</div>
          <div class="line-name">${esc(it.productName)}<div class="wa-unit">${money(it.unitPrice)} c/u${it.promo ? ` <span class="wa-promo-mini">🎉 promo · antes ${money(it.basePrice)}</span>` : ""}</div></div>
          <div class="wa-sub">${money(it.unitPrice * it.quantity)}</div>
        </div>
        <div class="line-tools">
          <button class="qbtn sm" data-action="w-ldec" data-i="${i}" aria-label="Quitar uno">−</button>
          <button class="qbtn sm" data-action="w-linc" data-i="${i}" aria-label="Agregar uno">+</button>
          <input class="field wa-note" data-wn="${i}" value="${esc(it.notes || "")}" placeholder="Nota para cocina" autocomplete="off">
          <button class="tool danger" data-action="w-ldel" data-i="${i}">🗑</button>
        </div>
      </div>`;
    }).join("")}
    <div class="wa-totals">
      <div class="wa-row"><span>Subtotal productos</span><b>${money(t.sub)}</b></div>
      <div class="wa-row wa-extra">
        <input class="field" data-w="extraLabel" value="${esc(d.extraLabel || "Envío")}" placeholder="Envío / ajuste" autocomplete="off">
        <input class="field wa-extra-amt" data-w="extraCharge" inputmode="decimal" value="${d.extraCharge ? d.extraCharge : ""}" placeholder="$0.00" autocomplete="off">
      </div>
      <div class="wa-row wa-extra">
        <input class="field" data-w="disposablesLabel" value="${esc(d.disposablesLabel || "Desechables")}" placeholder="Desechables" autocomplete="off">
        <input class="field wa-extra-amt" data-w="disposablesCharge" inputmode="decimal" value="${d.disposablesCharge ? d.disposablesCharge : ""}" placeholder="$0.00" autocomplete="off">
      </div>
      <div class="wa-row wa-total"><span>TOTAL</span><b id="wa-total">${money(t.total)}</b></div>
      <label class="wa-text-lbl">Texto del total que verá el cliente (editable)
        <input class="field" data-w="totalText" value="${esc(totalText(d))}" autocomplete="off">
      </label>
      ${d.totalTextCustom ? `<button class="link-btn sm" data-action="w-text-auto">↺ Usar total calculado</button>` : ""}
    </div>
    <div class="general-note">
      <label>NOTA GENERAL (para cocina)</label>
      <textarea class="field" rows="2" data-w="generalNotes" placeholder="Ej.: empacar salsas aparte">${esc(d.generalNotes || "")}</textarea>
    </div>`;
}

function updateTotalsInPlace() {
  const d = draft();
  const t = totals(d);
  const tot = $("#wa-total", root); if (tot) tot.textContent = money(t.total);
  const tt = $("[data-w=totalText]", root);
  if (tt && !d.totalTextCustom && document.activeElement !== tt) tt.value = defaultTotalText(d);
}

/* ---------- Imagen del pedido para el cliente ---------- */

function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/** Dibuja la imagen del pedido (PNG) con el logo, productos, precios y total. */
export async function renderOrderImage(data) {
  if (data.shipCharge === undefined) data = { ...data, shipCharge: data.extraCharge || 0 }; // pedidos de v1.5.0
  try { await document.fonts?.ready; } catch { /* */ }
  const W = 1080, pad = 70;
  const items = data.items || [];
  const lineH = 86;
  const H = 520 + items.length * lineH + (data.shipCharge ? 70 : 0) + (data.disposablesCharge ? 70 : 0) + (data.promoLabel ? 56 : 0) + 420;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const font = (w, px) => `${w} ${px}px "Nunito Sans", "Segoe UI", Roboto, Arial, sans-serif`;
  const disp = (px) => `800 ${px}px "Baloo 2", "Nunito Sans", Arial, sans-serif`;
  // Fondo y franja superior
  g.fillStyle = "#F7F3E6"; g.fillRect(0, 0, W, H);
  const grd = g.createLinearGradient(0, 0, W, 0); grd.addColorStop(0, "#4A2C82"); grd.addColorStop(1, "#5A2A8A");
  g.fillStyle = grd; g.fillRect(0, 0, W, 330);
  const stripe = ["#E2007A", "#FDD000", "#FFFFFF"];
  for (let x = 0, k = 0; x < W; x += 44, k++) { g.fillStyle = stripe[k % 3]; g.fillRect(x, 330, 44, 12); }
  // Logo
  const logo = await loadImg(data.logo || logoSrc());
  if (logo) {
    const lh = 250, lw = (logo.width / logo.height) * lh;
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(W / 2, 170, 150, 0, Math.PI * 2); g.fill();
    g.drawImage(logo, W / 2 - lw / 2, 45, lw, lh);
  }
  // Encabezado
  let y = 420;
  g.textAlign = "center"; g.fillStyle = "#E2007A"; g.font = disp(54); g.fillText("Resumen de tu pedido", W / 2, y);
  y += 56; g.fillStyle = "#1D1530"; g.font = font(700, 34);
  g.fillText(`${data.customerName || "Cliente"}${data.when ? " · " + data.when : ""}`, W / 2, y);
  if (data.promoLabel) { y += 52; g.fillStyle = "#E2007A"; g.font = font(800, 32); g.fillText(`🎉 ${data.promoLabel}`, W / 2, y); }
  y += 40;
  g.strokeStyle = "#E4DDEF"; g.lineWidth = 3; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke(); g.setLineDash([]);
  y += 30;
  // Productos
  g.textAlign = "left";
  for (const it of items) {
    y += 52;
    g.fillStyle = "#E2007A"; g.font = disp(44); g.fillText(`${it.quantity}×`, pad, y);
    g.fillStyle = "#1D1530"; g.font = font(800, 36);
    let name = it.productName;
    while (g.measureText(name).width > W - pad * 2 - 260 && name.length > 4) name = name.slice(0, -2);
    if (name !== it.productName) name = name.trim() + "…";
    g.fillText(name, pad + 96, y);
    g.textAlign = "right"; g.fillText(money(it.unitPrice * it.quantity), W - pad, y); g.textAlign = "left";
    g.fillStyle = "#6B6280"; g.font = font(600, 24); g.fillText(`${money(it.unitPrice)} c/u${it.promo ? " · promo" : ""}`, pad + 96, y + 30);
    y += lineH - 52;
  }
  const extras = [[data.extraLabel || "Envío", data.shipCharge], [data.disposablesLabel || "Desechables", data.disposablesCharge]].filter((x) => x[1]);
  for (const [lbl, amt] of extras) {
    y += 56; g.fillStyle = "#1D1530"; g.font = font(700, 32); g.fillText(lbl, pad + 96, y);
    g.textAlign = "right"; g.fillText(money(amt), W - pad, y); g.textAlign = "left"; y += 14;
  }
  // Total
  y += 50;
  g.fillStyle = "#FDD000"; roundRect(g, pad, y, W - pad * 2, 130, 28); g.fill();
  g.fillStyle = "#1E1238"; g.textAlign = "center"; g.font = disp(64);
  let tt = data.totalText || "";
  while (g.measureText(tt).width > W - pad * 2 - 40 && g.font) { g.font = disp(parseInt(g.font.match(/(\d+)px/)[1], 10) - 4); }
  g.fillText(tt, W / 2, y + 88);
  y += 190;
  g.fillStyle = "#4A2C82"; g.font = font(700, 32);
  if (data.minutes) g.fillText(`⏱ Tiempo estimado: ${data.minutes} min${data.readyAt ? ` · listo aprox. ${data.readyAt}` : ""}`, W / 2, y);
  y += 62; g.fillStyle = "#E2007A"; g.font = disp(44); g.fillText("¡Gracias por tu pedido! 🌮", W / 2, y);
  y += 50; g.fillStyle = "#6B6280"; g.font = font(600, 26); g.fillText("Takolandia – Comida Mexicana", W / 2, y);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Número para wa.me: sólo dígitos; 09XXXXXXXX (Ecuador) → 5939XXXXXXXX. */
export function waNumber(phone) {
  let n = String(phone || "").replace(/\D/g, "");
  if (n.length === 10 && n.startsWith("0")) n = "593" + n.slice(1);
  else if (n.length === 9 && n.startsWith("9")) n = "593" + n;
  return n;
}

function summaryText(data) {
  if (data.shipCharge === undefined) data = { ...data, shipCharge: data.extraCharge || 0 };
  return [`¡Hola ${data.customerName || ""}! 🌮 Este es el resumen de tu pedido en Takolandia:`, "",
    ...(data.promoLabel ? [`🎉 ${data.promoLabel}`, ""] : []),
    ...data.items.map((i) => `${i.quantity}× ${i.productName} — ${money(i.unitPrice * i.quantity)}`),
    ...(data.shipCharge ? [`${data.extraLabel || "Envío"} — ${money(data.shipCharge)}`] : []),
    ...(data.disposablesCharge ? [`${data.disposablesLabel || "Desechables"} — ${money(data.disposablesCharge)}`] : []),
    "", data.totalText, ...(data.minutes ? [`⏱ Tiempo estimado: ${data.minutes} min`] : []), "", "¡Gracias por tu pedido!"].join("\n");
}

/** Datos listos para la imagen/mensaje a partir del borrador. */
function shareData(d) {
  const t = totals(d);
  const tgt = targetOf(d);
  return {
    customerName: d.customerName, phone: d.phone, items: d.items.map((i) => ({ ...i })),
    extraCharge: t.extra, shipCharge: t.ship, extraLabel: d.extraLabel,
    disposablesCharge: t.disp, disposablesLabel: d.disposablesLabel, total: t.total, totalText: totalText(d),
    minutes: d.preparationMinutes, readyAt: tgt ? fmtTime(tgt) : "", when: fmtTime(d.receivedAt),
    promoLabel: d.items.some((i) => i.promo) && PROMOS[d.promoDay] ? PROMOS[d.promoDay].label : "",
  };
}

/**
 * Envía la imagen al cliente: en el teléfono abre el menú "Compartir" (elegir
 * WhatsApp y el chat del cliente). Si el navegador no puede compartir
 * archivos, descarga la imagen y abre el chat de WhatsApp con el resumen en texto.
 */
export async function shareWhatsAppSummary(data) {
  if (!data?.items?.length) return toast("No hay datos del pedido para enviar", "error");
  const blob = await renderOrderImage(data);
  const file = new File([blob], `Pedido-Takolandia-${(data.customerName || "cliente").replace(/\W+/g, "-")}.png`, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] }); // sólo la imagen, sin texto debajo
      return;
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
  }
  // Respaldo (computadora): descargar imagen + abrir chat con el texto.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  const num = waNumber(data.phone);
  window.open(`https://wa.me/${num}`, "_blank", "noopener");
  toast("Imagen descargada. Adjúntala en el chat de WhatsApp que se abrió.", "info", 5000);
}

/* ---------- Enviar a cocina ---------- */

async function sendToKitchen(btn) {
  if (sending) return;
  const d = draft();
  if (!d.customerName.trim() && !d.phone.trim()) return toast("Escribe el nombre o el celular del cliente", "error");
  if (!d.items.length) return toast("Agrega al menos un producto", "error");
  const pre = checkItems(d.items);
  if (pre.blocked.length) {
    if ((await blockedDialog(pre.blocked)) === "remove") {
      const idx = new Set(pre.blocked.map((b) => b.index));
      d.items = d.items.filter((_, i) => !idx.has(i)); saveDraft(d); renderSummary();
      toast("Productos no disponibles quitados. Revisa el total y vuelve a enviar.", "info", 4000);
    }
    return;
  }
  if (!d.preparationMinutes && !(await confirmDialog("Sin tiempo asignado", "Cocina no verá cuenta regresiva. ¿Enviar sin tiempo?", "Enviar", "danger"))) return;
  const t = totals(d);
  const ok = await confirmDialog(`¿Enviar a cocina el pedido de ${d.customerName || d.phone}?`,
    `${d.items.reduce((s, i) => s + i.quantity, 0)} artículo(s) · ${totalText(d)}\nCocina recibe los productos (sin precios).`, "Sí, ENVIAR", "primary");
  if (!ok) return;
  sending = true; btn.disabled = true;
  try {
    const av = checkItems(d.items);
    const waiter = getWaiter() || { id: dataService.uid || "", name: "Sin nombre" };
    const order = dataService.buildOrder({
      waiter, deviceId: deviceId(), generalNotes: d.generalNotes,
      items: d.items.map((i, idx) => {
        const o = av.optional.find((x) => x.index === idx);
        return { productId: i.productId, productName: i.productName, category: i.category || "", quantity: i.quantity,
          referencePrice: Number(i.unitPrice) || 0, notes: [i.notes, o ? optionalNote(o.optionalMissing) : ""].filter(Boolean).join(" · ") };
      }),
      external: {
        platform: "WHATSAPP", platformOrderNumber: "", customerName: d.customerName, customerPhone: d.phone,
        receivedAt: d.receivedAt, preparationMinutes: d.preparationMinutes || 0, targetReadyAt: targetOf(d),
        targetManual: false, ocrUsed: false, totalAmount: t.total, extraCharge: t.extra, totalText: totalText(d),
      },
    });
    if (!order.targetReadyAt) delete order.targetReadyAt;
    if (!order.preparationMinutes) delete order.preparationMinutes;
    localStorage.setItem(LAST_KEY, JSON.stringify({ orderId: order.orderId, ...shareData(d) }));
    const pending = submitOrder(order);
    clearDraft();
    go(`externos/enviado/${order.orderId}`, { replace: true });
    await pending;
  } finally {
    sending = false;
    if (btn.isConnected) btn.disabled = false;
  }
}

/* ---------- Eventos ---------- */

async function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const i = Number(b.dataset.i);
  switch (b.dataset.action) {
    case "w-ext": go("externos"); break;
    case "w-menu": go("whatsapp"); break;
    case "w-hist": go("historial/whatsapp"); break;
    case "w-new": {
      const d = getDraft();
      if (d && d.items.length && !(await confirmDialog("Hay un pedido sin terminar", `Se descartará el pedido de ${d.customerName || d.phone || "cliente"}.`, "Empezar uno nuevo", "danger"))) return;
      saveDraft(emptyDraft()); go("whatsapp/nuevo"); break;
    }
    case "w-resume": go("whatsapp/nuevo"); break;
    case "w-min": { const d = draft(); d.preparationMinutes = Math.max(5, Math.min(180, (d.preparationMinutes || 0) + Number(b.dataset.d))); saveDraft(d);
      const inp = $("[data-w=preparationMinutes]", root); if (inp) inp.value = d.preparationMinutes; renderTarget(); break; }
    case "w-cat": ui.category = b.dataset.id; ui.search = ""; { const s = $("[data-w=search]", root); if (s) s.value = ""; } renderCats(); renderProducts(); break;
    case "w-promo": { const d = draft(); d.promoDay = b.dataset.day || ""; repriceAll(d); saveDraft(d); renderPromos(); renderProducts(); renderBar();
      const p = PROMOS[d.promoDay]; toast(p ? `${p.icon} ${p.label}: ${money(p.price)} aplicado` : "Precios normales", "info"); break; }
    case "w-add": changeQty(b.dataset.pid, +1); break;
    case "w-dec": changeQty(b.dataset.pid, -1); break;
    case "w-review": go("whatsapp/resumen"); break;
    case "w-back": go("whatsapp/nuevo", { replace: true }); break;
    case "w-linc": { const d = draft(); if (d.items[i]) d.items[i].quantity++; saveDraft(d); renderSummary(); break; }
    case "w-ldec": { const d = draft(); if (d.items[i] && --d.items[i].quantity <= 0) d.items.splice(i, 1); saveDraft(d); if (!d.items.length) go("whatsapp/nuevo", { replace: true }); else renderSummary(); break; }
    case "w-ldel": { const d = draft(); const it = d.items[i];
      if (it && await confirmDialog("Eliminar producto", `¿Quitar ${it.quantity} × ${it.productName}?`, "Eliminar", "danger")) { d.items.splice(i, 1); saveDraft(d); if (!d.items.length) go("whatsapp/nuevo", { replace: true }); else renderSummary(); }
      break; }
    case "w-text-auto": { const d = draft(); d.totalTextCustom = false; d.totalText = ""; saveDraft(d); renderSummary(); break; }
    case "w-discard":
      if (await confirmDialog("Descartar pedido", "Se borra este pedido de WhatsApp. No se envía nada a cocina.", "Descartar", "danger")) { clearDraft(); go("whatsapp", { replace: true }); }
      break;
    case "w-share": {
      const d = draft();
      if (!d.items.length) return;
      b.disabled = true;
      try { await shareWhatsAppSummary(shareData(d)); } finally { b.disabled = false; }
      break;
    }
    case "w-send": sendToKitchen(b); break;
  }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.wn !== undefined) { const d = draft(); if (d.items[+t.dataset.wn]) { d.items[+t.dataset.wn].notes = t.value; saveDraft(d); } return; }
  const k = t.dataset.w;
  if (!k) return;
  if (k === "search") { ui.search = t.value; renderCats(); renderProducts(); return; }
  const d = draft();
  if (k === "preparationMinutes") { const n = parseInt(t.value, 10); d.preparationMinutes = n >= 1 && n <= 180 ? n : null; saveDraft(d); renderTarget(); return; }
  if (k === "extraCharge" || k === "disposablesCharge") { const n = parseFloat(String(t.value).replace(",", ".")); d[k] = isFinite(n) ? round2(n) : 0; saveDraft(d); updateTotalsInPlace(); return; }
  if (k === "totalText") { d.totalText = t.value; d.totalTextCustom = t.value.trim() !== "" && t.value !== defaultTotalText(d); saveDraft(d); return; }
  d[k] = t.value;
  saveDraft(d);
}
