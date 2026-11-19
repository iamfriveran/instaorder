/**
 * INSTAOrder — Catálogo por defecto de Takolandia
 * ------------------------------------------------
 * Generado a partir de Precios_Takolandia.xlsx (hoja "Precios Takolandia").
 * Se usa como catálogo inicial. Una vez que se edita el catálogo desde
 * Configuración > Catálogo, la versión guardada en Firebase tiene prioridad.
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
      "active": true
    },
    {
      "id": "quesadillas",
      "name": "Quesadillas",
      "icon": "🧀",
      "order": 2,
      "active": true
    },
    {
      "id": "burritos",
      "name": "Burritos",
      "icon": "🌯",
      "order": 3,
      "active": true
    },
    {
      "id": "nachos",
      "name": "Nachos",
      "icon": "🥙",
      "order": 4,
      "active": true
    },
    {
      "id": "fajitas",
      "name": "Fajitas",
      "icon": "🫑",
      "order": 5,
      "active": true
    },
    {
      "id": "doritos",
      "name": "Doritos",
      "icon": "🔺",
      "order": 6,
      "active": true
    },
    {
      "id": "flautas",
      "name": "Flautas",
      "icon": "🥖",
      "order": 7,
      "active": true
    },
    {
      "id": "bandejas",
      "name": "Bandejas",
      "icon": "🍽️",
      "order": 8,
      "active": true
    },
    {
      "id": "extras",
      "name": "Extras",
      "icon": "➕",
      "order": 9,
      "active": true
    },
    {
      "id": "bebidas",
      "name": "Bebidas",
      "icon": "🥤",
      "order": 10,
      "active": true
    },
    {
      "id": "cantaritos",
      "name": "Cantaritos",
      "icon": "🏺",
      "order": 11,
      "active": true
    },
    {
      "id": "micheladas",
      "name": "Micheladas",
      "icon": "🍺",
      "order": 12,
      "active": true
    },
    {
      "id": "cocteles",
      "name": "Cócteles",
      "icon": "🍹",
      "order": 13,
      "active": true
    },
    {
      "id": "promociones",
      "name": "Promociones",
      "icon": "⭐",
      "order": 14,
      "active": true
    }
  ],
  "products": [
    {
      "id": "p-taco-carne-de-res",
      "name": "Taco Carne de Res",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 1
    },
    {
      "id": "p-taco-pollo",
      "name": "Taco Pollo",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 2
    },
    {
      "id": "p-taco-al-pastor",
      "name": "Taco Al Pastor",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 3
    },
    {
      "id": "p-taco-birria",
      "name": "Taco Birria",
      "categoryId": "tacos",
      "referencePrice": 2.75,
      "active": true,
      "order": 4
    },
    {
      "id": "p-taco-campechano",
      "name": "Taco Campechano",
      "categoryId": "tacos",
      "referencePrice": 2.5,
      "active": true,
      "order": 5
    },
    {
      "id": "p-taco-full",
      "name": "Taco Full",
      "categoryId": "tacos",
      "referencePrice": 3,
      "active": true,
      "order": 6
    },
    {
      "id": "p-quesadilla-queso",
      "name": "Quesadilla Queso",
      "categoryId": "quesadillas",
      "referencePrice": 2.75,
      "active": true,
      "order": 7
    },
    {
      "id": "p-quesadilla-res",
      "name": "Quesadilla Res",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 8
    },
    {
      "id": "p-quesadilla-pollo",
      "name": "Quesadilla Pollo",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 9
    },
    {
      "id": "p-quesadilla-pastor",
      "name": "Quesadilla Pastor",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 10
    },
    {
      "id": "p-quesadilla-campechano",
      "name": "Quesadilla Campechano",
      "categoryId": "quesadillas",
      "referencePrice": 3.75,
      "active": true,
      "order": 11
    },
    {
      "id": "p-quesadilla-full",
      "name": "Quesadilla Full",
      "categoryId": "quesadillas",
      "referencePrice": 4,
      "active": true,
      "order": 12
    },
    {
      "id": "p-quesadilla-birria",
      "name": "Quesadilla Birria",
      "categoryId": "quesadillas",
      "referencePrice": 4.75,
      "active": true,
      "order": 13
    },
    {
      "id": "p-burrito-clasico-res",
      "name": "Burrito Clásico Res",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 14
    },
    {
      "id": "p-burrito-clasico-pollo",
      "name": "Burrito Clásico Pollo",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 15
    },
    {
      "id": "p-burrito-clasico-pastor",
      "name": "Burrito Clásico Pastor",
      "categoryId": "burritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 16
    },
    {
      "id": "p-burrito-gratinado-res",
      "name": "Burrito Gratinado Res",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 17
    },
    {
      "id": "p-burrito-gratinado-pollo",
      "name": "Burrito Gratinado Pollo",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 18
    },
    {
      "id": "p-burrito-gratinado-pastor",
      "name": "Burrito Gratinado Pastor",
      "categoryId": "burritos",
      "referencePrice": 4.5,
      "active": true,
      "order": 19
    },
    {
      "id": "p-burrito-birria",
      "name": "Burrito Birria",
      "categoryId": "burritos",
      "referencePrice": 4.75,
      "active": true,
      "order": 20
    },
    {
      "id": "p-chimichanga-res",
      "name": "Chimichanga Res",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 21
    },
    {
      "id": "p-chimichanga-pollo",
      "name": "Chimichanga Pollo",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 22
    },
    {
      "id": "p-chimichanga-cerdo",
      "name": "Chimichanga Cerdo",
      "categoryId": "burritos",
      "referencePrice": 4.25,
      "active": true,
      "order": 23
    },
    {
      "id": "p-nachos-queso",
      "name": "Nachos Queso",
      "categoryId": "nachos",
      "referencePrice": 2.5,
      "active": true,
      "order": 24
    },
    {
      "id": "p-nachos-pastor",
      "name": "Nachos Pastor",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 25
    },
    {
      "id": "p-nachos-pollo",
      "name": "Nachos Pollo",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 26
    },
    {
      "id": "p-nachos-carne-de-res",
      "name": "Nachos Carne de Res",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 27
    },
    {
      "id": "p-nachos-campechano",
      "name": "Nachos Campechano",
      "categoryId": "nachos",
      "referencePrice": 3.75,
      "active": true,
      "order": 28
    },
    {
      "id": "p-nachos-full",
      "name": "Nachos Full",
      "categoryId": "nachos",
      "referencePrice": 4.5,
      "active": true,
      "order": 29
    },
    {
      "id": "p-nachos-chilli-beans",
      "name": "Nachos Chilli Beans",
      "categoryId": "nachos",
      "referencePrice": 5.5,
      "active": true,
      "order": 30
    },
    {
      "id": "p-nachos-bell-grande",
      "name": "Nachos Bell Grande",
      "categoryId": "nachos",
      "referencePrice": 5.75,
      "active": true,
      "order": 31
    },
    {
      "id": "p-taco-bowl",
      "name": "Taco Bowl",
      "categoryId": "nachos",
      "referencePrice": 4.5,
      "active": true,
      "order": 32
    },
    {
      "id": "p-fajita-pollo",
      "name": "Fajita Pollo",
      "categoryId": "fajitas",
      "referencePrice": 9,
      "active": true,
      "order": 33
    },
    {
      "id": "p-fajita-carne-de-res",
      "name": "Fajita Carne de Res",
      "categoryId": "fajitas",
      "referencePrice": 9.5,
      "active": true,
      "order": 34
    },
    {
      "id": "p-fajita-trio",
      "name": "Fajita Trío",
      "categoryId": "fajitas",
      "referencePrice": 13,
      "active": true,
      "order": 35
    },
    {
      "id": "p-doritos-limon-res",
      "name": "Doritos Limón Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 36
    },
    {
      "id": "p-doritos-limon-cerdo",
      "name": "Doritos Limón Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 37
    },
    {
      "id": "p-doritos-limon-pollo",
      "name": "Doritos Limón Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 38
    },
    {
      "id": "p-doritos-hot-res",
      "name": "Doritos Hot Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 39
    },
    {
      "id": "p-doritos-hot-pollo",
      "name": "Doritos Hot Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 40
    },
    {
      "id": "p-doritos-hot-cerdo",
      "name": "Doritos Hot Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 41
    },
    {
      "id": "p-doritos-normal-res",
      "name": "Doritos Normal Res",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 42
    },
    {
      "id": "p-doritos-normal-pollo",
      "name": "Doritos Normal Pollo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 43
    },
    {
      "id": "p-doritos-normal-cerdo",
      "name": "Doritos Normal Cerdo",
      "categoryId": "doritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 44
    },
    {
      "id": "p-flauta-de-res",
      "name": "Flauta de Res",
      "categoryId": "flautas",
      "referencePrice": 5.5,
      "active": true,
      "order": 45
    },
    {
      "id": "p-flauta-de-pollo",
      "name": "Flauta de Pollo",
      "categoryId": "flautas",
      "referencePrice": 5.5,
      "active": true,
      "order": 46
    },
    {
      "id": "p-flauta-de-queso",
      "name": "Flauta de Queso",
      "categoryId": "flautas",
      "referencePrice": 4.75,
      "active": true,
      "order": 47
    },
    {
      "id": "p-bandeja-carnal",
      "name": "Bandeja Carnal",
      "categoryId": "bandejas",
      "referencePrice": 14,
      "active": true,
      "order": 48
    },
    {
      "id": "p-bandejalandia",
      "name": "Bandejalandia",
      "categoryId": "bandejas",
      "referencePrice": 10,
      "active": true,
      "order": 49
    },
    {
      "id": "p-extra-guacamole",
      "name": "Extra Guacamole",
      "categoryId": "extras",
      "referencePrice": 1.5,
      "active": true,
      "order": 50
    },
    {
      "id": "p-extra-nachos",
      "name": "Extra Nachos",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 51
    },
    {
      "id": "p-extra-de-frejol",
      "name": "Extra de Frejol",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 52
    },
    {
      "id": "p-extra-de-queso",
      "name": "Extra de Queso",
      "categoryId": "extras",
      "referencePrice": 2,
      "active": true,
      "order": 53
    },
    {
      "id": "p-agua-de-jamaica",
      "name": "Agua de Jamaica",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 54
    },
    {
      "id": "p-horchata",
      "name": "Horchata",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 55
    },
    {
      "id": "p-agua-natural",
      "name": "Agua Natural",
      "categoryId": "bebidas",
      "referencePrice": 1,
      "active": true,
      "order": 56
    },
    {
      "id": "p-agua-con-gas",
      "name": "Agua con Gas",
      "categoryId": "bebidas",
      "referencePrice": 1,
      "active": true,
      "order": 57
    },
    {
      "id": "p-fuze-tea",
      "name": "Fuze Tea",
      "categoryId": "bebidas",
      "referencePrice": 1.75,
      "active": true,
      "order": 58
    },
    {
      "id": "p-soda-coca-cola",
      "name": "Soda (Coca-Cola)",
      "categoryId": "bebidas",
      "referencePrice": 1.25,
      "active": true,
      "order": 59
    },
    {
      "id": "p-soda-1-litro",
      "name": "Soda 1 Litro",
      "categoryId": "bebidas",
      "referencePrice": 2.5,
      "active": true,
      "order": 60
    },
    {
      "id": "p-limonada-imperial",
      "name": "Limonada Imperial",
      "categoryId": "bebidas",
      "referencePrice": 2.5,
      "active": true,
      "order": 61
    },
    {
      "id": "p-limonada-de-coco",
      "name": "Limonada de Coco",
      "categoryId": "bebidas",
      "referencePrice": 5.75,
      "active": true,
      "order": 62
    },
    {
      "id": "p-limonada-frutos-rojos",
      "name": "Limonada Frutos Rojos",
      "categoryId": "bebidas",
      "referencePrice": 3.5,
      "active": true,
      "order": 63
    },
    {
      "id": "p-cantarito",
      "name": "Cantarito",
      "categoryId": "cantaritos",
      "referencePrice": 3.75,
      "active": true,
      "order": 64
    },
    {
      "id": "p-sorbete-mexicano",
      "name": "Sorbete Mexicano",
      "categoryId": "cantaritos",
      "referencePrice": 0.5,
      "active": true,
      "order": 65
    },
    {
      "id": "p-medio-cantaro",
      "name": "Medio Cántaro",
      "categoryId": "cantaritos",
      "referencePrice": 18,
      "active": true,
      "order": 66
    },
    {
      "id": "p-cantaro-entero",
      "name": "Cántaro Entero",
      "categoryId": "cantaritos",
      "referencePrice": 30,
      "active": true,
      "order": 67
    },
    {
      "id": "p-michelada-pilsener",
      "name": "Michelada Pilsener",
      "categoryId": "micheladas",
      "referencePrice": 3.75,
      "active": true,
      "order": 68
    },
    {
      "id": "p-michelada-club",
      "name": "Michelada Club",
      "categoryId": "micheladas",
      "referencePrice": 4,
      "active": true,
      "order": 69
    },
    {
      "id": "p-michelada-corona-heineken",
      "name": "Michelada Corona/Heineken",
      "categoryId": "micheladas",
      "referencePrice": 5.5,
      "active": true,
      "order": 70
    },
    {
      "id": "p-frozen-para-ninos",
      "name": "Frozen para Niños",
      "categoryId": "cocteles",
      "referencePrice": 4,
      "active": true,
      "order": 71
    },
    {
      "id": "p-mexican-flag",
      "name": "Mexican Flag",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 72
    },
    {
      "id": "p-ronchata",
      "name": "Ronchata",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 73
    },
    {
      "id": "p-margarita-jamaiquina",
      "name": "Margarita Jamaiquina",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 74
    },
    {
      "id": "p-fizzy-mango",
      "name": "Fizzy Mango",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 75
    },
    {
      "id": "p-mojituna-azteca",
      "name": "Mojituna Azteca",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 76
    },
    {
      "id": "p-canequila",
      "name": "Canequila",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 77
    },
    {
      "id": "p-mojito",
      "name": "Mojito",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 78
    },
    {
      "id": "p-pina-colada",
      "name": "Piña Colada",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 79
    },
    {
      "id": "p-cuba-libre",
      "name": "Cuba Libre",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 80
    },
    {
      "id": "p-daiquiri",
      "name": "Daiquiri",
      "categoryId": "cocteles",
      "referencePrice": 4,
      "active": true,
      "order": 81
    },
    {
      "id": "p-tequila-sunrise",
      "name": "Tequila Sunrise",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 82
    },
    {
      "id": "p-laguna-azul",
      "name": "Laguna Azul",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 83
    },
    {
      "id": "p-margarita",
      "name": "Margarita",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 84
    },
    {
      "id": "p-la-catrina",
      "name": "La Catrina",
      "categoryId": "cocteles",
      "referencePrice": 6.75,
      "active": true,
      "order": 85
    },
    {
      "id": "p-morir-sonando",
      "name": "Morir Soñando",
      "categoryId": "cocteles",
      "referencePrice": 5.75,
      "active": true,
      "order": 86
    },
    {
      "id": "p-promo-1",
      "name": "Promo 1 – Combo Taquero",
      "description": "2 Tacos de Res + Guacamole + Coca-Cola 300ml",
      "categoryId": "promociones",
      "referencePrice": 4.99,
      "regularPrice": 6.5,
      "active": true,
      "order": 87
    },
    {
      "id": "p-promo-2",
      "name": "Promo 2 – Doble Antojo",
      "description": "1 Burrito Clásico de Res + 1 Quesadilla de Res + 1 Coca-Cola 300ml",
      "categoryId": "promociones",
      "referencePrice": 7.99,
      "regularPrice": 9.75,
      "active": true,
      "order": 88
    },
    {
      "id": "p-promo-3",
      "name": "Promo 3 – Fiesta para Dos",
      "description": "2 Burritos Gratinados (Res/Pollo) + 2 Tacos (Res/Pollo) + 2 Coca-Colas 300ml",
      "categoryId": "promociones",
      "referencePrice": 13.5,
      "regularPrice": 16.5,
      "active": true,
      "order": 89
    }
  ]
};
