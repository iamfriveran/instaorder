/**
 * INSTAOrder — DISPONIBILIDAD DE INGREDIENTES (productos agotados)
 * =================================================================
 * - Cocina marca un ingrediente como AGOTADO o DISPONIBLE (#/ingredientes).
 * - El estado vive en Firebase (/ingredients/{id}) y llega en tiempo real a
 *   todos los dispositivos. Cada cambio queda en /ingredientLog.
 * - Cada producto del catálogo declara sus ingredientes:
 *     ingredients: obligatorios. "res|pollo|cerdo" = a elección (basta uno).
 *     optional:    opcionales: si se agotan el producto se vende SIN ellos
 *                  y se avisa a cocina en la nota del producto.
 * - Un producto con un obligatorio agotado queda BLOQUEADO para pedidos
 *   nuevos (no se puede agregar ni enviar). Las órdenes ya enviadas, el
 *   historial y los pedidos externos ya recibidos NO se modifican.
 */

import { dataService } from "../firebase-service.js";
import { DEFAULT_CATALOG } from "../catalog.js";
import { state, can } from "./state.js";
import { go } from "./router.js";
import { appHeader, demoNotice } from "./components.js";
import { getCook } from "./store.js";
import { $, esc, toast, confirmDialog, dialog, fmtTime } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Ingredientes por defecto (tomados de las descripciones del menú)    */
/* ------------------------------------------------------------------ */

export const INGREDIENT_GROUPS = [
  ["proteinas", "🥩 Proteínas"], ["bases", "🌮 Tortillas y bases"], ["complementos", "🥑 Complementos y salsas"], ["bebidas", "🥤 Bebidas"],
];

export const DEFAULT_INGREDIENTS = [
  ["res", "Res", "proteinas"], ["pollo", "Pollo", "proteinas"], ["cerdo", "Cerdo", "proteinas"],
  ["pastor", "Pastor", "proteinas"], ["birria", "Birria", "proteinas"], ["chorizo", "Chorizo", "proteinas"],
  ["camaron", "Camarón", "proteinas"],
  ["tortilla-tacos", "Tortilla de tacos", "bases"], ["tortilla-burritos", "Tortilla de burritos y quesadillas", "bases"],
  ["tortilla-flautas", "Tortilla de flautas", "bases"], ["nachos", "Nachos (totopos)", "bases"],
  ["doritos-limon", "Doritos de limón", "bases"], ["doritos-hot", "Doritos picantes", "bases"], ["doritos-normal", "Doritos natural", "bases"],
  ["frejol", "Frejol", "bases"], ["arroz", "Arroz", "bases"], ["tortillas", "Tortillas (fajitas)", "bases"], ["verduras", "Verduras salteadas", "bases"],
  ["queso", "Queso", "complementos"], ["guacamole", "Guacamole", "complementos"], ["pico-gallo", "Pico de gallo", "complementos"],
  ["pina", "Piña", "complementos"], ["cebolla", "Cebolla", "complementos"], ["limon", "Limón", "complementos"], ["lechuga", "Lechuga", "complementos"],
  ["jalapeno", "Jalapeño", "complementos"], ["salsa-cheddar", "Salsa cheddar", "complementos"], ["salsa-agria", "Salsa agria", "complementos"],
  ["coca-cola", "Coca-Cola", "bebidas"], ["horchata", "Horchata", "bebidas"], ["jamaica", "Jamaica", "bebidas"],
].map(([id, name, group], i) => ({ id, name, group, order: i + 1 }));

/** Ingredientes retirados (v1.4.1 → v1.4.2): ya no se muestran ni bloquean. */
const LEGACY = new Set(["tortilla-maiz", "tortilla-trigo"]);

const DEFAULT_COMPOSITION = Object.fromEntries(DEFAULT_CATALOG.products.map((p) => [p.id, { ingredients: p.ingredients || [], optional: p.optional || [] }]));

/** Lista de ingredientes (por defecto + los de Firebase), ordenada. */
export function ingredientList() {
  const remote = state.ingredients || {};
  const map = new Map(DEFAULT_INGREDIENTS.map((d) => [d.id, { ...d, available: true }]));
  for (const [id, v] of Object.entries(remote)) {
    const base = map.get(id);
    // Los ingredientes de fábrica conservan su nombre y grupo del código; de Firebase sólo se toma el estado.
    map.set(id, base ? { ...v, ...base, available: v.available, updatedAt: v.updatedAt, updatedBy: v.updatedBy, id }
      : { id, group: "complementos", order: 999, ...v });
  }
  return [...map.values()].filter((i) => i.deleted !== true && !LEGACY.has(i.id)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

const ingById = (id) => ingredientList().find((i) => i.id === id);
export const ingName = (id) => ingById(id)?.name || id;
/** Un ingrediente desconocido se considera disponible (no bloquea por error). */
export const isIngAvailable = (id) => ingById(id)?.available !== false;

/** Composición de un producto (si el catálogo guardado no la trae, se usa la por defecto). */
export function composition(p) {
  if (!p) return { ingredients: [], optional: [] };
  const d = DEFAULT_COMPOSITION[p.id] || { ingredients: [], optional: [] };
  let ingredients = Array.isArray(p.ingredients) ? p.ingredients : (p.ingredients ? Object.values(p.ingredients) : d.ingredients);
  const optional = (Array.isArray(p.optional) ? p.optional : (p.optional ? Object.values(p.optional) : d.optional)).filter((x) => !LEGACY.has(x));
  // Un catálogo guardado antes del cambio de tortillas: se reemplazan las antiguas por las nuevas.
  if (ingredients.some((e) => String(e).split("|").some((a) => LEGACY.has(a)))) {
    const newTort = d.ingredients.filter((e) => String(e).startsWith("tortilla-"));
    ingredients = [...newTort, ...ingredients.filter((e) => !String(e).split("|").some((a) => LEGACY.has(a)))];
  }
  return { ingredients, optional };
}

/**
 * Estado de un producto.
 * @returns {{available:boolean, missing:string[], optionalMissing:string[], choiceLimited:string[]}}
 *   missing: nombres de ingredientes obligatorios agotados (bloquean).
 *   optionalMissing: opcionales agotados (se vende sin ellos).
 *   choiceLimited: en "a elección", opciones agotadas (ej. "Res") mientras otras siguen.
 */
export function productStatus(p) {
  const { ingredients, optional } = composition(p);
  const missing = [], choiceLimited = [];
  for (const entry of ingredients) {
    const alts = String(entry).split("|").filter(Boolean);
    const out = alts.filter((a) => !isIngAvailable(a));
    if (out.length === alts.length) missing.push(alts.map(ingName).join(" / "));
    else if (out.length) choiceLimited.push(...out.map(ingName));
  }
  const optionalMissing = optional.filter((o) => !isIngAvailable(o)).map(ingName);
  return { available: missing.length === 0, missing, optionalMissing, choiceLimited };
}

export const productById = (id) => state.catalog.products.find((p) => p.id === id);

/** Productos afectados por un ingrediente (obligatorio o a elección). */
export function productsUsing(id) {
  return state.catalog.products.filter((p) => p.active !== false && composition(p).ingredients.some((e) => String(e).split("|").includes(id)));
}

/** Productos que lo llevan como opcional. */
export function productsOptional(id) {
  return state.catalog.products.filter((p) => p.active !== false && composition(p).optional.includes(id));
}

/** Productos que quedarían BLOQUEADOS si este ingrediente se agota (con el estado actual de los demás). */
export function productsBlockedIf(id) {
  const avail = (x) => x !== id && isIngAvailable(x);
  return productsUsing(id).filter((p) => composition(p).ingredients.some((e) => {
    const alts = String(e).split("|");
    return alts.includes(id) && !alts.some(avail);
  }));
}

/**
 * Revisa los productos de un pedido con la disponibilidad ACTUAL.
 * @returns {{blocked: {index, productName, missing}[], optional: {index, productName, optionalMissing}[]}}
 */
export function checkItems(items) {
  const blocked = [], optional = [];
  items.forEach((it, index) => {
    const p = productById(it.productId);
    if (!p) return;
    const st = productStatus(p);
    if (!st.available) blocked.push({ index, productName: it.productName, missing: st.missing });
    else if (st.optionalMissing.length) optional.push({ index, productName: it.productName, optionalMissing: st.optionalMissing });
  });
  return { blocked, optional };
}

/** Diálogo "NO SE PUEDE ENVIAR EL PEDIDO". Devuelve "remove" | "edit". */
export async function blockedDialog(blocked) {
  const ok = await dialog({
    title: "⚠️ NO SE PUEDE ENVIAR EL PEDIDO",
    html: true,
    body: `<p>${blocked.length === 1 ? "El siguiente producto ya no está disponible:" : "Los siguientes productos ya no están disponibles:"}</p>
      <div class="dup-box">${blocked.map((b) => `<b>${esc(b.productName)}</b><br><small>Ingrediente agotado: <b>${esc(b.missing.join(", ").toUpperCase())}</b></small>`).join("<hr>")}</div>
      <p class="small">Corrige el pedido antes de enviarlo a cocina.</p>`,
    confirmText: "Quitar no disponibles",
    cancelText: "Corregir pedido",
    tone: "danger",
  });
  return ok ? "remove" : "edit";
}

/** Nota automática para cocina cuando falta un opcional: "SIN GUACAMOLE (agotado)". */
export function optionalNote(names) {
  return names.length ? `SIN ${names.join(", ").toUpperCase()} (agotado)` : "";
}

/* ------------------------------------------------------------------ */
/* Pantalla de cocina: CONTROL DE INGREDIENTES (#/ingredientes)        */
/* ------------------------------------------------------------------ */

let root = null;
let showLog = false;
let logRows = null;

export const IngredientsScreen = {
  mount(el) {
    if (!can("kitchen")) { toast("Tu usuario no tiene el rol de Cocina", "error"); go("inicio", { replace: true }); return; }
    root = el;
    root.innerHTML = `${appHeader({ subtitle: "Control de ingredientes", back: "i-back" })}${demoNotice()}
      <main class="screen ingredients">
        <div class="ing-top">
          <div id="ing-summary"></div>
          <button class="btn btn-ghost btn-sm" data-action="i-log">📋 Registro de hoy</button>
          ${can("kitchen") ? `<button class="btn btn-ghost btn-sm" data-action="i-add">➕ Ingrediente</button>` : ""}
        </div>
        <div id="ing-log"></div>
        <div id="ing-list"></div>
      </main>`;
    root.addEventListener("click", onClick);
    this.update();
  },
  update() {
    if (!root) return;
    const list = ingredientList();
    const out = list.filter((i) => i.available === false);
    $("#ing-summary", root).innerHTML = out.length
      ? `<span class="ing-alert">🔴 ${out.length} agotado(s): <b>${out.map((i) => esc(i.name)).join(", ")}</b></span>`
      : `<span class="ing-ok">🟢 Todo disponible</span>`;
    const html = INGREDIENT_GROUPS.map(([g, label]) => {
      const items = list.filter((i) => (i.group || "complementos") === g);
      if (!items.length) return "";
      return `<section class="ing-group"><h3 class="sec">${label}</h3><div class="ing-grid">${items.map((i) => {
        const off = i.available === false;
        const n = productsUsing(i.id).length;
        const no = productsOptional(i.id).length;
        return `<div class="ing-card ${off ? "off" : "on"}">
          <div class="ing-name">${esc(i.name)}</div>
          <div class="ing-state">${off ? "🔴 AGOTADO / NO DISPONIBLE" : "🟢 DISPONIBLE"}</div>
          <div class="ing-meta">${n || no ? [n ? `${n} producto(s)` : "", no ? `opcional en ${no}` : ""].filter(Boolean).join(" · ") : "Sin productos asociados"}${i.updatedAt ? ` · ${fmtTime(i.updatedAt)}${i.updatedBy?.name ? " · " + esc(i.updatedBy.name) : ""}` : ""}</div>
          <button class="btn ${off ? "btn-success" : "btn-danger-ghost"}" data-action="i-toggle" data-id="${esc(i.id)}">${off ? "VOLVER A DISPONIBLE" : "MARCAR NO DISPONIBLE"}</button>
        </div>`;
      }).join("")}</div></section>`;
    }).join("");
    const el = $("#ing-list", root);
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
    renderLog();
  },
  unmount() { root?.removeEventListener("click", onClick); root = null; },
};

function renderLog() {
  const el = $("#ing-log", root);
  if (!el) return;
  if (!showLog) { el.innerHTML = ""; return; }
  if (!logRows) { el.innerHTML = `<p class="muted small">Cargando…</p>`; return; }
  el.innerHTML = `<section class="s-card ing-log"><h3>📋 Registro de hoy</h3>${logRows.length
    ? `<ol>${logRows.map((r) => `<li><b>${fmtTime(r.at)}</b> · ${esc(r.name)}: ${r.to ? "🟢 DISPONIBLE" : "🔴 NO DISPONIBLE"}${r.byName ? ` · ${esc(r.byName)}` : ""}</li>`).join("")}</ol>`
    : `<p class="muted small">Sin cambios hoy.</p>`}</section>`;
}

async function loadLog() {
  logRows = null; renderLog();
  try { logRows = (await dataService.getIngredientLog()).sort((a, b) => b.at - a.at); }
  catch { logRows = []; toast("No se pudo cargar el registro", "error"); }
  renderLog();
}

async function toggle(id, btn) {
  const ing = ingById(id);
  if (!ing) return;
  const goingOut = ing.available !== false;
  const affected = productsBlockedIf(id);
  const limited = productsUsing(id).length - affected.length;
  const opt = productsOptional(id).length;
  if (goingOut) {
    const ok = await confirmDialog(`¿${ing.name.toUpperCase()} agotado?`,
      `Se bloquearán ${affected.length} producto(s) para pedidos nuevos en todos los teléfonos:\n${affected.slice(0, 8).map((p) => "• " + p.name).join("\n")}${affected.length > 8 ? `\n… y ${affected.length - 8} más` : ""}`
      + (limited ? `\n\n${limited} producto(s) a elección seguirán con otras opciones.` : "")
      + (opt ? `\n${opt} producto(s) se venderán sin ${ing.name.toLowerCase()}.` : "")
      + `\n\nLas órdenes ya enviadas no se modifican.`,
      "Sí, MARCAR NO DISPONIBLE", "danger");
    if (!ok) return;
  }
  btn.disabled = true;
  try {
    await dataService.setIngredientAvailable(ing, !goingOut, getCook() || { id: state.me?.uid || "", name: state.me?.displayName || "Cocina" });
    toast(goingOut ? `🔴 ${ing.name}: NO DISPONIBLE · ${affected.length} producto(s) bloqueado(s)` : `🟢 ${ing.name}: DISPONIBLE · ${affected.length} producto(s) disponibles de nuevo`, goingOut ? "error" : "success", 3500);
    if (showLog) loadLog();
  } catch (e) {
    btn.disabled = false;
    toast(/offline|conexi/i.test(String(e?.message || e?.name)) ? "Sin conexión: no se pudo cambiar." : "No se pudo cambiar (permisos o conexión).", "error");
  }
}

async function addIngredient() {
  const name = await dialog({ title: "Nuevo ingrediente", input: { placeholder: "Ej.: Aguacate" }, confirmText: "Agregar" });
  if (!name || !name.trim()) return;
  const id = name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (ingById(id)) return toast("Ese ingrediente ya existe", "error");
  try {
    await dataService.setIngredientAvailable({ id, name: name.trim(), group: "complementos", order: 900 + ingredientList().length }, true,
      getCook() || { id: state.me?.uid || "", name: state.me?.displayName || "Cocina" });
    toast(`Ingrediente "${name.trim()}" agregado. Asígnalo a los productos en Configuración › Catálogo.`, "success", 4500);
  } catch { toast("No se pudo agregar (permisos o conexión).", "error"); }
}

function onClick(e) {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  switch (b.dataset.action) {
    case "i-back": history.length > 1 ? history.back() : go("cocina"); break;
    case "i-toggle": toggle(b.dataset.id, b); break;
    case "i-log": showLog = !showLog; if (showLog) loadLog(); else renderLog(); break;
    case "i-add": addIngredient(); break;
  }
}

/* ------------------------------------------------------------------ */
/* Editor de composición (Configuración › Catálogo, sólo Admin)        */
/* ------------------------------------------------------------------ */

/**
 * Abre el editor de ingredientes de un producto. Devuelve
 * {ingredients, optional} o null si se cancela.
 */
export function editComposition(product) {
  return new Promise((resolve) => {
    const comp = composition(product);
    const state0 = {};
    let choice = [];
    for (const e of comp.ingredients) {
      const alts = String(e).split("|");
      if (alts.length > 1) { choice = alts; alts.forEach((a) => { state0[a] = "choice"; }); } else state0[e] = "req";
    }
    for (const o of comp.optional) state0[o] = "opt";
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal picker comp-editor" role="dialog" aria-modal="true">
      <h2 class="modal-title">🧩 ${esc(product.name)}</h2>
      <p class="small muted">Obligatorio: si se agota, el producto se bloquea. Opcional: se vende sin él. A elección: basta que uno esté disponible (ej. res, pollo o cerdo).</p>
      <div class="picker-list">${INGREDIENT_GROUPS.map(([g, label]) => {
        const items = ingredientList().filter((i) => (i.group || "complementos") === g);
        return items.length ? `<h4 class="sec">${label}</h4>` + items.map((i) => `<label class="comp-row"><span>${esc(i.name)}</span>
          <select class="field" data-ing="${esc(i.id)}">
            ${[["", "No lleva"], ["req", "Obligatorio"], ["opt", "Opcional"], ["choice", "A elección"]].map(([v, t]) => `<option value="${v}" ${(state0[i.id] || "") === v ? "selected" : ""}>${t}</option>`).join("")}
          </select></label>`).join("") : "";
      }).join("")}</div>
      <div class="modal-actions"><button class="btn btn-ghost" data-r="0">Cancelar</button><button class="btn btn-primary" data-r="1">Aplicar</button></div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-r]");
      if (!b && e.target !== wrap) return;
      if (b?.dataset.r === "1") {
        const req = [], opt = [], ch = [];
        wrap.querySelectorAll("[data-ing]").forEach((s) => {
          if (s.value === "req") req.push(s.dataset.ing);
          else if (s.value === "opt") opt.push(s.dataset.ing);
          else if (s.value === "choice") ch.push(s.dataset.ing);
        });
        if (ch.length === 1) req.push(ch[0]); else if (ch.length > 1) req.push(ch.join("|"));
        wrap.remove();
        resolve({ ingredients: req, optional: opt });
      } else { wrap.remove(); resolve(null); }
    });
  });
}
