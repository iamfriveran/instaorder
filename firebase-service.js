/**
 * INSTAOrder — Servicio de datos
 * ==============================
 *
 * Toda la comunicación con la base de datos pasa por este archivo.
 *
 * Arquitectura:
 *   DataService  -> lógica de negocio (enviar orden, aceptar, completar,
 *                   notificar al mesero, historial, configuración).
 *   Adapter      -> transporte. Hay dos:
 *       FirebaseAdapter : Firebase Realtime Database (producción).
 *       LocalAdapter    : MODO DEMO LOCAL (localStorage + BroadcastChannel)
 *                         cuando aún no se configuró firebase-config.js.
 *
 * Estructura de datos (ver README, sección "Estructura de datos"):
 *   /settings/app                 configuración compartida (meseros, mesas...)
 *   /catalog                      catálogo editable (si no existe, se usa catalog.js)
 *   /counters/orderNumber         contador del número visible de orden (#1001, #1002...)
 *   /orders/{orderId}             órdenes (nunca se borran)
 *   /orders/{orderId}/events/{k}  registro de auditoría de la orden
 *   /security/requireRoles        (sólo consola) activa los roles
 *   /roles/{uid}                  (sólo consola) "waiter" | "kitchen" | "admin"
 *
 * Reglas clave de negocio:
 *  - Una orden se crea con un ID único generado en el teléfono ANTES de enviarla.
 *    Reintentar con el mismo ID nunca crea un duplicado (se comprueba si ya
 *    existe y las reglas de seguridad impiden sobrescribirla).
 *  - Una orden sólo se marca como "enviada" cuando Firebase confirma la escritura.
 *  - Los productos de una orden enviada son inmutables (reglas de seguridad).
 *  - Los precios son referenciales: aquí NO se suman ni se calculan totales.
 */

import { firebaseConfig, AUTH_MODE, FIREBASE_SDK_VERSION, IS_DEMO } from "./firebase-config.js";

/** Usuarios con contraseña y roles administrados desde la app ("users"; "email" es el nombre anterior). */
export const USERS_MODE = (!IS_DEMO && (AUTH_MODE === "users" || AUTH_MODE === "email"))
  // Sólo para probar en modo demo: localStorage "instaorder.demo.users" = "1".
  || (IS_DEMO && typeof localStorage !== "undefined" && localStorage.getItem("instaorder.demo.users") === "1");

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Marcador de "hora del servidor". Cada adaptador lo traduce. */
export const SERVER_TS = { ".sv": "timestamp" };

export class OfflineError extends Error {
  constructor(msg = "Sin conexión con el servidor") { super(msg); this.name = "OfflineError"; }
}

/** Identificador aleatorio corto, seguro para claves de Firebase. */
export function randomId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(len);
  (globalThis.crypto || window.crypto).getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

/** Clave de evento ordenable cronológicamente. */
function eventKey() {
  return "e" + Date.now().toString(36) + randomId(4);
}

/** Fecha local AAAA-MM-DD (se usa para filtrar el historial por día). */
export function dayKeyOf(ms = Date.now()) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function getAt(tree, path) {
  if (!path) return tree;
  let node = tree;
  for (const part of path.split("/").filter(Boolean)) {
    if (node == null || typeof node !== "object") return null;
    node = node[part];
  }
  return node === undefined ? null : node;
}

function setAt(tree, path, value) {
  const parts = path.split("/").filter(Boolean);
  let node = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] == null || typeof node[parts[i]] !== "object") node[parts[i]] = {};
    node = node[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = value;
}

function resolveServerValues(value, now) {
  if (value && typeof value === "object") {
    if (value[".sv"] === "timestamp") return now;
    const out = Array.isArray(value) ? [] : {};
    for (const k of Object.keys(value)) out[k] = resolveServerValues(value[k], now);
    return out;
  }
  return value;
}

/** Convierte objetos con claves numéricas (como los devuelve Firebase) en arrays. */
function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k]).filter(Boolean);
}

function normalizeOrder(o) {
  if (!o) return null;
  return {
    ...o,
    items: toArray(o.items),
    events: o.events || {},
    waiterNotification: o.waiterNotification || { status: "NONE" },
  };
}

/* ------------------------------------------------------------------ */
/* Adaptador Firebase                                                  */
/* ------------------------------------------------------------------ */

class FirebaseAdapter {
  constructor() {
    this.kind = "firebase";
    this.state = "connecting";
    this.connected = false;
    this.everConnected = false;
    this.offset = 0;
    this.uid = null;
    this.user = null;
    this.connListeners = new Set();
    this.authListeners = new Set();
  }

  async init() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
    const [appMod, dbMod, authMod] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-database.js`),
      import(`${base}/firebase-auth.js`),
    ]);
    this.f = { ...dbMod, ...authMod };
    this.appMod = appMod;
    this.app = appMod.initializeApp(firebaseConfig);
    this.db = dbMod.getDatabase(this.app);
    this.auth = authMod.getAuth(this.app);

    // Estado de conexión en tiempo real (sin polling).
    dbMod.onValue(dbMod.ref(this.db, ".info/connected"), (snap) => {
      this.connected = snap.val() === true;
      if (this.connected) this.everConnected = true;
      this._computeState();
    });
    dbMod.onValue(dbMod.ref(this.db, ".info/serverTimeOffset"), (snap) => {
      this.offset = Number(snap.val()) || 0;
    });
    window.addEventListener("online", () => this._computeState());
    window.addEventListener("offline", () => this._computeState());

    // Autenticación
    await new Promise((resolve) => {
      let first = true;
      authMod.onAuthStateChanged(this.auth, async (user) => {
        this.user = user;
        this.uid = user ? user.uid : null;
        if (!user && AUTH_MODE === "anonymous") {
          try { await authMod.signInAnonymously(this.auth); } catch (e) {
            console.error("[INSTAOrder] Error de inicio anónimo:", e);
            this.authError = e;
            this.authListeners.forEach((cb) => cb(null, e));
            if (first) { first = false; resolve(); }
          }
          return;
        }
        this.authListeners.forEach((cb) => cb(user));
        if (first) { first = false; resolve(); }
      });
    });
  }

  /** En modo usuarios, una sesión anónima antigua (del modo anterior) no sirve: pide iniciar sesión. */
  needsLogin() { return USERS_MODE && (!this.user || this.user.isAnonymous); }

  /* ---------- Modo "users": usuario + contraseña administrados desde la app ---------- */

  /** "Saby" -> "saby@instaorder-takolandia.firebaseapp.com" (correo interno, nunca recibe correos). */
  usernameToEmail(username) {
    return `${String(username).trim().toLowerCase()}@${firebaseConfig.authDomain}`;
  }

  async signInUser(username, password) {
    await this.f.signInWithEmailAndPassword(this.auth, this.usernameToEmail(username), password);
  }

  /** Crea la cuenta y deja la sesión iniciada con ella (sólo para el primer Admin). */
  async createOwnAccount(username, password) {
    const cred = await this.f.createUserWithEmailAndPassword(this.auth, this.usernameToEmail(username), password);
    return cred.user.uid;
  }

  /**
   * El Admin crea la cuenta de otro empleado SIN cerrar su propia sesión:
   * se usa una segunda instancia de Firebase sólo en memoria.
   */
  async createAuthUser(username, password) {
    const name = "instaorder-creator";
    const sec = this.appMod.getApps().find((a) => a.name === name) || this.appMod.initializeApp(firebaseConfig, name);
    const auth2 = this.f.getAuth(sec);
    await this.f.setPersistence(auth2, this.f.inMemoryPersistence);
    const cred = await this.f.createUserWithEmailAndPassword(auth2, this.usernameToEmail(username), password);
    const uid = cred.user.uid;
    await this.f.signOut(auth2);
    return uid;
  }

  /** Cada empleado cambia su propia contraseña (pide la actual). */
  async changeOwnPassword(current, next) {
    const user = this.auth.currentUser;
    const cred = this.f.EmailAuthProvider.credential(user.email, current);
    await this.f.reauthenticateWithCredential(user, cred);
    await this.f.updatePassword(user, next);
  }

  async signInEmail(email, password) {
    await this.f.signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut() { await this.f.signOut(this.auth); }

  onAuth(cb) { this.authListeners.add(cb); return () => this.authListeners.delete(cb); }

  _computeState() {
    let s;
    if (this.connected) s = "connected";
    else if (!navigator.onLine) s = "offline";
    else s = this.everConnected ? "reconnecting" : "connecting";
    if (s !== this.state) {
      this.state = s;
      this.connListeners.forEach((cb) => cb(s));
    }
  }

  onConnection(cb) { this.connListeners.add(cb); cb(this.state); return () => this.connListeners.delete(cb); }
  isConnected() { return this.connected; }
  now() { return Date.now() + this.offset; }
  newKey() { return eventKey(); }

  listen(path, cb, onError) {
    const { ref, onValue } = this.f;
    return onValue(ref(this.db, path), (s) => cb(s.val()), (e) => { console.error(path, e); onError && onError(e); });
  }

  listenQuery(path, child, value, cb, onError) {
    const { ref, onValue, query, orderByChild, equalTo } = this.f;
    const q = query(ref(this.db, path), orderByChild(child), equalTo(value));
    return onValue(q, (s) => cb(s.val() || {}), (e) => { console.error(path, e); onError && onError(e); });
  }

  async get(path) {
    const { ref, get } = this.f;
    const snap = await get(ref(this.db, path));
    return snap.val();
  }

  async queryOnce(path, child, value) {
    const { ref, get, query, orderByChild, equalTo } = this.f;
    const snap = await get(query(ref(this.db, path), orderByChild(child), equalTo(value)));
    return snap.val() || {};
  }

  /** Escritura multi-ruta atómica. Resuelve sólo cuando el servidor confirma. */
  update(map) {
    const { ref, update } = this.f;
    return update(ref(this.db), map);
  }

  /** Incrementa un contador con transacción (sin duplicados entre dispositivos). */
  async nextCounter(path, start) {
    const { ref, runTransaction } = this.f;
    const res = await runTransaction(ref(this.db, path), (cur) => (typeof cur === "number" ? cur : start) + 1);
    if (!res.committed) throw new Error("No se pudo asignar número de orden");
    return res.snapshot.val();
  }
}

/* ------------------------------------------------------------------ */
/* Adaptador local (MODO DEMO)                                         */
/* ------------------------------------------------------------------ */

const DEMO_KEY = "instaorder.demo.db";

class LocalAdapter {
  constructor() {
    this.kind = "demo";
    this.uid = sessionStorage.getItem("instaorder.demo.session") || "demo-" + (localStorage.getItem("instaorder.deviceId") || "device");
    this.listeners = new Set();
    this.connListeners = new Set();
    this.simOffline = sessionStorage.getItem("instaorder.demo.offline") === "1";
    this.everConnected = true;
  }

  async init() {
    this.channel = "BroadcastChannel" in window ? new BroadcastChannel("instaorder-demo") : null;
    if (this.channel) this.channel.onmessage = () => this._emit();
    window.addEventListener("storage", (e) => { if (e.key === DEMO_KEY) this._emit(); });
  }

  /* --- Simulación de usuarios en modo demo (contraseñas en claro: SÓLO PRUEBAS) --- */
  get user() { const u = sessionStorage.getItem("instaorder.demo.session"); return u ? { uid: u } : null; }
  needsLogin() { return USERS_MODE && !this.user; }
  onAuth() { return () => {}; }
  _auth() { return getAt(this._read(), "__auth") || {}; }
  async signInUser(username, password) {
    const a = this._auth()[username];
    if (!a || a.password !== password) { const e = new Error("bad"); e.code = "auth/invalid-credential"; throw e; }
    sessionStorage.setItem("instaorder.demo.session", a.uid); this.uid = a.uid;
  }
  async createAuthUser(username, password) {
    if (this._auth()[username]) { const e = new Error("dup"); e.code = "auth/email-already-in-use"; throw e; }
    const uid = "U" + randomId(10);
    await this.update({ [`__auth/${username}`]: { uid, password } });
    return uid;
  }
  async createOwnAccount(username, password) {
    const uid = await this.createAuthUser(username, password);
    sessionStorage.setItem("instaorder.demo.session", uid); this.uid = uid;
    return uid;
  }
  async changeOwnPassword(current, next) {
    const entry = Object.entries(this._auth()).find(([, v]) => v.uid === this.uid);
    if (!entry || entry[1].password !== current) { const e = new Error("bad"); e.code = "auth/invalid-credential"; throw e; }
    await this.update({ [`__auth/${entry[0]}/password`]: next });
  }
  async signOut() { sessionStorage.removeItem("instaorder.demo.session"); }

  get state() { return this.simOffline ? "offline" : "demo"; }
  onConnection(cb) { this.connListeners.add(cb); cb(this.state); return () => this.connListeners.delete(cb); }
  isConnected() { return !this.simOffline; }

  /** Sólo modo demo: simula pérdida de conexión en esta pestaña (para pruebas). */
  setSimulatedOffline(v) {
    this.simOffline = !!v;
    sessionStorage.setItem("instaorder.demo.offline", v ? "1" : "0");
    this.connListeners.forEach((cb) => cb(this.state));
    if (!v) this._emit();
  }

  now() { return Date.now(); }
  newKey() { return eventKey(); }

  _read() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || {}; } catch { return {}; }
  }

  _emit() {
    if (this.simOffline) return; // desconectado: no llegan cambios
    const tree = this._read();
    for (const l of this.listeners) {
      let val = getAt(tree, l.path);
      if (l.child) {
        const out = {};
        for (const [k, v] of Object.entries(val || {})) if (v && v[l.child] === l.value) out[k] = v;
        val = out;
      }
      const json = JSON.stringify(val);
      if (json !== l.last) { l.last = json; l.cb(val == null ? (l.child ? {} : null) : JSON.parse(json)); }
    }
  }

  _subscribe(l) {
    this.listeners.add(l);
    setTimeout(() => this._emit(), 0);
    return () => this.listeners.delete(l);
  }

  listen(path, cb) { return this._subscribe({ path, cb, last: undefined }); }
  listenQuery(path, child, value, cb) { return this._subscribe({ path, child, value, cb, last: undefined }); }

  async get(path) {
    if (this.simOffline) throw new OfflineError();
    return getAt(this._read(), path);
  }

  async queryOnce(path, child, value) {
    if (this.simOffline) throw new OfflineError();
    const out = {};
    for (const [k, v] of Object.entries(getAt(this._read(), path) || {})) if (v && v[child] === value) out[k] = v;
    return out;
  }

  async update(map) {
    if (this.simOffline) throw new OfflineError();
    await new Promise((r) => setTimeout(r, 120)); // simula latencia de red
    const tree = this._read();
    const now = Date.now();
    for (const [path, value] of Object.entries(map)) setAt(tree, path, resolveServerValues(value, now));
    localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
    if (this.channel) this.channel.postMessage("changed");
    this._emit();
  }

  async nextCounter(path, start) {
    if (this.simOffline) throw new OfflineError();
    const tree = this._read();
    const cur = getAt(tree, path);
    const next = (typeof cur === "number" ? cur : start) + 1;
    setAt(tree, path, next);
    localStorage.setItem(DEMO_KEY, JSON.stringify(tree));
    return next;
  }

  /** Borra todos los datos de la demo (sólo modo demo). */
  resetDemo() {
    localStorage.removeItem(DEMO_KEY);
    if (this.channel) this.channel.postMessage("changed");
    this._emit();
  }
}

/* ------------------------------------------------------------------ */
/* DataService — lógica de negocio                                     */
/* ------------------------------------------------------------------ */

const ORDER_NUMBER_START = 1000;

class DataService {
  constructor() {
    this.adapter = IS_DEMO ? new LocalAdapter() : new FirebaseAdapter();
    this.isDemo = IS_DEMO;
  }

  async init() { await this.adapter.init(); }

  get state() { return this.adapter.state; }
  onConnection(cb) { return this.adapter.onConnection(cb); }
  isConnected() { return this.adapter.isConnected(); }
  now() { return this.adapter.now(); }
  get uid() { return this.adapter.uid; }

  /* ---------- Configuración compartida ---------- */

  watchSettings(cb, onError) { return this.adapter.listen("settings/app", (v) => cb(v || null), onError); }

  /** Guarda sólo las claves indicadas de la configuración. */
  saveSettings(partial) {
    const map = {};
    for (const [k, v] of Object.entries(partial)) map[`settings/app/${k}`] = v;
    map["settings/app/updatedAt"] = SERVER_TS;
    return this.adapter.update(map);
  }

  watchCatalog(cb, onError) { return this.adapter.listen("catalog", (v) => cb(v || null), onError); }

  saveCatalog(catalog) {
    return this.adapter.update({ catalog: { ...catalog, updatedAt: SERVER_TS } });
  }

  /* ---------- Órdenes ---------- */

  /**
   * Órdenes activas: NEW, ACCEPTED, y COMPLETED cuya notificación aún no fue
   * aceptada por el mesero. Un solo listener en tiempo real alimenta la
   * cocina, el estado de las mesas y las alertas de los meseros.
   */
  watchActiveOrders(cb, onError) {
    return this.adapter.listenQuery("orders", "active", true, (obj) => {
      const list = Object.values(obj || {}).map(normalizeOrder);
      list.sort((a, b) => (a.sentAt || a.createdAt) - (b.sentAt || b.createdAt));
      cb(list);
    }, onError);
  }

  async getOrder(orderId) {
    return normalizeOrder(await this.adapter.get(`orders/${orderId}`));
  }

  /** Órdenes creadas en un día (AAAA-MM-DD). */
  async getOrdersByDay(dayKey) {
    const obj = await this.adapter.queryOnce("orders", "dayKey", dayKey);
    return Object.values(obj).map(normalizeOrder);
  }

  /**
   * Construye una orden nueva (todavía no enviada). El ID único se genera
   * aquí, en el dispositivo, para que los reintentos sean idempotentes.
   */
  buildOrder({ tableNumber, waiter, items, generalNotes, deviceId, correctionOf = null }) {
    const now = this.now();
    const orderId = `ORD-${dayKeyOf(now).replace(/-/g, "")}-${randomId(6)}`;
    const cleanItems = items.map((it, i) => ({
      lineId: `L${i + 1}`,
      productId: it.productId,
      productName: it.productName,
      category: it.category || "",
      quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
      // Precio referencial copiado para consulta. NO se usa para calcular nada.
      referencePrice: typeof it.referencePrice === "number" ? it.referencePrice : null,
      notes: (it.notes || "").trim(),
      prepared: false,
    }));
    return {
      schemaVersion: 1,
      orderId,
      orderNumber: null,
      type: correctionOf ? "CORRECTION" : "NORMAL",
      correctionOf: correctionOf || null,
      tableNumber: Number(tableNumber),
      waiterId: waiter.id,
      waiterName: waiter.name, // copia del nombre al momento de crear la orden
      deviceId,
      items: cleanItems,
      itemCount: cleanItems.reduce((n, it) => n + it.quantity, 0), // conteo de artículos, no dinero
      generalNotes: (generalNotes || "").trim(),
      status: "NEW",
      active: true,
      dayKey: dayKeyOf(now),
      createdAt: now,
    };
  }

  /**
   * Envía una orden a cocina de forma idempotente.
   *  1. Exige conexión confirmada (si no, lanza OfflineError y la orden
   *     queda en la bandeja de salida local, marcada "NO ENVIADA").
   *  2. Asigna número visible (#1001...) con transacción, una sola vez.
   *  3. Si la orden ya existe en el servidor (reintento), no la reescribe.
   *  4. Escribe la orden y sus eventos en una sola operación atómica y
   *     resuelve sólo cuando el servidor la confirma.
   */
  async sendOrder(order, { onNumberAssigned } = {}) {
    if (!this.adapter.isConnected()) throw new OfflineError();

    if (!order.orderNumber) {
      order.orderNumber = await this.adapter.nextCounter("counters/orderNumber", ORDER_NUMBER_START);
      onNumberAssigned && onNumberAssigned(order.orderNumber);
    }

    const existing = await this.adapter.get(`orders/${order.orderId}`);
    if (existing) return { duplicatePrevented: true, order: normalizeOrder(existing) };

    const by = { id: order.waiterId, name: order.waiterName };
    const record = {
      ...order,
      correctionOf: order.correctionOf || null,
      clientSentAt: Date.now(),
      sentAt: SERVER_TS,
      waiterNotification: { status: "NONE" },
      events: {
        [this.adapter.newKey()]: { type: "ORDER_CREATED", at: order.createdAt, byId: by.id, byName: by.name, deviceId: order.deviceId },
        [this.adapter.newKey()]: { type: "ORDER_SENT", at: SERVER_TS, byId: by.id, byName: by.name, deviceId: order.deviceId },
      },
    };
    // Firebase no guarda null: los quitamos para mantener datos limpios.
    for (const k of Object.keys(record)) if (record[k] === null) delete record[k];

    await this.adapter.update({ [`orders/${order.orderId}`]: record });
    return { duplicatePrevented: false };
  }

  _event(orderId, type, by, extra = {}) {
    return {
      [`orders/${orderId}/events/${this.adapter.newKey()}`]: {
        type, at: SERVER_TS, byId: by?.id || "", byName: by?.name || "", ...extra,
      },
    };
  }

  /** Cocina acepta la orden: detiene el parpadeo en todos los dispositivos. */
  acceptOrder(order, by) {
    if (!this.adapter.isConnected()) return Promise.reject(new OfflineError());
    return this.adapter.update({
      [`orders/${order.orderId}/status`]: "ACCEPTED",
      [`orders/${order.orderId}/acceptedAt`]: SERVER_TS,
      [`orders/${order.orderId}/acceptedBy`]: { id: by?.id || "", name: by?.name || "Cocina" },
      ...this._event(order.orderId, "ORDER_ACCEPTED", by),
    });
  }

  /** Marca (opcional) un producto como preparado. */
  setItemPrepared(order, index, prepared, by) {
    if (!this.adapter.isConnected()) return Promise.reject(new OfflineError());
    return this.adapter.update({
      [`orders/${order.orderId}/items/${index}/prepared`]: !!prepared,
      ...this._event(order.orderId, prepared ? "ITEM_PREPARED" : "ITEM_UNPREPARED", by, { line: index }),
    });
  }

  /**
   * Cocina completa la orden: sale del panel de cocina, queda en el
   * historial (no se borra) y se genera la notificación para el mesero.
   */
  completeOrder(order, by) {
    if (!this.adapter.isConnected()) return Promise.reject(new OfflineError());
    const id = order.orderId;
    const map = {
      [`orders/${id}/status`]: "COMPLETED",
      [`orders/${id}/completedAt`]: SERVER_TS,
      [`orders/${id}/completedBy`]: { id: by?.id || "", name: by?.name || "Cocina" },
      [`orders/${id}/waiterNotification`]: { status: "PENDING", createdAt: SERVER_TS },
      ...this._event(id, "ORDER_COMPLETED", by),
    };
    // Si se completa sin haberse aceptado, se registra la aceptación implícita.
    if (order.status === "NEW") {
      map[`orders/${id}/acceptedAt`] = SERVER_TS;
      map[`orders/${id}/acceptedBy`] = { id: by?.id || "", name: by?.name || "Cocina" };
    }
    return this.adapter.update(map);
  }

  /** El teléfono del mesero registra que recibió la alerta (una vez). */
  markNotificationDelivered(order, waiter) {
    if (!this.adapter.isConnected()) return Promise.resolve();
    return this.adapter.update({
      [`orders/${order.orderId}/waiterNotification/status`]: "DELIVERED",
      [`orders/${order.orderId}/waiterNotification/deliveredAt`]: SERVER_TS,
      ...this._event(order.orderId, "NOTIFICATION_DELIVERED", waiter),
    });
  }

  /** El mesero acepta la alerta "LISTO PARA SERVIR" de UNA orden. */
  acknowledgeNotification(order, waiter) {
    if (!this.adapter.isConnected()) return Promise.reject(new OfflineError());
    const id = order.orderId;
    return this.adapter.update({
      [`orders/${id}/waiterNotification/status`]: "ACKNOWLEDGED",
      [`orders/${id}/waiterNotification/acknowledgedAt`]: SERVER_TS,
      [`orders/${id}/waiterNotification/acknowledgedBy`]: { id: waiter?.id || "", name: waiter?.name || "" },
      [`orders/${id}/active`]: false,
      ...this._event(id, "NOTIFICATION_ACKNOWLEDGED", waiter),
    });
  }

  /* ---------- Sesión (modo email) ---------- */
  needsLogin() { return this.adapter.needsLogin(); }
  get usersMode() { return USERS_MODE; }

  /* ---------- Usuarios (modo "users") ---------- */

  /** ¿Ya existe el primer Admin? (dato público: sólo true/false). */
  async isBootstrapped() { return (await this.adapter.get("security/bootstrapped")) === true; }

  _profile({ username, displayName, roles, shared }, createdBy) {
    return {
      username: String(username).trim().toLowerCase(),
      displayName: String(displayName).trim(),
      roles: { waiter: !!roles.waiter, kitchen: !!roles.kitchen, admin: !!roles.admin },
      shared: !!shared,
      active: true,
      createdAt: SERVER_TS,
      createdBy: createdBy || "",
    };
  }

  /** Configuración inicial: la primera persona crea su cuenta y queda como Admin. */
  async bootstrapAdmin({ username, displayName, password }) {
    const uid = await this.adapter.createOwnAccount(username, password);
    await this.adapter.update({
      [`users/${uid}`]: this._profile({ username, displayName, roles: { waiter: true, kitchen: true, admin: true } }, uid),
      "security/bootstrapped": true,
    });
    return uid;
  }

  /** El Admin crea un empleado con usuario, contraseña y roles. */
  async createUser(data, admin) {
    if (!this.adapter.isConnected()) throw new OfflineError();
    const uid = await this.adapter.createAuthUser(data.username, data.password);
    await this.adapter.update({ [`users/${uid}`]: this._profile(data, admin?.id) });
    return uid;
  }

  /** Cambia roles, nombre, tablet compartida o activa/desactiva (sólo Admin). */
  updateUser(uid, patch, admin) {
    if (!this.adapter.isConnected()) return Promise.reject(new OfflineError());
    const map = {};
    for (const [k, v] of Object.entries(patch)) map[`users/${uid}/${k}`] = v;
    map[`users/${uid}/updatedAt`] = SERVER_TS;
    map[`users/${uid}/updatedBy`] = admin?.id || "";
    return this.adapter.update(map);
  }

  watchUser(uid, cb, onError) { return this.adapter.listen(`users/${uid}`, cb, onError); }
  watchUsers(cb, onError) {
    return this.adapter.listen("users", (v) => cb(Object.entries(v || {}).map(([uid, u]) => ({ uid, ...u }))), onError);
  }
  signInUser(u, p) { return this.adapter.signInUser(u, p); }
  changeOwnPassword(c, n) { return this.adapter.changeOwnPassword(c, n); }
  signInEmail(e, p) { return this.adapter.signInEmail(e, p); }
  signOut() { return this.adapter.signOut ? this.adapter.signOut() : Promise.resolve(); }
  onAuth(cb) { return this.adapter.onAuth(cb); }
  get userEmail() { return this.adapter.user?.email || ""; }
}

export const dataService = new DataService();
