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
    subtitle: "INCREMENTA TUS APORTACIONES DESDE $500 - DESCUBRE TU PREMIO NAVIDEÑO",
    footer: "UNA EXPERIENCIA ESPECIAL DE NUESTRA GRAN FAMILIA ACAVEN DE R.L"
  },
  labels: {
    spin: "GIRAR",
    spinning: "GIRAR",
    remaining: "premios disponibles",
    remainingOne: "premio disponible",
    noStock: "La magia volverá pronto",
    noStockDetail: "No quedan premios disponibles en esta jornada.",
    winnerTitle: "¡Felicidades! Estimado asociado",
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
    { id: "canasta", title: "Canasta Gourmet", image: "img/premio-1.png", stock: 7, accent: "#36c7ff" },
    { id: "freidoras", title: "Freidora de aire", image: "img/premio-2.png", stock: 2, accent: "#ffd86b" },
    { id: "cafetera", title: "Cafetera Black+Decker", image: "img/premio-3.png", stock: 2, accent: "#73e5ff" },
    { id: "personalblender", title: "Personal Blender", image: "img/premio-4.png", stock: 3, accent: "#ff9fcb" },
    { id: "sandiwchera", title: "Sandiwchera Black+Decker", image: "img/premio-5.png", stock: 1, accent: "#ff9fcb" }
    ,{ id: "tarjeta", title: "Tarjeta de Super", image: "img/premio-6.png", stock: 4, accent: "#ff9fcb" }
    ,{ id: "tarjetasiman", title: "Tarjeta de Siman", image: "img/premio-7.png", stock: 4, accent: "#ff9fcb" }
  ]
};