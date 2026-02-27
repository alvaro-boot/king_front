let ventaProductos = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("user-name").textContent =
    user.nombreCompleto || user.usuario;
  document.getElementById("btn-logout").addEventListener("click", logout);

  initVentas();
  loadVentas();
  document
    .getElementById("btn-cerrar-venta-detalle")
    ?.addEventListener("click", () => {
      document.getElementById("venta-detalle-modal").style.display = "none";
    });
});

function toggleClienteRequerido() {
  const selectTipo = document.getElementById("venta-tipo");
  const selectCliente = document.getElementById("venta-cliente");
  const hint = document.getElementById("venta-cliente-hint");
  const opt = selectTipo.selectedOptions[0];
  const desc = (opt?.dataset?.descripcion || "").toLowerCase();
  const esContado = desc.includes("contado");
  if (esContado) {
    selectCliente.removeAttribute("required");
    if (hint) hint.textContent = "(opcional en venta de contado)";
  } else {
    selectCliente.setAttribute("required", "required");
    if (hint) hint.textContent = "";
  }
}

function initVentas() {
  const ventaForm = document.getElementById("venta-form");
  const btnAgregarProducto = document.getElementById("btn-agregar-producto");

  btnAgregarProducto.addEventListener("click", () => {
    const select = document.getElementById("producto-agregar");
    const id = parseInt(select.value, 10);
    if (!id) return;
    const producto = Array.from(select.options).find(
      (o) => parseInt(o.value, 10) === id,
    );
    if (!producto) return;
    const precio = parseInt(producto.dataset.precio || "0", 10);
    const existing = ventaProductos.find((p) => p.producto.id === id);
    if (existing) existing.cantidad += 1;
    else
      ventaProductos.push({
        producto: {
          id,
          nombre: producto.textContent.trim(),
          precioDeVenta: precio,
        },
        cantidad: 1,
      });
    renderVentaProductos();
  });

  document
    .getElementById("btn-nuevo-tipo-venta")
    .addEventListener("click", () => {
      document.getElementById("tipo-venta-modal").style.display = "flex";
    });
  document
    .getElementById("btn-cerrar-tipo-venta")
    .addEventListener("click", () => {
      document.getElementById("tipo-venta-modal").style.display = "none";
    });
  document
    .getElementById("tipo-venta-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const desc = document
        .getElementById("tipo-venta-descripcion")
        .value.trim();
      try {
        await api.createTipoVenta({ descripcion: desc || "Sin descripción" });
        document.getElementById("tipo-venta-modal").style.display = "none";
        document.getElementById("tipo-venta-descripcion").value = "";
        loadVentas();
      } catch (err) {
        alert(err.message || "Error al crear tipo de venta");
      }
    });

  document.getElementById("venta-tipo").addEventListener("change", toggleClienteRequerido);

  ventaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectTipo = document.getElementById("venta-tipo");
    const tipoDeVentaId = parseInt(selectTipo.value, 10);
    const tipoDePagoId = parseInt(
      document.getElementById("venta-tipo-pago").value,
      10,
    );
    const descripcionTipo = (selectTipo.selectedOptions[0]?.dataset?.descripcion || "").toLowerCase();
    const esContado = descripcionTipo.includes("contado");
    const clienteIdRaw = document.getElementById("venta-cliente").value;
    const clienteId = clienteIdRaw ? parseInt(clienteIdRaw, 10) : null;

    if (!tipoDeVentaId || !tipoDePagoId) {
      alert("Seleccione tipo de venta y tipo de pago");
      return;
    }
    if (!esContado && !clienteId) {
      alert("Para venta a crédito debe seleccionar un cliente");
      return;
    }
    if (ventaProductos.length === 0) {
      alert("Agregue al menos un producto");
      return;
    }
    const productos = ventaProductos.map((p) => ({
      producto_id: p.producto.id,
      cantidad: p.cantidad,
      precio_unitario: p.producto.precioDeVenta,
    }));
    const valorTotal = ventaProductos.reduce(
      (sum, p) => sum + p.producto.precioDeVenta * p.cantidad,
      0,
    );
    const payload = {
      valor_total: valorTotal,
      tipo_de_venta_id: tipoDeVentaId,
      tipo_de_pago_id: tipoDePagoId,
      productos,
    };
    if (clienteId) payload.cliente_id = clienteId;

    try {
      await api.createVenta(payload);
      ventaProductos = [];
      renderVentaProductos();
      ventaForm.reset();
      loadVentas();
      alert("Venta registrada correctamente");
    } catch (err) {
      alert(err.message || "Error al registrar venta");
    }
  });
}

function renderVentaProductos() {
  const ul = document.getElementById("venta-productos-lista");
  const totalEl = document.getElementById("venta-total-valor");
  const total = ventaProductos.reduce(
    (sum, p) => sum + p.producto.precioDeVenta * p.cantidad,
    0,
  );
  ul.innerHTML = ventaProductos
    .map(
      (p, i) => {
        const subtotal = p.producto.precioDeVenta * p.cantidad;
        return `
    <li class="venta-linea">
      <span class="venta-linea-nombre">${p.producto.nombre} ${
          p.cantidad > 1 ? `x${p.cantidad}` : ""
        }</span>
      <label class="venta-linea-precio">
        Precio: <input type="number" min="0" step="100" value="${p.producto.precioDeVenta}" data-index="${i}" class="input-precio-venta" />
      </label>
      <span class="venta-linea-subtotal">$${subtotal.toLocaleString()}</span>
      <button type="button" class="btn-remove" data-index="${i}">Quitar</button>
    </li>
  `;
      },
    )
    .join("");
  totalEl.textContent = total.toLocaleString();
  ul.querySelectorAll(".input-precio-venta").forEach((input) => {
    input.addEventListener("change", () => {
      const idx = parseInt(input.dataset.index, 10);
      const val = parseInt(input.value, 10);
      if (!Number.isNaN(val) && val >= 0 && ventaProductos[idx]) {
        ventaProductos[idx].producto.precioDeVenta = val;
        renderVentaProductos();
      }
    });
  });
  ul.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      ventaProductos.splice(parseInt(btn.dataset.index, 10), 1);
      renderVentaProductos();
    });
  });
}

async function loadVentas() {
  try {
    const [ventas, clientes, tipos, tiposPago, productos] = await Promise.all([
      api.getVentas(),
      api.getClientes(),
      api.getTiposVenta(),
      api.getTiposPago(),
      api.getProductos(),
    ]);
    const selectCliente = document.getElementById("venta-cliente");
    const selectTipo = document.getElementById("venta-tipo");
    const selectTipoPago = document.getElementById("venta-tipo-pago");
    const selectProducto = document.getElementById("producto-agregar");
    selectCliente.innerHTML =
      '<option value="">Seleccionar cliente...</option>' +
      (clientes || [])
        .map(
          (c) =>
            `<option value="${c.id}">${getStr(c, "nombre_completo")}</option>`,
        )
        .join("");
    selectTipo.innerHTML =
      '<option value="">Seleccionar tipo...</option>' +
      (tipos || [])
        .map(
          (t) => {
            const desc = (getStr(t, "descripcion") || "").toLowerCase();
            return `<option value="${t.id}" data-descripcion="${desc}">${
              getStr(t, "descripcion") || "Tipo " + t.id
            }</option>`;
          },
        )
        .join("");
    toggleClienteRequerido();
    selectTipoPago.innerHTML =
      '<option value="">Seleccionar forma de pago...</option>' +
      (tiposPago || [])
        .map(
          (tp) =>
            `<option value="${tp.id}">${getStr(tp, "nombre") || "Tipo " + tp.id}</option>`,
        )
        .join("");
    selectProducto.innerHTML =
      '<option value="">Seleccionar producto...</option>' +
      (productos || [])
        .map((p) => {
          const precio = getNum(p, "precio_de_venta");
          return `<option value="${p.id}" data-precio="${precio}">${getStr(
            p,
            "nombre",
          )} - $${precio.toLocaleString()}</option>`;
        })
        .join("");
    const lista = document.getElementById("ventas-lista");
    lista.innerHTML =
      !ventas || ventas.length === 0
        ? '<div class="empty-state">No hay ventas registradas</div>'
        : ventas
            .slice(0, 50)
            .map(
              (v) => `
      <div class="venta-item" data-id="${v.id}" title="Clic para ver detalle">
        <strong>#${v.id}</strong> - ${
                getStr(v.cliente, "nombre_completo") || "N/A"
              } - $${getNum(v, "valor_total").toLocaleString()}
        <br><small>${(v.productosDeLaVenta || []).length} producto(s)</small>
      </div>
    `,
            )
            .join("");
    lista.querySelectorAll(".venta-item[data-id]").forEach((el) => {
      el.addEventListener("click", () =>
        showVentaDetalle(parseInt(el.dataset.id, 10)),
      );
    });
  } catch (err) {
    console.error("Error cargando ventas:", err);
    document.getElementById("ventas-lista").innerHTML =
      '<div class="empty-state">Error al cargar: ' +
      (err.message || "Ver consola") +
      "</div>";
  }
}

async function showVentaDetalle(ventaId) {
  try {
    const venta = await api.getVenta(ventaId);
    document.getElementById("venta-detalle-id").textContent = venta.id;
    const fecha = venta.fecha
      ? new Date(venta.fecha).toLocaleString("es-CO")
      : "N/A";
    const productos = (venta.productosDeLaVenta || []).map((pv) => {
      const nombre = getStr(pv.producto, "nombre") || "Producto";
      const cantidad = pv.cantidad ?? 1;
      const precio = pv.precioUnitario != null ? pv.precioUnitario : getNum(pv.producto, "precio_de_venta");
      return { nombre, cantidad, precio, subtotal: cantidad * precio };
    });
    document.getElementById("venta-detalle-content").innerHTML = `
      <div class="venta-detalle-info">
        <p><strong>Cliente:</strong> ${
          getStr(venta.cliente, "nombre_completo") || "N/A"
        }</p>
        <p><strong>Tipo venta:</strong> ${
          getStr(venta.tipoDeVenta, "descripcion") || "N/A"
        }</p>
        <p><strong>Forma de pago:</strong> ${
          getStr(venta.tipoDePago, "nombre") || "N/A"
        }</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Total:</strong> $${getNum(
          venta,
          "valor_total",
        ).toLocaleString()}</p>
      </div>
      <div class="venta-detalle-productos">
        <h5>Productos</h5>
        <table>
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${productos
              .map(
                (p) => `
              <tr>
                <td>${p.nombre}</td>
                <td>${p.cantidad}</td>
                <td>$${p.precio.toLocaleString()}</td>
                <td>$${p.subtotal.toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById("venta-detalle-modal").style.display = "flex";
  } catch (err) {
    alert("Error al cargar detalle: " + (err.message || ""));
  }
}
