/**
 * INSTAOrder — Utilidades de interfaz
 * Diálogos de confirmación, avisos (toasts), formato de fechas y textos.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escapa texto para insertarlo de forma segura en HTML. */
export function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const pad2 = (n) => String(n).padStart(2, "0");

/** "07" para mesas. */
export const tableLabel = (n) => pad2(n);

export function fmtTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
}

export function fmtClock(d = new Date()) {
  return {
    date: d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" }),
  };
}

/** Duración legible: "45 s", "3 min", "1 h 12 min". */
export function fmtDuration(ms) {
  if (ms == null || ms < 0 || !isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Precio SOLO referencial (nunca se suma). */
export function fmtRefPrice(p) {
  if (typeof p !== "number") return "";
  return "$" + p.toFixed(2);
}

/** Número visible de la orden. */
export function orderLabel(o) {
  return o.orderNumber ? `#${o.orderNumber}` : o.orderId.slice(-6);
}

/* ---------------- Toasts ---------------- */

export function toast(message, type = "info", ms = 2600) {
  let host = $("#toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, ms);
}

/* ---------------- Diálogos ---------------- */

/**
 * Diálogo modal propio (no usa alert/confirm del navegador).
 * @returns Promise<boolean|string> true/false, o el texto ingresado si input.
 */
export function dialog({ title, body = "", confirmText = "Aceptar", cancelText = "Cancelar",
  tone = "primary", input = null, html = false } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title" class="modal-title">${esc(title)}</h2>
        <div class="modal-body">${html ? body : esc(body).replace(/\n/g, "<br>")}</div>
        ${input ? `<input class="field modal-input" type="${input.type || "text"}"
            inputmode="${input.inputmode || "text"}" placeholder="${esc(input.placeholder || "")}"
            value="${esc(input.value || "")}" autocomplete="off">` : ""}
        <div class="modal-actions">
          ${cancelText ? `<button class="btn btn-ghost" data-r="0">${esc(cancelText)}</button>` : ""}
          <button class="btn btn-${tone}" data-r="1">${esc(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const inp = $(".modal-input", wrap);
    const done = (ok) => {
      wrap.classList.add("closing");
      setTimeout(() => wrap.remove(), 150);
      resolve(ok ? (inp ? inp.value : true) : (inp ? null : false));
    };
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-r]");
      if (b) { b.disabled = true; done(b.dataset.r === "1"); }
      else if (e.target === wrap && cancelText) done(false);
    });
    if (inp) {
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(true); });
      setTimeout(() => inp.focus(), 50);
    } else {
      setTimeout(() => $(`[data-r="1"]`, wrap)?.focus(), 50);
    }
  });
}

export const confirmDialog = (title, body, confirmText = "Confirmar", tone = "primary") =>
  dialog({ title, body, confirmText, tone });

/** Pide el PIN de administración. */
export async function askPin(expected) {
  const v = await dialog({
    title: "PIN de configuración",
    body: "Ingresa el PIN para modificar la configuración.",
    confirmText: "Entrar",
    input: { type: "password", inputmode: "numeric", placeholder: "PIN" },
  });
  if (v === null) return false;
  if (String(v) === String(expected)) return true;
  toast("PIN incorrecto", "error");
  return false;
}
