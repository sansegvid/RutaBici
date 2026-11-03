// Sin claves ni frameworks: Nominatim (partida), BRouter (bici), Overpass (locales).
const CLAVE = "rutabici_paradas";
const RADIO_DESTINO = 2; // Kilómetros en línea recta desde el centro del destino.
const SERVICIOS = {
  geocodificar: "https://nominatim.openstreetmap.org/search",
  bicicleta: "https://brouter.de/brouter",
  locales: "https://overpass-api.de/api/interpreter"
};
// Catálogo de destinos, no rutas fijas. Se ordena desde la partida confirmada.
let DESTINOS = [];
let datos = leer(CLAVE, {});
// Migrar los IDs del JSON de ejemplo: no son locales consultados en el mapa.
if (datos.version === 2) datos = { ...datos, version: 3, paradas: [] };
else if (datos.version !== 3) datos = { version: 3, partida: datos.partida || "", ruta: "", paradas: [], origen: null };
let locales = [];
let localesCargados = false;
let longitudIda = 0;
let estadoLocales = "Elige una ruta para ver los locales cercanos.";
let revision = 0;
let peticion = null;
let consultaActiva = null;
let ultimaConsulta = 0;
const cacheUbicaciones = new Map();

function guardarDatos() { guardar(CLAVE, datos); }
function destinoElegido() { return DESTINOS.find(d => d.id === datos.ruta); }
function paradasElegidas() {
  const destino = destinoElegido();
  return datos.paradas.filter(p => destino && p && ["Cafetería", "Restaurante"].includes(p.categoria)
    && Number.isFinite(p.lat) && Number.isFinite(p.lng) && distancia(p, destino) <= RADIO_DESTINO)
    .sort((a, b) => distancia(a, destino) - distancia(b, destino));
}
function coordenadas(p) { return p.lat + "," + p.lng; }
function distancia(a, b) {
  const rad = Math.PI / 180;
  const v = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, v)));
}
function recomendar(origen) {
  return DESTINOS.map(d => ({ ...d, distancia: distancia(origen, d) }))
    .filter(d => d.distancia > 2 && d.distancia <= 80).sort((a, b) => a.distancia - b.distancia);
}
function cancelar() {
  revision++;
  if (peticion) peticion.abort();
  peticion = new AbortController();
}
async function consultar(url, opciones = {}) {
  const respuesta = await fetch(url, { ...opciones, signal: AbortSignal.any([peticion.signal, AbortSignal.timeout(45000)]) });
  if (!respuesta.ok) throw new Error("Servicio no disponible (" + respuesta.status + ").");
  return respuesta.json();
}
function opcionesRuta() {
  const selector = $("ruta");
  selector.replaceChildren(crear("option", "", datos.origen ? "Selecciona una ruta" : "Primero confirma el punto de partida"));
  selector.firstChild.value = "";
  if (datos.origen) recomendar(datos.origen).forEach(d => {
    const opcion = crear("option", "", datos.partida.trim() + " → " + d.nombre + " → regreso (" + Math.round(d.distancia) + " km en línea recta hasta el destino)");
    opcion.value = d.id;
    selector.appendChild(opcion);
  });
  selector.disabled = !datos.origen;
  selector.value = datos.ruta;
}
function mostrarLocales() {
  const lista = $("lista");
  lista.replaceChildren();
  const tipo = $("tipo").value;
  const visibles = locales.filter(l => tipo === "Todos" || l.categoria === tipo);
  $("contador").textContent = localesCargados && !estadoLocales ? "Locales encontrados: " + visibles.length + " · a menos de " + RADIO_DESTINO + " km de " + destinoElegido().nombre : "";
  if (!visibles.length) {
    lista.appendChild(crear("p", "vacio", estadoLocales || "No hay locales registrados de este tipo cerca del destino. Prueba otro tipo de local."));
    return;
  }
  visibles.forEach(l => {
    const agregada = datos.paradas.some(p => p.id === l.id);
    const tarjeta = crear("article", agregada ? "tarjeta elegida" : "tarjeta");
    tarjeta.appendChild(crear("h3", "", l.nombre));
    tarjeta.appendChild(crear("p", "dato", l.categoria + " · a " + l.distanciaDestino.toFixed(2) + " km de " + destinoElegido().nombre + " (en línea recta)"));
    tarjeta.appendChild(crear("p", "dato", l.horario ? "Horario publicado: " + l.horario : "Horario sin registrar. Confirma antes de visitar."));
    const boton = crear("button", agregada ? "boton secundario" : "boton", agregada ? "Quitar de mi ruta" : "Agregar a mi ruta");
    boton.type = "button";
    boton.addEventListener("click", () => cambiarParada(l));
    tarjeta.appendChild(boton);
    lista.appendChild(tarjeta);
  });
}
function mostrarResumen() {
  const resumen = $("resumen");
  resumen.replaceChildren();
  const destino = destinoElegido();
  const listo = !!(datos.origen && destino);
  $("btn-mapa").disabled = !listo;
  if (!listo) {
    resumen.appendChild(crear("p", "vacio", "Confirma tu partida y elige una ruta de ida y vuelta."));
    return;
  }
  const pasos = crear("ol");
  [datos.partida + " (salida)", destino.nombre + " (destino)", ...paradasElegidas().map(p => p.nombre), datos.partida + " (regreso)"].forEach(texto => pasos.appendChild(crear("li", "", texto)));
  resumen.appendChild(pasos);
  resumen.appendChild(crear("p", "dato", "Paradas elegidas: " + paradasElegidas().length + "/2. Se visitan cerca del destino, antes de regresar."));
  if (longitudIda) resumen.appendChild(crear("p", "dato", "Ida en bicicleta sin desvíos a locales: " + longitudIda.toFixed(1) + " km. El circuito y los desvíos se recalculan en el planificador al abrirlo."));
}
function cambiarParada(local) {
  if (datos.paradas.some(p => p.id === local.id)) datos.paradas = datos.paradas.filter(p => p.id !== local.id);
  else {
    if (datos.paradas.length >= 2) return mensaje("Puedes agregar 2 locales. Quita uno antes de elegir otro.", "advertencia");
    datos.paradas.push(local);
  }
  guardarDatos();
  mostrarLocales();
  mostrarResumen();
}
function invalidarPartida() {
  cancelar();
  datos.partida = $("partida").value;
  datos.origen = null;
  datos.ruta = "";
  datos.paradas = [];
  locales = []; localesCargados = false; longitudIda = 0;
  estadoLocales = "Confirma el nuevo punto de partida para actualizar las rutas y los locales.";
  $("ubicaciones").hidden = true;
  $("ubicacion-elegida").textContent = "";
  $("error-partida").textContent = "";
  $("mensaje").hidden = true;
  $("btn-reintentar").hidden = true;
  guardarDatos(); opcionesRuta(); mostrarLocales(); mostrarResumen();
}
function confirmarOrigen(origen) {
  cancelar();
  locales = []; localesCargados = false; longitudIda = 0;
  $("btn-reintentar").hidden = true;
  datos.origen = origen;
  datos.ruta = "";
  datos.paradas = [];
  $("ubicacion-elegida").textContent = "Partida confirmada: " + origen.nombre;
  guardarDatos(); opcionesRuta(); mostrarResumen();
  estadoLocales = "Elige una de las rutas recomendadas desde esta partida.";
  mostrarLocales();
  if (!recomendar(origen).length) mensaje("No hay destinos del catálogo a menos de 80 km de esta ubicación.", "advertencia");
}
async function actualizarPartida() {
  const texto = $("partida").value.trim();
  if (datos.origen && texto === datos.partida.trim()) return;
  if (consultaActiva?.texto === texto && consultaActiva.revision === revision) return;
  if (!texto) { $("error-partida").textContent = "Escribe tu punto de partida."; return; }
  cancelar();
  const actual = revision;
  consultaActiva = { texto, revision: actual };
  $("error-partida").textContent = "";
  $("ubicacion-elegida").textContent = "Buscando punto de partida…";
  try {
    const coords = texto.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    let resultados;
    if (coords) {
      const lat = Number(coords[1]), lng = Number(coords[2]);
      if (lat < 8 || lat > 11.3 || lng < -86 || lng > -82.5) throw new Error("Indica una ubicación dentro de Costa Rica.");
      resultados = [{ lat, lng, nombre: texto }];
    } else if (cacheUbicaciones.has(texto)) resultados = cacheUbicaciones.get(texto);
    else {
      // No autocomplete: solo al terminar de editar o pulsar Actualizar.
      const espera = Math.max(0, 1100 - (Date.now() - ultimaConsulta));
      if (espera) await new Promise(r => setTimeout(r, espera));
      if (actual !== revision) return;
      ultimaConsulta = Date.now();
      const parametros = new URLSearchParams({ q: texto, format: "jsonv2", countrycodes: "cr", limit: "5", "accept-language": "es" });
      const respuesta = await consultar(SERVICIOS.geocodificar + "?" + parametros);
      resultados = respuesta.map(p => ({ lat: Number(p.lat), lng: Number(p.lon), nombre: p.display_name }));
      cacheUbicaciones.set(texto, resultados);
    }
    if (actual !== revision) return;
    if (!resultados.length) throw new Error("No se encontró ese lugar. Agrega el cantón/provincia o escribe latitud,longitud.");
    datos.partida = texto;
    if (resultados.length === 1) confirmarOrigen(resultados[0]);
    else {
      const selector = $("ubicaciones");
      selector.replaceChildren(crear("option", "", "Selecciona la ubicación correcta"));
      selector.firstChild.value = "";
      resultados.forEach((p, i) => { const o = crear("option", "", p.nombre); o.value = i; selector.appendChild(o); });
      selector.hidden = false;
      selector.onchange = () => { if (selector.value !== "") confirmarOrigen(resultados[Number(selector.value)]); };
      $("ubicacion-elegida").textContent = "Hay varias coincidencias. Confirma la ubicación correcta.";
    }
  } catch (error) {
    if (actual !== revision) return;
    $("ubicacion-elegida").textContent = "";
    $("error-partida").textContent = error.message + " Puedes volver a intentarlo con Actualizar rutas.";
  } finally { if (consultaActiva?.revision === actual) consultaActiva = null; }
}
function usarUbicacionActual() {
  if (!navigator.geolocation) {
    $("error-partida").textContent = "Tu navegador no permite obtener la ubicación. Escribe el punto de partida.";
    return;
  }
  if (!window.isSecureContext) {
    $("error-partida").textContent = "Para usar tu ubicación, abre el sitio con HTTPS o con Live Server en localhost.";
    return;
  }
  invalidarPartida();
  const actual = revision;
  const boton = $("btn-ubicacion");
  boton.disabled = true;
  boton.textContent = "Obteniendo ubicación…";
  $("ubicacion-elegida").textContent = "Permite el acceso a tu ubicación cuando el navegador lo solicite.";
  function terminar() {
    boton.disabled = false;
    boton.textContent = "Usar mi ubicación actual";
  }
  navigator.geolocation.getCurrentPosition(posicion => {
    terminar();
    // No sobrescribir una partida que se haya editado mientras se esperaba.
    if (actual !== revision) return;
    const { latitude: lat, longitude: lng, accuracy } = posicion.coords;
    if (lat < 8 || lat > 11.3 || lng < -86 || lng > -82.5) {
      $("ubicacion-elegida").textContent = "";
      $("error-partida").textContent = "La ubicación obtenida está fuera de Costa Rica. Escribe un punto de partida en Costa Rica.";
      return;
    }
    $("partida").value = "Mi ubicación actual";
    datos.partida = $("partida").value;
    confirmarOrigen({ lat, lng, nombre: "Mi ubicación actual (" + lat.toFixed(6) + ", " + lng.toFixed(6) + ")" });
    mensaje("Ubicación obtenida. Precisión aproximada: " + Math.round(accuracy) + " m. Elige una ruta desde este punto.", "exito");
  }, error => {
    terminar();
    if (actual !== revision) return;
    $("ubicacion-elegida").textContent = "";
    const errores = {
      1: "No se dio permiso de ubicación. Habilítalo en el navegador o escribe tu punto de partida.",
      2: "No se pudo determinar tu ubicación. Inténtalo de nuevo o escribe tu punto de partida.",
      3: "Se agotó el tiempo para obtener tu ubicación. Inténtalo de nuevo o escribe tu punto de partida."
    };
    $("error-partida").textContent = errores[error.code] || "No se pudo obtener la ubicación. Escribe tu punto de partida.";
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
async function cargarRuta() {
  cancelar();
  const actual = revision;
  locales = []; localesCargados = false; longitudIda = 0;
  $("btn-reintentar").hidden = true;
  mostrarResumen();
  if (!datos.origen || !destinoElegido()) { estadoLocales = "Elige una ruta para ver los locales cercanos."; mostrarLocales(); return; }
  estadoLocales = "Buscando restaurantes y cafeterías cerca de " + destinoElegido().nombre + "…";
  mostrarLocales();
  try {
    const destino = destinoElegido();
    const parametros = new URLSearchParams({ lonlats: [datos.origen, destino].map(p => p.lng + "," + p.lat).join("|"), profile: "trekking", alternativeidx: "0", format: "geojson" });
    const consulta = '[out:json][timeout:25];nwr["amenity"~"^(cafe|restaurant|fast_food)$"](around:'
      + RADIO_DESTINO * 1000 + ',' + destino.lat + ',' + destino.lng + ');out center tags;';
    // Las consultas son independientes: un fallo del cálculo de distancia
    // no impide mostrar restaurantes y cafeterías junto al destino.
    const [trayecto, busqueda] = await Promise.allSettled([
      consultar(SERVICIOS.bicicleta + "?" + parametros),
      consultar(SERVICIOS.locales + "?" + new URLSearchParams({ data: consulta }))
    ]);
    if (actual !== revision) return;
    if (trayecto.status === "fulfilled") {
      const linea = trayecto.value.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(linea) && linea.length >= 2) {
        longitudIda = linea.slice(1).reduce((total, p, i) => total + distancia({ lng: linea[i][0], lat: linea[i][1] }, { lng: p[0], lat: p[1] }), 0);
      }
    }
    if (busqueda.status === "rejected") throw busqueda.reason;
    const resultado = busqueda.value;
    if (resultado.remark) throw new Error("La búsqueda de locales no se completó. Inténtalo de nuevo.");
    const vistos = new Set();
    locales = (resultado.elements || []).filter(p => ["cafe", "restaurant", "fast_food"].includes(p.tags?.amenity)).map(p => {
      const t = p.tags || {}, centro = p.center || p;
      const categoria = t.amenity === "cafe" ? "Cafetería" : "Restaurante";
      const l = { id: p.type + "/" + p.id, nombre: t.name || "Local sin nombre registrado", categoria, lat: centro.lat, lng: centro.lon, horario: t.opening_hours || "" };
      return { ...l, distanciaDestino: distancia(l, destino) };
    }).filter(l => {
      if (!Number.isFinite(l.lat) || !Number.isFinite(l.lng)) return false;
      const clave = l.categoria + l.nombre + l.lat.toFixed(4) + l.lng.toFixed(4);
      if (l.distanciaDestino > RADIO_DESTINO || vistos.has(clave)) return false;
      vistos.add(clave); return true;
    }).sort((a, b) => a.distanciaDestino - b.distanciaDestino);
    // Mantener solo selecciones todavía presentes tras una recarga del servicio.
    datos.paradas = locales.filter(l => datos.paradas.some(p => p.id === l.id));
    localesCargados = true;
    guardarDatos();
    estadoLocales = "";
  } catch (error) {
    if (actual !== revision) return;
    estadoLocales = "No se pudieron cargar los locales: " + error.message + " Puedes abrir el circuito sin paradas o volver a intentarlo.";
    $("btn-reintentar").hidden = false;
  }
  if (actual === revision) { mostrarLocales(); mostrarResumen(); }
}
function puntosCircuito() { return [datos.origen, destinoElegido(), ...paradasElegidas(), datos.origen]; }
function urlGoogle() {
  const puntos = puntosCircuito();
  const parametros = new URLSearchParams({ api: "1", origin: coordenadas(puntos[0]), destination: coordenadas(puntos[puntos.length - 1]), waypoints: puntos.slice(1, -1).map(coordenadas).join("|"), travelmode: "driving", avoid: "highways|tolls" });
  return "https://www.google.com/maps/dir/?" + parametros;
}
function abrirMapa() {
  if (!datos.origen || !destinoElegido()) return mensaje("Confirma tu punto de partida y selecciona una ruta.", "error");
  window.open(urlGoogle(), "_blank", "noopener");
}
async function iniciar() {
  activarMenu();
  try {
    const respuesta = await fetch("data/rutas.json");
    if (!respuesta.ok) throw new Error("No se pudo leer rutas.json.");
    DESTINOS = await respuesta.json();
  } catch (error) {
    mensaje("No se pudieron cargar los destinos. Abre el sitio con Live Server y vuelve a cargar la página.", "error");
    return;
  }
  $("partida").value = datos.partida;
  $("partida").addEventListener("input", invalidarPartida);
  $("partida").addEventListener("change", actualizarPartida);
  $("partida").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); actualizarPartida(); } });
  $("btn-actualizar").addEventListener("click", actualizarPartida);
  $("btn-ubicacion").addEventListener("click", usarUbicacionActual);
  $("ruta").addEventListener("change", () => { datos.ruta = $("ruta").value; datos.paradas = []; guardarDatos(); cargarRuta(); });
  $("tipo").addEventListener("change", mostrarLocales);
  $("btn-reintentar").addEventListener("click", cargarRuta);
  $("btn-limpiar").addEventListener("click", () => { datos.paradas = []; guardarDatos(); mostrarLocales(); mostrarResumen(); });
  $("btn-mapa").addEventListener("click", () => abrirMapa());
  opcionesRuta(); mostrarLocales(); mostrarResumen();
  if (datos.origen) {
    $("ubicacion-elegida").textContent = "Partida confirmada: " + datos.origen.nombre;
    cargarRuta();
  }
}
iniciar();
