# INSTAOrder · Takolandia – Comida Mexicana

Sistema interno de pedidos en mesa y comunicación en tiempo real entre **meseros** (teléfono) y **cocina** (tablet).

- HTML5 + CSS3 + JavaScript puro (módulos ES6). Sin frameworks ni build.
- **Firebase Realtime Database** para los pedidos en tiempo real.
- **Firebase Authentication** (anónima o por usuario) para que la base de datos no quede abierta.
- **GitHub Pages** como hosting y **PWA** instalable en el teléfono y la tablet.

> ⚠️ INSTAOrder **no** calcula costos, subtotales, IVA ni totales. Los precios del catálogo son sólo **referenciales** para identificar productos. No es una caja registradora.

---

## Índice

1. [Estructura del proyecto](#1-estructura-del-proyecto)
2. [Probar sin Firebase (modo demo)](#2-probar-sin-firebase-modo-demo)
3. [Crear el repositorio en GitHub y subir los archivos](#3-crear-el-repositorio-en-github-y-subir-los-archivos)
4. [Crear y configurar Firebase](#4-crear-y-configurar-firebase)
5. [Reglas de seguridad](#5-reglas-de-seguridad)
6. [Authentication y roles](#6-authentication-y-roles)
7. [Publicar con GitHub Pages](#7-publicar-con-github-pages)
8. [Usar la app en los teléfonos de los meseros](#8-usar-la-app-en-los-teléfonos-de-los-meseros)
9. [Usar la app en la tablet de cocina](#9-usar-la-app-en-la-tablet-de-cocina)
10. [Actualizar la aplicación en el futuro](#10-actualizar-la-aplicación-en-el-futuro)
11. [Catálogo (Precios_Takolandia.xlsx)](#11-catálogo-precios_takolandiaxlsx)
12. [Estructura de datos](#12-estructura-de-datos)
13. [Seguridad: qué está implementado y qué configurar a mano](#13-seguridad-qué-está-implementado-y-qué-configurar-a-mano)
14. [Limitaciones conocidas y alternativas](#14-limitaciones-conocidas-y-alternativas)

---

## 1. Estructura del proyecto

```
instaorder/
├── index.html             Página única de la app
├── styles.css             Todos los estilos (colores Takolandia, KDS, mesero)
├── app.js                 Arranque, pantalla de inicio, conexión, actualizaciones
├── firebase-config.js     ← AQUÍ pegas la configuración de tu proyecto Firebase
├── firebase-service.js    Capa de datos: órdenes, estados, notificaciones, historial
├── catalog.js             Catálogo inicial generado desde Precios_Takolandia.xlsx
├── manifest.json          PWA (nombre, iconos, colores)
├── service-worker.js      PWA (caché de la app y actualizaciones)
├── database.rules.json    Reglas de seguridad de Realtime Database
├── .nojekyll              Indica a GitHub Pages que sirva los archivos tal cual
├── js/
│   ├── waiter.js          MODO MESERO (mesas, pedido, resumen, alertas "listo")
│   ├── kitchen.js         MODO COCINA (KDS) e HISTORIAL
│   ├── settings.js        CONFIGURACIÓN
│   ├── outbox.js          Bandeja de salida: envío seguro y sin duplicados
│   ├── store.js           Datos locales del dispositivo (borradores, preferencias)
│   ├── state.js           Estado compartido y valores por defecto
│   ├── router.js          Navegación (#/mesero, #/cocina, …)
│   ├── components.js      Cabecera e indicador de conexión
│   ├── sound.js           Sonidos (Web Audio), vibración, pantalla encendida
│   └── ui.js              Diálogos, avisos y formatos
├── assets/
│   ├── logo.png           Logo de Takolandia (reemplazable)
│   └── icons/             Iconos de la PWA
├── README.md
└── PRUEBAS.md             Pruebas realizadas y pendientes
```

**Cambiar el logo:** reemplaza `assets/logo.png` (PNG con fondo transparente, ~500 px) o súbelo desde *Configuración › General › Logo*. Para los iconos de la app instalada, reemplaza los PNG de `assets/icons/` con las mismas medidas.

---

## 2. Probar sin Firebase (modo demo)

Mientras `firebase-config.js` tenga `apiKey: "PEGAR_AQUI"`, la app funciona en **MODO DEMO LOCAL**:

- Los datos se guardan en el navegador y se comparten **sólo entre pestañas del mismo navegador**.
- Se muestra una franja rosada "MODO DEMO LOCAL" para que nadie lo confunda con operación real.
- En *Configuración › Sistema* hay un interruptor para **simular "sin conexión"** y probar los envíos pendientes.

Para probar en tu computadora (los módulos JS no funcionan abriendo el archivo con doble clic):

```bash
cd instaorder
python3 -m http.server 8080
# abre http://localhost:8080 en dos pestañas: una en MODO MESERO y otra en MODO COCINA
```

---

## 3. Crear el repositorio en GitHub y subir los archivos

**Opción A – desde la web (sin instalar nada)**
1. Entra a <https://github.com/new>.
2. Nombre: `instaorder` · Visibilidad: **Public** (GitHub Pages gratis requiere repositorio público; ver nota) · *Create repository*.
3. En el repositorio: **Add file › Upload files**, arrastra **todo el contenido** de la carpeta `instaorder/` (incluida la carpeta `js/`, `assets/` y el archivo `.nojekyll`).
4. *Commit changes*.

**Opción B – con Git**
```bash
cd instaorder
git init
git add .
git commit -m "INSTAOrder v1.0.0"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/instaorder.git
git push -u origin main
```

> **Nota:** el código de la app no contiene secretos (la configuración web de Firebase es pública por diseño). La protección real son las reglas de seguridad y Authentication. Con GitHub Pro/Team puedes usar un repositorio privado con Pages.

---

## 4. Crear y configurar Firebase

1. Entra a <https://console.firebase.google.com> › **Agregar proyecto** › nombre `instaorder-takolandia` (Analytics es opcional).
2. **Crear Realtime Database:** menú *Compilación › Realtime Database › Crear base de datos*.
   - Ubicación: la más cercana (p. ej. `us-central1`).
   - Modo: **bloqueado** (luego pegas las reglas del paso 5).
3. **Registrar la app web:** *Configuración del proyecto (⚙️) › Tus apps › Web (`</>`)* › apodo `INSTAOrder` › *Registrar*. **No** marques Firebase Hosting (usamos GitHub Pages).
4. Copia el objeto `firebaseConfig` que aparece y pégalo en **`firebase-config.js`**:
   ```js
   export const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "instaorder-takolandia.firebaseapp.com",
     databaseURL: "https://instaorder-takolandia-default-rtdb.firebaseio.com",
     projectId: "instaorder-takolandia",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "…"
   };
   ```
   Verifica que `databaseURL` esté presente (si tu base es en Europa termina en `firebasedatabase.app`).
5. Sube el `firebase-config.js` modificado a GitHub (paso 10).

---

## 5. Reglas de seguridad

1. Realtime Database › pestaña **Reglas**.
2. Borra el contenido y pega **todo** el archivo `database.rules.json`.
3. **Publicar**.

Qué hacen las reglas:

| Protección | Cómo |
|---|---|
| Nada se lee ni se escribe sin sesión | Todo exige `auth != null` |
| Las órdenes **no se pueden borrar** | Sólo se permite crear una orden si no existe; no hay regla que permita escribir `null` |
| Una orden enviada **no se edita en silencio** | Mesa, mesero, productos, cantidades y notas son inmutables tras crearla |
| No hay órdenes duplicadas | Crear sólo si el ID no existe; el número `#1001…` usa una transacción |
| Estados coherentes | Sólo `NEW → ACCEPTED → COMPLETED` (o `NEW → COMPLETED`) |
| Horas confiables | `sentAt`, `acceptedAt`, `completedAt`, `acknowledgedAt` deben ser la hora del servidor |
| Auditoría | Los eventos sólo se pueden agregar, nunca modificar ni borrar |
| Historial protegido | No existe ninguna ruta para borrar ni editar órdenes completadas |
| Campos desconocidos | Se rechazan |
| Roles (opcional) | Ver paso 6 |

---

## 6. Authentication y roles

### Modo recomendado para empezar: anónimo (`AUTH_MODE = "anonymous"`)
1. *Compilación › Authentication › Comenzar › Método de acceso › **Anónimo** › Habilitar*.
2. Cada dispositivo inicia sesión automáticamente. Las reglas bloquean a cualquiera **sin** sesión (por ejemplo, alguien que llame a la URL de la base de datos), pero cualquiera que abra tu URL de la app obtiene una sesión.

### Modo con usuarios y roles (`AUTH_MODE = "email"`)
Más seguro: sólo los dispositivos con usuario y contraseña pueden entrar.
1. *Authentication › Método de acceso › **Correo electrónico/contraseña** › Habilitar*.
2. *Authentication › Usuarios › Agregar usuario*. Sugerencia: un usuario por dispositivo o por rol, p. ej.
   `meseros@takolandia.app`, `cocina@takolandia.app`, `admin@takolandia.app`.
3. Copia el **UID** de cada usuario.
4. En *Realtime Database › Datos*, crea manualmente:
   ```
   roles/
     <UID-meseros>: "waiter"
     <UID-cocina>:  "kitchen"
     <UID-admin>:   "admin"
   security/
     requireRoles: true
   ```
5. En `firebase-config.js` cambia `AUTH_MODE = "email"` y súbelo.
6. Cada dispositivo pedirá usuario y contraseña **una sola vez** (la sesión se recuerda).

Con `requireRoles: true`:
- `waiter`: crea órdenes y acepta alertas "listo para servir".
- `kitchen`: acepta, marca productos y completa órdenes.
- `admin`: todo lo anterior + modifica configuración y catálogo.
- Nadie puede borrar órdenes ni el historial (tampoco el admin desde la app). Los roles y `security` sólo se editan desde la consola.

### Identificación de empleado ≠ autenticación
- **Seleccionar el nombre del mesero** (o del cocinero) **identifica** quién hace cada acción y se guarda en cada orden. **No prueba** que esa persona sea realmente quien lo tocó: cualquiera con el teléfono puede elegir otro nombre.
- **El PIN de Configuración** evita cambios accidentales pero se guarda en la base y lo verifica el navegador; **no** es seguridad real.
- **La autenticación real** es la de Firebase (usuario/contraseña + reglas). Si necesitas responsabilidad individual estricta, crea un usuario Firebase por empleado y el rol correspondiente; la app ya guarda el UID de la sesión en *Sistema* y el ID del dispositivo en cada orden.

---

## 7. Publicar con GitHub Pages

1. En el repositorio: **Settings › Pages**.
2. *Source*: **Deploy from a branch** · *Branch*: `main` · carpeta `/ (root)` · **Save**.
3. Espera 1–2 minutos. La URL será: `https://TU-USUARIO.github.io/instaorder/`
4. **Autoriza el dominio en Firebase:** *Authentication › Configuración › Dominios autorizados › Agregar dominio* → `TU-USUARIO.github.io`.
5. (Recomendado) En Google Cloud Console › *APIs y servicios › Credenciales*, restringe la API key a referentes HTTP `https://TU-USUARIO.github.io/*`.

---

## 8. Usar la app en los teléfonos de los meseros

1. Abre la URL en **Chrome (Android)** o **Safari (iPhone)**.
2. Instalar como app:
   - Android/Chrome: menú ⋮ › **Instalar aplicación** (o "Agregar a pantalla de inicio").
   - iPhone/Safari: botón **Compartir** › **Agregar a pantalla de inicio**.
3. Abre INSTAOrder desde el icono › **MODO MESERO** › elige tu nombre.
4. Toca la pantalla una vez para habilitar el sonido (regla de los navegadores).
5. Flujo: **Mesa › Categoría › + productos › Revisar pedido › notas › ENVIAR A COCINA › Confirmar**.
6. Cuando cocina completa tu orden, aparece la alerta **"MESA XX – ¡PEDIDO LISTO PARA SERVIR!"** parpadeando en cualquier pantalla del modo mesero, hasta que tocas **ACEPTAR**. Cada orden tiene su propia alerta.
7. *Mis pedidos* muestra tus órdenes activas, las no enviadas y el botón **Enviar corrección**.

Estados de las mesas: ⬜ Disponible · 🟨 Pendiente de enviar · 🟦 Enviada a cocina · 🟧 En preparación · 🟩 Lista para servir.

---

## 9. Usar la app en la tablet de cocina

1. Abre la URL en la tablet e instálala (igual que en el paso 8).
2. **MODO COCINA**. Opcional: toca **Identificarse** para registrar quién acepta y completa.
3. Toca la franja amarilla **"Toca aquí para activar el sonido"** la primera vez.
4. Recomendado: tablet conectada al cargador, brillo alto, *Configuración › Alertas › Mantener pantalla encendida* (y en Android, desactivar el ahorro de batería para el navegador).
5. Columna **NUEVAS**: tarjetas parpadeando → **VER PEDIDO** → **ACEPTAR ORDEN**.
   Columna **EN PREPARACIÓN**: marca productos (opcional) → **MARCAR ORDEN COMPLETADA** → el mesero recibe la alerta.
6. Tiempo transcurrido: se pone naranja a los 10 min y rojo a los 20 min.
7. **Historial**: órdenes completadas por fecha, mesa, ID/número y mesero; detalle con horas, tiempo de preparación, quién aceptó/completó y registro de eventos. Es de sólo lectura.

---

## 10. Actualizar la aplicación en el futuro

> Hay **dos tipos de actualización distintos**:
> - **Pedidos** (tiempo real): viajan por Firebase al instante. No requieren tocar GitHub.
> - **Código de la app** (diseño, funciones): se publica en GitHub y llega a los dispositivos al abrir/actualizar la app.

Pasos para publicar una versión nueva del código:
1. Modifica los archivos.
2. En `service-worker.js` cambia `CACHE_VERSION` (p. ej. `"instaorder-v1.0.1"`) y en `app.js` cambia `APP_VERSION`.
3. Sube los cambios a GitHub (Upload files o `git commit` + `git push`).
4. En 1–2 minutos GitHub Pages publica. Cada dispositivo, al abrir la app o volver a ella, detecta la versión nueva y muestra **"Hay una nueva versión – Actualizar ahora"**. No se recarga solo para no interrumpir un pedido.

Actualizar **no borra órdenes**: las órdenes están en Firebase; los borradores y las órdenes no enviadas están en el almacenamiento del dispositivo, que se conserva.

Cambios de catálogo, meseros, mesas o logo **no** requieren GitHub: se hacen en *Configuración* y se sincronizan al instante.

---

## 11. Catálogo (Precios_Takolandia.xlsx)

El archivo tiene una hoja **"Precios Takolandia"** con **14 categorías** y **89 productos** (86 productos + 3 promociones). Se respetaron todas las categorías y nombres del Excel; **no se inventaron productos**.

| Categoría | Productos |
|---|---|
| Tacos | 6 — Carne de Res, Pollo, Al Pastor, Birria, Campechano, Full |
| Quesadillas | 7 — Queso, Res, Pollo, Pastor, Campechano, Full, Birria |
| Burritos | 10 — Clásico (Res/Pollo/Pastor), Gratinado (Res/Pollo/Pastor), Birria, Chimichanga (Res/Pollo/Cerdo) |
| Nachos | 9 — Queso, Pastor, Pollo, Carne de Res, Campechano, Full, Chilli Beans, Bell Grande, Taco Bowl |
| Fajitas | 3 — Pollo, Carne de Res, Trío |
| Doritos | 9 — Limón / Hot / Normal × Res, Pollo, Cerdo |
| Flautas | 3 — Res, Pollo, Queso |
| Bandejas | 2 — Bandeja Carnal, Bandejalandia |
| Extras | 4 — Guacamole, Nachos, Frejol, Queso |
| Bebidas | 10 — Jamaica, Horchata, Agua Natural, Agua con Gas, Fuze Tea, Soda (Coca-Cola), Soda 1 Litro, Limonada Imperial, Limonada de Coco, Limonada Frutos Rojos |
| Cantaritos | 4 — Cantarito, Sorbete Mexicano, Medio Cántaro, Cántaro Entero |
| Micheladas | 3 — Pilsener, Club, Corona/Heineken |
| Cócteles | 16 — Frozen para Niños, Mexican Flag, Ronchata, Margarita Jamaiquina, Fizzy Mango, Mojituna Azteca, Canequila, Mojito, Piña Colada, Cuba Libre, Daiquiri, Tequila Sunrise, Laguna Azul, Margarita, La Catrina, Morir Soñando |
| Promociones | 3 — Promo 1 Combo Taquero, Promo 2 Doble Antojo, Promo 3 Fiesta para Dos |

Notas del análisis:
- **Ningún producto quedó sin categoría**, por lo que **no se reorganizó ninguno**.
- Se mantuvieron donde el Excel los ubica, aunque podrían discutirse: *Taco Bowl* (en Nachos), *Chimichangas* (en Burritos) y *Sorbete Mexicano* (en Cantaritos). Se pueden mover desde *Configuración › Catálogo*.
- Las promociones tienen el contenido como descripción (ej. "2 Tacos de Res + Guacamole + Coca-Cola 300ml"), el precio promo como referencial y el precio regular guardado como dato informativo.
- Para editar: *Configuración › Catálogo* (renombrar, cambiar precio referencial, mover de categoría, activar/desactivar, agregar). El botón **Restaurar catálogo original del Excel** vuelve a la versión de `catalog.js`.

---

## 12. Estructura de datos

```
/settings/app                     configuración compartida
    restaurantName, restaurantSubtitle, tableCount, logo, adminPin,
    waiters: [{id, name, active}], kitchenStaff: [{id, name, active}]
/catalog                          {categories:[…], products:[…]}  (si no existe → catalog.js)
/counters/orderNumber             1000, 1001, …  (transacción)
/orders/{orderId}
/security/requireRoles            (sólo consola)
/roles/{uid}                      (sólo consola)
```

Ejemplo de orden:

```json
{
  "schemaVersion": 1,
  "orderId": "ORD-20261119-K7Q2MX",
  "orderNumber": 1042,
  "type": "NORMAL",
  "tableNumber": 7,
  "waiterId": "waiter-001",
  "waiterName": "Carlos",
  "deviceId": "DEV-8F3K2M9Q",
  "items": [
    { "lineId": "L1", "productId": "p-taco-carne-de-res", "productName": "Taco Carne de Res",
      "category": "Tacos", "quantity": 3, "referencePrice": 2.5, "notes": "", "prepared": false },
    { "lineId": "L2", "productId": "p-quesadilla-pollo", "productName": "Quesadilla Pollo",
      "category": "Quesadillas", "quantity": 2, "referencePrice": 3.75, "notes": "Sin cebolla", "prepared": false }
  ],
  "itemCount": 5,
  "generalNotes": "Una persona es alérgica al aguacate.",
  "status": "COMPLETED",
  "active": false,
  "dayKey": "2026-11-19",
  "createdAt": 1795110100000,
  "sentAt": 1795110120000,
  "acceptedAt": 1795110300000,
  "acceptedBy": { "id": "cook-001", "name": "Chef Luis" },
  "completedAt": 1795110900000,
  "completedBy": { "id": "cook-001", "name": "Chef Luis" },
  "waiterNotification": {
    "status": "ACKNOWLEDGED", "createdAt": 1795110900000,
    "deliveredAt": 1795110901000, "acknowledgedAt": 1795110960000,
    "acknowledgedBy": { "id": "waiter-001", "name": "Carlos" }
  },
  "events": {
    "e…": { "type": "ORDER_CREATED", "at": 1795110100000, "byId": "waiter-001", "byName": "Carlos" },
    "e…": { "type": "ORDER_SENT", "at": 1795110120000, "byId": "waiter-001", "byName": "Carlos" },
    "e…": { "type": "ORDER_ACCEPTED", "at": 1795110300000, "byName": "Chef Luis" },
    "e…": { "type": "ORDER_COMPLETED", "at": 1795110900000, "byName": "Chef Luis" },
    "e…": { "type": "NOTIFICATION_DELIVERED", "at": 1795110901000, "byName": "Carlos" },
    "e…": { "type": "NOTIFICATION_ACKNOWLEDGED", "at": 1795110960000, "byName": "Carlos" }
  }
}
```

Decisiones de diseño:
- **`orderId` se genera en el teléfono antes de enviar** → los reintentos usan el mismo ID y no duplican.
- **`orderNumber`** (#1042) es el número legible; se asigna con transacción.
- **`active`** = la orden sigue "viva" (en cocina o pendiente de que el mesero acepte la alerta). Un único listener en tiempo real `orderByChild("active").equalTo(true)` alimenta cocina, mesas y alertas sin descargar el historial.
- **Estados:** `NEW` → `ACCEPTED` → `COMPLETED`. Notificación al mesero: `NONE` → `PENDING` → `DELIVERED` → `ACKNOWLEDGED`, independiente por orden.
- **`waiterName` se copia** en cada orden: renombrar o eliminar un mesero no altera órdenes pasadas.
- **Correcciones:** una orden enviada no se modifica. *Mis pedidos › Enviar corrección* crea una orden nueva `type: "CORRECTION"` con `correctionOf` → cocina la ve marcada "CORRECCIÓN DE LA ORDEN #…".
- **Hora del servidor** para todos los tiempos (y compensación del reloj del dispositivo para el tiempo transcurrido).
- `referencePrice` se guarda sólo como referencia; ningún código lo suma.

---

## 13. Seguridad: qué está implementado y qué configurar a mano

**Implementado en el código**
- Sin credenciales privadas, claves de administración ni service accounts en el frontend.
- Reglas `database.rules.json` (paso 5) con inmutabilidad, transiciones de estado, sin borrado, validación de campos y roles opcionales.
- Inicio de sesión obligatorio (anónimo o correo/contraseña).
- Las órdenes sólo se muestran como enviadas cuando Firebase confirma la escritura.
- Todo texto ingresado se escapa antes de mostrarse (previene inyección de HTML).
- El Service Worker nunca cachea tráfico de la base de datos.

**Debes hacerlo tú en Firebase Console**
1. Publicar las reglas (paso 5).
2. Habilitar Authentication (anónimo o correo/contraseña) (paso 6).
3. Autorizar el dominio `TU-USUARIO.github.io` (paso 7).
4. Si usas roles: crear usuarios, `roles/{uid}` y `security/requireRoles = true`.
5. Recomendado: restringir la API key por dominio; activar **App Check** (reCAPTCHA) si quieres impedir el acceso desde otras webs; configurar **alertas de presupuesto** en Google Cloud.
6. Recomendado: **copias de seguridad** (plan Blaze › Realtime Database › Copias de seguridad) o exportar JSON periódicamente desde la consola.
7. Cambiar el PIN de Configuración (por defecto `1234`).

---

## 14. Limitaciones conocidas y alternativas

| Tema | Limitación | Alternativa sencilla |
|---|---|---|
| Alertas con la app cerrada o el teléfono bloqueado | Una web sin servidor propio no puede enviar *push* cuando la app está cerrada (iOS además lo limita). Con la app abierta en segundo plano se muestra una notificación del sistema si se dio permiso. | Mantener INSTAOrder abierta en el teléfono durante el turno. Para *push* real con la app cerrada: Firebase Cloud Messaging + Cloud Functions (requiere plan Blaze). |
| Sonido | Los navegadores exigen un toque antes de reproducir audio; iPhone en modo silencio no suena. | La alerta visual con parpadeo es siempre obligatoria; en Android también vibra. |
| Pantalla de la tablet | La API "mantener pantalla encendida" no existe en todos los navegadores. | Configurar el bloqueo automático de la tablet en "Nunca" mientras está en el cargador. |
| Estado "Pendiente de enviar" | Los borradores viven en el teléfono que los crea; otros meseros no ven ese estado. | Enviar los pedidos en cuanto estén listos. |
| Sin conexión | Se puede tomar y confirmar un pedido sin Internet; queda marcado **NO ENVIADA** en el teléfono y se envía solo al reconectar (sin duplicar). Cocina no lo recibe hasta entonces. | Revisar *Mis pedidos* si el indicador muestra "Sin conexión". |
| Identificación por nombre / PIN | No es autenticación (ver paso 6). | Usuarios Firebase individuales con roles. |
| Historial de días anteriores | Se consulta por fecha (un día a la vez). | Para reportes: exportar JSON desde la consola de Firebase. |
