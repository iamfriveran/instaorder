# INSTAOrder · Takolandia – Comida Mexicana

Sistema interno de pedidos en mesa y comunicación en tiempo real entre **meseros** (teléfono) y **cocina** (tablet).

- HTML5 + CSS3 + JavaScript puro (módulos ES6). Sin frameworks ni build.
- **Firebase Realtime Database** para los pedidos en tiempo real.
- **Firebase Authentication** (anónima o por usuario) para que la base de datos no quede abierta.
- **GitHub Pages** como hosting y **PWA** instalable en el teléfono y la tablet.

> ⚠️ INSTAOrder **no** calcula costos ni totales en los pedidos de mesa ni de PedidosYa (los precios son sólo referenciales). **Única excepción: Pedidos por WhatsApp** (sección 19), que muestra precios y el total para informar al cliente. No es una caja registradora ni emite facturas.

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
15. [INSTALACIÓN DE INSTAOrder EN TELÉFONOS](#15-instalación-de-instaorder-en-teléfonos)
16. [USUARIOS, CONTRASEÑAS Y ROLES](#16-usuarios-contraseñas-y-roles)
17. [PEDIDOS EXTERNOS (PedidosYa) e HISTORIAL PERMANENTE](#17-pedidos-externos-pedidosya-e-historial-permanente)
18. [DISPONIBILIDAD DE INGREDIENTES (productos agotados)](#18-disponibilidad-de-ingredientes-productos-agotados)
19. [PEDIDOS POR WHATSAPP](#19-pedidos-por-whatsapp)

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
│   ├── whatsapp.js        PEDIDOS POR WHATSAPP: ingreso, precios, total, imagen para el cliente
│   ├── waiter.js          MODO MESERO (mesas, pedido, resumen, alertas "listo")
│   ├── kitchen.js         MODO COCINA (KDS) e HISTORIAL
│   ├── settings.js        CONFIGURACIÓN
│   ├── outbox.js          Bandeja de salida: envío seguro y sin duplicados
│   ├── store.js           Datos locales del dispositivo (borradores, preferencias)
│   ├── state.js           Estado compartido y valores por defecto
│   ├── router.js          Navegación (#/mesero, #/cocina, …)
│   ├── auth.js            Inicio de sesión, primer Admin, cuentas bloqueadas
│   ├── availability.js    Ingredientes agotados: pantalla de cocina y bloqueo de productos
│   ├── components.js      Cabecera e indicador de conexión
│   ├── external.js        PEDIDOS EXTERNOS: subir captura, revisar, enviar
│   ├── pedidosya.js       OCR local (Tesseract.js) + lectura de capturas de PedidosYa
│   ├── install.js         Botón "Instalar INSTAOrder" y pantalla de Ayuda
│   ├── sound.js           Sonidos (Web Audio), vibración, pantalla encendida
│   └── ui.js              Diálogos, avisos y formatos
├── ocr/lang/            Modelos OCR español + inglés (Tesseract, ~5 MB)
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

---

## 15. INSTALACIÓN DE INSTAOrder EN TELÉFONOS

INSTAOrder es una **aplicación web instalable (PWA)**: se instala desde el navegador, tiene su propio icono **INSTAOrder**, se abre a pantalla completa sin barras del navegador y se actualiza sola desde GitHub. No es una app de App Store/Play Store. Para Android también se entrega un **proyecto APK opcional** (ver I).

Dentro de la app: **Inicio › ❓ Ayuda e instalación** muestra estas instrucciones y el estado de conexión.

Dirección para instalar: **https://iamfriveran.github.io/instaorder/**

### A. Instalación en Android
1. Abre la dirección en **Chrome**.
2. En la pantalla de inicio de INSTAOrder toca **📲 Instalar INSTAOrder en este teléfono** → **Instalar**.
   Si el botón no abre el diálogo: menú **⋮ › Instalar aplicación** (o "Agregar a pantalla principal").
3. El icono **INSTAOrder** aparece en la pantalla de inicio y en el cajón de apps.
4. El botón de instalar desaparece cuando la app ya está instalada.

### B. Instalación en iPhone
1. Abre la dirección en **Safari**.
2. Toca **Compartir** (cuadro con flecha ⬆︎).
3. Elige **"Añadir a pantalla de inicio"**.
4. Toca **"Añadir"**.
5. Abre INSTAOrder desde el icono creado.

En iPhone es una PWA (no una app nativa de iOS). Se respetan el notch, la Dynamic Island y la barra inferior (`safe-area-inset`).

### C. Abrir la app desde el icono
Toca **INSTAOrder**. Abre directo en la pantalla inicial (logo, hora, conexión, MODO MESERO / MODO COCINA) y recuerda el último modo usado en ese teléfono.

### D. Cómo actualizar INSTAOrder
- Publicas los cambios en GitHub (sección 10) y cambias `CACHE_VERSION` en `service-worker.js` y `APP_VERSION` en `app.js`.
- Al abrir la app (o volver a ella), aparece abajo **"✨ Nueva versión disponible · ACTUALIZAR AHORA"**.
- Si el mesero está tomando un pedido, la app avisa antes; el borrador queda guardado y se recupera después.
- La actualización **no borra** órdenes activas, historial ni pedidos pendientes de envío (están en Firebase y en el almacenamiento del teléfono, no en la caché).
- No hay que reinstalar el icono.

### E. Si el icono no aparece
- Android: revisa el **cajón de aplicaciones**; en Ajustes › Apps › Chrome permite "Agregar accesos directos a la pantalla principal". Usa Chrome (algunos navegadores de fabricante no instalan PWA).
- iPhone: debe hacerse desde **Safari** (o Chrome con iOS 16.4+ por el menú Compartir). Repite "Añadir a pantalla de inicio".
- Si se instaló una versión vieja: desinstala el icono y vuelve a instalar desde la dirección (los pedidos no se pierden).

### F. Verificar la conexión a Firebase
- El indicador de la pantalla inicial y de las cabeceras debe decir **● Conectado** (verde).
- **Configuración › Sistema** muestra Base de datos = "Firebase Realtime Database" y el UID de la sesión.
- Si dice **Modo demo local**, `firebase-config.js` no tiene la configuración real. Si dice **Sin conexión / Reconectando**, revisa Internet: los pedidos NO se envían hasta volver a "Conectado".

### G. Pedidos en tiempo real vs. actualizaciones de software
| | Pedidos | Actualizaciones de la app |
|---|---|---|
| Qué es | Órdenes, estados, alertas | Diseño, funciones, correcciones |
| Cómo viaja | Firebase, al instante | GitHub Pages → Service Worker |
| Cuándo llega | Inmediato (con conexión) | Al abrir/volver a la app + "ACTUALIZAR AHORA" |
| Necesita GitHub | No | Sí |

### H. Limitaciones de PWA y notificaciones (especialmente iOS)
**Implementado y garantizado con la app abierta y conectada:** alertas visuales con parpadeo, sonido opcional, vibración (Android) y actualización inmediata por Firebase.

**Con la app cerrada o en segundo plano:** Firebase Realtime Database **por sí sola no envía notificaciones** con la app cerrada; sólo transmite datos a una app abierta. Para avisos push reales se necesita:
1. **Firebase Cloud Messaging (FCM)** en el proyecto y un **par de claves VAPID** (Firebase Console › Configuración › Cloud Messaging › *Web Push certificates*). La clave pública va en la app; la privada nunca sale de Firebase.
2. **Un backend que envíe el push** cuando cocina completa una orden: **Cloud Functions for Firebase** con un disparador en `orders/{id}/status` → requiere el **plan Blaze** (pago por uso, con nivel gratuito).
3. Guardar el **token FCM de cada teléfono** asociado al mesero, y un `firebase-messaging-sw.js`.
4. **iPhone:** Web Push sólo funciona en **iOS 16.4 o superior**, sólo con la app **instalada en la pantalla de inicio** (no en Safari) y con permiso de notificaciones aceptado dentro de la app.
5. **Android:** funciona con Chrome; algunos fabricantes (ahorro de batería) retrasan las notificaciones.

Esto no se implementó en esta versión porque requiere el plan Blaze y una función de servidor. Mientras tanto: mantener INSTAOrder abierta durante el turno. Si quieres, es la siguiente fase.

Otras limitaciones iOS: el sonido no suena en modo silencio; iOS puede suspender la app al bloquear el teléfono (al volver, se resincroniza sola y muestra las alertas pendientes); la pantalla de carga en iPhone es la del sistema (no personalizada).

### I. APK para Android (opcional)
Se entrega aparte el proyecto **`INSTAOrder_Android.zip`** (Capacitor). El APK abre esta misma PWA (mismo Firebase, catálogo y datos) a pantalla completa y se actualiza solo desde GitHub. **No está compilado**: requiere Android Studio; los pasos están en `LEEME-ANDROID.md` (APK de prueba, firma de producción, instalación y actualización).

Alternativa sin Android Studio: **https://www.pwabuilder.com** › escribe la dirección de INSTAOrder › **Package for stores › Android** › descarga el APK firmado de prueba. Usa el mismo `manifest.json` e iconos.

Para el personal, **la PWA (A y B) es la opción recomendada**: no requiere instalar archivos ni permitir orígenes desconocidos.

---

## 16. USUARIOS, CONTRASEÑAS Y ROLES

Desde la versión 1.2.0 (`AUTH_MODE = "users"` en `firebase-config.js`) cada empleado entra con **usuario y contraseña**, y el **Admin administra los usuarios desde la app**: *Configuración › Usuarios*.

### Roles (uno o varios por persona)
| Rol | Puede |
|---|---|
| 🧾 Mesero | Modo mesero: tomar y enviar pedidos, recibir y aceptar sus alertas "LISTO PARA SERVIR" |
| 👨‍🍳 Cocina | Modo cocina e historial: aceptar, marcar y completar órdenes |
| 🛡️ Admin | Todo lo anterior + General, Usuarios y Catálogo |
| 📟 Tablet compartida | Marca para la cuenta de la tablet de cocina: al aceptar/completar, cada cocinero elige su nombre |

Un empleado con Mesero + Cocina ve los dos modos y cambia entre ellos. Cada persona sólo ve los modos que tiene permitidos. Su nombre se toma de su cuenta (ya no se elige de una lista).

### Activación (una sola vez, ~10 minutos, idealmente fuera del horario de servicio)
> Entre los pasos 2 y 4 los dispositivos dejan de funcionar hasta que cada persona inicie sesión.

1. **Firebase Console › Authentication › Sign-in method › Add new provider › Email/Password** › activa **sólo el primer interruptor** (Email/Password) › **Save**.
2. **Realtime Database › Rules**: borra todo, pega el nuevo `database.rules.json` › **Publish**.
3. Sube los archivos de esta versión a GitHub.
4. Abre INSTAOrder: aparece **"Configuración inicial"**. Crea tu usuario **Administrador** (nombre, usuario, contraseña). **La primera persona que lo haga queda como Admin**, por eso hazlo tú enseguida.
5. *Configuración › Usuarios* › crea a cada empleado (botón 🎲 genera una contraseña de 6 dígitos) y entrega sus datos.
6. Crea la cuenta de la tablet de cocina (rol Cocina + "Tablet compartida") e inicia sesión con ella en la tablet.
7. **Authentication › Sign-in method › Anonymous › Disable** (ya no se usa).

### Operación diaria
- **Nuevo empleado:** *Usuarios › Nuevo usuario*.
- **Renuncia:** *Usuarios › ⛔ Desactivar*. Pierde el acceso **al instante** en todos sus dispositivos (las reglas de Firebase rechazan cualquier lectura o escritura de una cuenta desactivada). Sus órdenes e historial se conservan. Se puede **Reactivar**.
- **Olvidó su contraseña:** *Usuarios › 🔑 Olvidó su contraseña*: desactiva la cuenta y prepara una nueva con los mismos roles (ej. `saby2`) y una contraseña nueva. La contraseña de otra persona no se puede ver ni cambiar sin un servidor (Cloud Functions, plan Blaze).
- **Cambiar mi contraseña:** *Configuración › Mi cuenta*.
- **Teléfono que pasa a otra persona:** *Mi cuenta › Cerrar sesión*.
- Debe quedar siempre al menos un Admin activo; un Admin no puede quitarse a sí mismo el rol ni desactivarse.

### Qué protege y qué no
- Las reglas exigen una cuenta **activa con el rol correcto** para cada acción: un mesero no puede aceptar ni completar órdenes; sólo el mesero de la orden (o un Admin) acepta su alerta; las órdenes se crean a nombre de quien tiene la sesión; sólo un Admin cambia configuración, catálogo y usuarios.
- Cualquiera que tenga la dirección podría crear una cuenta en Firebase, pero **sin perfil ni roles no puede ver ni hacer nada**.
- Los usuarios usan un correo interno (`usuario@instaorder-takolandia.firebaseapp.com`) que nunca recibe correos.
- El PIN de Configuración ya no se usa en este modo.

---

## 17. PEDIDOS EXTERNOS (PedidosYa) e HISTORIAL PERMANENTE

Versión 1.3.0. Reemplaza el envío de capturas por WhatsApp. **Costo adicional: $0.**

### Flujo
1. En PedidosYa recibes la orden y asignas los minutos (control **− 11 +**), como siempre.
2. Tomas la captura.
3. INSTAOrder › **🛵 PEDIDOS EXTERNOS** › **📸 SUBIR CAPTURA**.
4. El teléfono lee la captura (OCR) y llena: **número de orden (#148)**, **cliente**, **minutos asignados**, **productos y cantidades** (`1Por` = 1, `2Por` = 2…). Los productos se buscan en el catálogo; un combo como "1 burrito res + 1 quesadilla res + gaseosa 300ml" se reconoce como **Promo 2 – Doble Antojo**.
5. **Hora objetivo = hora de ingreso + minutos** (ej. 7:30 PM + 15 = 7:45 PM). Todo es editable; si cambias la hora objetivo a mano queda marcada "AJUSTE MANUAL".
6. **CONFIRMAR Y ENVIAR A COCINA** → aparece al instante en cocina, en el mismo panel que las mesas, con distintivo rojo **PEDIDOS YA #148**, cliente, minutos, hora objetivo y **cuenta regresiva** (amarilla a 3 min, roja **ATRASADA** si se pasa).
7. Cocina **ACEPTA** (deja de parpadear) y **COMPLETA**.
8. **Todos los meseros** reciben **"PEDIDOS YA · ORDEN #148 · ¡PEDIDO LISTO PARA DESPACHAR!"**. El primero que toca **ACEPTAR / CONFIRMAR DESPACHO** la apaga en todos (queda registrado quién y a qué hora).

### OCR gratuito y privado
- **Tesseract.js** (código abierto) se ejecuta **en el teléfono**: la imagen no se sube a ningún servicio ni a Firebase.
- La librería se descarga de jsDelivr (CDN gratuito); los modelos **español + inglés** están en `ocr/lang/` del proyecto (~5 MB, se descargan una vez y quedan guardados). Se usan los dos porque el modelo español lee "#148" como "4148".
- La imagen sólo vive en memoria mientras revisas; al enviar o descartar se borra. **No se guardan** teléfono, correo, cédula ni datos de facturación: sólo número, cliente, productos y tiempos.
- El número de orden y los minutos se ubican por **posición** en la captura (el número junto a "minu.." entre − y +), para no confundirlos con teléfonos, cédulas o precios. Si no se reconocen, la pantalla lo avisa en rojo; **nunca se inventa un tiempo**.

### Duplicados
Antes de enviar se buscan órdenes de la misma plataforma con el mismo número **hoy y ayer**. Si existe: **"⚠️ ESTA ORDEN YA FUE REGISTRADA"** con el registro existente y no se crea otra. Si de verdad es otro pedido, se puede registrar con doble confirmación (queda marcado "duplicado confirmado"). Cada orden tiene su propio ID interno (`ORD-…`); el #148 de PedidosYa es un dato aparte.

### Historial permanente
- Las órdenes **nunca se borran** (ni internas ni externas). Aceptar la alerta del mesero **sólo apaga la alerta**.
- **Historial** accesible para todo el personal: desde el inicio, desde la barra del mesero (📚) y desde cocina. Todos ven el mismo historial (Firebase), sin importar qué teléfono creó la orden.
- Búsqueda: `mesa 7`, `148` / `#148`, nombre del cliente, producto ("doble antojo"), mesero. Filtros: fecha, tipo (Mesa / PedidosYa), mesero, estado (completadas, servidas/despachadas, todas).
- Cada tarjeta se expande con todos los tiempos (creada, recibida, enviada, minutos asignados, hora objetivo, aceptada, completada, alerta aceptada), personas, productos, notas y registro de eventos. Sólo lectura.
- **Mis pedidos** (mesero) separa: **Órdenes activas** · **Pedidos listos** · botón **Historial**.

### Datos (Firebase)
Mismo nodo `/orders` que los pedidos de mesa, con campos nuevos:
`orderType` (`DINE_IN` | `THIRD_PARTY`), `sourcePlatform` (`PEDIDOS_YA`), `platformOrderNumber`, `customerName`, `receivedAt`, `preparationMinutes`, `targetReadyAt`, `targetManual`, `enteredBy`, `ocrUsed`, `duplicateOverride`. La alerta usa el mismo `waiterNotification` (`PENDING` → `ACKNOWLEDGED`). Las órdenes antiguas sin `orderType` se tratan como de mesa.

### Para activarlo
1. Requiere el modo usuarios (sección 16) ya activado.
2. **Realtime Database › Rules**: pega el nuevo `database.rules.json` › **Publish** (permite los campos nuevos y que cualquier mesero confirme un despacho externo).
3. Sube todos los archivos a GitHub, **incluida la carpeta `ocr`**.

### Limitaciones
- El OCR depende de la calidad de la captura: usa la captura completa de la orden, sin recortar ni hacer zoom. Siempre revisa antes de enviar (los productos dudosos aparecen en amarillo; los no identificados, en rojo).
- La primera lectura en cada teléfono tarda más (descarga ~5 MB). Luego, 2–5 segundos según el teléfono.
- Las bebidas de un pedido externo **sí aparecen en cocina** (marcadas 🥤) porque van empacadas en el mismo pedido.

---

## 18. DISPONIBILIDAD DE INGREDIENTES (productos agotados)

Versión 1.4.0.

### Cocina
Modo cocina › botón **🥫 Ingredientes** (cuando hay agotados se vuelve rojo: **🔴 2 agotado(s)**).
Cada ingrediente muestra **🟢 DISPONIBLE** con **MARCAR NO DISPONIBLE**, o **🔴 AGOTADO / NO DISPONIBLE** con **VOLVER A DISPONIBLE**. Al agotar, se confirma mostrando qué productos se bloquearán. **📋 Registro de hoy** muestra quién cambió qué y a qué hora. **➕ Ingrediente** agrega uno nuevo.

### Meseros
- El cambio llega **al instante** a todos los teléfonos, sin recargar.
- Los productos afectados se ven atenuados con **🔴 Producto no disponible · Agotado: Res**, y el botón **+** queda deshabilitado: no se pueden agregar.
- Al **ENVIAR A COCINA** se vuelve a revisar todo con el estado actual (aunque el pedido se haya armado antes). Si algo se agotó: **⚠️ NO SE PUEDE ENVIAR EL PEDIDO**, con el producto y el ingrediente; se puede **Quitar no disponibles** o **Corregir pedido**.
- **Opcionales** (guacamole, pico de gallo, cebolla, salsas…): si se agotan, el producto se sigue vendiendo con **⚠️ Sin guacamole (agotado)** y a cocina le llega la nota **"SIN GUACAMOLE (agotado)"**.
- **A elección** (Bandejas "res, pollo o cerdo", Promo 3 "Res/Pollo"): se bloquean sólo si se agotan **todas** sus opciones; mientras tanto muestran **⚠️ Sin Res: elige otra opción**.
- Las proteínas son productos separados en el catálogo (Quesadilla Res, Quesadilla Pollo…): si se agota la res, sólo se bloquean las versiones con res.
- **Pedidos externos:** como ya fueron aceptados en PedidosYa no se bloquean, pero se avisa y se pide confirmar; a cocina le llega "⚠️ AGOTADO …" en la nota.
- Las órdenes ya enviadas, aceptadas o del historial **no se modifican**.

### Ingredientes de cada producto
La relación inicial se armó con las **descripciones de tu menú** (Menu_Takolandia_Descripciones.xlsx):
- **Tortillas** (por uso, no por tipo): **Tortilla de tacos** (tacos, Promo 1 y 3, Bandejas), **Tortilla de burritos y quesadillas** (quesadillas, burritos, chimichangas, Promo 2 y 3, Bandejas) y **Tortilla de flautas**.
- **Obligatorios:** proteína, tortilla/base, queso (en quesadillas, nachos, doritos, flautas, gratinados), frejol (burritos), etc.
- **Opcionales:** guarniciones y salsas ("servido con…").
- **Birria** es independiente: agotar Res NO bloquea la birria, y agotar Birria NO bloquea los productos de res.
- **Pastor** se controla aparte de Cerdo. Si se acaba todo el cerdo, marca Cerdo y Pastor.
- Bebidas y cócteles: sólo Coca-Cola, Horchata y Jamaica. El resto no se controla por ingrediente (se puede desactivar el producto en el catálogo).

Para corregirla: **Configuración › Catálogo** (Admin) › producto › **🧩 Ingredientes**: por ingrediente elige *No lleva / Obligatorio / Opcional / A elección* › **Aplicar** › **Guardar**.

### Datos (Firebase)
- `/ingredients/{id}`: `name`, `group`, `order`, `available`, `updatedAt`, `updatedBy`. Lo escribe cocina o Admin.
- `/ingredientLog/{id}`: `ingredientId`, `name`, `from`, `to`, `at`, `byName`, `dayKey`. Sólo se agrega.
- Catálogo: cada producto lleva `ingredients` (obligatorios; `"res|pollo"` = a elección) y `optional`.

### Para activarlo
1. **Realtime Database › Rules**: pega el nuevo `database.rules.json` › **Publish** (agrega `ingredients` e `ingredientLog`).
2. Sube los archivos a GitHub.

---

## 19. PEDIDOS POR WHATSAPP

Versión 1.5.0. **Pedidos externos** ahora tiene dos opciones:
- **🛵 PEDIDOS YA** › *Subir captura de pantalla* · *Ingreso manual* (igual que antes).
- **💬 PEDIDOS POR WHATSAPP** › *Ingreso manual*.

### Ingreso manual (WhatsApp)
1. **Número de celular**, **Nombre del cliente** y **Tiempo asignado** (− / + de 5 en 5, o escribiéndolo). Muestra "listo aprox." con la hora.
2. **Productos** con las mismas pestañas de categorías y buscador que los pedidos de mesa, mostrando el **precio** de cada producto. Los productos con ingredientes agotados están bloqueados.
3. **🧾 Ver pedido**: cantidades, **precio por producto**, subtotal, **envío / ajuste** (nombre y monto editables, puede ser negativo para un descuento), **TOTAL**, y el **texto del total que verá el cliente** (editable, ej. "TOTAL: $14.50 · pago en efectivo"). Notas por producto y nota general para cocina.
4. **📲 ENVIAR AL CLIENTE**: genera una **imagen del pedido con el logo de Takolandia**, los productos, precios, el texto del total y el tiempo estimado.
   - En el teléfono se abre el menú **Compartir**: elige **WhatsApp** y el chat del cliente (también va el resumen en texto).
   - En una computadora se descarga la imagen y se abre el chat de WhatsApp del número con el resumen en texto, para adjuntar la imagen.
   - El número se convierte al formato internacional de Ecuador: `09XXXXXXXX` → `5939XXXXXXXX`.
5. **🚀 ENVIAR A COCINA**: llega como pedido externo **WHATSAPP #1047** (el número de INSTAOrder), en verde, con cuenta regresiva. **Cocina no ve precios.** Al completarlo, los meseros reciben "¡PEDIDO LISTO PARA DESPACHAR!".
   Después del envío también se puede volver a enviar el resumen al cliente.

### Precios
- Salen del catálogo (**Configuración › Catálogo**, precio de cada producto). Para cambiar un precio, cámbialo ahí.
- Se guardan con la orden: precio unitario de cada producto, envío/ajuste, total y texto del total. El **Historial** (filtro 💬 WhatsApp) muestra el total cobrado y el celular.

### Para activarlo
1. **Realtime Database › Rules**: pega el nuevo `database.rules.json` › **Publish** (permite celular y montos en pedidos de WhatsApp).
2. Sube los archivos a GitHub.

### 19.1 Promoción del día (sólo WhatsApp)
En "Ingreso manual" de WhatsApp elige **Sin promo / Lunes / Martes / Miércoles**. El día actual queda preseleccionado.
- Lunes de Quesadilla $2: Quesadilla Queso, Res, Pollo, Pastor, Campechano.
- Martes de Burritos $2: Burrito Clásico Res, Pollo, Pastor.
- Miércoles de Tacos $1: Taco Carne de Res, Pollo, Al Pastor.
### 19.2 Envío y desechables
En el resumen hay dos cargos opcionales: **Envío** y **Desechables** (nombre y monto editables). Ambos se suman al total y aparecen en la imagen del cliente; en el historial se guardan juntos como cargo extra.

Para cambiar precios o productos de la promo, editar `PROMOS` al inicio de `js/whatsapp.js`.
