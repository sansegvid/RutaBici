// Inicio: estadísticas (localStorage) y locales destacados (JSON)

let locales = [];

function mostrarEstadisticas() {
  const salidas = leer("rutabici_salidas", []);
  $("est-racha").textContent = textoDias(calcularRacha(salidas));
  $("est-total").textContent = salidas.length;
}

function mostrarLocales(categoria) {
  const lista = $("lista");
  lista.innerHTML = "";
  const filtrados = locales.filter((l) => categoria === "Todos" || l.categoria === categoria);

  if (filtrados.length === 0) {
    lista.appendChild(crear("p", "vacio", "No hay locales de este tipo."));
    return;
  }
  filtrados.forEach((l) => {
    const tarjeta = crear("article", "tarjeta");
    tarjeta.appendChild(crear("h3", "", l.nombre));
    tarjeta.appendChild(crear("p", "dato", l.categoria + " · " + l.ruta + " · km " + l.km));
    tarjeta.appendChild(crear("p", "", l.descripcion));
    lista.appendChild(tarjeta);
  });
}

async function iniciar() {
  activarMenu();
  mostrarEstadisticas();

  document.querySelectorAll(".chip").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((b) => {
        b.classList.remove("activo");
        b.setAttribute("aria-pressed", "false");
      });
      boton.classList.add("activo");
      boton.setAttribute("aria-pressed", "true");
      mostrarLocales(boton.dataset.categoria);
    });
  });

  try {
    locales = await cargarLocales();
    mostrarLocales("Todos");
  } catch (error) {
    $("lista").appendChild(crear("p", "vacio", "No se pudieron cargar los datos. Abre el sitio con Live Server o GitHub Pages."));
  }
}

iniciar();
