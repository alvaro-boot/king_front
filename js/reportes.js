let ventasCompletas = [];
let clientesData = [];
let productosData = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("user-name").textContent =
    user.nombreCompleto || user.usuario;
  document.getElementById("btn-logout").addEventListener("click", logout);

  document
    .getElementById("btn-aplicar-filtros")
    .addEventListener("click", () => {
      aplicarFiltros();
    });
  document
    .getElementById("btn-limpiar-filtros")
    .addEventListener("click", () => {
      document.getElementById("filtro-fecha-desde").value = "";
      document.getElementById("filtro-fecha-hasta").value = "";
      document.getElementById("filtro-cliente").value = "";
      document.getElementById("filtro-producto").value = "";
      loadReportes();
    });

  loadReportes();
});

function aplicarFiltros() {
  renderReportes(getVentasFiltradas());
}

function getVentasFiltradas() {
  let ventas = [...(ventasCompletas || [])];
  const fechaDesde = document.getElementById("filtro-fecha-desde").value;
  const fechaHasta = document.getElementById("filtro-fecha-hasta").value;
  const clienteId = document.getElementById("filtro-cliente").value;
  const productoId = document.getElementById("filtro-producto").value;

  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    ventas = ventas.filter((v) => {
      const f = v.fecha ? new Date(v.fecha) : null;
      return f && f >= desde;
    });
  }
  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    ventas = ventas.filter((v) => {
      const f = v.fecha ? new Date(v.fecha) : null;
      return f && f <= hasta;
    });
  }
  if (clienteId) {
    const cid = parseInt(clienteId, 10);
    ventas = ventas.filter((v) => (v.clienteId ?? v.cliente?.id) === cid);
  }
  if (productoId) {
    const pid = parseInt(productoId, 10);
    ventas = ventas.filter((v) =>
      (v.productosDeLaVenta || []).some(
        (pv) => (pv.productoId ?? pv.producto?.id) === pid,
      ),
    );
  }
  return ventas;
}

function calcularGanancia(ventas) {
  let ganancia = 0;
  (ventas || []).forEach((v) => {
    (v.productosDeLaVenta || []).forEach((pv) => {
      const prod = pv.producto;
      if (prod) {
        const precioVenta = getNum(prod, "precio_de_venta");
        const precioCompra = getNum(prod, "precio_compra");
        ganancia += precioVenta - precioCompra;
      }
    });
  });
  return ganancia;
}

function renderReportes(ventas) {
  const totalVentas = Array.isArray(ventas) ? ventas.length : 0;
  const valorTotal = (ventas || []).reduce(
    (sum, v) => sum + getNum(v, "valor_total"),
    0,
  );
  const ganancia = calcularGanancia(ventas);

  document.getElementById("stat-total-ventas").textContent = totalVentas;
  document.getElementById("stat-valor-total").textContent =
    "$" + valorTotal.toLocaleString();
  document.getElementById("stat-ganancia").textContent =
    "$" + ganancia.toLocaleString();

  const porTipo = {};
  (ventas || []).forEach((v) => {
    const tipo = getStr(v.tipoDeVenta, "descripcion") || "Sin tipo";
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });

  document.getElementById("ventas-por-tipo").innerHTML =
    Object.entries(porTipo)
      .map(
        ([tipo, count]) =>
          `<div class="reporte-item"><span>${tipo}</span><span>${count} venta(s)</span></div>`,
      )
      .join("") || '<div class="empty-state">Sin datos</div>';

  const reportesLista = document.getElementById("reportes-ventas-lista");
  reportesLista.innerHTML =
    !ventas || ventas.length === 0
      ? '<div class="empty-state">No hay ventas con los filtros aplicados</div>'
      : ventas
          .slice(0, 50)
          .map((v) => {
            const prods = (v.productosDeLaVenta || [])
              .map((pv) => getStr(pv.producto, "nombre") || "Producto")
              .join(", ");
            const fecha = v.fecha
              ? new Date(v.fecha).toLocaleDateString("es-CO")
              : "-";
            return `
        <div class="venta-item">
          <strong>#${v.id}</strong> - ${
              getStr(v.cliente, "nombre_completo") || "N/A"
            } - $${getNum(v, "valor_total").toLocaleString()}
          <br><small>${fecha} | Productos: ${prods || "-"}</small>
        </div>
      `;
          })
          .join("");
}

async function loadReportes() {
  try {
    const [ventas, clientes, productos] = await Promise.all([
      api.getVentas(),
      api.getClientes(),
      api.getProductos(),
    ]);

    ventasCompletas = ventas || [];
    clientesData = clientes || [];
    productosData = productos || [];

    const selectCliente = document.getElementById("filtro-cliente");
    const selectProducto = document.getElementById("filtro-producto");
    selectCliente.innerHTML =
      '<option value="">Todos</option>' +
      clientesData
        .map(
          (c) =>
            `<option value="${c.id}">${getStr(c, "nombre_completo")}</option>`,
        )
        .join("");
    selectProducto.innerHTML =
      '<option value="">Todos</option>' +
      productosData
        .map((p) => `<option value="${p.id}">${getStr(p, "nombre")}</option>`)
        .join("");

    renderReportes(ventasCompletas);
  } catch (err) {
    console.error("Error cargando reportes:", err);
    document.getElementById("stat-total-ventas").textContent = "0";
    document.getElementById("stat-valor-total").textContent = "$0";
    document.getElementById("stat-ganancia").textContent = "$0";
    document.getElementById("ventas-por-tipo").innerHTML =
      '<div class="empty-state">Error: ' +
      (err.message || "Ver consola") +
      "</div>";
    document.getElementById("reportes-ventas-lista").innerHTML =
      '<div class="empty-state">Error al cargar ventas</div>';
  }
}
