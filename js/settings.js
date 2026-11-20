/**
 * INSTAOrder — CONFIGURACIÓN
 * ==========================
 * Pestañas:
 *  - Alertas (este dispositivo): sonido, volumen, repetición, vibración, parpadeo.
 *  - General: nombre del restaurante, número de mesas, logo, PIN.
 *  - Personal: meseros y personal de cocina.
 *  - Catálogo: categorías y productos (activar/desactivar, editar, agregar).
 *  - Sistema: estado de conexión, Firebase, dispositivo, versión.
 *
 * Lo compartido (General, Personal, Catálogo) se guarda en Firebase y se
 * protege con un PIN de administración (bloqueo operativo; la seguridad real
 * la dan las reglas de Firebase — ver README).
 */

import { dataService, randomId } from "../firebase-service.js";
import { IS_DEMO, AUTH_MODE } from "../firebase-config.js";
import { DEFAULT_CATALOG } from "../catalog.js";
import { state, DEFAULT_SETTINGS, normalizeCatalog, logoSrc } from "./state.js";
import { go } from "./router.js";
import { appHeader, demoNotice, CONN_LABELS } from "./components.js";
import { getPrefs, setPrefs, pinUnlocked, setPinUnlocked, deviceId, getOutbox } from "./store.js";
import { playAlert, unlockAudio, vibrate } from "./sound.js";
import { $, esc, toast, confirmDialog, askPin, dialog } from "./ui.js";

let root = null;
let tab = "alertas";
let work = null; // copia de trabajo de lo compartido

const TABS = [
  ["alertas", "🔔 Alertas"], ["general", "🏷️ General"], ["personal", "👥 Personal"],
  ["catalogo", "🌮 Catálogo"], ["sistema", "📡 Sistema"],
];
const LOCKED = new Set(["general", "personal", "catalogo"]);

function freshWork() {
  return {
    settings: JSON.parse(JSON.stringify(state.settings)),
    catalog: JSON.parse(JSON.stringify(state.catalog)),
    dirty: false,
    catFilter: state.catalog.categories[0]?.id || "",
  };
}

export const SettingsScreen = {
  mount(el, params) {
    root = el;
    tab = params[0] || tab;
    work = freshWork();
    root.innerHTML = `${appHeader({ subtitle: "Configuración", back: "s-back" })}${demoNotice()}
      <nav class="tabs" id="s-tabs"></nav>
      <main class="screen settings" id="s-body"></main>`;
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);
    render();
  },
  update() {
    // Si llega configuración nueva del servidor y no hay cambios sin guardar, refrescar.
    if (!root) return;
    if (!work.dirty) { const f = work.catFilter; work = freshWork(); work.catFilter = f; }
    if (tab === "sistema" || !work.dirty) render();
  },
  unmount() {
    root?.removeEventListener("click", onClick);
    root?.removeEventListener("change", onChange);
    root?.removeEventListener("input", onInput);
    root = null;
  },
};

function render() {
  $("#s-tabs", root).innerHTML = TABS.map(([k, t]) =>
    `<button class="tab ${tab === k ? "on" : ""}" data-action="tab" data-tab="${k}">${t}${LOCKED.has(k) && !pinUnlocked() ? " 🔒" : ""}</button>`).join("");
  const body = $("#s-body", root);
  const active = document.activeElement;
  if (body.contains(active) && active.matches("input[type=text],input:not([type]),textarea")) return; // no interrumpir escritura
  if (LOCKED.has(tab) && !pinUnlocked()) {
    body.innerHTML = `<div class="locked"><div class="lock-ico">🔒</div><p>Esta sección requiere el PIN de administración.</p>
      <button class="btn btn-primary btn-lg" data-action="unlock">Ingresar PIN</button>
      <p class="muted small">PIN inicial: 1234 (cámbialo en General).</p></div>`;
    return;
  }
  body.innerHTML = ({ alertas: alertsTab, general: generalTab, personal: staffTab, catalogo: catalogTab, sistema: systemTab })[tab]();
}

const saveBar = (what) => `<div class="save-bar ${work.dirty ? "dirty" : ""}">
  <span>${work.dirty ? "Cambios sin guardar" : "Sin cambios"}</span>
  <button class="btn btn-ghost" data-action="discard" ${work.dirty ? "" : "disabled"}>Descartar</button>
  <button class="btn btn-primary" data-action="save-${what}" ${work.dirty ? "" : "disabled"}>💾 Guardar</button></div>`;

/* ---------- Alertas (dispositivo) ---------- */

function alertsTab() {
  const p = getPrefs();
  const notif = "Notification" in window ? Notification.permission : "unsupported";
  return `<section class="s-card">
    <h3>Alertas de este dispositivo</h3>
    <p class="muted small">Estas opciones se guardan sólo en este teléfono/tablet. Las alertas visuales con parpadeo siempre están activas.</p>
    <label class="s-row toggle"><span>Sonido de alertas</span><input type="checkbox" data-pref="soundEnabled" ${p.soundEnabled ? "checked" : ""}></label>
    <label class="s-row"><span>Tono</span><select class="field" data-pref="soundTone">
      ${[["chime", "Campanita"], ["bell", "Timbre"], ["beep", "Bip"]].map(([v, t]) => `<option value="${v}" ${p.soundTone === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="s-row"><span>Volumen</span><input type="range" min="0.1" max="1" step="0.1" data-pref="volume" value="${p.volume}"></label>
    <label class="s-row"><span>Repetir sonido mientras haya alertas pendientes</span><select class="field" data-pref="repeatSeconds">
      ${[[0, "No repetir"], [5, "Cada 5 s"], [10, "Cada 10 s"], [20, "Cada 20 s"], [30, "Cada 30 s"], [60, "Cada 60 s"]].map(([v, t]) => `<option value="${v}" ${Number(p.repeatSeconds) === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="s-row toggle"><span>Vibración (teléfonos Android)</span><input type="checkbox" data-pref="vibrate" ${p.vibrate ? "checked" : ""}></label>
    <label class="s-row"><span>Intensidad del parpadeo</span><select class="field" data-pref="blinkStyle">
      ${[["suave", "Suave"], ["normal", "Normal"], ["intenso", "Intenso"]].map(([v, t]) => `<option value="${v}" ${p.blinkStyle === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="s-row toggle"><span>Mantener pantalla encendida (cocina)</span><input type="checkbox" data-pref="keepScreenOn" ${p.keepScreenOn ? "checked" : ""}></label>
    <div class="s-actions">
      <button class="btn btn-ghost" data-action="test-new">🔊 Probar sonido "orden nueva"</button>
      <button class="btn btn-ghost" data-action="test-ready">🔊 Probar sonido "listo para servir"</button>
      ${notif === "default" ? `<button class="btn btn-ghost" data-action="notif">🔔 Permitir notificaciones del sistema</button>` : ""}
    </div>
    <p class="muted small">Notificaciones del sistema: ${notif === "granted" ? "permitidas" : notif === "denied" ? "bloqueadas en el navegador" : notif === "unsupported" ? "no disponibles en este navegador" : "sin decidir"}.
    Sólo funcionan mientras INSTAOrder está abierta (aunque esté en segundo plano).</p>
  </section>`;
}

/* ---------- General ---------- */

function generalTab() {
  const s = work.settings;
  return `<section class="s-card">
    <h3>Restaurante</h3>
    <label class="s-row"><span>Nombre</span><input class="field" data-ws="restaurantName" value="${esc(s.restaurantName)}"></label>
    <label class="s-row"><span>Subtítulo</span><input class="field" data-ws="restaurantSubtitle" value="${esc(s.restaurantSubtitle)}"></label>
    <label class="s-row"><span>Número de mesas</span><input class="field narrow" type="number" min="1" max="200" inputmode="numeric" data-ws="tableCount" value="${esc(s.tableCount)}"></label>
  </section>
  <section class="s-card">
    <h3>Logo</h3>
    <div class="logo-edit"><img src="${esc(s.logo || "assets/logo.png")}" alt="Logo actual">
      <div>
        <label class="btn btn-ghost file-btn">📷 Subir logo<input type="file" accept="image/*" data-action-change="logo" hidden></label>
        <button class="btn btn-ghost" data-action="logo-reset">Usar logo por defecto</button>
        <p class="muted small">Se ajusta automáticamente a 320 px. También puedes reemplazar <code>assets/logo.png</code> en GitHub.</p>
      </div></div>
  </section>
  <section class="s-card">
    <h3>PIN de configuración</h3>
    <label class="s-row"><span>PIN (4–8 dígitos)</span><input class="field narrow" inputmode="numeric" data-ws="adminPin" value="${esc(s.adminPin)}"></label>
    <p class="muted small">El PIN evita cambios accidentales. No es autenticación real: ver README › Seguridad.</p>
  </section>${saveBar("settings")}`;
}

/* ---------- Personal ---------- */

function staffList(key, title, hint) {
  const arr = work.settings[key];
  return `<section class="s-card"><h3>${title}</h3><p class="muted small">${hint}</p>
    <div class="staff-list">${arr.map((w, i) => `<div class="staff-row ${w.active === false ? "off" : ""}">
      <input class="field" data-staff="${key}" data-i="${i}" value="${esc(w.name)}" aria-label="Nombre">
      <label class="mini-toggle"><input type="checkbox" data-staff-active="${key}" data-i="${i}" ${w.active !== false ? "checked" : ""}> Activo</label>
      <button class="icon-btn danger" data-action="staff-del" data-key="${key}" data-i="${i}" aria-label="Eliminar">🗑</button>
      <small class="muted">${esc(w.id)}</small></div>`).join("")}</div>
    <button class="btn btn-ghost" data-action="staff-add" data-key="${key}">➕ Agregar</button></section>`;
}

function staffTab() {
  return staffList("waiters", "Meseros", "Las órdenes guardan una copia del nombre: editar o eliminar un mesero no altera órdenes anteriores.")
    + staffList("kitchenStaff", "Personal de cocina", "Opcional: permite registrar quién aceptó y quién completó cada orden.")
    + saveBar("settings");
}

/* ---------- Catálogo ---------- */

function catalogTab() {
  const c = work.catalog;
  const cat = c.categories.find((x) => x.id === work.catFilter) || c.categories[0];
  const prods = c.products.filter((p) => p.categoryId === cat?.id);
  return `<section class="s-card">
    <h3>Categorías</h3>
    <div class="cat-admin">${c.categories.map((k, i) => `<div class="cat-row ${k.active === false ? "off" : ""} ${k.id === cat?.id ? "sel" : ""}">
      <button class="cat-pick" data-action="cat-pick" data-id="${esc(k.id)}">${esc(k.icon || "🍴")} ${esc(k.name)} <small>(${c.products.filter((p) => p.categoryId === k.id).length})</small></button>
      <button class="icon-btn" data-action="cat-up" data-i="${i}" aria-label="Subir">↑</button>
      <button class="icon-btn" data-action="cat-edit" data-i="${i}" aria-label="Editar">✏️</button>
      <label class="mini-toggle"><input type="checkbox" data-cat-active="${i}" ${k.active !== false ? "checked" : ""}> Activa</label>
    </div>`).join("")}</div>
    <button class="btn btn-ghost" data-action="cat-add">➕ Nueva categoría</button>
  </section>
  ${cat ? `<section class="s-card">
    <h3>${esc(cat.icon || "")} ${esc(cat.name)} — productos</h3>
    <p class="muted small">El precio es sólo referencial (se muestra al mesero, nunca se suma).</p>
    <div class="prod-admin">${prods.map((p) => {
      const i = c.products.indexOf(p);
      return `<div class="prod-row ${p.active === false ? "off" : ""}">
        <input class="field" data-prod="name" data-i="${i}" value="${esc(p.name)}" aria-label="Nombre">
        <input class="field narrow" data-prod="referencePrice" data-i="${i}" type="number" step="0.01" min="0" inputmode="decimal" value="${p.referencePrice ?? ""}" aria-label="Precio referencial">
        <select class="field narrow" data-prod="categoryId" data-i="${i}" aria-label="Categoría">${c.categories.map((k) => `<option value="${esc(k.id)}" ${k.id === p.categoryId ? "selected" : ""}>${esc(k.name)}</option>`).join("")}</select>
        <label class="mini-toggle"><input type="checkbox" data-prod-active="${i}" ${p.active !== false ? "checked" : ""}> Activo</label>
      </div>`;
    }).join("") || `<p class="empty">Sin productos.</p>`}</div>
    <button class="btn btn-ghost" data-action="prod-add" data-cat="${esc(cat.id)}">➕ Nuevo producto en ${esc(cat.name)}</button>
  </section>` : ""}
  <section class="s-card">
    <h3>Origen del catálogo</h3>
    <p class="muted small">${state.catalogFromServer ? "Usando el catálogo guardado en la base de datos." : "Usando el catálogo por defecto (Precios_Takolandia.xlsx). Al guardar, se publicará en la base de datos."}</p>
    <button class="btn btn-danger-ghost" data-action="cat-reset">↺ Restaurar catálogo original del Excel</button>
  </section>${saveBar("catalog")}`;
}

/* ---------- Sistema ---------- */

function systemTab() {
  const c = CONN_LABELS[state.conn] || {};
  const queued = Object.keys(getOutbox()).length;
  return `<section class="s-card">
    <h3>Conexión</h3>
    <div class="sys-grid">
      <div><small>Estado</small><b class="conn-${c.cls}">${c.text || state.conn}</b></div>
      <div><small>Base de datos</small>${IS_DEMO ? "MODO DEMO LOCAL (Firebase sin configurar)" : "Firebase Realtime Database"}</div>
      <div><small>Autenticación</small>${IS_DEMO ? "—" : AUTH_MODE === "email" ? `Usuario: ${esc(dataService.userEmail)}` : "Anónima por dispositivo"}</div>
      <div><small>UID</small><code>${esc(dataService.uid || "—")}</code></div>
      <div><small>Dispositivo</small><code>${esc(deviceId())}</code></div>
      <div><small>Órdenes sin enviar en este dispositivo</small>${queued}</div>
      <div><small>Órdenes activas</small>${state.activeOrders.length}</div>
    </div>
    ${!IS_DEMO && AUTH_MODE === "email" ? `<button class="btn btn-ghost" data-action="signout">Cerrar sesión de este dispositivo</button>` : ""}
  </section>
  ${IS_DEMO ? `<section class="s-card"><h3>Herramientas del modo demo</h3>
    <p class="muted small">Sólo existen en modo demo, para probar sin Firebase.</p>
    <label class="s-row toggle"><span>Simular SIN CONEXIÓN en esta pestaña</span><input type="checkbox" data-action-change="sim-offline" ${state.conn === "offline" ? "checked" : ""}></label>
    <button class="btn btn-danger-ghost" data-action="demo-reset">Borrar datos de la demo</button></section>` : ""}
  <section class="s-card"><h3>Aplicación</h3>
    <p>INSTAOrder · ${esc(state.settings.restaurantName)} – ${esc(state.settings.restaurantSubtitle)}</p>
    <button class="btn btn-ghost" data-action="check-update">Buscar actualización de la app</button>
  </section>`;
}

/* ---------- Guardado ---------- */

async function save(what) {
  if (!dataService.isConnected()) return toast("Sin conexión: no se puede guardar ahora.", "error");
  try {
    if (what === "settings") {
      const s = work.settings;
      s.tableCount = Math.max(1, Math.min(200, parseInt(s.tableCount, 10) || 20));
      s.waiters = s.waiters.filter((w) => w.name.trim()).map((w) => ({ ...w, name: w.name.trim() }));
      s.kitchenStaff = s.kitchenStaff.filter((w) => w.name.trim()).map((w) => ({ ...w, name: w.name.trim() }));
      if (!/^\d{4,8}$/.test(String(s.adminPin))) return toast("El PIN debe tener de 4 a 8 dígitos", "error");
      await dataService.saveSettings({
        restaurantName: s.restaurantName.trim() || DEFAULT_SETTINGS.restaurantName,
        restaurantSubtitle: s.restaurantSubtitle.trim(),
        tableCount: s.tableCount, logo: s.logo || "", adminPin: String(s.adminPin),
        waiters: s.waiters, kitchenStaff: s.kitchenStaff,
      });
    } else {
      const c = work.catalog;
      c.products.forEach((p, i) => { p.order = i + 1; p.name = p.name.trim(); });
      c.categories.forEach((k, i) => { k.order = i + 1; });
      await dataService.saveCatalog({ version: (c.version || 1) + 1, source: "INSTAOrder", categories: c.categories, products: c.products.filter((p) => p.name) });
    }
    work.dirty = false;
    toast("Cambios guardados y sincronizados", "success");
    const f = work.catFilter; work = freshWork(); work.catFilter = f;
    render();
  } catch (e) {
    console.error(e);
    toast("No se pudo guardar (permisos o conexión).", "error", 4000);
  }
}

function markDirty() {
  work.dirty = true;
  const bar = $(".save-bar", root);
  if (bar) bar.outerHTML = saveBar(tab === "catalogo" ? "catalog" : "settings");
}

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- Eventos ---------- */

async function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  const i = Number(b.dataset.i);
  switch (a) {
    case "s-back":
      if (work.dirty && !(await confirmDialog("Cambios sin guardar", "¿Salir sin guardar?", "Salir", "danger"))) return;
      history.length > 1 ? history.back() : go("inicio");
      break;
    case "tab":
      if (work.dirty && !(await confirmDialog("Cambios sin guardar", "¿Cambiar de sección y descartar los cambios?", "Descartar", "danger"))) return;
      work = freshWork(); tab = b.dataset.tab; history.replaceState(null, "", `#/config/${tab}`); render();
      break;
    case "unlock":
      if (await askPin(state.settings.adminPin)) { setPinUnlocked(true); render(); }
      break;
    case "discard": work = freshWork(); render(); break;
    case "save-settings": save("settings"); break;
    case "save-catalog": save("catalog"); break;
    case "test-new": unlockAudio(); setTimeout(() => playAlert("test"), 80); break;
    case "test-ready": unlockAudio(); setTimeout(() => { playAlert("test"); vibrate(); }, 80); break;
    case "notif": await Notification.requestPermission(); render(); break;
    case "logo-reset": work.settings.logo = ""; markDirty(); render(); break;
    case "staff-add": {
      const key = b.dataset.key;
      work.settings[key].push({ id: `${key === "waiters" ? "waiter" : "cook"}-${randomId(5).toLowerCase()}`, name: "", active: true });
      markDirty(); render();
      setTimeout(() => { const ins = root.querySelectorAll(`[data-staff="${key}"]`); ins[ins.length - 1]?.focus(); }, 30);
      break;
    }
    case "staff-del": {
      const w = work.settings[b.dataset.key][i];
      if (await confirmDialog("Eliminar", `¿Eliminar a "${w.name || "(sin nombre)"}" de la lista? Sus órdenes anteriores no se modifican. (También puedes sólo desactivarlo.)`, "Eliminar", "danger")) {
        work.settings[b.dataset.key].splice(i, 1); markDirty(); render();
      }
      break;
    }
    case "cat-pick": work.catFilter = b.dataset.id; render(); break;
    case "cat-up": if (i > 0) { const arr = work.catalog.categories; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; markDirty(); render(); } break;
    case "cat-edit": {
      const k = work.catalog.categories[i];
      const name = await dialog({ title: "Nombre de la categoría", input: { value: k.name }, confirmText: "Aceptar" });
      if (name === null || !name.trim()) return;
      const icon = await dialog({ title: "Ícono (emoji)", input: { value: k.icon || "" }, confirmText: "Aceptar" });
      k.name = name.trim(); if (icon !== null) k.icon = icon.trim().slice(0, 4);
      markDirty(); render();
      break;
    }
    case "cat-add": {
      const name = await dialog({ title: "Nueva categoría", input: { placeholder: "Ej.: Postres" }, confirmText: "Crear" });
      if (!name || !name.trim()) return;
      let id = slug(name) || "cat";
      if (work.catalog.categories.some((k) => k.id === id)) id += "-" + randomId(3).toLowerCase();
      work.catalog.categories.push({ id, name: name.trim(), icon: "🍴", active: true, order: work.catalog.categories.length + 1 });
      work.catFilter = id; markDirty(); render();
      break;
    }
    case "prod-add": {
      const name = await dialog({ title: "Nuevo producto", input: { placeholder: "Nombre del producto" }, confirmText: "Agregar" });
      if (!name || !name.trim()) return;
      work.catalog.products.push({ id: `p-${slug(name)}-${randomId(3).toLowerCase()}`, name: name.trim(), categoryId: b.dataset.cat, referencePrice: null, active: true });
      markDirty(); render();
      break;
    }
    case "cat-reset":
      if (await confirmDialog("Restaurar catálogo", "Se reemplazará el catálogo actual por el original de Precios_Takolandia.xlsx al guardar. Las órdenes existentes no cambian.", "Restaurar", "danger")) {
        work.catalog = JSON.parse(JSON.stringify(normalizeCatalog(DEFAULT_CATALOG))); work.catFilter = work.catalog.categories[0].id; markDirty(); render();
      }
      break;
    case "signout":
      if (await confirmDialog("Cerrar sesión", "Este dispositivo dejará de recibir órdenes hasta que vuelvas a iniciar sesión.", "Cerrar sesión", "danger")) {
        await dataService.signOut(); location.reload();
      }
      break;
    case "demo-reset":
      if (await confirmDialog("Borrar datos de la demo", "Se borran las órdenes y la configuración de la demo en este navegador.", "Borrar", "danger")) {
        dataService.adapter.resetDemo(); toast("Datos de demo borrados");
      }
      break;
    case "check-update":
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
        toast(reg?.waiting ? "Hay una versión nueva: toca 'Actualizar ahora'." : "Estás usando la última versión.");
      }
      break;
  }
}

function onChange(e) {
  const t = e.target;
  if (t.dataset.pref) {
    const v = t.type === "checkbox" ? t.checked : t.type === "range" || t.dataset.pref === "repeatSeconds" ? Number(t.value) : t.value;
    setPrefs({ [t.dataset.pref]: v });
    if (t.dataset.pref === "soundEnabled" && v) unlockAudio();
    toast("Preferencia guardada en este dispositivo");
    return;
  }
  if (t.dataset.actionChange === "sim-offline") { dataService.adapter.setSimulatedOffline(t.checked); return; }
  if (t.dataset.actionChange === "logo" && t.files?.[0]) { loadLogo(t.files[0]); return; }
  if (t.dataset.staffActive) { work.settings[t.dataset.staffActive][+t.dataset.i].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.catActive) { work.catalog.categories[+t.dataset.catActive].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.prodActive) { work.catalog.products[+t.dataset.prodActive].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.prod === "categoryId") { work.catalog.products[+t.dataset.i].categoryId = t.value; markDirty(); render(); }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.ws) { work.settings[t.dataset.ws] = t.value; markDirty(); }
  else if (t.dataset.staff) { work.settings[t.dataset.staff][+t.dataset.i].name = t.value; markDirty(); }
  else if (t.dataset.prod === "name") { work.catalog.products[+t.dataset.i].name = t.value; markDirty(); }
  else if (t.dataset.prod === "referencePrice") {
    const n = parseFloat(t.value);
    work.catalog.products[+t.dataset.i].referencePrice = isFinite(n) ? Math.round(n * 100) / 100 : null;
    markDirty();
  }
}

/** Reduce la imagen del logo y la guarda como data URL (pequeña). */
function loadLogo(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const max = 320;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    work.settings.logo = c.toDataURL("image/png");
    URL.revokeObjectURL(url);
    markDirty(); render();
  };
  img.src = url;
}
