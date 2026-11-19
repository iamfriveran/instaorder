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
  apiKey: "PEGAR_AQUI",
  authDomain: "TU-PROYECTO.firebaseapp.com",
  databaseURL: "https://TU-PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU-PROYECTO",
  storageBucket: "TU-PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

/**
 * Modo de autenticación de los dispositivos:
 *  - "anonymous": cada dispositivo inicia sesión anónima automáticamente.
 *                 Simple; las reglas exigen sesión, pero no distinguen roles.
 *  - "email":     cada dispositivo inicia sesión una vez con un usuario
 *                 (correo/contraseña) creado en Firebase Console. Permite
 *                 roles (mesero / cocina / admin) con security/requireRoles.
 */
export const AUTH_MODE = "anonymous";

/** Versión del SDK de Firebase cargado desde el CDN oficial (gstatic). */
export const FIREBASE_SDK_VERSION = "10.14.1";

/** true cuando aún no se ha pegado la configuración real. */
export const IS_DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === "PEGAR_AQUI";
