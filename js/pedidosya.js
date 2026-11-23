/**
 * INSTAOrder — Lectura de capturas de PedidosYa (OCR local)
 * =========================================================
 * - OCR: Tesseract.js (gratuito, código abierto). Se ejecuta EN EL NAVEGADOR:
 *   la imagen nunca sale del teléfono. La librería se descarga de jsDelivr
 *   (CDN gratuito) y los modelos de idioma español + inglés (~5 MB) vienen
 *   en este mismo proyecto (carpeta ocr/lang). Se descargan una vez y quedan
 *   guardados en el teléfono.
 *   Se usan los dos idiomas porque el modelo en español lee "#148" como
 *   "4148"; combinado con inglés lo lee bien.
 * - Parser: a partir del texto y de la POSICIÓN de cada palabra reconoce:
 *     número de orden (#148), cliente, minutos de preparación (− 11 +),
 *     productos y cantidades ("1Por ..."), aunque ocupen varias líneas.
 * - Coincidencia con el catálogo: por palabras, sin acentos, con tolerancia
 *   a errores de OCR. Nunca inventa productos: si no hay coincidencia
 *   suficiente lo marca para revisión.
 *
 * El archivo no depende del DOM salvo runOcr(), para poder probarse aparte.
 */

export const PLATFORMS = {
  PEDIDOS_YA: { id: "PEDIDOS_YA", label: "PEDIDOS YA", short: "PedidosYa", color: "#FA0050" },
};

const TESS_VERSION = "5.1.1";
const CDN = "https://cdn.jsdelivr.net/npm";

/* ------------------------------------------------------------------ */
/* OCR en el navegador                                                 */
/* ------------------------------------------------------------------ */

let workerPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = resolve; s.onerror = () => reject(new Error("No se pudo descargar el lector OCR. Revisa la conexión a Internet."));
    document.head.appendChild(s);
  });
}

/**
 * Ejecuta el OCR sobre una imagen (File/Blob/URL) y devuelve líneas y
 * palabras con su posición.
 */
export async function runOcr(image, onProgress) {
  await loadScript(`${CDN}/tesseract.js@${TESS_VERSION}/dist/tesseract.min.js`);
  if (!workerPromise) {
    workerPromise = window.Tesseract.createWorker(["spa", "eng"], 1, {
      workerPath: `${CDN}/tesseract.js@${TESS_VERSION}/dist/worker.min.js`,
      corePath: `${CDN}/tesseract.js-core@${TESS_VERSION}`,
      // Ruta propia: el repositorio incluye ocr/lang/ con spa + eng (ver README).
      langPath: new URL("../ocr/lang", import.meta.url).href,
      logger: (m) => onProgress && onProgress(m),
    }).catch((e) => { workerPromise = null; throw e; });
  }
  const worker = await workerPromise;
  const { data } = await worker.recognize(image);
  const dims = await imageSize(image);
  return {
    width: dims.width, height: dims.height,
    lines: data.lines.map((l) => ({ text: l.text.trim(), bbox: l.bbox, conf: l.confidence })),
    words: data.words.map((w) => ({ text: w.text.trim(), bbox: w.bbox, conf: w.confidence })),
    confidence: data.confidence,
  };
}

function imageSize(image) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = typeof image === "string" ? image : URL.createObjectURL(image);
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); if (typeof image !== "string") URL.revokeObjectURL(url); };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                 */
/* ------------------------------------------------------------------ */

export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STOP = new Set(["de", "del", "con", "al", "la", "el", "los", "las", "y", "en", "a", "por", "para", "un", "una", "x"]);
/** Sinónimos usados en PedidosYa ↔ catálogo de Takolandia. */
const SYN = {
  gaseosa: ["coca", "cola", "soda"], refresco: ["coca", "cola", "soda"], cocacola: ["coca", "cola"],
  carne: ["res"], res: ["carne"],
};

/** Palabras significativas (sin acentos, sin plurales simples). */
export function tokens(s) {
  const out = new Set();
  for (let t of norm(s).replace(/[+&/,;:()|.\-]/g, " ").split(/\s+/)) {
    if (!t || STOP.has(t) || /^\d{1,2}$/.test(t)) continue;
    t = t.replace(/[^a-z0-9ñ]/g, "");
    if (t.length < 2) continue;
    if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
    out.add(t);
  }
  return out;
}

/** El token o cualquiera de sus sinónimos está en el conjunto. */
function hasSyn(set, t) {
  if (has(set, t)) return true;
  return (SYN[t] || []).some((x) => set.has(x));
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** ¿El token t está (o casi está, por error de OCR) en el conjunto? */
function has(set, t) {
  if (set.has(t)) return true;
  if (t.length < 5) return false;
  for (const s of set) if (s.length >= 5 && lev(s, t) <= 1) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Coincidencia con el catálogo                                        */
/* ------------------------------------------------------------------ */

/**
 * Devuelve los mejores productos del catálogo para un texto leído.
 * score 0..1: combina cuánto del texto leído explica el producto y cuánto
 * del nombre/contenido del producto aparece en el texto.
 */
export function matchProduct(text, catalog) {
  const q = tokens(text);
  if (!q.size) return [];
  const res = [];
  for (const p of catalog.products) {
    if (p.active === false) continue;
    const nameT = tokens(p.name);
    const descT = tokens(p.description || "");
    const all = new Set([...nameT, ...descT]);
    let cover = 0;
    for (const t of q) if (hasSyn(all, t)) cover++;
    const ocrCov = cover / q.size;
    const recall = (set) => { if (!set.size) return 0; let n = 0; for (const t of set) if (hasSyn(q, t)) n++; return n / set.size; };
    const nameRecall = recall(nameT);
    let score = 0.65 * ocrCov + 0.35 * Math.max(nameRecall, recall(descT));
    // Un producto suelto debe coincidir en al menos una palabra de su NOMBRE: "Salsa cheddar"
    // no es un "Burrito Gratinado" aunque su descripción mencione salsa cheddar.
    // (Las promociones/bandejas se reconocen por su contenido.)
    if (nameRecall === 0 && p.categoryId !== "promociones" && p.categoryId !== "bandejas") score *= 0.4;
    // Un texto con "+" es un combo: favorece promociones/bandejas frente a productos sueltos.
    if (/\+/.test(text) && (p.categoryId === "promociones" || p.categoryId === "bandejas")) score += 0.1;
    score = Math.min(1, score);
    if (score > 0.2) res.push({ product: p, score });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Parser de la captura de PedidosYa                                   */
/* ------------------------------------------------------------------ */

const STOP_LINE = /^(facturar|nro|email|subtotal|total|medio de pago|env[ií]o|costo|descuento|propina|el pedido|\d+\s*productos?\b|comentario|nota del cliente|cup[oó]n)/i;
const ITEM_START = /^\s*([0-9Il|]{1,2})\s*P[o0]r\b\s*(.*)$/i;
const PRICE_TAIL = /\s*\$?\s*\d{1,4}[.,]\d{1,2}\s*\S{0,2}\s*$/;

const cx = (b) => (b.x0 + b.x1) / 2;

function findPrepMinutes(ocr, H) {
  const top = H ? H * 0.45 : Infinity;
  const minu = ocr.words.find((w) => /^min/i.test(w.text) && w.bbox.y0 < top);
  const nums = ocr.words.filter((w) => /^\d{1,3}$/.test(w.text) && w.bbox.y0 < top);
  if (minu) {
    const h = minu.bbox.y1 - minu.bbox.y0;
    const wdt = minu.bbox.x1 - minu.bbox.x0;
    const cands = nums.filter((n) => Math.abs(cx(n.bbox) - cx(minu.bbox)) < Math.max(wdt, 60) * 1.5
      && n.bbox.y1 <= minu.bbox.y0 + h && minu.bbox.y0 - n.bbox.y1 < h * 5)
      .sort((a, b) => (minu.bbox.y0 - a.bbox.y1) - (minu.bbox.y0 - b.bbox.y1));
    if (cands[0]) {
      const c = cands[0].bbox;
      const line = ocr.lines.find((l) => c.y0 >= l.bbox.y0 - 5 && c.y1 <= l.bbox.y1 + 5);
      return { value: Number(cands[0].text), conf: cands[0].conf, method: "control", line };
    }
  }
  // Respaldo: patrón "− 11 +" en una línea superior.
  for (const l of ocr.lines) {
    if (H && l.bbox.y0 > top) continue;
    const m = l.text.match(/[-–—−]\s*(\d{1,3})\s*[+4t]\s*$/);
    if (m) return { value: Number(m[1]), conf: l.conf, method: "pattern", line: l };
  }
  return null;
}

/**
 * Número de orden. Fuentes, en orden de confianza:
 *  1. palabra "#154" en la tarjeta superior;
 *  2. "#154" en cualquier línea superior (incluida la barra "#154 - 237…");
 *  3. el modelo a veces lee "#" como "4" o "$": "4154" en la MISMA línea que el
 *     control de minutos, o "$+154-" en la barra superior → 154 (se pide verificar).
 */
function findOrderNumber(ocr, H, minutesLine) {
  const top = H ? H * 0.45 : Infinity;
  const w = ocr.words.find((x) => /^#\d{1,6}$/.test(x.text) && x.bbox.y0 < top);
  if (w) return { value: w.text.slice(1), sure: true };
  for (const l of ocr.lines) {
    if (H && l.bbox.y0 > top) continue;
    const m = l.text.match(/#\s?(\d{1,6})\b/);
    if (m) return { value: m[1], sure: true };
  }
  const header = ocr.lines.slice(0, 4).map((l) => l.text.match(/[$#S]\s*\+?\s*(\d{2,6})\s*-/)).find(Boolean);
  if (minutesLine) {
    const m = minutesLine.text.match(/^\W{0,2}4(\d{2,5})\b/);
    if (m) {
      const agree = header && header[1] === m[1];
      return { value: m[1], sure: !!agree };
    }
  }
  if (header) return { value: header[1], sure: false };
  return null;
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const BAD_NAME = /@|pedidosya|invoices|\d{3,}|repartidor|facturar/i;

function findCustomer(ocr, H) {
  // Etiqueta "Cliente" (puede venir con un ícono leído como letra: "a Cliente").
  const idx = ocr.lines.findIndex((l) => /^.{0,3}\bcliente\s*:?\s*$/i.test(l.text) && (!H || l.bbox.y0 < H * 0.6));
  let name = "";
  if (idx >= 0 && ocr.lines[idx + 1]) {
    // Quita el ícono leído como "5 " o ">. " al inicio.
    name = ocr.lines[idx + 1].text.replace(/^(?:[^A-Za-zÁÉÍÓÚÑáéíóúñ]+|[A-Za-z]\W\s)+/, "").trim();
    if (BAD_NAME.test(name)) name = "";
  }
  const masked = !name || /x{2,}/i.test(name);
  if (masked) {
    for (const l of ocr.lines) {
      const m = l.text.match(/Facturar a (?:empresa|nombre de|cliente)?\s*:?\s*(.+?)\s*(?:[-–|].*)?$/i);
      if (m && m[1].length > 2 && !BAD_NAME.test(m[1])) return { value: titleCase(m[1].trim()), source: "facturación", idx };
    }
  }
  return name ? { value: masked ? name : titleCase(name), source: "cliente", masked, idx } : null;
}

/** Texto de una línea sin la columna de precios (a la derecha de la captura). */
function lineTextNoPrice(ocr, line) {
  const W = ocr.width || 0;
  if (!W) return line.text.replace(PRICE_TAIL, "");
  const ws = ocr.words.filter((w) => {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    return cy >= line.bbox.y0 && cy <= line.bbox.y1 && w.bbox.x0 >= line.bbox.x0 - 2 && w.bbox.x1 <= line.bbox.x1 + 2;
  });
  if (!ws.length) return line.text.replace(PRICE_TAIL, "");
  return ws.filter((w) => w.bbox.x0 < W * 0.72).sort((a, b) => a.bbox.x0 - b.bbox.x0).map((w) => w.text).join(" ").replace(PRICE_TAIL, "");
}

const GROUP_LABEL = /^(elige|escoge|selecciona|elegir|escoja|opciones?|extras?|adicional(es)?|agregados?)\b/i;

function findItems(ocr, catalog, customerLineIdx) {
  const items = [];
  const lines = ocr.lines;
  // Posición horizontal del "1Por" de cada línea de producto. Los productos principales
  // empiezan a la izquierda; las OPCIONES de un producto (recuadro "Elige tu salsa /
  // Extra / 1Por Salsa cheddar") empiezan bastante más a la derecha.
  const porX = (l) => ocr.words.find((w) => /^[0-9Il|]{0,2}P[o0]r$/i.test(w.text) && Math.abs((w.bbox.y0 + w.bbox.y1) / 2 - (l.bbox.y0 + l.bbox.y1) / 2) < 30)?.bbox.x0 ?? l.bbox.x0;
  const starts = lines.slice(Math.max(0, customerLineIdx)).filter((l) => ITEM_START.test(l.text)).map(porX);
  const mainX = starts.length ? Math.min(...starts) : 0;
  const indentLimit = mainX + Math.max(60, (ocr.width || 900) * 0.07);
  let extraGroup = false;
  for (let i = Math.max(0, customerLineIdx); i < lines.length; i++) {
    const m = lines[i].text.match(ITEM_START);
    if (!m) continue;
    const qty = Number(m[1].replace(/[Il|]/g, "1")) || 1;
    const isModifier = items.length > 0 && porX(lines[i]) > indentLimit;
    let text = (lineTextNoPrice(ocr, lines[i]).match(ITEM_START)?.[2] ?? m[2]).replace(PRICE_TAIL, "").trim();
    const startWord = ocr.words.find((w) => /P[o0]r$/i.test(w.text) && Math.abs(w.bbox.y0 - lines[i].bbox.y0) < 25);
    const textX = startWord ? startWord.bbox.x1 : lines[i].bbox.x0 + 80;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (ITEM_START.test(l.text) || STOP_LINE.test(l.text.replace(/^\W+/, ""))) break;
      if (l.bbox.x0 < textX - 40) break; // el bloque gris de facturación empieza más a la izquierda
      if (/^\s*\$?\s*\d{1,4}[.,]\d{1,2}\s*\S{0,2}\s*$/.test(l.text)) continue; // sólo precio
      text += " " + lineTextNoPrice(ocr, l).trim();
    }
    i = j - 1;
    text = text.replace(/\s+/g, " ").replace(/\s*[-–—]+\s*$/, "").trim();
    if (isModifier) {
      // Opción del producto anterior: no es un producto nuevo, va como nota para cocina.
      if (GROUP_LABEL.test(text)) { extraGroup = /extra|adicional/i.test(text); continue; }
      const prev = items[items.length - 1];
      const opt = `${qty > 1 ? qty + "× " : ""}${text}${extraGroup ? " (extra)" : ""}`;
      prev.notes = prev.notes ? `${prev.notes} · ${opt}` : opt;
      prev.modifiers = [...(prev.modifiers || []), opt];
      continue;
    }
    extraGroup = false;
    const cands = matchProduct(text, catalog);
    const best = cands[0];
    const second = cands[1];
    let confident = !!best && best.score >= 0.55 && (!second || best.score - second.score >= 0.08);
    // Un combo ("… + …") que coincide con un producto suelto (no promoción) se revisa a mano.
    if (best && /\+/.test(text) && best.product.categoryId !== "promociones") confident = false;
    items.push({
      quantity: Math.min(99, qty),
      rawText: text,
      productId: best && best.score >= 0.35 ? best.product.id : "",
      productName: best && best.score >= 0.35 ? best.product.name : text,
      score: best ? Math.round(best.score * 100) / 100 : 0,
      confident,
      alternatives: cands.slice(0, 3).map((c) => ({ id: c.product.id, name: c.product.name, score: Math.round(c.score * 100) / 100 })),
      notes: "",
    });
  }
  return items;
}

/**
 * Analiza el resultado del OCR de una captura de PedidosYa.
 * @returns {{platform, platformOrderNumber, customerName, preparationMinutes, items, warnings, found}}
 */
export function parsePedidosYa(raw, catalog) {
  const ocr = {
    ...raw,
    lines: raw.lines.map((l) => ({ ...l, text: String(l.text).replace(/\s+/g, " ").trim() })).filter((l) => l.text),
    words: raw.words.map((w) => ({ ...w, text: String(w.text).trim() })).filter((w) => w.text),
  };
  const H = ocr.height || 0;
  const all = ocr.lines.map((l) => l.text).join("\n");
  const warnings = [];

  // El logo de PedidosYa no es texto; el formato "1Por …" de los productos sí lo identifica.
  const isPY = /pedidos\s?ya|pedidosya/i.test(all) || /\dP[o0]r\b/i.test(all);
  if (!isPY) warnings.push("La captura no parece de PedidosYa: confirma la plataforma.");

  const min = findPrepMinutes(ocr, H);
  const num = findOrderNumber(ocr, H, min?.line);
  if (!num) warnings.push("No se reconoció el NÚMERO DE ORDEN (#…). Escríbelo.");
  else if (!num.sure) warnings.push(`Verifica el NÚMERO DE ORDEN: se leyó #${num.value}.`);
  if (!min) warnings.push("No se reconoció el TIEMPO DE PREPARACIÓN (el número entre − y +). Escríbelo.");
  else if (min.value < 1 || min.value > 180) warnings.push(`El tiempo leído (${min.value} min) parece incorrecto. Verifícalo.`);

  const cust = findCustomer(ocr, H);
  if (!cust) warnings.push("No se reconoció el nombre del cliente.");
  else if (cust.masked) warnings.push("El nombre del cliente aparece oculto en la captura.");

  const custIdx = cust?.idx ?? ocr.lines.findIndex((l) => /cliente/i.test(l.text));
  const items = findItems(ocr, catalog, custIdx);
  if (!items.length) warnings.push("No se reconocieron productos. Agrégalos manualmente.");
  items.forEach((it) => {
    if (!it.productId) warnings.push(`Producto no identificado: "${it.rawText}". Elige el producto correcto.`);
    else if (!it.confident) warnings.push(`Verifica el producto "${it.rawText}" → ${it.productName}.`);
  });

  return {
    platform: isPY ? "PEDIDOS_YA" : "PEDIDOS_YA",
    platformOrderNumber: num ? num.value : "",
    customerName: cust ? cust.value : "",
    preparationMinutes: min && min.value >= 1 && min.value <= 180 ? min.value : null,
    items,
    warnings,
    found: { orderNumber: !!num, orderNumberSure: !!num?.sure, minutes: !!min, customer: !!cust, minutesMethod: min?.method || null },
  };
}
