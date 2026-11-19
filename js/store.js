/**
 * INSTAOrder — Almacenamiento local del dispositivo
 * --------------------------------------------------
 * Lo que vive SOLO en este teléfono/tablet (localStorage):
 *  - ID del dispositivo, último modo usado, mesero / cocinero seleccionado.
 *  - Preferencias de alertas y sonido de este dispositivo.
 *  - Borradores de pedidos (aún no enviados) por mesa.
 *  - Bandeja de salida: órdenes confirmadas por el mesero que aún no han
 *    sido confirmadas por el servidor (p. ej. sin conexión). Se reintentan
 *    con el MISMO ID, por lo que nunca se duplican.
 *
 * Nota: una actualización de la app (GitHub Pages / Service Worker) no borra
 * localStorage, así que los borradores y la bandeja de salida sobreviven.
 */

import { randomId } from "../firebase-service.js";

const K = {
  device: "instaorder.deviceId",
  mode: "instaorder.lastMode",
  waiter: "instaorder.waiter",
  cook: "instaorder.cook",
  prefs: "instaorder.prefs",
  drafts: "instaorder.drafts",
  outbox: "instaorder.outbox",
  pin: "instaorder.pinOk",
};

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function deviceId() {
  let id = localStorage.getItem(K.device);
  if (!id) { id = "DEV-" + randomId(8); localStorage.setItem(K.device, id); }
  return id;
}

export const getLastMode = () => localStorage.getItem(K.mode);
export const setLastMode = (m) => (m ? localStorage.setItem(K.mode, m) : localStorage.removeItem(K.mode));

export const getWaiter = () => read(K.waiter, null);
export const setWaiter = (w) => (w ? write(K.waiter, w) : localStorage.removeItem(K.waiter));

export const getCook = () => read(K.cook, null);
export const setCook = (c) => (c ? write(K.cook, c) : localStorage.removeItem(K.cook));

/* ---------- Preferencias de alertas (por dispositivo) ---------- */

export const DEFAULT_PREFS = {
  soundEnabled: true,
  soundTone: "chime",      // chime | bell | beep
  volume: 0.8,             // 0..1
  repeatSeconds: 20,       // 0 = no repetir; repetición moderada mientras haya alertas pendientes
  vibrate: true,           // teléfonos Android
  blinkStyle: "normal",    // suave | normal | intenso
  keepScreenOn: true,      // tablet de cocina (Wake Lock si el navegador lo permite)
};

export const getPrefs = () => ({ ...DEFAULT_PREFS, ...read(K.prefs, {}) });
export const setPrefs = (p) => write(K.prefs, { ...getPrefs(), ...p });

/* ---------- Borradores por mesa ---------- */

export function getDrafts() { return read(K.drafts, {}); }

export function getDraft(table) {
  return getDrafts()[table] || null;
}

export function saveDraft(table, draft) {
  const all = getDrafts();
  if (!draft || (!draft.items?.length && !draft.generalNotes?.trim() && !draft.correctionOf)) delete all[table];
  else all[table] = { ...draft, updatedAt: Date.now() };
  write(K.drafts, all);
}

export function clearDraft(table) { saveDraft(table, null); }

/* ---------- Bandeja de salida ---------- */

export function getOutbox() { return read(K.outbox, {}); }

export function putOutbox(entry) {
  const all = getOutbox();
  all[entry.order.orderId] = entry;
  write(K.outbox, all);
}

export function patchOutbox(orderId, patch) {
  const all = getOutbox();
  if (!all[orderId]) return;
  all[orderId] = { ...all[orderId], ...patch, order: { ...all[orderId].order, ...(patch.order || {}) } };
  write(K.outbox, all);
}

export function removeOutbox(orderId) {
  const all = getOutbox();
  delete all[orderId];
  write(K.outbox, all);
}

/* ---------- Sesión de configuración (PIN) ---------- */
export const pinUnlocked = () => sessionStorage.getItem(K.pin) === "1";
export const setPinUnlocked = (v) => sessionStorage.setItem(K.pin, v ? "1" : "0");
