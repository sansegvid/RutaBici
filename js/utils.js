// Funciones compartidas por las tres páginas

const $ = (id) => document.getElementById(id);

function leer(clave, valorPorDefecto) {
  try {
    const texto = localStorage.getItem(clave);
    return texto === null ? valorPorDefecto : JSON.parse(texto);
  } catch (error) {
    return valorPorDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    return false;
  }
}

async function cargarLocales() {
  const respuesta = await fetch("data/locales.json");
  return await respuesta.json();
}

// Crea un elemento HTML con clase y texto
function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

// Muestra un mensaje de éxito, error, advertencia o info en el div #mensaje
function mensaje(texto, tipo) {
  const caja = $("mensaje");
  caja.textContent = texto;
  caja.className = "mensaje " + tipo;
  caja.hidden = false;
}

function activarMenu() {
  const boton = $("btn-menu");
  boton.addEventListener("click", () => {
    const abierto = $("menu").classList.toggle("abierto");
    boton.setAttribute("aria-expanded", abierto);
  });
}

// "1 día", "2 días"
function textoDias(n) {
  return n + (n === 1 ? " día" : " días");
}

// Minúsculas y sin tildes, para que "cafe" encuentre "Café"
function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------- Fechas y racha ----------
function hoy() {
  return new Date().toLocaleDateString("en-CA"); // formato AAAA-MM-DD
}

function diasEntre(fechaA, fechaB) {
  return Math.round((new Date(fechaA) - new Date(fechaB)) / 86400000);
}

function formatearFecha(texto) {
  const p = texto.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

// Días consecutivos con salidas, contando desde hoy o ayer
function calcularRacha(salidas) {
  const fechas = [...new Set(salidas.map((s) => s.fecha))].sort().reverse();
  if (fechas.length === 0 || diasEntre(hoy(), fechas[0]) > 1) return 0;
  let racha = 1;
  while (racha < fechas.length && diasEntre(fechas[racha - 1], fechas[racha]) === 1) {
    racha++;
  }
  return racha;
}
