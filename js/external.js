/**
 * INSTAOrder — PEDIDOS EXTERNOS (THIRD PARTY)
 * ===========================================
 * Rutas:
 *   #/externos               Panel: subir captura, en cocina, listos para despacho
 *   #/externos/revisar       Revisión y edición de la orden leída
 *   #/externos/enviado/ID    Resultado del envío
 *
 * Flujo: captura de PedidosYa → OCR en el teléfono (js/pedidosya.js) →
 * revisión → CONFIRMAR Y ENVIAR A COCINA → misma cola en tiempo real que
 * los pedidos de mesa (outbox + Firebase).
 *
 * Privacidad: la imagen sólo vive en la memoria de esta pantalla. No se
 * guarda ni se sube a ningún servicio. Sólo se envían los datos de texto
 * necesarios (número, cliente, productos, tiempos).
 */

import { dataService } from "../firebase-service.js";
import { state, can, categoryById } from "./state.js";
import { go } from "./router.js";
import { appHeader, demoNotice } from "./components.js";
import { submitOrder, outboxEntries, processOutbox } from "./outbox.js";
import { getWaiter, deviceId } from "./store.js";
import { runOcr, parsePedidosYa, matchProduct, PLATFORMS, norm } from "./pedidosya.js";
import { productStatus, checkItems, optionalNote } from "./availability.js";
import { $, esc, toast, confirmDialog, dialog, fmtTime, fmtDateTime, orderTitle, orderLabel, isExternal } from "./ui.js";

const DRAFT_KEY = "instaorder.extDraft";
let root = null;
let view = null;
let image = null;      // { file, url }  — sólo en memoria
let ocrBusy = false;
let sending = false;

/* ---------- Borrador (sin imagen) ---------- */

function emptyDraft() {
  return {
    platform: "PEDIDOS_YA", platformOrderNumber: "", customerName: "",
    preparationMinutes: null, receivedAt: Date.now(), targetReadyAt: null, targetManual: false,
    items: [], generalNotes: "", warnings: [], ocrUsed: false, found: {},
  };
}
function getDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null; } catch { return null; } }
function saveDraft(d) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }
const draft = () => getDraft() || emptyDraft();

/** targetReadyAt = receivedAt + minutos (salvo ajuste manual). */
function recompute(d) {
  if (!d.targetManual) d.targetReadyAt = d.preparationMinutes ? d.receivedAt + d.preparationMinutes * 60000 : null;
  return d;
}

function dropImage() {
  if (image?.url) URL.revokeObjectURL(image.url);
  image = null;
}

/* ------------------------------------------------------------------ */

export const ExternalScreen = {
  mount(el, params) {
    if (!can("waiter")) { toast("Tu usuario no tiene el rol de Mesero", "error"); go("inicio", { replace: true }); return; }
    root = el;
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("change", onChange);
    const [a, b] = params;
    if (a === "revisar") mountReview();
    else if (a === "enviado" && b) mountSent(b);
    else mountPanel();
  },
  update() {
    if (!root) return;
    if (view === "panel") renderPanel();
    else if (view === "sent") renderSent();
  },
  unmount() {
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("input", onInput);
    root?.removeEventListener("change", onChange);
    root = null; view = null;
  },
};

const header = (back) => appHeader({ subtitle: "Pedidos externos", back }) + demoNotice();

/* ---------- Panel ---------- */

function mountPanel() {
  view = "panel";
  const d = getDraft();
  root.innerHTML = `${header("x-home")}
  <main class="screen ext-panel">
    <section class="ext-hero">
      <div class="ext-badge-lg">🛵 PEDIDOS YA</div>
      <label class="btn btn-ext btn-xl file-btn">📸 SUBIR CAPTURA
        <input type="file" accept="image/png,image/jpeg,image/webp,image/*" data-file hidden></label>
      <button class="btn btn-ghost" data-action="x-manual">✍️ Ingresar sin captura</button>
      ${d ? `<button class="btn btn-yellow" data-action="x-resume">↩︎ Continuar orden en revisión${d.platformOrderNumber ? ` #${esc(d.platformOrderNumber)}` : ""}</button>` : ""}
      <p class="muted small">La captura se lee en este teléfono y no se guarda ni se envía a ningún servicio.</p>
    </section>
    <div id="ext-lists"></div>
  </main>`;
  renderPanel();
}

function extCard(o, mode) {
  const late = o.targetReadyAt && dataService.now() > o.targetReadyAt;
  return `<div class="mo-card ext-card ${mode === "ready" ? "st-ready" : o.status === "ACCEPTED" ? "st-preparing" : "st-sent"}">
    <div class="mo-top"><span class="ext-pill">PEDIDOS YA</span><b>#${esc(o.platformOrderNumber)}</b>
      <span class="status-chip ${mode === "ready" ? "st-ready" : o.status === "ACCEPTED" ? "st-preparing" : "st-sent"}">${mode === "ready" ? "Listo para despachar" : o.status === "ACCEPTED" ? "En preparación" : "Enviada a cocina"}</span></div>
    ${o.customerName ? `<div class="mo-meta">👤 ${esc(o.customerName)}</div>` : ""}
    <div class="mo-items">${o.items.map((i) => `${i.quantity}× ${esc(i.productName)}`).join(" · ")}</div>
    <div class="mo-meta">${o.preparationMinutes ? `⏱ ${o.preparationMinutes} min · ` : ""}${o.targetReadyAt ? `objetivo <b>${fmtTime(o.targetReadyAt)}</b>${mode !== "ready" ? ` · <b class="${late ? "txt-late" : ""}" data-until="${o.targetReadyAt}"></b>` : ""}` : "sin hora objetivo"}</div>
  </div>`;
}

function renderPanel() {
  const el = $("#ext-lists", root);
  if (!el) return;
  const ext = state.activeOrders.filter(isExternal);
  const inKitchen = ext.filter((o) => o.status === "NEW" || o.status === "ACCEPTED").sort((a, b) => (a.targetReadyAt || a.sentAt) - (b.targetReadyAt || b.sentAt));
  const ready = ext.filter((o) => o.status === "COMPLETED" && o.waiterNotification?.status !== "ACKNOWLEDGED");
  const queued = outboxEntries().filter((e) => e.order.orderType === "THIRD_PARTY");
  const html = (queued.length ? `<h3 class="sec">⏳ Sin enviar (este teléfono)</h3>` + queued.map((e) => `
      <div class="mo-card st-pending"><div class="mo-top"><span class="ext-pill">PEDIDOS YA</span><b>#${esc(e.order.platformOrderNumber)}</b>
      <span class="status-chip st-pending">${e.state === "FAILED" ? "Error" : e.state === "SENDING" ? "Enviando…" : "NO ENVIADA"}</span></div>
      <button class="btn btn-sm btn-primary" data-action="x-retry">Reintentar envío</button></div>`).join("") : "")
    + `<h3 class="sec">🟢 Listos para despachar (${ready.length})</h3>` + (ready.map((o) => extCard(o, "ready")).join("") || `<p class="empty small">Ninguno.</p>`)
    + `<h3 class="sec">🍳 En cocina (${inKitchen.length})</h3>` + (inKitchen.map((o) => extCard(o, "kitchen")).join("") || `<p class="empty small">Ninguno.</p>`)
    + `<button class="btn btn-ghost btn-lg ext-hist" data-action="x-history">📚 Historial de pedidos externos</button>`;
  if (el._html !== html) { el.innerHTML = html; el._html = html; }
}

/* ---------- Revisión ---------- */

function mountReview() {
  view = "review";
  if (!getDraft()) saveDraft(emptyDraft());
  root.innerHTML = `${header("x-panel")}
  <main class="screen ext-review">
    <section class="s-card ext-img-card" id="x-img"></section>
    <section class="s-card" id="x-form"></section>
  </main>
  <div class="summary-actions ext-actions">
    <button class="btn btn-danger-ghost" data-action="x-discard">Descartar</button>
    <button class="btn btn-primary btn-send" data-action="x-send">✅ CONFIRMAR Y ENVIAR A COCINA</button>
  </div>`;
  renderImage();
  renderForm();
}

function renderImage(progress) {
  const el = $("#x-img", root);
  if (!el) return;
  if (!image) {
    el.innerHTML = `<div class="x-noimg">
      <label class="btn btn-ext file-btn">📸 ${getDraft()?.ocrUsed ? "Subir otra captura" : "SUBIR CAPTURA"}<input type="file" accept="image/png,image/jpeg,image/webp,image/*" data-file hidden></label>
      <span class="muted small">${getDraft()?.ocrUsed ? "La captura ya fue leída y se eliminó de la memoria." : "O completa los datos a mano."}</span></div>`;
    return;
  }
  el.innerHTML = `<div class="x-img-row">
    <img src="${image.url}" alt="Captura del pedido" class="x-preview">
    <div class="x-img-actions">
      ${ocrBusy ? `<div class="ocr-progress"><div class="ocr-bar" style="width:${Math.round((progress?.p || 0) * 100)}%"></div></div><p class="small"><b>${esc(progress?.label || "Leyendo captura…")}</b></p>`
        : `<button class="btn btn-primary" data-action="x-ocr">🔎 Leer captura de nuevo</button>`}
      <label class="btn btn-ghost btn-sm file-btn">🔄 Cambiar imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/*" data-file hidden></label>
      <button class="btn btn-danger-ghost btn-sm" data-action="x-drop">🗑 Eliminar imagen</button>
    </div></div>`;
}

const timeVal = (ms) => { if (!ms) return ""; const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
function fromTime(base, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base); d.setHours(h, m, 0, 0);
  return d.getTime();
}

function renderForm() {
  const el = $("#x-form", root);
  if (!el) return;
  const d = draft();
  const missingMin = !d.preparationMinutes;
  el.innerHTML = `
    ${d.warnings?.length ? `<div class="x-warn"><b>⚠️ Revisa:</b><ul>${d.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : ""}
    <div class="x-grid">
      <label>Plataforma<select class="field" data-x="platform">${Object.values(PLATFORMS).map((p) => `<option value="${p.id}" ${d.platform === p.id ? "selected" : ""}>${p.label}</option>`).join("")}</select></label>
      <label>Orden #<input class="field x-big ${d.platformOrderNumber ? "" : "x-missing"}" data-x="platformOrderNumber" inputmode="numeric" autocomplete="off" value="${esc(d.platformOrderNumber)}" placeholder="Escribe el número"></label>
      <label class="x-wide">Cliente<input class="field" data-x="customerName" autocomplete="off" value="${esc(d.customerName)}" placeholder="Nombre del cliente" maxlength="80"></label>
    </div>
    <div class="x-time ${missingMin ? "x-missing-box" : ""}">
      <div class="x-time-col">
        <span class="x-lbl">TIEMPO ASIGNADO EN PEDIDOSYA</span>
        <div class="x-stepper">
          <button class="qbtn minus" data-action="x-min" data-d="-1" aria-label="Menos un minuto">−</button>
          <input class="field x-min" data-x="preparationMinutes" inputmode="numeric" autocomplete="off" value="${d.preparationMinutes ?? ""}" placeholder="?">
          <button class="qbtn plus" data-action="x-min" data-d="1" aria-label="Más un minuto">+</button>
          <span class="x-unit">MIN</span>
        </div>
        ${missingMin ? `<span class="x-err">No se reconoció: escríbelo</span>` : d.found?.minutes ? `<span class="muted small">Leído de la captura</span>` : ""}
      </div>
      <div class="x-time-col">
        <span class="x-lbl">RECIBIDA</span>
        <input class="field" type="time" data-x="receivedAt" value="${timeVal(d.receivedAt)}">
      </div>
      <div class="x-time-col">
        <span class="x-lbl">HORA OBJETIVO ${d.targetManual ? '<span class="mini-chip st-pending">AJUSTE MANUAL</span>' : ""}</span>
        <input class="field x-target" type="time" data-x="targetReadyAt" value="${timeVal(d.targetReadyAt)}">
        ${d.targetManual ? `<button class="link-btn sm" data-action="x-auto">Volver a automático</button>` : `<span class="muted small">= recibida + minutos</span>`}
      </div>
    </div>
    <h3 class="sec">PEDIDO</h3>
    <div class="x-items">${d.items.map((it, i) => `
      <div class="x-item ${it.productId ? (it.confident === false ? "x-check" : "") : "x-unknown"}">
        <div class="x-item-row">
          <div class="x-qty">
            <button class="qbtn sm" data-action="x-q" data-i="${i}" data-d="-1" aria-label="Menos">−</button>
            <b>${it.quantity}</b>
            <button class="qbtn sm" data-action="x-q" data-i="${i}" data-d="1" aria-label="Más">+</button>
          </div>
          <button class="x-prod" data-action="x-pick" data-i="${i}">
            <span>${it.productId ? esc(it.productName) : `⚠️ ${esc(it.productName || "Elegir producto")}`}</span>
            <small>${it.productId ? "Cambiar ▾" : "Producto no identificado · toca para elegir"}</small>
          </button>
          <button class="icon-btn danger" data-action="x-del" data-i="${i}" aria-label="Eliminar">🗑</button>
        </div>
        ${availHtml(it)}
        ${it.rawText ? `<div class="x-raw">Leído: “${esc(it.rawText)}”${it.productId && it.confident === false ? " · <b>verifica</b>" : ""}</div>` : ""}
        ${desc(it) ? `<div class="line-desc">${esc(desc(it))}</div>` : ""}
        <input class="field x-note" data-xi="${i}" value="${esc(it.notes || "")}" placeholder="Nota para cocina (opcional)">
      </div>`).join("") || `<p class="empty small">Sin productos.</p>`}</div>
    <button class="btn btn-ghost" data-action="x-add">➕ Agregar producto</button>
    <div class="general-note">
      <label>NOTA GENERAL</label>
      <textarea class="field" rows="2" data-x="generalNotes" placeholder="Ej.: empacar salsas aparte">${esc(d.generalNotes || "")}</textarea>
    </div>
    <p class="no-money">No se registran precios ni totales. No se guardan teléfono, correo ni datos de facturación.</p>`;
}

function availHtml(it) {
  const p = state.catalog.products.find((x) => x.id === it.productId);
  if (!p) return "";
  const st = productStatus(p);
  if (!st.available) return `<div class="line-unavail">🔴 Producto no disponible · Agotado: ${esc(st.missing.join(", ").toUpperCase())}</div>`;
  if (st.optionalMissing.length) return `<div class="line-limited">⚠️ Se enviará ${esc(optionalNote(st.optionalMissing))}</div>`;
  return "";
}

const desc = (it) => state.catalog.products.find((p) => p.id === it.productId)?.description || "";

/* ---------- OCR ---------- */

async function setImage(file) {
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return toast("Formato no válido. Usa JPG, PNG o WEBP.", "error");
  dropImage();
  image = { file, url: URL.createObjectURL(file) };
  if (view !== "review") { go("externos/revisar"); setTimeout(processImage, 50); return; }
  processImage();
}

async function processImage() {
  if (!image || ocrBusy) return;
  ocrBusy = true;
  renderImage({ p: 0.02, label: "Preparando lector…" });
  try {
    const ocr = await runOcr(image.file, (m) => {
      const label = m.status === "recognizing text" ? "Leyendo captura…" : m.status?.includes("load") ? "Cargando lector (sólo la primera vez)…" : "Preparando…";
      renderImage({ p: m.progress || 0, label });
    });
    const r = parsePedidosYa(ocr, state.catalog);
    const d = emptyDraft();
    Object.assign(d, {
      platform: r.platform, platformOrderNumber: r.platformOrderNumber, customerName: r.customerName,
      preparationMinutes: r.preparationMinutes, receivedAt: Date.now(), ocrUsed: true, found: r.found,
      warnings: r.warnings,
      items: r.items.map((it) => ({ ...it, category: categoryById(state.catalog.products.find((p) => p.id === it.productId)?.categoryId)?.name || "" })),
    });
    saveDraft(recompute(d));
    toast(r.warnings.length ? "Captura leída: revisa los avisos" : "Captura leída", r.warnings.length ? "info" : "success");
  } catch (e) {
    console.error(e);
    toast("No se pudo leer la captura: " + (e.message || e), "error", 5000);
  } finally {
    ocrBusy = false;
    renderImage();
    renderForm();
  }
}

/* ---------- Selector de producto ---------- */

function pickProduct(initial = "") {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal picker" role="dialog" aria-modal="true">
      <h2 class="modal-title">Elegir producto</h2>
      <input class="field" type="search" placeholder="🔎 Buscar…" value="${esc(initial)}" data-ps>
      <div class="picker-list"></div>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-ghost" data-custom>Usar texto tal cual</button></div></div>`;
    document.body.appendChild(wrap);
    const list = $(".picker-list", wrap);
    const input = $("[data-ps]", wrap);
    const draw = () => {
      const q = input.value.trim();
      let prods = state.catalog.products.filter((p) => p.active !== false);
      if (q) {
        const scored = matchProduct(q, state.catalog).map((x) => x.product);
        const words = norm(q).split(/\s+/).filter(Boolean);
        const direct = prods.filter((p) => words.every((w) => norm(p.name + " " + (p.description || "")).includes(w)));
        prods = [...new Map([...direct, ...scored].map((p) => [p.id, p])).values()];
      }
      list.innerHTML = prods.slice(0, 60).map((p) => `<button class="picker-item ${productStatus(p).available ? "" : "p-off"}" data-id="${esc(p.id)}">
        <b>${esc(p.name)}${productStatus(p).available ? "" : ` <span class="p-unavail">🔴 No disponible: ${esc(productStatus(p).missing.join(", "))}</span>`}</b><small>${esc(categoryById(p.categoryId)?.name || "")}${p.description ? " · " + esc(p.description) : ""}</small></button>`).join("") || `<p class="empty small">Sin resultados.</p>`;
    };
    draw();
    input.addEventListener("input", draw);
    setTimeout(() => input.focus(), 50);
    wrap.addEventListener("click", (e) => {
      const it = e.target.closest("[data-id]");
      const close = (v) => { wrap.remove(); resolve(v); };
      if (it) close(state.catalog.products.find((p) => p.id === it.dataset.id));
      else if (e.target.closest("[data-close]") || e.target === wrap) close(null);
      else if (e.target.closest("[data-custom]")) close(input.value.trim() ? { custom: input.value.trim() } : null);
    });
  });
}

function editDraft(fn) { const d = draft(); fn(d); saveDraft(recompute(d)); renderForm(); }

/* ---------- Envío ---------- */

async function send(btn) {
  if (sending) return;
  const d = draft();
  const num = String(d.platformOrderNumber || "").trim().replace(/^#/, "");
  if (!num) return toast("Falta el número de orden", "error");
  if (!d.platform) return toast("Falta la plataforma", "error");
  if (!d.items.length) return toast("Agrega al menos un producto", "error");
  if (d.items.some((i) => !(i.quantity >= 1))) return toast("Revisa las cantidades", "error");
  const unknown = d.items.filter((i) => !i.productId);
  if (unknown.length && !(await confirmDialog("Productos no identificados",
    `${unknown.map((i) => `• ${i.productName}`).join("\n")}\n\nSe enviarán a cocina con el texto tal como está. ¿Continuar?`, "Enviar así", "danger"))) return;
  // Productos dudosos (amarillo): confirmación explícita, no sólo un aviso.
  const doubtful = d.items.filter((i) => i.productId && i.confident === false && i.rawText);
  if (doubtful.length && !(await confirmDialog("¿Los productos son correctos?",
    `${doubtful.map((i) => `• Leído: “${i.rawText}”\n   → ${i.quantity} × ${i.productName}`).join("\n")}\n\nSi no coincide, toca "Cancelar" y cámbialo o elimínalo.`,
    "Sí, son correctos", "primary"))) return;
  if (!d.preparationMinutes && !d.targetReadyAt && !(await confirmDialog("Tiempo de preparación desconocido",
    "No hay minutos asignados ni hora objetivo. Cocina no verá cuenta regresiva.\n¿Enviar sin tiempo?", "Enviar sin tiempo", "danger"))) return;
  // Disponibilidad: el pedido externo ya fue aceptado en PedidosYa, así que no se
  // bloquea, pero se exige confirmar sabiendo qué falta.
  const av = checkItems(d.items);
  if (av.blocked.length && !(await confirmDialog("⚠️ Ingrediente agotado",
    `${av.blocked.map((b) => `• ${b.productName}: agotado ${b.missing.join(", ").toUpperCase()}`).join("\n")}\n\nCocina no puede prepararlo tal cual. Cambia el producto, o envíalo y coordina con el cliente / PedidosYa.`,
    "Enviar de todos modos", "danger"))) return;
  if (!dataService.isConnected()) return toast("Sin conexión: no se puede verificar ni enviar. El borrador queda guardado.", "error", 5000);

  sending = true; btn.disabled = true; btn.textContent = "Verificando…";
  try {
    let duplicateOverride = false;
    const dups = await dataService.findExternalDuplicates(d.platform, num);
    if (dups.length) {
      const o = dups[0];
      const ok = await dialog({
        title: "⚠️ ESTA ORDEN YA FUE REGISTRADA",
        html: true,
        body: `<div class="dup-box"><b>${esc(orderTitle(o))}</b> · ${esc(o.customerName || "")}<br>
          Registrada ${fmtDateTime(o.sentAt)} por ${esc(o.enteredBy?.name || o.waiterName)}<br>
          Estado: <b>${{ NEW: "Nueva en cocina", ACCEPTED: "En preparación", COMPLETED: "Completada" }[o.status] || o.status}</b><br>
          ${o.items.map((i) => `${i.quantity}× ${esc(i.productName)}`).join("<br>")}</div>
          <p class="small">No se creó otra orden. Si de verdad es un pedido distinto con el mismo número, puedes registrarlo igual (quedará marcado como duplicado confirmado).</p>`,
        confirmText: "Registrar de todos modos", cancelText: "No enviar", tone: "danger",
      });
      if (!ok) return;
      if (!(await confirmDialog("Confirmar duplicado", `¿Seguro que la orden #${num} es OTRO pedido? Quedará registrado quién lo confirmó.`, "Sí, es otro pedido", "danger"))) return;
      duplicateOverride = true;
    }
    btn.textContent = "Enviando…";
    const waiter = getWaiter() || { id: dataService.uid || "", name: "Sin nombre" };
    const order = dataService.buildOrder({
      waiter, deviceId: deviceId(), generalNotes: d.generalNotes,
      items: d.items.map((i, idx) => {
        const o = av.optional.find((x) => x.index === idx);
        const bl = av.blocked.find((x) => x.index === idx);
        const extra = [o ? optionalNote(o.optionalMissing) : "", bl ? `⚠️ AGOTADO ${bl.missing.join(", ").toUpperCase()}` : ""].filter(Boolean).join(" · ");
        return {
          productId: i.productId || "custom", productName: i.productName, category: i.category || "",
          quantity: i.quantity, notes: [i.notes, extra].filter(Boolean).join(" · "), referencePrice: null,
        };
      }),
      external: {
        platform: d.platform, platformOrderNumber: num, customerName: d.customerName,
        receivedAt: d.receivedAt, preparationMinutes: d.preparationMinutes || 0,
        targetReadyAt: d.targetReadyAt || null, targetManual: d.targetManual, duplicateOverride, ocrUsed: d.ocrUsed,
      },
    });
    if (!order.targetReadyAt) delete order.targetReadyAt;
    if (!order.preparationMinutes) delete order.preparationMinutes;
    const pending = submitOrder(order);
    clearDraft();
    dropImage();
    go(`externos/enviado/${order.orderId}`, { replace: true });
    await pending;
  } catch (e) {
    console.error(e);
    toast("No se pudo verificar/enviar: " + (e.message || e), "error", 5000);
  } finally {
    sending = false;
    if (btn.isConnected) { btn.disabled = false; btn.textContent = "✅ CONFIRMAR Y ENVIAR A COCINA"; }
  }
}

/* ---------- Resultado ---------- */

let sentId = null;
function mountSent(id) {
  view = "sent"; sentId = id;
  root.innerHTML = `${header("x-panel")}<main class="screen sent-screen" id="x-sent"></main>`;
  renderSent();
}
function renderSent() {
  const el = $("#x-sent", root);
  if (!el) return;
  const q = outboxEntries().find((e) => e.order.orderId === sentId);
  const live = state.activeOrders.find((o) => o.orderId === sentId);
  const o = q?.order || live;
  el.innerHTML = (q ? `<div class="sent-card ${q.state === "FAILED" ? "bad" : "wait"}"><div class="sent-ico">${q.state === "SENDING" ? "⏳" : "📵"}</div>
      <h2>${q.state === "FAILED" ? "ERROR AL ENVIAR" : q.state === "SENDING" ? "ENVIANDO…" : "NO ENVIADA — SIN CONEXIÓN"}</h2>
      <p class="muted">Cocina AÚN NO la ha recibido. Se enviará al recuperar la conexión, sin duplicarse.</p>
      ${q.state === "FAILED" ? `<button class="btn btn-primary btn-lg" data-action="x-retry">Reintentar</button>` : ""}</div>`
    : `<div class="sent-card ok"><div class="sent-ico">✅</div><h2>ENVIADA A COCINA</h2>
      <p class="sent-num">${o ? esc(orderTitle(o)) : ""}</p>
      ${o?.targetReadyAt ? `<p>Hora objetivo: <b>${fmtTime(o.targetReadyAt)}</b></p>` : ""}<p class="muted small">Confirmada por el servidor · ID ${esc(sentId)}</p></div>`)
    + `<label class="btn btn-ext btn-xl file-btn">📸 Subir otra captura<input type="file" accept="image/*" data-file hidden></label>
       <button class="btn btn-ghost btn-lg" data-action="x-panel">🛵 Ver pedidos externos</button>`;
}

/* ---------- Eventos ---------- */

async function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const i = Number(b.dataset.i);
  switch (b.dataset.action) {
    case "x-home": go("inicio"); break;
    case "x-panel": go("externos"); break;
    case "x-history": go("historial/externos"); break;
    case "x-manual": saveDraft(emptyDraft()); go("externos/revisar"); break;
    case "x-resume": go("externos/revisar"); break;
    case "x-retry": processOutbox(); break;
    case "x-ocr": processImage(); break;
    case "x-drop": dropImage(); renderImage(); break;
    case "x-min": editDraft((d) => { d.preparationMinutes = Math.max(1, Math.min(180, (d.preparationMinutes || 0) + Number(b.dataset.d))); d.warnings = (d.warnings || []).filter((w) => !/TIEMPO/.test(w)); }); break;
    case "x-auto": editDraft((d) => { d.targetManual = false; }); break;
    case "x-q": editDraft((d) => { const it = d.items[i]; if (it) it.quantity = Math.max(1, Math.min(99, it.quantity + Number(b.dataset.d))); }); break;
    case "x-del": {
      const it = draft().items[i];
      if (it && await confirmDialog("Eliminar producto", `¿Quitar ${it.quantity} × ${it.productName}?`, "Eliminar", "danger")) editDraft((d) => d.items.splice(i, 1));
      break;
    }
    case "x-pick": case "x-add": {
      const cur = b.dataset.action === "x-pick" ? draft().items[i] : null;
      const p = await pickProduct(cur?.rawText || "");
      if (!p) return;
      editDraft((d) => {
        const data = p.custom
          ? { productId: "", productName: p.custom, category: "", confident: false }
          : { productId: p.id, productName: p.name, category: categoryById(p.categoryId)?.name || "", confident: true };
        if (cur) Object.assign(d.items[i], data);
        else d.items.push({ quantity: 1, rawText: "", notes: "", ...data });
        d.warnings = (d.warnings || []).filter((w) => !cur || !w.includes(cur.rawText));
      });
      break;
    }
    case "x-discard":
      if (await confirmDialog("Descartar orden", "Se borran los datos leídos y la imagen. No se envía nada a cocina.", "Descartar", "danger")) {
        clearDraft(); dropImage(); go("externos", { replace: true });
      }
      break;
    case "x-send": send(b); break;
  }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.xi !== undefined) { const d = draft(); if (d.items[+t.dataset.xi]) { d.items[+t.dataset.xi].notes = t.value; saveDraft(d); } return; }
  const k = t.dataset.x;
  if (!k || t.type === "time" || k === "platform") return;
  const d = draft();
  if (k === "preparationMinutes") {
    const n = parseInt(t.value, 10);
    d.preparationMinutes = n >= 1 && n <= 180 ? n : null;
    saveDraft(recompute(d));
    const tgt = $("[data-x=targetReadyAt]", root);
    if (tgt && !d.targetManual) tgt.value = timeVal(d.targetReadyAt);
    return;
  }
  d[k] = t.value;
  saveDraft(d);
}

function onChange(e) {
  const t = e.target;
  if (t.matches("[data-file]")) { setImage(t.files?.[0]); t.value = ""; return; }
  const k = t.dataset.x;
  if (k === "platform") editDraft((d) => { d.platform = t.value; });
  else if (k === "receivedAt" && t.value) editDraft((d) => { d.receivedAt = fromTime(d.receivedAt, t.value); });
  else if (k === "targetReadyAt" && t.value) editDraft((d) => {
    let v = fromTime(d.receivedAt, t.value);
    if (v < d.receivedAt - 3600000) v += 24 * 3600000; // pasa de medianoche
    d.targetReadyAt = v; d.targetManual = true;
  });
  else if (k === "preparationMinutes") {
    // Sin redibujar el formulario (no interrumpir el siguiente toque): sólo estilos.
    const d = draft();
    $(".x-time", root)?.classList.toggle("x-missing-box", !d.preparationMinutes);
  }
}
