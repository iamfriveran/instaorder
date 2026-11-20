/**
 * INSTAOrder — Navegación por hash (#/mesero, #/cocina, ...).
 * Compatible con GitHub Pages (no requiere configuración del servidor) y
 * permite usar el botón "atrás" del teléfono.
 */

const routes = {};
let current = null;
let root = null;
let locked = false;

/** Detiene la navegación (cuenta desactivada): ninguna pantalla vuelve a dibujarse. */
export function lockRouter() {
  locked = true;
  if (current?.screen?.unmount) { try { current.screen.unmount(); } catch { /* */ } }
  current = null;
}

export function defineRoute(name, screen) { routes[name] = screen; }

export function go(path, { replace = false } = {}) {
  const hash = "#/" + path.replace(/^#?\/?/, "");
  if (location.hash === hash) { render(); return; }
  if (replace) history.replaceState(null, "", hash);
  else location.hash = hash;
  if (replace) render();
}

export function currentRoute() { return current; }

function parse() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { name: parts[0] || "inicio", params: parts.slice(1) };
}

export function render() {
  if (locked) return;
  const { name, params } = parse();
  const screen = routes[name] || routes.inicio;
  if (current?.screen?.unmount) current.screen.unmount();
  root.innerHTML = "";
  root.scrollTop = 0;
  window.scrollTo(0, 0);
  document.body.dataset.screen = name;
  current = { name, params, screen };
  screen.mount(root, params);
}

export function refresh() {
  if (locked) return;
  if (current?.screen?.update) current.screen.update(current.params);
}

export function startRouter(el) {
  root = el;
  window.addEventListener("hashchange", render);
  render();
}
