/**
 * INSTAOrder — Inicio de sesión con usuario y contraseña (modo "users")
 * =====================================================================
 * - Configuración inicial: si todavía no existe ningún Admin, la pantalla
 *   permite crear el primer usuario Administrador (lo hace el dueño, una vez).
 * - Inicio de sesión: usuario + contraseña. La sesión queda guardada en el
 *   teléfono hasta que la persona cierre sesión.
 * - Si la cuenta está desactivada o no tiene roles, se bloquea el acceso.
 *
 * Los usuarios usan un correo interno (usuario@<proyecto>.firebaseapp.com)
 * que nunca recibe correos: el empleado sólo ve y escribe su usuario.
 */

import { dataService } from "../firebase-service.js";
import { state } from "./state.js";
import { $, esc } from "./ui.js";
import { lockRouter } from "./router.js";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export const normUser = (u) => String(u || "").trim().toLowerCase();

export function authErrorText(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-email"))
    return "Usuario o contraseña incorrectos.";
  if (c.includes("too-many-requests")) return "Demasiados intentos. Espera unos minutos.";
  if (c.includes("email-already-in-use")) return "Ese usuario ya existe. Elige otro.";
  if (c.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (c.includes("network")) return "Sin conexión. Revisa Internet.";
  if (c.includes("operation-not-allowed")) return "Falta habilitar 'Correo electrónico/contraseña' en Firebase Authentication.";
  if (c.includes("PERMISSION_DENIED") || /permission/i.test(e?.message || "")) return "Permiso denegado: revisa que las reglas nuevas estén publicadas en Firebase.";
  return "No se pudo completar: " + (e?.message || e);
}

function shell(inner) {
  $("#app").innerHTML = `
  <section class="home">
    <div class="home-card login-card">
      <div class="logo-slot"><img src="assets/logo.png" class="home-logo" alt="Logo Takolandia"></div>
      <h1 class="home-title">INSTA<b>Order</b></h1>
      ${inner}
    </div>
  </section>`;
}

/** Muestra el inicio de sesión (o la configuración inicial). No resuelve: recarga al entrar. */
export async function showLogin() {
  let boot = true;
  try { boot = await dataService.isBootstrapped(); } catch { boot = true; }
  if (!boot) return showBootstrap();

  shell(`
    <p class="home-sub">Inicia sesión</p>
    <form class="login-form" autocomplete="on">
      <input class="field" name="u" placeholder="Usuario" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
      <input class="field" name="p" type="password" placeholder="Contraseña" required autocomplete="current-password">
      <button class="btn btn-primary btn-lg" type="submit">Entrar</button>
      <p class="login-err" role="alert"></p>
      <p class="muted small">¿No tienes usuario o olvidaste tu contraseña? Pídeselo al administrador.</p>
    </form>`);
  const f = $(".login-form");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button");
    btn.disabled = true;
    f.querySelector(".login-err").textContent = "";
    try {
      await dataService.signInUser(normUser(f.u.value), f.p.value);
      location.reload();
    } catch (err) {
      f.querySelector(".login-err").textContent = authErrorText(err);
      btn.disabled = false;
    }
  });
}

function showBootstrap() {
  shell(`
    <p class="home-sub">Configuración inicial</p>
    <p class="small">Crea el usuario <b>Administrador</b>. Sólo se hace una vez: después, el Administrador crea los usuarios de los empleados desde <b>Configuración › Usuarios</b>.</p>
    <form class="login-form" autocomplete="off">
      <input class="field" name="n" placeholder="Tu nombre (ej.: Francisco)" required maxlength="40">
      <input class="field" name="u" placeholder="Usuario (ej.: francisco)" required autocapitalize="none" autocorrect="off" spellcheck="false">
      <input class="field" name="p" type="password" placeholder="Contraseña (mínimo 6)" required minlength="6" autocomplete="new-password">
      <input class="field" name="p2" type="password" placeholder="Repite la contraseña" required minlength="6" autocomplete="new-password">
      <button class="btn btn-primary btn-lg" type="submit">Crear Administrador</button>
      <p class="login-err" role="alert"></p>
    </form>`);
  const f = $(".login-form");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = f.querySelector(".login-err");
    const u = normUser(f.u.value);
    if (!USERNAME_RE.test(u)) { err.textContent = "Usuario: 3 a 30 letras minúsculas o números, sin espacios ni acentos."; return; }
    if (f.p.value.length < 6) { err.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    if (f.p.value !== f.p2.value) { err.textContent = "Las contraseñas no coinciden."; return; }
    const btn = f.querySelector("button");
    btn.disabled = true;
    try {
      await dataService.bootstrapAdmin({ username: u, displayName: f.n.value, password: f.p.value });
      location.reload();
    } catch (e2) {
      err.textContent = authErrorText(e2);
      btn.disabled = false;
    }
  });
}

/** Pantalla para cuentas desactivadas o sin roles. */
export function showBlocked(reason) {
  lockRouter();
  document.getElementById("ready-alerts")?.remove();
  shell(`
    <p class="conn-pill conn-bad" style="margin:6px auto">ACCESO BLOQUEADO</p>
    <p>${esc(reason)}</p>
    <p class="muted small">Si crees que es un error, habla con el administrador.</p>
    <button class="btn btn-ghost btn-lg" data-logout>Cerrar sesión</button>`);
  $("[data-logout]").addEventListener("click", async () => { await dataService.signOut(); location.reload(); });
}

/**
 * Escucha el perfil del usuario con sesión. Resuelve con el perfil la primera
 * vez que es válido. Si después lo desactivan, bloquea la app al instante.
 */
export function watchMyProfile(onChange) {
  return new Promise((resolve) => {
    let started = false;
    dataService.watchUser(dataService.uid, (p) => {
      const profile = p ? { uid: dataService.uid, ...p } : null;
      const roles = profile?.roles || {};
      const ok = profile && profile.active === true && (roles.waiter || roles.kitchen || roles.admin);
      if (!ok) {
        state.me = null;
        showBlocked(!profile ? "Este usuario no tiene un perfil en INSTAOrder."
          : profile.active !== true ? "Esta cuenta fue desactivada." : "Esta cuenta no tiene roles asignados.");
        return;
      }
      const wasBlocked = started && !state.me;
      state.me = profile;
      if (!started) { started = true; resolve(profile); }
      else if (wasBlocked) location.reload();
      else onChange && onChange(profile);
    }, (e) => {
      state.me = null;
      showBlocked(/permission/i.test(e?.message || e?.code || "")
        ? "Tu cuenta está desactivada o no tiene permisos en INSTAOrder."
        : "No se pudo leer tu perfil. " + authErrorText(e));
    });
  });
}
