/**
 * INSTAOrder — Configuración de Firebase
 * ======================================
 *
 * 1. En Firebase Console > Configuración del proyecto > Tus apps > Web,
 *    copia el objeto `firebaseConfig` y pega los valores abajo.
 * 2. La configuración web de Firebase es PÚBLICA por diseño (no es una
 *    contraseña). La seguridad real la dan las Reglas de la base de datos
 *    (database.rules.json) y Firebase Authentication.
 * 3. NUNCA pongas aquí claves de administración, "service accounts" ni
 *    secretos de servidor.
 *
 * Mientras `apiKey` siga con el valor "PEGAR_AQUI", la aplicación funciona en
 * MODO DEMO LOCAL: los datos se guardan sólo en este navegador y se comparten
 * entre pestañas del mismo navegador. Sirve para probar, NO para operar.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBvqnr6YA1JGNeKeUOtxM0CQ9IGwTo14Ys",
  authDomain: "instaorder-takolandia.firebaseapp.com",
  databaseURL: "https://instaorder-takolandia-default-rtdb.firebaseio.com",
  projectId: "instaorder-takolandia",
  storageBucket: "instaorder-takolandia.firebasestorage.app",
  messagingSenderId: "809932989663",
  appId: "1:809932989663:web:8d5a2eeaa367890392356a"
};

/**
 * Modo de autenticación de los dispositivos:
 *  - "users":     RECOMENDADO. Cada empleado entra con usuario y contraseña.
 *                 El Admin crea usuarios, asigna roles (Mesero / Cocina / Admin,
 *                 uno o varios) y desactiva cuentas desde Configuración › Usuarios.
 *                 Requiere habilitar "Correo electrónico/contraseña" en Firebase
 *                 Authentication y publicar database.rules.json.
 *  - "anonymous": modo anterior, sin usuarios (cualquiera con la dirección entra).
 */
export const AUTH_MODE = "users";

/** Versión del SDK de Firebase cargado desde el CDN oficial (gstatic). */
export const FIREBASE_SDK_VERSION = "10.14.1";

/** true cuando aún no se ha pegado la configuración real. */
export const IS_DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === "PEGAR_AQUI";
