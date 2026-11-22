/**
 * INSTAOrder — Punto de entrada
 * =============================
 * Takolandia – Comida Mexicana · Sistema interno de pedidos en mesa.
 *
 * Responsabilidades de este archivo:
 *  - Iniciar el servicio de datos (Firebase o modo demo).
 *  - Mantener en tiempo real configuración, catálogo y órdenes activas.
 *  - Pantalla de inicio, inicio de sesión (si AUTH_MODE = "email"),
 *    indicadores de conexión, reloj y tiempos transcurridos.
 *  - Registrar el Service Worker y avisar cuando hay una versión nueva.
 */

import { dataService } from "./firebase-service.js";
import { IS_DEMO } from "./firebase-config.js";
import { state, emit, subscribe, mergeSettings, normalizeCatalog, logoSrc, can } from "./js/state.js";
import { defineRoute, startRouter, go, refresh } from "./js/router.js";
import { connPill, refreshConnPills, CONN_LABELS } from "./js/components.js";
import { processOutbox } from "./js/outbox.js";
import { getLastMode, setLastMode } from "./js/store.js";
import { unlockAudio } from "./js/sound.js";
import { esc, fmtClock, fmtDuration, toast, confirmDialog, $ } from "./js/ui.js";
import { WaiterScreen, startWaiterAlerts } from "./js/waiter.js";
import { KitchenScreen, HistoryScreen } from "./js/kitchen.js";
import { SettingsScreen } from "./js/settings.js";
import { ExternalScreen } from "./js/external.js";
import { IngredientsScreen } from "./js/availability.js";
import { showLogin, watchMyProfile } from "./js/auth.js";
import { initInstall, installButtonHtml, startInstall, onInstallChange, HelpScreen } from "./js/install.js";

export const APP_VERSION = "1.4.1";

/* ------------------------------------------------------------------ */
/* Pantalla de inicio                                                  */
/* ------------------------------------------------------------------ */

const HomeScreen = {
  mount(root) {
    const last = getLastMode();
    root.innerHTML = `
    <section class="home">
      <div class="home-card">
        <div class="logo-slot">
          <img src="${esc(logoSrc())}" alt="Logo ${esc(state.settings.restaurantName)}" class="home-logo">
        </div>
        <h1 class="home-title">INSTA<b>Order</b></h1>
        <p class="home-sub">${esc(state.settings.restaurantName)} – ${esc(state.settings.restaurantSubtitle)}</p>
        <div class="home-clock">
          <div class="home-time" data-clock="time"></div>
          <div class="home-date" data-clock="date"></div>
        </div>
        <div class="home-conn">${connPill()}</div>
        ${state.me ? `<p class="home-user">👤 ${esc(state.me.displayName)} · <button class="link-btn sm" data-go="config/cuenta">Mi cuenta</button></p>` : ""}
        <div class="home-actions">
          ${can("waiter") ? `<button class="mode-btn mode-waiter" data-mode="mesero">
            <span class="mode-ico">📱</span>
            <span class="mode-txt"><b>MODO MESERO</b><small>Tomar pedidos en mesa</small></span>
            ${last === "mesero" ? '<span class="mode-last">Último usado</span>' : ""}
          </button>` : ""}
          ${can("waiter") ? `<button class="mode-btn mode-ext" data-go="externos">
            <span class="mode-ico">🛵</span>
            <span class="mode-txt"><b>PEDIDOS EXTERNOS</b><small>PedidosYa · subir captura</small></span>
          </button>` : ""}
          ${can("kitchen") ? `<button class="mode-btn mode-kitchen" data-mode="cocina">
            <span class="mode-ico">👨‍🍳</span>
            <span class="mode-txt"><b>MODO COCINA</b><small>Pantalla de órdenes (tablet)</small></span>
            ${last === "cocina" ? '<span class="mode-last">Último usado</span>' : ""}
          </button>` : ""}
        </div>
        <div class="install-slot">${installButtonHtml()}</div>
        <div class="home-links">
          <button class="link-btn" data-go="config">⚙️ Configuración</button>
          <button class="link-btn" data-go="historial">📚 Historial</button>
          <button class="link-btn" data-go="ayuda">❓ Ayuda e instalación</button>
        </div>
        <p class="home-version">v${APP_VERSION}${IS_DEMO ? " · modo demo local" : ""}</p>
      </div>
    </section>`;
    root.querySelector(".home").addEventListener("click", (e) => {
      const m = e.target.closest("[data-mode]");
      if (m) { unlockAudio(); setLastMode(m.dataset.mode); go(m.dataset.mode); return; }
      if (e.target.closest("[data-install]")) { startInstall(); return; }
      const g = e.target.closest("[data-go]");
      if (g) go(g.dataset.go);
    });
    tickClocks();
  },
  update() {
    const img = $(".home-logo");
    if (img && img.getAttribute("src") !== logoSrc()) img.src = logoSrc();
  },
};

/* ------------------------------------------------------------------ */
/* Reloj y tiempos transcurridos (se actualizan cada segundo)          */
/* ------------------------------------------------------------------ */

function tickClocks() {
  const c = fmtClock(new Date(dataService.now()));
  document.querySelectorAll("[data-clock]").forEach((el) => {
    const v = el.dataset.clock === "date" ? c.date : el.dataset.clock === "time" ? c.time : `${c.time}`;
    if (el.textContent !== v) el.textContent = v;
  });
  const now = dataService.now();
  // Cuenta regresiva hacia la hora objetivo (se calcula con la hora actual; nunca se "reinicia").
  document.querySelectorAll("[data-until]").forEach((el) => {
    const until = Number(el.dataset.until);
    if (!until) return;
    const ms = until - now;
    const min = Math.ceil(Math.abs(ms) / 60000);
    el.textContent = ms >= 0 ? (ms < 60000 ? "MENOS DE 1 MIN" : `${min} MIN RESTANTES`) : `ATRASADA ${min} MIN`;
    const box = el.closest("[data-urgency]");
    const u = ms < 0 ? "late" : ms <= 3 * 60000 ? "soon" : "ok";
    if (box && box.dataset.urgency !== u) box.dataset.urgency = u;
    el.classList.toggle("txt-late", ms < 0);
  });
  document.querySelectorAll("[data-since]").forEach((el) => {
    const since = Number(el.dataset.since);
    if (!since) return;
    const ms = now - since;
    el.textContent = fmtDuration(ms);
    // Avisos de demora para cocina (10 y 20 minutos)
    const warn = el.closest("[data-age]");
    if (warn) warn.dataset.age = ms > 20 * 60000 ? "late" : ms > 10 * 60000 ? "slow" : "ok";
  });
}

/* ------------------------------------------------------------------ */
/* Banner global de conexión                                           */
/* ------------------------------------------------------------------ */

function updateConnBanner() {
  let el = $("#conn-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "conn-banner";
    el.setAttribute("role", "alert");
    document.body.appendChild(el);
  }
  const bad = state.conn === "offline" || state.conn === "reconnecting" || state.conn === "auth-error";
  const kitchen = document.body.dataset.screen === "cocina";
  el.className = bad ? "show " + (state.conn === "offline" ? "bad" : "warn") : "";
  if (state.conn === "auth-error") {
    el.textContent = "⚠️ No se pudo iniciar sesión en Firebase. Revisa Authentication y las reglas (ver README).";
  } else if (bad) {
    el.textContent = kitchen
      ? `⚠️ ${CONN_LABELS[state.conn].text.toUpperCase()} — LAS ÓRDENES NUEVAS NO ESTÁN LLEGANDO`
      : `⚠️ ${CONN_LABELS[state.conn].text.toUpperCase()} — los pedidos NO se están enviando. Se enviarán al reconectar.`;
  }
}

/* ------------------------------------------------------------------ */
/* Service Worker: actualizaciones de la app desde GitHub Pages         */
/* ------------------------------------------------------------------ */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https:$|^http:$/.test(location.protocol)) return;
  navigator.serviceWorker.register("./service-worker.js").then((reg) => {
    const offer = (worker) => {
      let bar = $("#update-bar");
      if (bar) return;
      bar = document.createElement("div");
      bar.id = "update-bar";
      bar.innerHTML = `<span>✨ Nueva versión disponible</span>
        <button class="btn btn-sm btn-yellow">ACTUALIZAR AHORA</button>`;
      document.body.appendChild(bar);
      bar.querySelector("button").onclick = async () => {
        // No interrumpir un pedido en curso: avisar primero. El borrador está
        // guardado en el teléfono y se recupera después de actualizar.
        if (/^#\/mesero\/mesa\//.test(location.hash)) {
          const ok = await confirmDialog("Pedido en curso",
            "Estás tomando un pedido. Se guardará como borrador y podrás continuarlo después de actualizar.\n¿Actualizar ahora?",
            "Actualizar", "primary");
          if (!ok) return;
        }
        bar.querySelector("button").disabled = true;
        worker.postMessage({ type: "SKIP_WAITING" });
      };
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) offer(nw);
      });
    });
    // Buscar versión nueva al volver a la app y cada 30 minutos.
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch((e) => console.warn("[INSTAOrder] Service Worker no registrado:", e));

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    // Los pedidos están en Firebase y la bandeja local en localStorage:
    // recargar no pierde información.
    location.reload();
  });
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

async function boot() {
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  initInstall();
  onInstallChange(() => {
    const slot = document.querySelector(".install-slot");
    if (slot) slot.innerHTML = installButtonHtml();
  });
  registerServiceWorker();
  setInterval(tickClocks, 1000);

  try {
    await dataService.init();
  } catch (e) {
    console.error(e);
    $("#app").innerHTML = `<section class="home"><div class="home-card">
      <img src="assets/logo.png" class="home-logo" alt="Logo">
      <h1 class="home-title">INSTA<b>Order</b></h1>
      <p class="login-err">No se pudo cargar Firebase. Verifica la conexión a Internet y firebase-config.js.</p>
      <button class="btn btn-primary btn-lg" onclick="location.reload()">Reintentar</button></div></section>`;
    return;
  }

  // Modo usuarios: iniciar sesión y verificar que la cuenta esté activa.
  state.usersMode = dataService.usersMode;
  if (dataService.needsLogin()) { showLogin(); return; }
  if (state.usersMode) {
    await watchMyProfile(() => emit());
    dataService.watchUsers((list) => { state.users = list; emit(); }, () => {});
  }

  dataService.onConnection((s) => {
    const was = state.conn;
    state.conn = s;
    refreshConnPills();
    updateConnBanner();
    if ((s === "connected" || s === "demo") && was !== s) processOutbox();
    if (s === "connected" && (was === "reconnecting" || was === "offline")) toast("Conexión restablecida", "success");
    emit();
  });
  dataService.onAuth((user, err) => {
    if (err) { state.conn = "auth-error"; refreshConnPills(); updateConnBanner(); }
  });

  const onDataError = (e) => {
    state.dataError = e;
    toast("Permiso denegado por Firebase. Revisa las reglas de seguridad.", "error", 6000);
  };

  dataService.watchSettings((remote) => {
    state.settings = mergeSettings(remote);
    state.settingsLoaded = true;
    emit();
  }, onDataError);

  dataService.watchCatalog((remote) => {
    state.catalogFromServer = !!remote;
    state.catalog = normalizeCatalog(remote);
    emit();
  }, onDataError);

  // Disponibilidad de ingredientes: en tiempo real en todos los dispositivos.
  dataService.watchIngredients((v) => { state.ingredients = v; emit(); }, onDataError);

  dataService.watchActiveOrders((orders) => {
    state.activeOrders = orders;
    state.ordersLoaded = true;
    emit();
  }, onDataError);

  subscribe(() => refresh());

  defineRoute("inicio", HomeScreen);
  defineRoute("mesero", WaiterScreen);
  defineRoute("cocina", KitchenScreen);
  defineRoute("historial", HistoryScreen);
  defineRoute("config", SettingsScreen);
  defineRoute("ayuda", HelpScreen);
  defineRoute("externos", ExternalScreen);
  defineRoute("ingredientes", IngredientsScreen);

  // Recordar el último modo usado en este dispositivo.
  if (!location.hash || location.hash === "#/" || location.hash === "#") {
    const last = getLastMode();
    if ((last === "mesero" && can("waiter")) || (last === "cocina" && can("kitchen"))) history.replaceState(null, "", "#/" + last);
  }

  window.addEventListener("hashchange", updateConnBanner);
  startRouter($("#app"));
  startWaiterAlerts();
  updateConnBanner();
  processOutbox();
}

boot();
