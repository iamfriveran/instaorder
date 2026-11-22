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
import { state, DEFAULT_SETTINGS, normalizeCatalog, logoSrc, can } from "./state.js";
import { authErrorText, normUser } from "./auth.js";
import { composition, editComposition, ingName } from "./availability.js";
import { go } from "./router.js";
import { appHeader, demoNotice, CONN_LABELS } from "./components.js";
import { getPrefs, setPrefs, pinUnlocked, setPinUnlocked, deviceId, getOutbox } from "./store.js";
import { playAlert, unlockAudio, vibrate } from "./sound.js";
import { $, esc, toast, confirmDialog, askPin, dialog } from "./ui.js";

let root = null;
let tab = "alertas";
let work = null; // copia de trabajo de lo compartido

const TABS_PIN = [
  ["alertas", "🔔 Alertas"], ["general", "🏷️ General"], ["personal", "👥 Personal"],
  ["catalogo", "🌮 Catálogo"], ["sistema", "📡 Sistema"],
];
const TABS_USERS = [
  ["alertas", "🔔 Alertas"], ["cuenta", "👤 Mi cuenta"], ["general", "🏷️ General"], ["usuarios", "👥 Usuarios"],
  ["catalogo", "🌮 Catálogo"], ["sistema", "📡 Sistema"],
];
const ADMIN_TABS = new Set(["general", "usuarios", "personal", "catalogo"]);
// Modo sin usuarios: lo compartido se protege con PIN. Modo usuarios: con el rol Admin.
const LOCKED = new Set(["general", "personal", "catalogo"]);

function tabs() {
  if (!state.usersMode) return TABS_PIN;
  return TABS_USERS.filter(([k]) => !ADMIN_TABS.has(k) || can("admin"));
}
const isLocked = (k) => !state.usersMode && LOCKED.has(k) && !pinUnlocked();
let newUser = { displayName: "", username: "", password: "", waiter: true, kitchen: false, admin: false, shared: false };

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
  if (!tabs().some(([k]) => k === tab)) tab = "alertas";
  $("#s-tabs", root).innerHTML = tabs().map(([k, t]) =>
    `<button class="tab ${tab === k ? "on" : ""}" data-action="tab" data-tab="${k}">${t}${isLocked(k) ? " 🔒" : ""}</button>`).join("");
  const body = $("#s-body", root);
  const active = document.activeElement;
  if (body.contains(active) && active.matches("input[type=text],input:not([type]),textarea")) return; // no interrumpir escritura
  if (isLocked(tab)) {
    body.innerHTML = `<div class="locked"><div class="lock-ico">🔒</div><p>Esta sección requiere el PIN de administración.</p>
      <button class="btn btn-primary btn-lg" data-action="unlock">Ingresar PIN</button>
      <p class="muted small">PIN inicial: 1234 (cámbialo en General).</p></div>`;
    return;
  }
  body.innerHTML = ({ alertas: alertsTab, general: generalTab, personal: staffTab, catalogo: catalogTab, sistema: systemTab,
    cuenta: accountTab, usuarios: usersTab })[tab]();
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
  ${state.usersMode ? "" : `<section class="s-card">
    <h3>PIN de configuración</h3>
    <label class="s-row"><span>PIN (4–8 dígitos)</span><input class="field narrow" inputmode="numeric" data-ws="adminPin" value="${esc(s.adminPin)}"></label>
    <p class="muted small">El PIN evita cambios accidentales. No es autenticación real: ver README › Seguridad.</p>
  </section>`}${saveBar("settings")}`;
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
    <p class="muted small">🍳 Cocina = los productos se envían a la pantalla de cocina. 🥤 Mesero = bebidas que sirve el mesero; NO se envían a cocina.</p>
    <div class="cat-admin">${c.categories.map((k, i) => `<div class="cat-row ${k.active === false ? "off" : ""} ${k.id === cat?.id ? "sel" : ""}">
      <button class="cat-pick" data-action="cat-pick" data-id="${esc(k.id)}">${esc(k.icon || "🍴")} ${esc(k.name)} <small>(${c.products.filter((p) => p.categoryId === k.id).length})</small></button>
      <button class="icon-btn" data-action="cat-up" data-i="${i}" aria-label="Subir">↑</button>
      <button class="icon-btn" data-action="cat-edit" data-i="${i}" aria-label="Editar">✏️</button>
      <button class="station-btn ${k.station === "waiter" ? "st-w" : "st-k"}" data-action="cat-station" data-i="${i}" title="¿A dónde va esta categoría?">${k.station === "waiter" ? "🥤 Mesero" : "🍳 Cocina"}</button>
      <label class="mini-toggle"><input type="checkbox" data-cat-active="${i}" ${k.active !== false ? "checked" : ""}> Activa</label>
    </div>`).join("")}</div>
    <button class="btn btn-ghost" data-action="cat-add">➕ Nueva categoría</button>
  </section>
  ${cat ? `<section class="s-card">
    <h3>${esc(cat.icon || "")} ${esc(cat.name)} — productos</h3>
    <p class="muted small">El precio es sólo referencial (se muestra al mesero, nunca se suma). La descripción aparece al mesero y en la pantalla de cocina.</p>
    <div class="prod-admin">${prods.map((p) => {
      const i = c.products.indexOf(p);
      return `<div class="prod-row ${p.active === false ? "off" : ""}">
        <input class="field" data-prod="name" data-i="${i}" value="${esc(p.name)}" aria-label="Nombre">
        <input class="field narrow" data-prod="referencePrice" data-i="${i}" type="number" step="0.01" min="0" inputmode="decimal" value="${p.referencePrice ?? ""}" aria-label="Precio referencial">
        <select class="field narrow" data-prod="categoryId" data-i="${i}" aria-label="Categoría">${c.categories.map((k) => `<option value="${esc(k.id)}" ${k.id === p.categoryId ? "selected" : ""}>${esc(k.name)}</option>`).join("")}</select>
        <label class="mini-toggle"><input type="checkbox" data-prod-active="${i}" ${p.active !== false ? "checked" : ""}> Activo</label>
        <button class="btn btn-ghost btn-sm" data-action="prod-ing" data-i="${i}">🧩 Ingredientes</button>
        <div class="comp-sum">${compSummary(p)}</div>
        <input class="field prod-desc" data-prod="description" data-i="${i}" value="${esc(p.description || "")}"
          placeholder="Descripción para cocina (ej.: Tortilla de maíz, carne de res, guacamole, cebolla y limón)" aria-label="Descripción">
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

/* ---------- Mi cuenta (modo usuarios) ---------- */

const ROLE_TXT = { waiter: "🧾 Mesero", kitchen: "👨‍🍳 Cocina", admin: "🛡️ Admin" };
const roleChips = (r = {}) => Object.keys(ROLE_TXT).filter((k) => r[k]).map((k) => `<span class="role-chip r-${k}">${ROLE_TXT[k]}</span>`).join(" ") || "<span class='muted'>Sin roles</span>";

function accountTab() {
  const me = state.me || {};
  return `<section class="s-card">
    <h3>Mi cuenta</h3>
    <div class="sys-grid">
      <div><small>Nombre</small><b>${esc(me.displayName)}</b></div>
      <div><small>Usuario</small><b>${esc(me.username)}</b></div>
      <div><small>Roles</small>${roleChips(me.roles)}</div>
      ${me.shared ? `<div><small>Tipo</small>Tablet compartida de cocina</div>` : ""}
    </div>
  </section>
  <section class="s-card">
    <h3>Cambiar mi contraseña</h3>
    <form class="pw-form" autocomplete="off">
      <input class="field" name="cur" type="password" placeholder="Contraseña actual" required autocomplete="current-password">
      <input class="field" name="n1" type="password" placeholder="Contraseña nueva (mínimo 6)" required minlength="6" autocomplete="new-password">
      <input class="field" name="n2" type="password" placeholder="Repite la contraseña nueva" required minlength="6" autocomplete="new-password">
      <button class="btn btn-primary" data-action="change-pw" type="button">Cambiar contraseña</button>
    </form>
  </section>
  <section class="s-card">
    <h3>Sesión</h3>
    <p class="muted small">Cierra sesión si este teléfono lo va a usar otra persona.</p>
    <button class="btn btn-danger-ghost" data-action="signout">Cerrar sesión</button>
  </section>`;
}

/* ---------- Usuarios (sólo Admin) ---------- */

function usersTab() {
  const users = state.users.slice().sort((a, b) => (b.active === true) - (a.active === true) || a.displayName.localeCompare(b.displayName));
  const n = newUser;
  return `<section class="s-card">
    <h3>➕ Nuevo usuario</h3>
    <div class="nu-grid">
      <label>Nombre (como aparecerá)<input class="field" data-nu="displayName" value="${esc(n.displayName)}" placeholder="Ej.: Saby" maxlength="40"></label>
      <label>Usuario para entrar<input class="field" data-nu="username" value="${esc(n.username)}" placeholder="Ej.: saby" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
      <label>Contraseña (mínimo 6)<span class="pw-row"><input class="field" data-nu="password" value="${esc(n.password)}" placeholder="Ej.: 482913" autocomplete="off">
        <button class="btn btn-ghost btn-sm" data-action="nu-gen" type="button">🎲 Generar</button></span></label>
    </div>
    <div class="role-picks">
      <label class="mini-toggle"><input type="checkbox" data-nur="waiter" ${n.waiter ? "checked" : ""}> 🧾 Mesero</label>
      <label class="mini-toggle"><input type="checkbox" data-nur="kitchen" ${n.kitchen ? "checked" : ""}> 👨‍🍳 Cocina</label>
      <label class="mini-toggle"><input type="checkbox" data-nur="admin" ${n.admin ? "checked" : ""}> 🛡️ Admin</label>
      <label class="mini-toggle"><input type="checkbox" data-nur="shared" ${n.shared ? "checked" : ""}> 📟 Tablet compartida de cocina</label>
    </div>
    <p class="muted small">"Tablet compartida": cuenta para la tablet de cocina que usan varias personas; al aceptar o completar, cada cocinero elige su nombre.</p>
    <button class="btn btn-primary" data-action="nu-create">Crear usuario</button>
  </section>
  <section class="s-card">
    <h3>👥 Usuarios (${users.filter((u) => u.active === true).length} activos)</h3>
    <p class="muted small">Los cambios se aplican al instante. Al desactivar una cuenta, esa persona pierde el acceso de inmediato; su historial se conserva.</p>
    <div class="user-list">${users.map((u) => {
      const self = u.uid === state.me?.uid;
      const r = u.roles || {};
      return `<div class="user-row ${u.active === true ? "" : "off"}">
        <div class="ur-head">
          <span class="avatar">${esc((u.displayName || "?").charAt(0).toUpperCase())}</span>
          <div class="ur-name"><b>${esc(u.displayName)}</b>${self ? ' <span class="mini-chip st-sent">Tú</span>' : ""}<br><small>usuario: ${esc(u.username)}${u.shared ? " · 📟 tablet compartida" : ""}</small></div>
          <span class="status-chip ${u.active === true ? "st-ready" : ""}">${u.active === true ? "Activo" : "Desactivado"}</span>
        </div>
        <div class="ur-roles">
          ${["waiter", "kitchen", "admin"].map((k) => `<label class="mini-toggle"><input type="checkbox" data-urole="${k}" data-uid="${esc(u.uid)}" ${r[k] ? "checked" : ""} ${(self && k === "admin") || u.active !== true ? "disabled" : ""}> ${ROLE_TXT[k]}</label>`).join("")}
        </div>
        ${self ? "" : `<div class="ur-actions">
          ${u.active === true
            ? `<button class="btn btn-sm btn-danger-ghost" data-action="u-deactivate" data-uid="${esc(u.uid)}">⛔ Desactivar</button>
               <button class="btn btn-sm btn-ghost" data-action="u-replace" data-uid="${esc(u.uid)}">🔑 Olvidó su contraseña</button>`
            : `<button class="btn btn-sm btn-ghost" data-action="u-activate" data-uid="${esc(u.uid)}">✅ Reactivar</button>`}
        </div>`}
      </div>`;
    }).join("")}</div>
  </section>`;
}

const meAsAdmin = () => ({ id: state.me?.uid, name: state.me?.displayName });

function genPassword() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

async function createNewUser() {
  const n = newUser;
  const username = normUser(n.username);
  if (!n.displayName.trim()) return toast("Escribe el nombre", "error");
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return toast("Usuario: 3 a 30 letras minúsculas o números, sin espacios ni acentos", "error");
  if (n.password.length < 6) return toast("La contraseña debe tener al menos 6 caracteres", "error");
  if (!n.waiter && !n.kitchen && !n.admin) return toast("Marca al menos un rol", "error");
  if (state.users.some((u) => u.username === username)) return toast("Ese usuario ya existe", "error");
  const btn = $("[data-action=nu-create]", root);
  btn.disabled = true; btn.textContent = "Creando…";
  try {
    await dataService.createUser({
      username, displayName: n.displayName, password: n.password,
      roles: { waiter: n.waiter, kitchen: n.kitchen, admin: n.admin }, shared: n.shared,
    }, meAsAdmin());
    const shown = { ...n, username };
    newUser = { displayName: "", username: "", password: "", waiter: true, kitchen: false, admin: false, shared: false };
    render();
    await dialog({
      title: "✅ Usuario creado",
      html: true,
      body: `<p>Entrega estos datos a <b>${esc(shown.displayName)}</b>:</p>
        <div class="cred-box"><div>Usuario: <b>${esc(shown.username)}</b></div><div>Contraseña: <b>${esc(shown.password)}</b></div></div>
        <p class="muted small">Que entre a INSTAOrder con estos datos. Puede cambiar su contraseña en Configuración › Mi cuenta.</p>`,
      confirmText: "Listo", cancelText: "",
    });
  } catch (e) {
    toast(authErrorText(e), "error", 5000);
    btn.disabled = false; btn.textContent = "Crear usuario";
  }
}

async function setUserActive(uid, active) {
  const u = state.users.find((x) => x.uid === uid);
  if (!u) return;
  if (!active) {
    const ok = await confirmDialog(`¿Desactivar a ${u.displayName}?`,
      `${u.displayName} (usuario "${u.username}") pierde el acceso a INSTAOrder de inmediato en todos sus dispositivos.\nSus órdenes y su historial se conservan. Puedes reactivarlo cuando quieras.`,
      "Desactivar", "danger");
    if (!ok) return;
  }
  try { await dataService.updateUser(uid, { active }, meAsAdmin()); toast(active ? `${u.displayName} reactivado` : `${u.displayName} desactivado`, "success"); }
  catch (e) { toast(authErrorText(e), "error"); }
}

async function replaceAccount(uid) {
  const u = state.users.find((x) => x.uid === uid);
  if (!u) return;
  const ok = await confirmDialog("Olvidó su contraseña",
    `Por seguridad, la contraseña de otra persona no se puede ver ni cambiar desde la app.\n\nSe DESACTIVARÁ la cuenta "${u.username}" y se preparará una cuenta nueva para ${u.displayName} con los mismos roles. Su historial anterior se conserva.`,
    "Continuar");
  if (!ok) return;
  try { await dataService.updateUser(uid, { active: false }, meAsAdmin()); } catch (e) { return toast(authErrorText(e), "error"); }
  let base = u.username.replace(/\d+$/, ""), i = 2;
  while (state.users.some((x) => x.username === `${base}${i}`)) i++;
  newUser = { displayName: u.displayName, username: `${base}${i}`, password: genPassword(),
    waiter: !!u.roles?.waiter, kitchen: !!u.roles?.kitchen, admin: !!u.roles?.admin, shared: !!u.shared };
  render();
  root.querySelector(".settings").scrollIntoView?.({ behavior: "smooth" });
  toast("Revisa los datos y toca 'Crear usuario'", "info", 4000);
}

async function toggleRole(uid, role, value, input) {
  const u = state.users.find((x) => x.uid === uid);
  const roles = { ...(u?.roles || {}), [role]: value };
  if (!roles.waiter && !roles.kitchen && !roles.admin) { input.checked = !value; return toast("Debe tener al menos un rol (o desactívalo)", "error"); }
  if (role === "admin" && !value && state.users.filter((x) => x.active === true && x.roles?.admin).length <= 1) {
    input.checked = true; return toast("Debe quedar al menos un Admin activo", "error");
  }
  try { await dataService.updateUser(uid, { roles: { waiter: !!roles.waiter, kitchen: !!roles.kitchen, admin: !!roles.admin } }, meAsAdmin()); toast("Roles actualizados", "success"); }
  catch (e) { input.checked = !value; toast(authErrorText(e), "error"); }
}

async function changeMyPassword() {
  const f = $(".pw-form", root);
  if (f.n1.value.length < 6) return toast("La contraseña nueva debe tener al menos 6 caracteres", "error");
  if (f.n1.value !== f.n2.value) return toast("Las contraseñas nuevas no coinciden", "error");
  const b = $("[data-action=change-pw]", root); b.disabled = true;
  try { await dataService.changeOwnPassword(f.cur.value, f.n1.value); f.reset(); toast("Contraseña cambiada", "success"); }
  catch (e) { toast(authErrorText(e), "error", 4500); }
  b.disabled = false;
}

function compSummary(p) {
  const c = composition(p);
  const req = c.ingredients.filter((x) => x !== "ninguno").map((e) => String(e).split("|").map(ingName).join(" o "));
  const opt = c.optional.filter((x) => x !== "ninguno").map(ingName);
  if (!req.length && !opt.length) return `<span class="muted">Sin ingredientes controlados (siempre disponible)</span>`;
  return `${req.length ? `<b>Obligatorios:</b> ${esc(req.join(", "))}` : ""}${opt.length ? ` · <b>Opcionales:</b> ${esc(opt.join(", "))}` : ""}`;
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
      <div><small>Autenticación</small>${IS_DEMO ? "—" : state.usersMode ? `Usuario: ${esc(state.me?.username || "")}` : "Anónima por dispositivo"}</div>
      <div><small>UID</small><code>${esc(dataService.uid || "—")}</code></div>
      <div><small>Dispositivo</small><code>${esc(deviceId())}</code></div>
      <div><small>Órdenes sin enviar en este dispositivo</small>${queued}</div>
      <div><small>Órdenes activas</small>${state.activeOrders.length}</div>
    </div>
    ${state.usersMode ? `<button class="btn btn-ghost" data-action="signout">Cerrar sesión de este dispositivo</button>` : ""}
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
      if (!state.usersMode && !/^\d{4,8}$/.test(String(s.adminPin))) return toast("El PIN debe tener de 4 a 8 dígitos", "error");
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
    case "prod-ing": {
      const prod = work.catalog.products[i];
      const res = await editComposition(prod);
      if (!res) break;
      // Firebase no guarda listas vacías: "ninguno" marca "sin ingredientes" a propósito.
      prod.ingredients = res.ingredients.length ? res.ingredients : ["ninguno"];
      prod.optional = res.optional.length ? res.optional : ["ninguno"];
      markDirty(); render();
      break;
    }
    case "cat-pick": work.catFilter = b.dataset.id; render(); break;
    case "cat-station": { const k = work.catalog.categories[i]; k.station = k.station === "waiter" ? "kitchen" : "waiter"; markDirty(); render(); break; }
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
    case "nu-gen": newUser.password = genPassword(); { const i = $("[data-nu=password]", root); if (i) i.value = newUser.password; } break;
    case "nu-create": createNewUser(); break;
    case "u-deactivate": setUserActive(b.dataset.uid, false); break;
    case "u-activate": setUserActive(b.dataset.uid, true); break;
    case "u-replace": replaceAccount(b.dataset.uid); break;
    case "change-pw": changeMyPassword(); break;
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
  if (t.dataset.nur) { newUser[t.dataset.nur] = t.checked; if (t.dataset.nur === "shared" && t.checked) { newUser.kitchen = true; newUser.waiter = false; render(); } return; }
  if (t.dataset.urole) { toggleRole(t.dataset.uid, t.dataset.urole, t.checked, t); return; }
  if (t.dataset.actionChange === "sim-offline") { dataService.adapter.setSimulatedOffline(t.checked); return; }
  if (t.dataset.actionChange === "logo" && t.files?.[0]) { loadLogo(t.files[0]); return; }
  if (t.dataset.staffActive) { work.settings[t.dataset.staffActive][+t.dataset.i].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.catActive) { work.catalog.categories[+t.dataset.catActive].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.prodActive) { work.catalog.products[+t.dataset.prodActive].active = t.checked; markDirty(); render(); return; }
  if (t.dataset.prod === "categoryId") { work.catalog.products[+t.dataset.i].categoryId = t.value; markDirty(); render(); }
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.nu) { newUser[t.dataset.nu] = t.value; return; }
  if (t.dataset.ws) { work.settings[t.dataset.ws] = t.value; markDirty(); }
  else if (t.dataset.staff) { work.settings[t.dataset.staff][+t.dataset.i].name = t.value; markDirty(); }
  else if (t.dataset.prod === "name") { work.catalog.products[+t.dataset.i].name = t.value; markDirty(); }
  else if (t.dataset.prod === "description") { work.catalog.products[+t.dataset.i].description = t.value.slice(0, 300); markDirty(); }
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
