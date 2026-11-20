/**
 * INSTAOrder — Instalación en teléfonos (PWA) y pantalla de Ayuda
 * ================================================================
 * - Android / Chrome / Edge / Samsung Internet: el navegador dispara el evento
 *   "beforeinstallprompt"; lo guardamos y mostramos el botón
 *   "📲 Instalar INSTAOrder". Al tocarlo aparece el diálogo oficial del sistema.
 * - iPhone / iPad (Safari): iOS no tiene ese evento. Se muestran las
 *   instrucciones de "Compartir › Añadir a pantalla de inicio".
 * - Si la app ya está instalada (se abrió desde el icono), no se muestra nada.
 *
 * INSTAOrder es una aplicación web instalable (PWA), no una app nativa de iOS.
 */

import { appHeader } from "./components.js";
import { go } from "./router.js";
import { dialog, esc } from "./ui.js";
import { state } from "./state.js";
import { dataService } from "../firebase-service.js";
import { CONN_LABELS } from "./components.js";

let deferredPrompt = null;
const listeners = new Set();

/** true si INSTAOrder se está ejecutando como app instalada (desde el icono). */
export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.navigator.standalone === true
    || document.referrer.startsWith("android-app://")
    || /INSTAOrderApp/.test(navigator.userAgent); // APK (Capacitor)
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isAndroid = () => /android/i.test(navigator.userAgent);

export function canPromptInstall() { return !!deferredPrompt; }
export function onInstallChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }
const notify = () => listeners.forEach((cb) => cb());

export function initInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // mostramos nuestro propio botón
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    localStorage.setItem("instaorder.installed", "1");
    notify();
  });
}

/** Botón de la pantalla de inicio. Vacío si ya está instalada. */
export function installButtonHtml() {
  if (isInstalled()) return "";
  return `<button class="install-btn" data-install>📲 Instalar INSTAOrder en este teléfono</button>`;
}

/** Acción del botón "Instalar". */
export async function startInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    notify();
    if (choice?.outcome === "accepted") return;
  }
  await dialog({
    title: "Instalar INSTAOrder",
    body: instructionsHtml(isIOS() ? "ios" : "android", true),
    html: true,
    confirmText: "Entendido",
    cancelText: "",
  });
}

function instructionsHtml(which, short = false) {
  if (which === "ios") {
    return `<ol class="help-steps">
      <li>Abre este enlace en <b>Safari</b>.</li>
      <li>Toca el botón <b>Compartir</b> <span class="kbd">⬆︎</span> (abajo en el centro, o arriba en iPad).</li>
      <li>Baja y elige <b>"Añadir a pantalla de inicio"</b>.</li>
      <li>Toca <b>"Añadir"</b>.</li>
      <li>Abre INSTAOrder desde el icono creado.</li>
    </ol>${short ? "" : `<p class="muted small">Si no ves "Añadir a pantalla de inicio", asegúrate de estar en Safari (o en Chrome con iOS 16.4 o superior, menú Compartir).</p>`}`;
  }
  return `<ol class="help-steps">
    <li>Abre este enlace en <b>Chrome</b>.</li>
    <li>Toca el menú <span class="kbd">⋮</span> (arriba a la derecha).</li>
    <li>Elige <b>"Instalar aplicación"</b> o <b>"Agregar a pantalla principal"</b>.</li>
    <li>Confirma con <b>"Instalar"</b>.</li>
    <li>Abre INSTAOrder desde el icono en la pantalla de inicio o en el cajón de aplicaciones.</li>
  </ol>`;
}

/* ------------------------------------------------------------------ */
/* Pantalla de Ayuda (#/ayuda)                                         */
/* ------------------------------------------------------------------ */

export const HelpScreen = {
  mount(root) {
    const c = CONN_LABELS[state.conn] || {};
    const installed = isInstalled();
    root.innerHTML = `${appHeader({ subtitle: "Ayuda e instalación", back: "h-home" })}
    <main class="screen help">
      <section class="s-card help-status">
        <div><small>Esta app</small><b>${installed ? "✅ Instalada (abierta desde el icono)" : "🌐 Abierta en el navegador"}</b></div>
        <div><small>Conexión a Firebase</small><b class="conn-${c.cls}">${esc(c.text || state.conn)}</b></div>
        ${!installed ? `<button class="btn btn-primary" data-install>📲 Instalar INSTAOrder</button>` : ""}
      </section>

      <section class="s-card">
        <h3>🤖 Instalar en Android</h3>
        ${instructionsHtml("android")}
        ${canPromptInstall() && !installed ? `<p class="muted small">Tu navegador permite instalar directamente: usa el botón "Instalar INSTAOrder" de arriba.</p>` : ""}
      </section>

      <section class="s-card">
        <h3>🍎 Instalar en iPhone</h3>
        ${instructionsHtml("ios")}
        <p class="muted small">En iPhone, INSTAOrder es una <b>aplicación web instalable (PWA)</b>, no una app de App Store. Funciona con su propio icono y sin las barras de Safari.</p>
      </section>

      <section class="s-card">
        <h3>📱 Abrir y actualizar</h3>
        <ul class="help-list">
          <li><b>Abrir:</b> toca el icono <b>INSTAOrder</b> en la pantalla de inicio. Se abre directo en la pantalla inicial.</li>
          <li><b>Actualizar:</b> cuando se publica una versión nueva aparece abajo <b>"Nueva versión disponible · ACTUALIZAR AHORA"</b>. Tócalo cuando no estés tomando un pedido. Los pedidos y el historial no se pierden.</li>
          <li><b>Pedidos vs. actualizaciones:</b> los pedidos viajan al instante por Internet (Firebase). Las actualizaciones cambian la app (diseño y funciones) y llegan al abrirla.</li>
        </ul>
      </section>

      <section class="s-card">
        <h3>🔧 Si algo no funciona</h3>
        <ul class="help-list">
          <li><b>No aparece "Instalar":</b> usa Chrome en Android o Safari en iPhone; ábrelo desde el enlace <code>https://…/instaorder/</code>. Si ya la instalaste, busca el icono en el cajón de aplicaciones.</li>
          <li><b>El icono no aparece:</b> en Android revisa el cajón de apps y los permisos de "accesos directos" del navegador; en iPhone repite "Añadir a pantalla de inicio" desde Safari.</li>
          <li><b>Dice "Sin conexión":</b> revisa el Wi-Fi o datos. Los pedidos NO se envían hasta que diga <b>Conectado</b>; se envían solos al reconectar, sin duplicarse.</li>
          <li><b>No suena:</b> toca la pantalla una vez al abrir la app y revisa que el teléfono no esté en silencio. Las alertas visuales siempre funcionan.</li>
        </ul>
      </section>

      <section class="s-card">
        <h3>🔔 Avisos con la app cerrada</h3>
        <p class="small">Las alertas "LISTO PARA SERVIR" llegan al instante <b>mientras INSTAOrder está abierta</b> (aunque esté en segundo plano unos minutos en Android). Con la app cerrada o el teléfono bloqueado mucho tiempo, el sistema puede pausarla: mantén INSTAOrder abierta durante el turno.</p>
      </section>
      <p class="muted small center">${dataService.isDemo ? "Modo demo local" : "INSTAOrder · Takolandia – Comida Mexicana"}</p>
    </main>`;
    this.root = root;
    root.addEventListener("click", onClick);
  },
  update() {},
  unmount() { this.root?.removeEventListener("click", onClick); this.root = null; },
};

function onClick(e) {
  if (e.target.closest("[data-install]")) { startInstall(); return; }
  const b = e.target.closest("[data-action='h-home']");
  if (b) go("inicio");
}
