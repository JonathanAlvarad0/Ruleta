/* ACAVEN DE R.L. — Configuración editable de la ruleta
 * Toda la personalización de la experiencia vive en este objeto.
 * Para restaurar los valores originales, cambia la versión o usa Reiniciar en mantenimiento.
 */
window.ACAVEN_CONFIG = {
  version: "1.0.0",
  storageKey: "acaven_ruleta_estado",
  brand: {
    name: "ACAVEN DE R.L.",
    logo: "img/logo.png",
    eyebrow: "Incrementa · Gira y gana",
    title: "GIRA Y GANA",
    subtitle: "Incrementa tus aportaciones desde $500 · Descubre tu premio navideño",
    footer: "Una experiencia especial para nuestra gran familia ACAVEN"
  },
  labels: {
    spin: "GIRAR",
    spinning: "GIRAR",
    remaining: "premios disponibles",
    remainingOne: "premio disponible",
    noStock: "La magia volverá pronto",
    noStockDetail: "No quedan premios disponibles en esta jornada.",
    winnerTitle: "¡Felicidades!",
    winnerLead: "Tu premio navideño es",
    close: "Continuar",
    maintenance: "Mantenimiento",
    backToDraw: "Volver al sorteo",
    reset: "Restaurar valores base",
    download: "Descargar config.js",
    copy: "Copiar configuración",
    copied: "Configuración copiada",
    addPrize: "Agregar premio",
    save: "Guardar cambios",
    delete: "Eliminar",
    stock: "Stock",
    image: "Ruta de imagen",
    title: "Título del premio"
  },
  celebration: {
    confettiPieces: 280,
    spinDurationMs: 10000,
    soundEnabled: true
  },
  prizes: [
    { id: "cafetera", title: "Cafetera navideña", image: "img/premio-3.png", stock: 3, accent: "#36c7ff" },
    { id: "horno", title: "Horno", image: "img/premio-4.png", stock: 4, accent: "#ffd86b" },
    { id: "licuadora", title: "Licuadora de cocina", image: "img/premio-1.png", stock: 2, accent: "#73e5ff" },
    { id: "tostador", title: "Tostador", image: "img/premio-2.png", stock: 3, accent: "#ff9fcb" }
  ]
};