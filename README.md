Ashes Audio Studio
Plataforma de dirección y producción de audio para Ashes of the Reborn.
Permite que un Director de Sonido organice, grabe, documente y exporte todo
el audio del juego (voces, música, ambientes, efectos, cinemáticas) sin
depender del programador. Es una PWA 100% en navegador: sin backend, sin
compilación, sin dependencias de pago.
Subir el proyecto a GitHub (desde el móvil)
En tu repo (puede ser uno nuevo, ej. ashes-audio-studio, o una carpeta
dentro de un repo existente), usa Add file → Upload files en la web
de GitHub.
Sube los archivos manteniendo esta estructura de carpetas exacta:
Código
Truco en el navegador del móvil: cuando subas los archivos de js/ o
icons/, escribe la ruta completa (ej. js/app.js) en el nombre si
GitHub no crea la carpeta automáticamente al arrastrar el archivo.
Activa GitHub Pages: Settings → Pages → Branch: main → carpeta
/ (root) → Save.
Tu app quedará en algo como
https://luismartinezprog.github.io/ashes-audio-studio/.
Ábrela en Chrome Android y usa Instalar app (o "Añadir a pantalla
de inicio") para que funcione como una app nativa, con ícono propio.
Qué incluye
Dashboard — total de assets, grabados/aprobados/pendientes/faltantes,
y medidores de progreso (estilo VU/LED) por categoría, por personaje y
por capítulo/misión.
Biblioteca — todos los assets de audio organizados por la jerarquía
fija del proyecto (Personajes → NPCs/Enemigos/Jefes, Habilidades, Armas,
Ambientes, Música, Cinemáticas, Interfaz, Eventos especiales), con
búsqueda y filtros avanzados (estado, emoción, personaje, capítulo,
etiqueta, duración).
Editor de asset — metadatos completos: ID, descripción, etiquetas,
prioridad, volumen sugerido, loop, dirección de actuación de voz
(personaje, emoción, intensidad 1–10, contexto, situación de uso),
ubicación narrativa (capítulo/misión/escena/evento), datos de música,
tipo de ambiente y tipo de efecto de sonido.
Grabador — grabación desde el micrófono del dispositivo, con
visualizador de forma de onda en vivo, escucha antes de guardar,
historial de tomas múltiples por asset, responsable y observaciones por
toma, y posibilidad de marcar cualquier toma anterior como la activa.
Mezclador de ambientes — reproduce varias capas de ambiente a la vez
(ej. bosque + tormenta + noche) con volumen independiente, para
previsualizar la atmósfera de una escena.
Exportar — selecciona los assets que quieras y genera un .zip con
audio/<categoría>/<id>.<ext> + metadata.json listo para integrar en
el juego.
Dónde vive la información
Todo (metadatos y audios grabados) se guarda en IndexedDB, en el
almacenamiento local del navegador del dispositivo donde se use la app.
Esto significa:
No necesita conexión a internet para funcionar día a día (es instalable
y offline gracias al service worker).
Los datos no se sincronizan automáticamente entre dispositivos. Si
varias personas van a grabar audio, cada una trabaja en su propio
dispositivo y luego exporta su .zip para enviarlo a quien integre todo
en el repo de Ashes.
Si se borra el caché del navegador o se desinstala la app, se pierde lo
grabado localmente — exporta seguido como respaldo.
Para integrar el audio exportado en Ashes
Cada .zip exportado trae:
Código
metadata.json es un array con un objeto por asset, incluyendo
referencias de archivo, volumen sugerido, loop, dirección de actuación,
datos narrativos/musicales/de ambiente, y los datos de la toma activa.
Puedes leer ese JSON desde el código de Ashes para precargar rutas y
configuración de audio automáticamente.
Si sale error "Error iniciando la base de datos local"
La app tiene un fallback automático: si IndexedDB no está disponible
(navegador muy viejo, modo incógnito, permisos restringidos, etc), pasa a
modo de emergencia que guarda todo en memoria mientras la app esté abierta,
pero se pierde si cierras el navegador o recergas la página.
Si ves un aviso "⚠️ Modo emergencia" en la pantalla:
Sigue grabando y organizando assets normalmente.
Exporta tu trabajo frecuentemente (botón EXPORTAR .ZIP en la última pestaña).
El .zip descargado tiene todo lo que necesitas.
Por qué pasa esto
Modo incógnito de Chrome: IndexedDB está deshabilitado por privacidad.
Navegador muy viejo: sin soporte para IndexedDB (necesitas Chrome 24+).
Almacenamiento del navegador lleno: el dispositivo no tiene espacio libre.
App abierta desde file://: IndexedDB no funciona en local sin servidor.
Solución: modo normal en vez de incógnito, navegador actualizado, o libera
espacio en el móvil.
Notas técnicas
Sin frameworks ni paso de compilación: HTML + CSS + JS puro, compatible
con GitHub Pages, Chrome Android/Desktop y PWABuilder (por si luego
quieres generar un .apk, igual que hiciste con Música).
La única dependencia externa es JSZip (vía CDN, solo se usa al
exportar). Todo lo demás funciona sin internet una vez instalada.
Pensado para cientos de assets sin problema; con varios miles, la lista
de la Biblioteca puede empezar a sentirse algo más lenta al escribir en
el buscador (no hay virtualización de lista), pero el resto de la app no
se ve afectado.
