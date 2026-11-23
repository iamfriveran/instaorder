/**
 * INSTAOrder — Componentes visuales compartidos (cabecera, estado de conexión).
 */

import { state, logoSrc } from "./state.js";
import { dataService } from "../firebase-service.js";
import { esc } from "./ui.js";

export const CONN_LABELS = {
  connected: { text: "Conectado", cls: "ok" },
  connecting: { text: "Conectando…", cls: "warn" },
  reconnecting: { text: "Reconectando…", cls: "warn" },
  offline: { text: "Sin conexión", cls: "bad" },
  demo: { text: "Modo demo local", cls: "demo" },
  "auth-error": { text: "Error de acceso", cls: "bad" },
};

export function connPill() {
  const c = CONN_LABELS[state.conn] || CONN_LABELS.connecting;
  return `<span class="conn-pill conn-${c.cls}" data-conn-pill role="status">
    <span class="conn-dot"></span><span class="conn-text">${c.text}</span></span>`;
}

/** Refresca todos los indicadores de conexión visibles. */
export function refreshConnPills() {
  const c = CONN_LABELS[state.conn] || CONN_LABELS.connecting;
  document.querySelectorAll("[data-conn-pill]").forEach((el) => {
    el.className = `conn-pill conn-${c.cls}`;
    el.querySelector(".conn-text").textContent = c.text;
  });
}

/**
 * Cabecera de las pantallas de trabajo.
 * @param {{title:string, subtitle?:string, back?:string, right?:string, variant?:string}} o
 */
export function appHeader(o) {
  return `
  <header class="app-header ${o.variant ? "app-header-" + o.variant : ""}">
    <div class="hdr-left">
      ${o.back ? `<button class="icon-btn" data-action="${esc(o.back)}" aria-label="Volver">‹</button>` : ""}
      <img class="hdr-logo" src="${esc(logoSrc())}" alt="Logo ${esc(state.settings.restaurantName)}">
      <div class="hdr-titles">
        <div class="hdr-brand">INSTA<b>Order</b></div>
        <div class="hdr-sub">${esc(o.subtitle || state.settings.restaurantName)}</div>
      </div>
    </div>
    ${o.center ? `<div class="hdr-center">${o.center}</div>` : ""}
    <div class="hdr-right">${o.right || ""}${o.noHome ? "" : `<button class="icon-btn hdr-home" data-home aria-label="Ir al inicio" title="Inicio">🏠</button>`}${connPill()}</div>
  </header>`;
}

export function demoNotice() {
  if (!dataService.isDemo) return "";
  return `<div class="demo-strip">MODO DEMO LOCAL · Firebase no configurado · los pedidos sólo se comparten entre pestañas de este navegador</div>`;
}
