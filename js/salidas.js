// Mis salidas: formulario validado e historial (localStorage)

const CLAVE = "rutabici_salidas";
let salidas = leer(CLAVE, []);
let foto = "";

const CAMPOS = ["fecha", "ruta", "duracion", "distancia", "velMax", "desnivel", "altitud"];
// Límites de los campos numéricos
const LIMITES = {
  duracion: { min: 1, max: 1440 },
  distancia: { min: 0.1, max: 500 },
  velMax: { min: 1, max: 120 },
  desnivel: { min: 0, max: 10000 },
  altitud: { min: 0, max: 5000 }
};

function velocidadMedia() {
  const km = Number($("distancia").value);
  const min = Number($("duracion").value);
  return km > 0 && min > 0 ? km / (min / 60) : 0;
}

function actualizarMedia() {
  const media = velocidadMedia();
  $("vel-media").textContent = media > 0 ? media.toFixed(1) + " km/h" : "-";
}

// Valida un campo y muestra su mensaje de error. Devuelve true si es válido.
function validar(id) {
  const campo = $(id);
  const valor = campo.value.trim();
  let error = "";

  if (valor === "") {
    error = "Completa este campo.";
  } else if (id === "fecha" && valor > hoy()) {
    error = "La fecha no puede ser futura.";
  } else if (id === "ruta" && valor.length < 3) {
    error = "Escribe al menos 3 letras.";
  } else if (LIMITES[id]) {
    const numero = Number(valor);
    if (isNaN(numero) || numero < LIMITES[id].min || numero > LIMITES[id].max) {
      error = "Debe ser un número entre " + LIMITES[id].min + " y " + LIMITES[id].max + ".";
    }
  }
  if (error === "" && id === "velMax" && Number(valor) < velocidadMedia()) {
    error = "No puede ser menor que la velocidad media (" + velocidadMedia().toFixed(1) + " km/h).";
  }

  $("error-" + id).textContent = error;
  campo.classList.toggle("invalido", error !== "");
  campo.setAttribute("aria-invalid", error !== "");
  return error === "";
}

// Reduce la foto para que quepa en localStorage
function elegirFoto() {
  const archivo = $("foto").files[0];
  foto = "";
  $("vista-foto").hidden = true;
  $("error-foto").textContent = "";
  if (!archivo) return;
  if (!archivo.type.startsWith("image/")) {
    $("error-foto").textContent = "El archivo debe ser una imagen.";
    $("foto").value = "";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(1, 400 / imagen.width);
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.width * escala);
      lienzo.height = Math.round(imagen.height * escala);
      lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      foto = lienzo.toDataURL("image/jpeg", 0.7);
      $("vista-foto").src = foto;
      $("vista-foto").hidden = false;
    };
    imagen.src = lector.result;
  };
  lector.readAsDataURL(archivo);
}

function guardarSalida(evento) {
  evento.preventDefault();
  let todoValido = true;
  CAMPOS.forEach((id) => {
    if (!validar(id)) todoValido = false;
  });
  if (!todoValido) {
    mensaje("Revisa los campos marcados en rojo antes de guardar.", "error");
    return;
  }

  salidas.push({
    id: Date.now(),
    fecha: $("fecha").value,
    ruta: $("ruta").value.trim(),
    duracion: Number($("duracion").value),
    distancia: Number($("distancia").value),
    velMedia: Number(velocidadMedia().toFixed(1)),
    velMax: Number($("velMax").value),
    desnivel: Number($("desnivel").value),
    altitud: Number($("altitud").value),
    foto: foto
  });

  if (!guardar(CLAVE, salidas)) {
    salidas.pop();
    mensaje("No se pudo guardar: el almacenamiento está lleno. Prueba sin foto.", "error");
    return;
  }
  limpiarFormulario();
  mostrarTodo();
  mensaje("¡Salida guardada! Tu racha es de " + textoDias(calcularRacha(salidas)) + ".", "exito");
}

function limpiarFormulario() {
  $("form-salida").reset();
  $("fecha").value = hoy();
  foto = "";
  $("vista-foto").hidden = true;
  CAMPOS.forEach((id) => {
    $("error-" + id).textContent = "";
    $(id).classList.remove("invalido");
    $(id).removeAttribute("aria-invalid");
  });
  actualizarMedia();
}

function mostrarTodo() {
  // Resumen
  const km = salidas.reduce((suma, s) => suma + s.distancia, 0);
  $("res-racha").textContent = textoDias(calcularRacha(salidas));
  $("res-total").textContent = salidas.length;
  $("res-km").textContent = km.toFixed(1) + " km";

  // Historial
  const historial = $("historial");
  historial.innerHTML = "";
  if (salidas.length === 0) {
    historial.appendChild(crear("p", "vacio", "Todavía no has registrado salidas."));
    return;
  }
  const ordenadas = salidas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  ordenadas.forEach((s) => {
    const tarjeta = crear("article", "tarjeta");
    if (s.foto) {
      const imagen = crear("img", "foto");
      imagen.src = s.foto;
      imagen.alt = "Foto de la salida del " + formatearFecha(s.fecha);
      tarjeta.appendChild(imagen);
    }
    tarjeta.appendChild(crear("h3", "", s.ruta));
    tarjeta.appendChild(crear("p", "dato", formatearFecha(s.fecha) + " · " + s.distancia + " km · " + s.duracion + " min"));
    tarjeta.appendChild(crear("p", "dato", "Media " + s.velMedia + " km/h · Máx. " + s.velMax + " km/h · Desnivel " + s.desnivel + " m · Altitud " + s.altitud + " m"));
    const boton = crear("button", "boton peligro", "Eliminar");
    boton.addEventListener("click", () => eliminarSalida(s.id));
    tarjeta.appendChild(boton);
    historial.appendChild(tarjeta);
  });
}

function eliminarSalida(id) {
  salidas = salidas.filter((s) => s.id !== id);
  guardar(CLAVE, salidas);
  mostrarTodo();
  mensaje("La salida se eliminó del historial.", "exito");
}

function limpiarHistorial() {
  if (salidas.length === 0) {
    mensaje("No hay salidas para limpiar.", "info");
  } else if (confirm("¿Borrar todo el historial? Esta acción no se puede deshacer.")) {
    salidas = [];
    guardar(CLAVE, salidas);
    mostrarTodo();
    mensaje("Se borró todo el historial.", "exito");
  }
}

activarMenu();
$("fecha").max = hoy();
$("fecha").value = hoy();
CAMPOS.forEach((id) => {
  $(id).addEventListener("input", () => {
    validar(id);
    if (id === "distancia" || id === "duracion") {
      actualizarMedia();
      if ($("velMax").value !== "") validar("velMax");
    }
  });
});
$("foto").addEventListener("change", elegirFoto);
$("form-salida").addEventListener("submit", guardarSalida);
$("btn-limpiar-form").addEventListener("click", () => {
  limpiarFormulario();
  mensaje("Formulario limpio.", "info");
});
$("btn-limpiar-historial").addEventListener("click", limpiarHistorial);
actualizarMedia();
mostrarTodo();
