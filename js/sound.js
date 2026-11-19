/**
 * INSTAOrder — Sonidos y vibración
 * --------------------------------
 * Sonidos breves generados con Web Audio API (no requiere archivos de audio).
 * Los navegadores bloquean el audio hasta que la persona toca la pantalla
 * (política de autoplay): `unlockAudio()` se llama en el primer toque.
 * El sonido es complementario: las alertas visuales siempre se muestran.
 */

import { getPrefs } from "./store.js";

let ctx = null;

export function audioReady() {
  return !!ctx && ctx.state === "running";
}

/** Debe llamarse dentro de un evento de toque/clic. */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch (e) {
    console.warn("[INSTAOrder] Audio no disponible:", e);
  }
}

const TONES = {
  // [frecuencia Hz, inicio s, duración s]
  chime: [[880, 0, 0.18], [1175, 0.16, 0.18], [1568, 0.32, 0.32]],
  bell: [[1046, 0, 0.6], [1318, 0.02, 0.6]],
  beep: [[988, 0, 0.12], [988, 0.2, 0.12], [988, 0.4, 0.12]],
};

/**
 * Reproduce un sonido corto.
 * @param {"new"|"ready"|"test"} kind
 */
export function playAlert(kind = "new") {
  const prefs = getPrefs();
  if (kind !== "test" && !prefs.soundEnabled) return;
  if (!ctx || ctx.state !== "running") return;
  const notes = TONES[prefs.soundTone] || TONES.chime;
  const t0 = ctx.currentTime + 0.02;
  const gainMax = Math.max(0.05, Math.min(1, prefs.volume)) * 0.5;
  // El aviso "listo para servir" suena una octava distinta para diferenciarlo.
  const mult = kind === "ready" ? 0.75 : 1;
  for (const [f, start, dur] of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(gainMax, t0 + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.05);
  }
}

export function vibrate(pattern = [250, 120, 250]) {
  const prefs = getPrefs();
  if (prefs.vibrate && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* no soportado */ }
  }
}

/* ---------- Mantener pantalla encendida (tablet de cocina) ---------- */

let wakeLock = null;

export async function keepScreenOn(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* el navegador puede negarlo; no es crítico */ }
}
