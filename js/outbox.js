/**
 * INSTAOrder — Bandeja de salida (envío seguro de órdenes)
 * --------------------------------------------------------
 * Flujo al presionar "ENVIAR A COCINA" (tras la confirmación):
 *   1. La orden (con ID único ya generado) se guarda en la bandeja local.
 *   2. Se intenta enviar. Mientras Firebase no confirme, la orden aparece
 *      como "ENVIANDO…" o "NO ENVIADA — SIN CONEXIÓN", nunca como enviada.
 *   3. Al confirmar Firebase, se quita de la bandeja.
 *   4. Si se pierde la conexión, se reintenta al reconectar con el MISMO ID:
 *      DataService.sendOrder comprueba si ya existe, así que no hay duplicados.
 */

import { dataService, OfflineError } from "../firebase-service.js";
import { getOutbox, putOutbox, patchOutbox, removeOutbox } from "./store.js";
import { emit } from "./state.js";
import { toast } from "./ui.js";

const inFlight = new Set();
let timer = null;

/** Encola y envía. Devuelve "sent" | "queued" | "failed". */
export async function submitOrder(order) {
  putOutbox({ order, state: "QUEUED", queuedAt: Date.now(), attempts: 0 });
  emit();
  return sendOne(order.orderId);
}

async function sendOne(orderId) {
  if (inFlight.has(orderId)) return "sending";
  const entry = getOutbox()[orderId];
  if (!entry) return "sent";
  inFlight.add(orderId);
  patchOutbox(orderId, { state: "SENDING", attempts: (entry.attempts || 0) + 1, lastAttempt: Date.now() });
  emit();
  try {
    const order = { ...entry.order };
    await dataService.sendOrder(order, {
      onNumberAssigned: (n) => patchOutbox(orderId, { order: { orderNumber: n } }),
    });
    removeOutbox(orderId);
    emit();
    return "sent";
  } catch (e) {
    const offline = e instanceof OfflineError || /offline|network|disconnect/i.test(String(e?.message));
    patchOutbox(orderId, { state: offline ? "QUEUED" : "FAILED", error: offline ? "" : String(e?.message || e) });
    if (!offline) console.error("[INSTAOrder] Error al enviar orden", e);
    emit();
    schedule();
    return offline ? "queued" : "failed";
  } finally {
    inFlight.delete(orderId);
  }
}

/** Reintenta todas las órdenes pendientes (al iniciar y al reconectar). */
export async function processOutbox() {
  const ids = Object.keys(getOutbox());
  if (!ids.length || !dataService.isConnected()) { if (ids.length) schedule(); return; }
  let sent = 0;
  for (const id of ids) if ((await sendOne(id)) === "sent") sent++;
  if (sent) toast(`${sent} orden(es) pendiente(s) enviada(s) a cocina`, "success");
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(processOutbox, 8000);
}

export function outboxEntries() { return Object.values(getOutbox()); }
