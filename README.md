# Ruleta navideña ACAVEN DE R.L.

Aplicación web estática portable para abrirse directamente desde una memoria USB, sin Node.js, servidor web ni conexión a internet. La estética sigue la referencia entregada: azul noche profundo, dorado metálico, iluminación azul eléctrica, pedestal luminoso y ambiente festivo invernal.

## Uso

1. Copia la carpeta completa `acaven-ruleta` a la USB.
2. Abre `index.html` con doble clic en un navegador moderno.
3. Pulsa **GIRAR** o la tecla **Espacio**.
4. Para administración, abre `index.html#mantenimiento` o pulsa el enlace **Mantenimiento** al pie de la pantalla pública.

## Configuración y persistencia

- Todos los textos, rutas, colores de acento, títulos, stock, sonidos y parámetros principales están en `config.js`.
- Después de cada giro, el estado se guarda en `localStorage` del navegador.
- Todos los premios disponibles tienen la misma probabilidad; el stock únicamente determina si siguen participando.
- Cada giro dura 10 segundos, con desaceleración y tensión visual al acercarse al resultado.
- El ganador se muestra con su imagen mientras cae confeti.
- El stock que llega a cero deja de participar automáticamente.
- Cambiar `version` en `config.js` fuerza a iniciar un nuevo estado base.
- El panel de mantenimiento permite modificar existencias, títulos e imágenes, agregar o eliminar premios, copiar la configuración o descargar un `config.js` actualizado.
- Para ver cambios realizados físicamente en `config.js`, usa una versión nueva o borra el almacenamiento del sitio desde el navegador.

## Estructura

```text
acaven-ruleta/
├── index.html
├── config.js
├── styles.css
├── app.js
├── README.md
├── lib/
│   └── jquery-3.7.1.min.js
└── img/
    └── (coloca aquí logo.png y las imágenes de tus premios)
```

Coloca tus imágenes PNG, JPG o WEBP dentro de `img/` y escribe sus rutas relativas en `config.js` o desde mantenimiento, por ejemplo `img/cafetera.png`. El encabezado usa exclusivamente `img/logo.png`. No se incluyen archivos SVG.
