# RutaBici

Proyecto ISW-521 con HTML, CSS y JavaScript, sin frameworks ni claves de API.

## Cómo abrirlo
En VS Code, abre `index.html` con Live Server, o publica el proyecto en GitHub
Pages. Los datos se leen con `fetch`; utiliza un servidor local en lugar de abrir
el HTML con doble clic.

## Planificar ruta
1. Escribe el lugar y su cantón, pulsa Enter, termina de editar o selecciona
   **Actualizar rutas**. Confirma la ubicación cuando haya varias coincidencias.
   También puedes escribir `latitud,longitud` o pulsar **Usar mi ubicación actual**.
   La ubicación del dispositivo requiere permiso del navegador y HTTPS o localhost.
2. Elige un destino. Las recomendaciones del catálogo se ordenan por distancia
   desde la partida confirmada, entre 2 y 80 km en línea recta.
3. Elige **Todos**, **Cafetería** o **Restaurante**. Se consultan únicamente locales
   dentro de un radio de **2 km del centro del destino** y se ordenan por cercanía
   a ese centro. Por ejemplo, al elegir Grecia se buscan locales cerca de Grecia,
   no cerca de la casa ni a lo largo de todo el trayecto.
4. Agrega hasta dos locales. El recorrido se abre en Google Maps con este orden:
   **salida → destino → locales elegidos → regreso a la salida**. El límite de dos
   locales conserva los tres puntos intermedios también en Google Maps móvil.
5. Google Maps abre el circuito en modo auto con preferencia para evitar autopistas
   y peajes. No hay un botón para abrir en modo bicicleta. Revisa acceso y condiciones.

Las distancias de cercanía son en línea recta; el acceso por carretera puede ser
más largo. Google Maps calcula el circuito completo al abrirlo. Si se dispone del
trayecto de BRouter, se muestra además la distancia de ida en bicicleta sin desvíos.
Un fallo de BRouter no impide mostrar los restaurantes y cafeterías del destino.

Cambiar la partida o el destino descarta las selecciones anteriores. Las paradas
antiguas se limpian al migrar esta actualización, conservando la partida y el
historial de salidas. Las respuestas atrasadas no restauran locales de otra ruta.
Se eliminaron talleres y agua del selector, de las consultas y de los ejemplos de
Inicio. Inicio conserva únicamente ejemplos de cafeterías y restaurantes.

## Servicios y límites
- Nominatim ubica las direcciones de partida en Costa Rica. Se consulta al confirmar
  la edición, no por cada tecla, y se reutilizan búsquedas durante la sesión.
- Overpass obtiene cafeterías y restaurantes de OpenStreetMap usando el destino y
  el radio de 2 km. Se comprueba también la distancia de las coordenadas devueltas.
- BRouter calcula opcionalmente la distancia del trayecto de ida.
- Los endpoints están en `SERVICIOS`, y el radio en `RADIO_DESTINO`, al principio de
  `js/planificar.js`. Los destinos del catálogo se cargan con `fetch` desde `data/rutas.json`.
- Requiere internet. Las direcciones se envían a Nominatim; las coordenadas se envían
  a los servicios de rutas y locales al usar estas funciones.
- Los servicios públicos pueden fallar o tener datos incompletos. Si no se puede
  cargar la búsqueda se ofrece reintentar; no se presenta como cero resultados.
  Los horarios publicados no garantizan que un local esté abierto.
- Si no se permite obtener la ubicación, no está disponible o se agota el tiempo,
  se explica el problema y se permite introducir la partida manualmente.

## Estructura y datos guardados
- `index.html`, `planificar.html`, `salidas.html`
- `css/styles.css`
- `js/utils.js`, `js/index.js`, `js/planificar.js`, `js/salidas.js`
- `data/locales.json`: 12 ejemplos para Inicio (datos demostrativos, no locales verificados)
- `data/rutas.json`: catálogo de 26 destinos cargado y procesado en Planificar ruta
- `img/logo.svg`

En localStorage se guardan `rutabici_paradas` (configuración y paradas) y
`rutabici_salidas` (historial de salidas).

## Validación de esta actualización
Se verificó la sintaxis y se probaron con respuestas controladas: búsqueda centrada
en Grecia y Alajuela, exclusión de locales lejanos y categorías retiradas, orden
por cercanía, filtros por tipo, circuito completo, cambio de destino, respuestas
atrasadas, ubicación del dispositivo y recuperación ante errores. Los servicios
públicos de locales han presentado errores en esta sesión; estas pruebas no
constituyen una verificación de disponibilidad en vivo.

## Locales y destinos
Los locales cercanos al destino se pueden filtrar por tipo: Todos, Cafetería o Restaurante.

`rutas.json` participa en la solución interactiva: sus destinos se ordenan por distancia desde el punto de partida y generan las opciones del selector. Los locales reales siguen consultándose en OpenStreetMap. Los ejemplos de `locales.json` se muestran únicamente en Inicio.
