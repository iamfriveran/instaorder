/**
 * INSTAOrder — Catálogo por defecto de Takolandia
 * ------------------------------------------------
 * Generado a partir de Precios_Takolandia.xlsx (hoja "Precios Takolandia").
 * Se usa como catálogo inicial. Una vez que se edita el catálogo desde
 * Configuración > Catálogo, la versión guardada en Firebase tiene prioridad.
 *
 * Descripciones: Menu_Takolandia_Descripciones.xlsx (20-nov-2026).
 * station: "kitchen" = va a cocina · "waiter" = bebida que sirve el mesero
 *          (no se envía a cocina).
 *
 * ingredients: ingredientes OBLIGATORIOS ("res|pollo" = a elección: basta uno disponible).
 * optional:    ingredientes opcionales (si se agotan, el producto se vende sin ellos).
 *
 * IMPORTANTE: referencePrice es SOLO REFERENCIAL para identificar el producto.
 * La aplicación nunca suma, multiplica ni totaliza precios.
 */
export const DEFAULT_CATALOG = {
  "version": 1,
  "source": "Precios_Takolandia.xlsx",
  "categories": [
    {
      "id": "tacos",
      "name": "Tacos",
      "icon": "🌮",
      "order": 1,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "quesadillas",
      "name": "Quesadillas",
      "icon": "🧀",
      "order": 2,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "burritos",
      "name": "Burritos",
      "icon": "🌯",
      "order": 3,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "nachos",
      "name": "Nachos",
      "icon": "🥙",
      "order": 4,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "fajitas",
      "name": "Fajitas",
      "icon": "🫑",
      "order": 5,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "doritos",
      "name": "Doritos",
      "icon": "🔺",
      "order": 6,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "flautas",
      "name": "Flautas",
      "icon": "🥖",
      "order": 7,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "bandejas",
      "name": "Bandejas",
      "icon": "🍽️",
      "order": 8,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "extras",
      "name": "Extras",
      "icon": "➕",
      "order": 9,
      "active": true,
      "station": "kitchen"
    },
    {
      "id": "bebidas",
      "name": "Bebidas",
      "icon": "🥤",
      "order": 10,
      "active": true,
      "station": "waiter"
    },
    {
      "id": "cantaritos",
      "name": "Cantaritos",
      "icon": "🏺",
      "order": 11,
      "active": true,
      "station": "waiter"
    },
    {
      "id": "micheladas",
      "name": "Micheladas",
      "icon": "🍺",
      "order": 12,
      "active": true,
      "station": "waiter"
    },
    {
      "id": "cocteles",
      "name": "Cócteles",
      "icon": "🍹",
      "order": 13,
      "active": true,
      "station": "waiter"
    },
    {
      "id": "promociones",
      "name": "Promociones",
      "icon": "⭐",
      "order": 14,
      "active": true,
      "station": "kitchen"
    }
  ],
  "products": [
    {
      "id": "p-taco-carne-de-res",
      "name": "Taco Carne de Res",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 1,
      "description": "Tortilla de maíz, carne de res, guacamole, cebolla y limón.",
      "ingredients": [
        "tortilla-maiz",
        "res"
      ],
      "optional": [
        "guacamole",
        "cebolla",
        "limon"
      ]
    },
    {
      "id": "p-taco-pollo",
      "name": "Taco Pollo",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 2,
      "description": "Tortilla de maíz, pechuga de pollo, guacamole, cebolla y limón.",
      "ingredients": [
        "tortilla-maiz",
        "pollo"
      ],
      "optional": [
        "guacamole",
        "cebolla",
        "limon"
      ]
    },
    {
      "id": "p-taco-al-pastor",
      "name": "Taco Al Pastor",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 3,
      "description": "Tortilla de maíz, carne de cerdo, piña, guacamole, cebolla y limón.",
      "ingredients": [
        "tortilla-maiz",
        "pastor"
      ],
      "optional": [
        "guacamole",
        "cebolla",
        "limon",
        "pina"
      ]
    },
    {
      "id": "p-taco-birria",
      "name": "Taco Birria",
      "categoryId": "tacos",
      "referencePrice": 2.75,
      "active": true,
      "order": 4,
      "description": "Tortilla de maíz, carne de res desmechada en salsa picante, guacamole y cebolla.",
      "ingredients": [
        "tortilla-maiz",
        "birria"
      ],
      "optional": [
        "guacamole",
        "cebolla"
      ]
    },
    {
      "id": "p-taco-campechano",
      "name": "Taco Campechano",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 5,
      "description": "Tortilla de maíz, carne de res, chorizo, guacamole, cebolla y limón.",
      "ingredients": [
        "tortilla-maiz",
        "res",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "cebolla",
        "limon"
      ]
    },
    {
      "id": "p-taco-full",
      "name": "Taco Full",
      "categoryId": "tacos",
      "referencePrice": 3,
      "active": true,
      "order": 6,
      "description": "Todas las carnes: res, cerdo, pollo, chorizo, guacamole, cebolla y limón.",
      "ingredients": [
        "tortilla-maiz",
        "res",
        "pollo",
        "cerdo",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "cebolla",
        "limon"
      ]
    },
    {
      "id": "p-quesadilla-queso",
      "name": "Quesadilla Queso",
      "categoryId": "quesadillas",
      "referencePrice": 2.75,
      "active": true,
      "order": 7,
      "description": "Tortilla de trigo, queso, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-quesadilla-res",
      "name": "Quesadilla Res",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 8,
      "description": "Tortilla de trigo, queso, carne de res, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "res"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-quesadilla-pollo",
      "name": "Quesadilla Pollo",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 9,
      "description": "Tortilla de trigo, queso, pechuga de pollo, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "pollo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-quesadilla-pastor",
      "name": "Quesadilla Pastor",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 10,
      "description": "Tortilla de trigo, queso, carne de cerdo, piña, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "pastor"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "pina"
      ]
    },
    {
      "id": "p-quesadilla-campechano",
      "name": "Quesadilla Campechano",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 11,
      "description": "Tortilla de trigo, queso, carne de res, chorizo, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "res",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-quesadilla-full",
      "name": "Quesadilla Full",
      "categoryId": "quesadillas",
      "referencePrice": 4,
      "active": true,
      "order": 12,
      "description": "Tortilla de trigo, queso, todas las carnes, chorizo, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "res",
        "pollo",
        "cerdo",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-quesadilla-birria",
      "name": "Quesadilla Birria",
      "categoryId": "quesadillas",
      "referencePrice": 4.75,
      "active": true,
      "order": 13,
      "description": "Tortilla de trigo, queso, carne de res desmechada, guacamole, pico de gallo.",
      "ingredients": [
        "tortilla-trigo",
        "queso",
        "birria"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-burrito-clasico-res",
      "name": "Burrito Clásico Res",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 14,
      "description": "Tortilla de maíz, frejol, res. Servido con guacamole, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "res"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria"
      ]
    },
    {
      "id": "p-burrito-clasico-pollo",
      "name": "Burrito Clásico Pollo",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 15,
      "description": "Tortilla de maíz, frejol, pollo. Servido con guacamole, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "pollo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria"
      ]
    },
    {
      "id": "p-burrito-clasico-pastor",
      "name": "Burrito Clásico Pastor",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 16,
      "description": "Tortilla de maíz, frejol, cerdo, piña. Servido con guacamole, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "pastor"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria",
        "pina"
      ]
    },
    {
      "id": "p-burrito-gratinado-res",
      "name": "Burrito Gratinado Res",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 17,
      "description": "Frejol, res, guacamole, queso. Servido con pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "frejol",
        "res",
        "queso"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria"
      ]
    },
    {
      "id": "p-burrito-gratinado-pollo",
      "name": "Burrito Gratinado Pollo",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 18,
      "description": "Frejol, pollo, guacamole, queso. Servido con pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "frejol",
        "pollo",
        "queso"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria"
      ]
    },
    {
      "id": "p-burrito-gratinado-pastor",
      "name": "Burrito Gratinado Pastor",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 19,
      "description": "Frejol, cerdo, piña, guacamole, queso. Servido con pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "frejol",
        "pastor",
        "queso"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria",
        "pina"
      ]
    },
    {
      "id": "p-burrito-birria",
      "name": "Burrito Birria",
      "categoryId": "burritos",
      "referencePrice": 4.75,
      "active": true,
      "order": 20,
      "description": "Frejol, guacamole, pico de gallo, carne de res desmechada, salsa cheddar y salsa agria.",
      "ingredients": [
        "frejol",
        "birria"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria"
      ]
    },
    {
      "id": "p-chimichanga-res",
      "name": "Chimichanga Res",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 21,
      "description": "Tortilla de maíz frita con frejol, res. Servida con guacamole, queso, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "res"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria",
        "queso"
      ]
    },
    {
      "id": "p-chimichanga-pollo",
      "name": "Chimichanga Pollo",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 22,
      "description": "Tortilla de maíz frita con frejol, pollo. Servida con guacamole, queso, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "pollo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria",
        "queso"
      ]
    },
    {
      "id": "p-chimichanga-cerdo",
      "name": "Chimichanga Cerdo",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 23,
      "description": "Tortilla de maíz frita con frejol, cerdo. Servida con guacamole, queso, pico de gallo, salsa cheddar y salsa agria.",
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "cerdo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "salsa-cheddar",
        "salsa-agria",
        "queso"
      ]
    },
    {
      "id": "p-nachos-queso",
      "name": "Nachos Queso",
      "categoryId": "nachos",
      "referencePrice": 2.5,
      "active": true,
      "order": 24,
      "description": "Nachos y queso.",
      "ingredients": [
        "nachos",
        "queso"
      ]
    },
    {
      "id": "p-nachos-pastor",
      "name": "Nachos Pastor",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 25,
      "description": "Nachos, queso, cerdo, piña, guacamole y pico de gallo.",
      "ingredients": [
        "nachos",
        "queso",
        "pastor"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "pina"
      ]
    },
    {
      "id": "p-nachos-pollo",
      "name": "Nachos Pollo",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 26,
      "description": "Nachos, queso, pollo, guacamole y pico de gallo.",
      "ingredients": [
        "nachos",
        "queso",
        "pollo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-nachos-carne-de-res",
      "name": "Nachos Carne de Res",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 27,
      "description": "Nachos, queso, res, guacamole y pico de gallo.",
      "ingredients": [
        "nachos",
        "queso",
        "res"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-nachos-campechano",
      "name": "Nachos Campechano",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 28,
      "description": "Nachos, queso, res, chorizo, guacamole y pico de gallo.",
      "ingredients": [
        "nachos",
        "queso",
        "res",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-nachos-full",
      "name": "Nachos Full",
      "categoryId": "nachos",
      "referencePrice": 4.5,
      "active": true,
      "order": 29,
      "description": "Nachos, queso, todas las carnes, chorizo, guacamole y pico de gallo.",
      "ingredients": [
        "nachos",
        "queso",
        "res",
        "pollo",
        "cerdo",
        "chorizo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo"
      ]
    },
    {
      "id": "p-nachos-chilli-beans",
      "name": "Nachos Chilli Beans",
      "categoryId": "nachos",
      "referencePrice": 5.5,
      "active": true,
      "order": 30,
      "description": "Nachos, frejol, res, queso, guacamole, pico de gallo y jalapeño.",
      "ingredients": [
        "nachos",
        "queso",
        "frejol",
        "res"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "jalapeno"
      ]
    },
    {
      "id": "p-nachos-bell-grande",
      "name": "Nachos Bell Grande",
      "categoryId": "nachos",
      "referencePrice": 5.75,
      "active": true,
      "order": 31,
      "description": "Nachos, frejol, todas las carnes, queso, guacamole, pico de gallo y jalapeño.",
      "ingredients": [
        "nachos",
        "queso",
        "frejol",
        "res",
        "pollo",
        "cerdo"
      ],
      "optional": [
        "guacamole",
        "pico-gallo",
        "jalapeno"
      ]
    },
    {
      "id": "p-taco-bowl",
      "name": "Taco Bowl",
      "categoryId": "nachos",
      "referencePrice": 4.5,
      "active": true,
      "order": 32,
      "description": "Nachos, frejol, todas las carnes, queso, guacamole, salsa agria.",
      "ingredients": [
        "nachos",
        "queso",
        "frejol",
        "res",
        "pollo",
        "cerdo"
      ],
      "optional": [
        "guacamole",
        "salsa-agria"
      ]
    },
    {
      "id": "p-fajita-pollo",
      "name": "Fajita Pollo",
      "categoryId": "fajitas",
      "referencePrice": 9,
      "active": true,
      "order": 33,
      "description": "Salteado de verduras, fajitas de pollo a la plancha, guacamole y frejol. Incluye arroz o tortillas.",
      "ingredients": [
        "verduras",
        "pollo",
        "arroz|tortillas"
      ],
      "optional": [
        "guacamole",
        "frejol"
      ]
    },
    {
      "id": "p-fajita-carne-de-res",
      "name": "Fajita Carne de Res",
      "categoryId": "fajitas",
      "referencePrice": 9.5,
      "active": true,
      "order": 34,
      "description": "Salteado de verduras, fajitas de res a la plancha, guacamole y frejol. Incluye arroz o tortillas.",
      "ingredients": [
        "verduras",
        "res",
        "arroz|tortillas"
      ],
      "optional": [
        "guacamole",
        "frejol"
      ]
    },
    {
      "id": "p-fajita-trio",
      "name": "Fajita Trío",
      "categoryId": "fajitas",
      "referencePrice": 13,
      "active": true,
      "order": 35,
      "description": "Salteado de verduras, fajitas de res y pollo a la plancha, camarones, guacamole y frejol. Incluye arroz o tortillas.",
      "ingredients": [
        "verduras",
        "res",
        "pollo",
        "camaron",
        "arroz|tortillas"
      ],
      "optional": [
        "guacamole",
        "frejol"
      ]
    },
    {
      "id": "p-doritos-limon-res",
      "name": "Doritos Limón Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 36,
      "description": "Doritos de limón, res y queso.",
      "ingredients": [
        "doritos-limon",
        "res",
        "queso"
      ]
    },
    {
      "id": "p-doritos-limon-cerdo",
      "name": "Doritos Limón Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 37,
      "description": "Doritos de limón, cerdo y queso.",
      "ingredients": [
        "doritos-limon",
        "cerdo",
        "queso"
      ]
    },
    {
      "id": "p-doritos-limon-pollo",
      "name": "Doritos Limón Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 38,
      "description": "Doritos de limón, pollo y queso.",
      "ingredients": [
        "doritos-limon",
        "pollo",
        "queso"
      ]
    },
    {
      "id": "p-doritos-hot-res",
      "name": "Doritos Hot Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 39,
      "description": "Doritos picantes, res y queso.",
      "ingredients": [
        "doritos-hot",
        "res",
        "queso"
      ]
    },
    {
      "id": "p-doritos-hot-pollo",
      "name": "Doritos Hot Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 40,
      "description": "Doritos picantes, pollo y queso.",
      "ingredients": [
        "doritos-hot",
        "pollo",
        "queso"
      ]
    },
    {
      "id": "p-doritos-hot-cerdo",
      "name": "Doritos Hot Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 41,
      "description": "Doritos picantes, cerdo y queso.",
      "ingredients": [
        "doritos-hot",
        "cerdo",
        "queso"
      ]
    },
    {
      "id": "p-doritos-normal-res",
      "name": "Doritos Normal Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 42,
      "description": "Doritos sabor natural, res y queso.",
      "ingredients": [
        "doritos-normal",
        "res",
        "queso"
      ]
    },
    {
      "id": "p-doritos-normal-pollo",
      "name": "Doritos Normal Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 43,
      "description": "Doritos sabor natural, pollo y queso.",
      "ingredients": [
        "doritos-normal",
        "pollo",
        "queso"
      ]
    },
    {
      "id": "p-doritos-normal-cerdo",
      "name": "Doritos Normal Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 44,
      "description": "Doritos sabor natural, cerdo y queso.",
      "ingredients": [
        "doritos-normal",
        "cerdo",
        "queso"
      ]
    },
    {
      "id": "p-flauta-de-res",
      "name": "Flauta de Res",
      "categoryId": "flautas",
      "referencePrice": 5.5,
      "active": true,
      "order": 45,
      "description": "Tortilla frita de maíz con queso, res, lechuga, pico de gallo y guacamole.",
      "ingredients": [
        "tortilla-maiz",
        "queso",
        "res"
      ],
      "optional": [
        "lechuga",
        "pico-gallo",
        "guacamole"
      ]
    },
    {
      "id": "p-flauta-de-pollo",
      "name": "Flauta de Pollo",
      "categoryId": "flautas",
      "referencePrice": 5.5,
      "active": true,
      "order": 46,
      "description": "Tortilla frita de maíz con queso, pollo, lechuga, pico de gallo y guacamole.",
      "ingredients": [
        "tortilla-maiz",
        "queso",
        "pollo"
      ],
      "optional": [
        "lechuga",
        "pico-gallo",
        "guacamole"
      ]
    },
    {
      "id": "p-flauta-de-queso",
      "name": "Flauta de Queso",
      "categoryId": "flautas",
      "referencePrice": 4.75,
      "active": true,
      "order": 47,
      "description": "Tortilla frita de maíz con queso, lechuga, pico de gallo y guacamole.",
      "ingredients": [
        "tortilla-maiz",
        "queso"
      ],
      "optional": [
        "lechuga",
        "pico-gallo",
        "guacamole"
      ]
    },
    {
      "id": "p-bandeja-carnal",
      "name": "Bandeja Carnal",
      "categoryId": "bandejas",
      "referencePrice": 14,
      "active": true,
      "order": 48,
      "description": "Tres tacos, dos quesadillas, proteína a elección (res, pollo o cerdo), una (1) bebida.",
      "ingredients": [
        "tortilla-maiz",
        "res|pollo|cerdo",
        "tortilla-trigo",
        "queso"
      ]
    },
    {
      "id": "p-bandejalandia",
      "name": "Bandejalandia",
      "categoryId": "bandejas",
      "referencePrice": 10,
      "active": true,
      "order": 49,
      "description": "Tres tacos, un burrito clásico, proteína a elección (res, pollo o cerdo), una (1) bebida.",
      "ingredients": [
        "tortilla-maiz",
        "res|pollo|cerdo",
        "frejol"
      ]
    },
    {
      "id": "p-extra-guacamole",
      "name": "Extra Guacamole",
      "categoryId": "extras",
      "referencePrice": 1.5,
      "active": true,
      "order": 50,
      "description": "Porción adicional de guacamole.",
      "ingredients": [
        "guacamole"
      ]
    },
    {
      "id": "p-extra-nachos",
      "name": "Extra Nachos",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 51,
      "description": "Porción adicional de nachos.",
      "ingredients": [
        "nachos"
      ]
    },
    {
      "id": "p-extra-de-frejol",
      "name": "Extra de Frejol",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 52,
      "description": "Porción adicional de frejol negro.",
      "ingredients": [
        "frejol"
      ]
    },
    {
      "id": "p-extra-de-queso",
      "name": "Extra de Queso",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 53,
      "description": "60g de queso mozzarella rallado.",
      "ingredients": [
        "queso"
      ]
    },
    {
      "id": "p-agua-de-jamaica",
      "name": "Agua de Jamaica",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 54,
      "description": "Agua fresca de flor de Jamaica.",
      "ingredients": [
        "jamaica"
      ]
    },
    {
      "id": "p-horchata",
      "name": "Horchata",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 55,
      "description": "Bebida de arroz con canela.",
      "ingredients": [
        "horchata"
      ]
    },
    {
      "id": "p-agua-natural",
      "name": "Agua Natural",
      "categoryId": "bebidas",
      "referencePrice": 1,
      "active": true,
      "order": 56,
      "description": "Agua sin gas, 300ml."
    },
    {
      "id": "p-agua-con-gas",
      "name": "Agua con Gas",
      "categoryId": "bebidas",
      "referencePrice": 1,
      "active": true,
      "order": 57,
      "description": "Agua con gas, 300ml."
    },
    {
      "id": "p-fuze-tea",
      "name": "Fuze Tea",
      "categoryId": "bebidas",
      "referencePrice": 1.75,
      "active": true,
      "order": 58,
      "description": "Té helado Fuze Tea."
    },
    {
      "id": "p-soda-coca-cola",
      "name": "Soda (Coca-Cola)",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 59,
      "description": "Coca-Cola 300ml.",
      "ingredients": [
        "coca-cola"
      ]
    },
    {
      "id": "p-soda-1-litro",
      "name": "Soda 1 Litro",
      "categoryId": "bebidas",
      "referencePrice": 2.5,
      "active": true,
      "order": 60,
      "description": "Gaseosa 1 litro."
    },
    {
      "id": "p-limonada-imperial",
      "name": "Limonada Imperial",
      "categoryId": "bebidas",
      "referencePrice": 2.5,
      "active": true,
      "order": 61,
      "description": "Limonada natural con hielo."
    },
    {
      "id": "p-limonada-de-coco",
      "name": "Limonada de Coco",
      "categoryId": "bebidas",
      "referencePrice": 5.75,
      "active": true,
      "order": 62,
      "description": "Limonada con crema de coco."
    },
    {
      "id": "p-limonada-frutos-rojos",
      "name": "Limonada Frutos Rojos",
      "categoryId": "bebidas",
      "referencePrice": 3.5,
      "active": true,
      "order": 63,
      "description": "Limonada con frutos rojos y hielo."
    },
    {
      "id": "p-cantarito",
      "name": "Cantarito",
      "categoryId": "cantaritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 64,
      "description": "Tequila, jugo de naranja, limón, toronja, sal, hielo. Vaso individual."
    },
    {
      "id": "p-sorbete-mexicano",
      "name": "Sorbete Mexicano",
      "categoryId": "cantaritos",
      "referencePrice": 0.5,
      "active": true,
      "order": 65,
      "description": "Sorbet mexicano de fruta."
    },
    {
      "id": "p-medio-cantaro",
      "name": "Medio Cántaro",
      "categoryId": "cantaritos",
      "referencePrice": 18,
      "active": true,
      "order": 66,
      "description": "Cantarito tamaño familiar — mitad de cántaro de barro."
    },
    {
      "id": "p-cantaro-entero",
      "name": "Cántaro Entero",
      "categoryId": "cantaritos",
      "referencePrice": 30,
      "active": true,
      "order": 67,
      "description": "Cantarito tamaño grande — cántaro de barro completo."
    },
    {
      "id": "p-michelada-pilsener",
      "name": "Michelada Pilsener",
      "categoryId": "micheladas",
      "referencePrice": 3.75,
      "active": true,
      "order": 68,
      "description": "Cerveza Pilsener, limón, sal, salsa picante y clamato."
    },
    {
      "id": "p-michelada-club",
      "name": "Michelada Club",
      "categoryId": "micheladas",
      "referencePrice": 4,
      "active": true,
      "order": 69,
      "description": "Cerveza Club, limón, sal, salsa picante y clamato."
    },
    {
      "id": "p-michelada-corona-heineken",
      "name": "Michelada Corona/Heineken",
      "categoryId": "micheladas",
      "referencePrice": 5.5,
      "active": true,
      "order": 70,
      "description": "Cerveza Corona o Heineken, limón, sal, salsa picante y clamato."
    },
    {
      "id": "p-frozen-para-ninos",
      "name": "Frozen para Niños",
      "categoryId": "cocteles",
      "referencePrice": 4,
      "active": true,
      "order": 71,
      "description": "Powerade azul, curacao, hielo, chupetes y gomitas."
    },
    {
      "id": "p-mexican-flag",
      "name": "Mexican Flag",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 72,
      "description": "Licor de menta, crema de leche, granadina y tequila."
    },
    {
      "id": "p-ronchata",
      "name": "Ronchata",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 73,
      "description": "Horchata, crema de coco, leche evaporada, ron.",
      "ingredients": [
        "horchata"
      ]
    },
    {
      "id": "p-margarita-jamaiquina",
      "name": "Margarita Jamaiquina",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 74,
      "description": "Triple seco, tequila, limón, jarabe de Jamaica."
    },
    {
      "id": "p-fizzy-mango",
      "name": "Fizzy Mango",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 75,
      "description": "Tequila, mango, Sprite y azúcar."
    },
    {
      "id": "p-mojituna-azteca",
      "name": "Mojituna Azteca",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 76,
      "description": "Ron, tequila, tuna, hierba buena."
    },
    {
      "id": "p-canequila",
      "name": "Canequila",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 77,
      "description": "Canela, naranjilla, tequila, azúcar."
    },
    {
      "id": "p-mojito",
      "name": "Mojito",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 78,
      "description": "Hierba buena, limón, ron blanco, hielo, Sprite."
    },
    {
      "id": "p-pina-colada",
      "name": "Piña Colada",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 79,
      "description": "Piña, crema de coco, ron blanco, hielo."
    },
    {
      "id": "p-cuba-libre",
      "name": "Cuba Libre",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 80,
      "description": "Ron blanco, limón, hielo, Coca-Cola.",
      "ingredients": [
        "coca-cola"
      ]
    },
    {
      "id": "p-daiquiri",
      "name": "Daiquiri",
      "categoryId": "cocteles",
      "referencePrice": 4,
      "active": true,
      "order": 81,
      "description": "Ron blanco, jugo de lima, azúcar, hielo."
    },
    {
      "id": "p-tequila-sunrise",
      "name": "Tequila Sunrise",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 82,
      "description": "Tequila, granadina, hielo, jugo de naranja."
    },
    {
      "id": "p-laguna-azul",
      "name": "Laguna Azul",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 83,
      "description": "Vodka, Curaçao, Sprite o limonada, hielo."
    },
    {
      "id": "p-margarita",
      "name": "Margarita",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 84,
      "description": "Tequila, limón, triple seco, hielo."
    },
    {
      "id": "p-la-catrina",
      "name": "La Catrina",
      "categoryId": "cocteles",
      "referencePrice": 6.75,
      "active": true,
      "order": 85,
      "description": "Cóctel especial de la casa."
    },
    {
      "id": "p-morir-sonando",
      "name": "Morir Soñando",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 86,
      "description": "Leche, leche evaporada, tequila, jugo de naranja, hielo."
    },
    {
      "id": "p-promo-1",
      "name": "Promo 1 – Combo Taquero",
      "description": "2 Tacos de Res + Guacamole + Coca-Cola 300ml",
      "categoryId": "promociones",
      "referencePrice": 4.99,
      "regularPrice": 6.5,
      "active": true,
      "order": 87,
      "ingredients": [
        "tortilla-maiz",
        "res",
        "guacamole",
        "coca-cola"
      ]
    },
    {
      "id": "p-promo-2",
      "name": "Promo 2 – Doble Antojo",
      "description": "1 Burrito Clásico de Res + 1 Quesadilla de Res + 1 Coca-Cola 300ml",
      "categoryId": "promociones",
      "referencePrice": 7.99,
      "regularPrice": 9.75,
      "active": true,
      "order": 88,
      "ingredients": [
        "tortilla-maiz",
        "frejol",
        "res",
        "tortilla-trigo",
        "queso",
        "coca-cola"
      ]
    },
    {
      "id": "p-promo-3",
      "name": "Promo 3 – Fiesta para Dos",
      "description": "2 Burritos Gratinados (Res/Pollo) + 2 Tacos (Res/Pollo) + 2 Coca-Colas 300ml",
      "categoryId": "promociones",
      "referencePrice": 13.5,
      "regularPrice": 16.5,
      "active": true,
      "order": 89,
      "ingredients": [
        "frejol",
        "queso",
        "tortilla-maiz",
        "res|pollo",
        "coca-cola"
      ]
    }
  ]
};
