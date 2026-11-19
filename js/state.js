/**
 * INSTAOrder — Estado compartido de la aplicación
 * Un único objeto `state` + suscripción simple para refrescar la pantalla activa.
 */

import { DEFAULT_CATALOG } from "../catalog.js";

export const DEFAULT_SETTINGS = {
  restaurantName: "Takolandia",
  restaurantSubtitle: "Comida Mexicana",
  tableCount: 20,
  logo: "",          // vacío = assets/logo.png. Puede ser una URL o imagen subida (data URL).
  adminPin: "1234",  // PIN de configuración (bloqueo operativo, NO es seguridad real)
  waiters: [
    { id: "waiter-001", name: "Carlos", active: true },
    { id: "waiter-002", name: "María", active: true },
    { id: "waiter-003", name: "José", active: true },
    { id: "waiter-004", name: "Andrea", active: true },
  ],
  kitchenStaff: [
    { id: "cook-001", name: "Chef Luis", active: true },
    { id: "cook-002", name: "Rosa", active: true },
  ],
};

export const state = {
  settings: { ...DEFAULT_SETTINGS },
  settingsLoaded: false,
  catalog: DEFAULT_CATALOG,
  catalogFromServer: false,
  activeOrders: [],
  ordersLoaded: false,
  conn: "connecting",
  dataError: null,
};

const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit() { subs.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

/** Lista (array) a partir de lo que Firebase devuelva (array u objeto). */
export function list(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : Object.values(v).filter(Boolean);
}

export function mergeSettings(remote) {
  const s = { ...DEFAULT_SETTINGS, ...(remote || {}) };
  s.waiters = list(remote?.waiters ?? DEFAULT_SETTINGS.waiters);
  s.kitchenStaff = list(remote?.kitchenStaff ?? DEFAULT_SETTINGS.kitchenStaff);
  s.tableCount = Math.max(1, Math.min(200, Number(s.tableCount) || 20));
  return s;
}

export function normalizeCatalog(c) {
  const cat = c || DEFAULT_CATALOG;
  return {
    ...cat,
    categories: list(cat.categories).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    products: list(cat.products).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

export const logoSrc = () => state.settings.logo || "assets/logo.png";

export function activeWaiters() { return state.settings.waiters.filter((w) => w.active !== false); }
export function activeCooks() { return state.settings.kitchenStaff.filter((w) => w.active !== false); }

export function categoryById(id) { return state.catalog.categories.find((c) => c.id === id); }
