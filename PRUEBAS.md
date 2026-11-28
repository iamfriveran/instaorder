# INSTAOrder — Pruebas

Pruebas automatizadas ejecutadas el 19-nov-2026 con un navegador Chromium real (Playwright), en **MODO DEMO LOCAL**: un teléfono simulado (390×844) como mesero y una tablet simulada (1280×800 y 820×1180) como cocina, sincronizados en tiempo real. Resultado: **37/37 verificaciones correctas** + prueba de actualización del Service Worker.

> El modo demo usa la misma lógica de negocio (`DataService`) que Firebase; sólo cambia el transporte. Las pruebas contra un proyecto Firebase real quedan **pendientes** porque requieren tus credenciales (ver abajo).

## Pruebas obligatorias

| # | Escenario | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Mesero crea una orden | Aparece en cocina inmediatamente | ✅ Superada |
| 2 | Llega una orden nueva a cocina | La tarjeta parpadea hasta aceptar | ✅ Superada (animación `kBlink` activa) |
| 3 | Cocina acepta | Se detiene el parpadeo y sigue activa | ✅ Superada |
| 4 | Cocina completa | Sale del panel y queda en el historial | ✅ Superada |
| 5 | Mesero recibe orden lista | "MESA XX – ¡PEDIDO LISTO PARA SERVIR!" parpadeando | ✅ Superada |
| 6 | Mesero acepta la notificación | El parpadeo se detiene sólo para esa orden | ✅ Superada |
| 7 | Tres órdenes listas del mismo mesero | Cada alerta es independiente | ✅ Superada (se aceptó la del medio; quedaron las otras 2) |
| 8 | Dos meseros simultáneos | Cada orden guarda quién la tomó | ✅ Superada (Carlos ×3, María ×1); la alerta de María no le apareció a Carlos |
| 9 | Pérdida de conexión | Indica desconexión y no finge envíos | ✅ Superada (orden marcada "NO ENVIADA — SIN CONEXIÓN"; cocina no la recibió; mesa en "Pendiente de enviar") |
| 10 | Vuelve la conexión | Se sincroniza sin duplicar | ✅ Superada (se envió exactamente 1 vez) |
| 11 | Varios toques en "Enviar" | Una sola orden | ✅ Superada |
| 12 | Actualización del código en GitHub | Nueva versión sin perder órdenes | ✅ Superada (aviso "Actualizar ahora", caché nueva, borradores conservados) |

## Verificaciones adicionales superadas
- Reintento con el mismo `orderId` desde la bandeja de salida → no duplica.
- Notas por producto y nota general guardadas y destacadas en cocina.
- Ningún total, subtotal ni IVA en pantalla.
- Marcar productos como preparados (opcional).
- Registro de eventos completo: creada, enviada, aceptada, completada, notificación recibida y aceptada.
- Mesa vuelve a "Disponible" cuando su orden termina (no queda bloqueada).
- Historial: filtros por mesa, mesero, número de orden y fecha; detalle con tiempos.
- Orden de corrección visible en cocina como "CORRECCIÓN DE LA ORDEN #…".
- Configuración: agregar mesero, cambiar número de mesas (20 → 24), PIN.

## Pendientes (requieren tu proyecto Firebase y dispositivos reales)
- [ ] Repetir pruebas 1–12 con Firebase configurado (2 teléfonos + 1 tablet).
- [ ] Verificar en el simulador de reglas de Firebase: borrar una orden → **denegado**; editar productos de una orden enviada → **denegado**.
- [ ] Modo `AUTH_MODE = "email"` con roles (`requireRoles: true`).
- [ ] Desconectar el Wi‑Fi de la tablet durante 1 min con pedidos entrando; verificar banner rojo y recuperación.
- [ ] Sonido y vibración en un iPhone y un Android reales (incluido modo silencio).
- [ ] Instalación PWA en iPhone (Safari) y Android (Chrome).
- [ ] Prueba de carga en hora pico (ej. 30 órdenes en 10 min).

## v1.1.0 — Instalación en teléfonos (20-nov-2026)
- ✅ Botón "Instalar INSTAOrder" visible en navegador; oculto al abrir como app instalada.
- ✅ En iPhone (Safari simulado) el botón muestra las instrucciones de "Añadir a pantalla de inicio".
- ✅ Pantalla Ayuda e instalación (#/ayuda) con estado de conexión.
- ✅ Actualización: aviso "Nueva versión disponible · ACTUALIZAR AHORA", caché nueva, borradores conservados.
- ✅ Regresión: 37/37 verificaciones + separación de bebidas.
- [ ] Instalación real en Android (Chrome) y iPhone (Safari) — pendiente en dispositivos.
- [ ] Compilar el APK en Android Studio e instalarlo — pendiente (no se pudo compilar en este entorno).

## v1.2.0 — Usuarios y roles (20-nov-2026, simulación en modo demo)
- ✅ Configuración inicial: el primer usuario queda como Admin.
- ✅ Admin crea usuarios con roles múltiples (Mesero+Cocina) y tablet compartida.
- ✅ Cada usuario sólo ve sus modos; un mesero no puede entrar a cocina.
- ✅ Las órdenes guardan el usuario con sesión; la tablet compartida registra al cocinero elegido.
- ✅ Alerta "listo" llega sólo a su mesero; cambio de contraseña propia.
- ✅ Desactivar cuenta bloquea la app de esa persona al instante.
- ✅ "Olvidó su contraseña" prepara una cuenta nueva con los mismos roles.
- ✅ Regresión 37/37 + bebidas.
- [ ] Pendiente con Firebase real: reglas nuevas (no hay emulador en este entorno). Probar tras activar: que un usuario desactivado no pueda leer órdenes y que un mesero no pueda completar una orden.

## v1.3.0 — Pedidos externos (PedidosYa), OCR e historial permanente (20-nov-2026)
OCR probado con Tesseract.js 5.1.1 real (mismo motor que usa el teléfono) sobre la captura real #148 y dos variantes generadas a partir de ella.

| # | Prueba | Resultado |
|---|---|---|
| 1 | OCR captura real #148 | ✅ #148 · Elvis Steven Zumbana · producto reconocido como **Promo 2 – Doble Antojo** |
| 2 | Tiempo − 15 + | ✅ 15 min (variante); captura real: 11 min. No se confunde con 2374595122 ni con la cédula |
| 3 | 7:30 PM + 15 min | ✅ 7:45 PM |
| 4 | Tiempo no reconocido | ✅ aviso rojo, campo editable, confirmación explícita para enviar sin tiempo |
| 5 | Productos y cantidades (5 productos, 2Por) | ✅ Quesadilla Full, Burrito Clásico Res, 2× Horchata, Agua de Jamaica |
| 6 | Producto en varias líneas | ✅ "1 burrito res+1 / quesadilla / res+gaseosa 300ml" unido en un solo producto (promo) |
| 7 | Duplicado | ✅ "ESTA ORDEN YA FUE REGISTRADA", no se creó otra |
| 8 | Llega a cocina | ✅ al instante, parpadeando, con hora objetivo y cuenta regresiva |
| 9 | Aceptar | ✅ deja de parpadear |
| 10 | Completar | ✅ sale del panel de cocina, alerta de despacho |
| 11 | Alerta al mesero | ✅ "LISTO PARA DESPACHAR", se apaga al confirmar |
| 12 | Historial permanente | ✅ la orden sigue tras confirmar despacho (eventos DISPATCHED, etc.) |
| 13 | Historial compartido | ✅ mismo historial en teléfono del mesero y tablet de cocina |
| 14 | Pedido de mesa | ✅ también permanece tras aceptar la alerta |
| 15 | Mesa + externo simultáneos | ✅ ambos en cocina; el externo no ocupa ninguna mesa |
| 16 | Desconexión | ✅ (pruebas anteriores) sin conexión no se envía ni se verifica; borrador guardado |
| 17 | Actualización | ✅ aviso de versión nueva, caché nueva, datos intactos |
| — | Regresión | ✅ 37/37 + bebidas + usuarios |

Pendiente en real: probar con varias capturas reales de PedidosYa (distintos productos, combos, notas del cliente) y en los teléfonos del restaurante; publicar las reglas nuevas y verificar en Firebase.

## v1.3.1 — Correcciones con la captura real #154 (20-nov-2026)
- ✅ #154 · Cris Benalcazar · 10 min · "2 tacos de carne + guacamole + gaseosa" → **Promo 1 – Combo Taquero**.
- ✅ Si el lector confunde "#" con "4" ("4154"), se recupera 154 comparando con la barra superior "#154 - 237…".
- ✅ El cliente ya no se toma del correo de facturación ("…@invoices.pedidosya.com").
- ✅ "gaseosa" ya no se confunde con Soda 1 Litro dentro de un combo; "carne" = "res".
- ✅ El campo vacío de número de orden ya no muestra "148" de ejemplo.
- ✅ #148 (real), variantes 15 min y 5 productos: siguen correctas.

## v1.4.0 — Disponibilidad de ingredientes (22-nov-2026, modo demo con 2 teléfonos + tablet)
| # | Prueba | Resultado |
|---|---|---|
| 1 | RES agotada | ✅ los 23 productos con res obligatoria bloqueados (tacos, quesadillas, burritos, chimichangas, nachos, fajitas, doritos, flautas, Promo 1 y 2) |
| 2 | Mensaje | ✅ "🔴 Producto no disponible · Agotado: Res" |
| 3 | Selección | ✅ botón + deshabilitado; tocar el producto no lo agrega |
| 4 | POLLO agotado | ✅ productos de pollo y Promo 3 (res/pollo) bloqueados |
| 5 | Independientes | ✅ pollo/cerdo siguen disponibles con res agotada |
| 6 | A elección | ✅ Bandejas siguen disponibles "Sin Res: elige otra opción" |
| 7 | Restaurar | ✅ todo vuelve a estar disponible al instante |
| 8 | Sincronización | ✅ el segundo teléfono se actualizó sin recargar |
| 9 | Carrito abierto | ✅ "NO SE PUEDE ENVIAR EL PEDIDO", no se envió; al quitar el producto se envió bien |
| 10 | Pedido externo aceptado | ✅ no se modificó |
| 11 | Historial | ✅ ninguna orden previa cambió |
| 12 | Actualización | ✅ caché nueva, datos intactos; el estado vive en Firebase |
| — | Opcional (guacamole) | ✅ Taco Al Pastor se vende con nota "SIN GUACAMOLE (agotado)"; Promo 1 (lleva guacamole) bloqueada |
| — | Registro | ✅ 6 cambios registrados con hora y persona |
| — | Regresión | ✅ 37/37, bebidas, usuarios, pedidos externos |

Pendiente en real: publicar las reglas y probar con la tablet y los teléfonos del restaurante.

## v1.4.2 — Tortillas por uso + atajo 🏠 (22-nov-2026)
- ✅ Tortilla de tacos agotada → 10 bloqueados (6 tacos, 2 bandejas, Promo 1 y 3).
- ✅ Tortilla de burritos y quesadillas agotada → 21 bloqueados (7 quesadillas, 10 burritos/chimichangas, 2 bandejas, Promo 2 y 3).
- ✅ Tortilla de flautas agotada → 3 flautas.
- ✅ "Tortilla de maíz" y "Tortilla de trigo" retiradas; un catálogo guardado con ellas se convierte solo a las nuevas.
- ✅ Botón 🏠 en la cabecera de todas las pantallas (mesero, externos, cocina, historial, configuración, ayuda, ingredientes); si hay cambios sin guardar, pregunta antes.
- ✅ Regresión: 37/37, ingredientes, birria, bebidas, pedidos externos.

## v1.4.3 — Opciones de producto en PedidosYa (orden #159, 23-nov-2026)
Causa del "1 × BURRITO GRATINADO RES" en la #159: el recuadro de opciones de la Promo 2 ("1Por Elige tu salsa · Extra · 1Por Salsa cheddar") se leyó como productos aparte, y "Salsa cheddar" se emparejó con el Burrito Gratinado Res por su descripción.
- ✅ Las opciones (líneas "1Por" con sangría dentro del recuadro) ahora son NOTA del producto: Promo 2 → "Salsa cheddar (extra)".
- ✅ Un producto suelto ya no se elige sólo por su descripción: debe coincidir alguna palabra del nombre.
- ✅ Productos dudosos (amarillo) piden confirmación explícita antes de enviar.
- ✅ #148, #154, #159 reales y variantes: correctas.

## v1.4.4 — Formato nuevo de PedidosYa (orden #160, 25-nov-2026)
Causa: PedidosYa cambió "1Por" por "1x" y "Cliente" por "Customer"; el lector no reconocía productos ni cliente. El teléfono además leyó 4 en vez de 6 minutos.
- ✅ Acepta "1Por", "1x" y "1×"; "Cliente" y "Customer".
- ✅ Segunda lectura de verificación de MINUTOS y NÚMERO DE ORDEN (sólo dígitos); si no coincide, usa la verificada y avisa.
- ✅ Quita la letra suelta del ícono del cliente ("A Niky Garzón" → "Niky Garzón").
- ✅ #160: 160 · Niky Garzón · 6 min · Promo 2 (nota: Salsa agria (extra)).
- ✅ #148, #154, #159 y variantes siguen correctas, también a media resolución.

## v1.5.0 — Pedidos por WhatsApp (27-nov-2026, modo demo)
- ✅ Pedidos externos › dos opciones: PEDIDOS YA (subir captura / ingreso manual) y PEDIDOS POR WHATSAPP (ingreso manual).
- ✅ Celular, nombre, tiempo (− / + de 5 min), productos con pestañas de categorías y buscador, con precio.
- ✅ Total: Promo 2 ($7.99) + 2 Horchata ($1.25) = $10.49; + envío $1.50 = $11.99. Texto del total editable ("· pago en efectivo").
- ✅ Imagen del pedido (1080 px) con logo, productos, precios, envío, total y tiempo; en computadora se descarga y abre wa.me/5939…; en teléfono usa Compartir.
- ✅ 0991234567, 991234567 y +593 99 123 4567 → 593991234567.
- ✅ Cocina recibe WHATSAPP #1001 en verde, sin precios, con cuenta regresiva; alerta de despacho al mesero; historial con filtro WhatsApp y total.
- ✅ Productos con ingrediente agotado bloqueados también en WhatsApp.
- ✅ Regresión: 37/37, pedidos externos (OCR), ingredientes, bebidas, atajo 🏠.
- [ ] Probar "Compartir → WhatsApp" en un teléfono real (Android/iPhone).

## v1.5.1 — Promoción del día en Pedidos por WhatsApp (27-nov-2026, modo demo)
- ✅ Selector: Sin promo · Lunes (Quesadilla $2) · Martes (Burritos $2) · Miércoles (Tacos $1); se preselecciona el día de hoy si es lunes a miércoles.
- ✅ Sólo aplica a: Quesadilla Queso/Res/Pollo/Pastor/Campechano; Burrito Clásico Res/Pollo/Pastor; Taco Carne de Res/Pollo/Al Pastor. Quesadilla Birria, Burritos Gratinados, etc. mantienen su precio.
- ✅ Pedido de prueba (2 Quesadilla Res, 1 Quesadilla Birria, 1 Burrito Clásico Pollo, 3 Taco Pollo): Sin promo $23.50 · Lunes $20.00 · Martes $21.75 · Miércoles $19.00.
- ✅ Cambiar de día recalcula todo el pedido; resumen muestra "promo · antes $x"; imagen y mensaje muestran el nombre de la promo; total guardado correcto.
- ✅ Regresión WhatsApp v1.5.0 y 37/37.

## v1.5.2 — Costo de desechables en Pedidos por WhatsApp (27-nov-2026, modo demo)
- ✅ Nuevo casillero "Desechables" (nombre y monto editables) junto a "Envío"; acepta 0,50 o 0.50.
- ✅ Subtotal $4.00 + envío $1.50 + desechables $0.50 = $6.00; con sólo desechables $4.50; el texto del total se actualiza solo.
- ✅ Imagen y mensaje muestran Envío y Desechables en líneas separadas; se conserva al recargar.
- ✅ Se guarda totalAmount 6 y extraCharge 2 (envío + desechables); cocina sin precios. No requiere cambiar reglas de Firebase.
- ✅ Regresión WhatsApp, promociones y 37/37.

## v1.5.3 — Sólo imagen al cliente (27-nov-2026, modo demo)
- ✅ En teléfono, "Compartir" envía únicamente la imagen (sin el texto debajo).
- ✅ En computadora se descarga la imagen y se abre el chat wa.me/5939… sin mensaje escrito.
