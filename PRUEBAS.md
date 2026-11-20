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
