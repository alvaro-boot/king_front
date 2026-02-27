/**
 * King Perfum - Aplicación Frontend
 */

// Estado global
let currentUser = null;
let ventaProductos = []; // { producto, cantidad } - por ahora cantidad 1 por producto
let editingProductoId = null;
let editingCategoriaId = null;
let editingClienteId = null;

// Elementos DOM
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userNameEl = document.getElementById("user-name");
const btnLogout = document.getElementById("btn-logout");

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("king_perfum_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showApp();
    } catch (e) {
      localStorage.removeItem("king_perfum_user");
    }
  }

  initLogin();
  initNavigation();
  initVentas();
  initStock();
  initClientes();
  initReportes();
});

// Login
function initLogin() {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const usuario = document.getElementById("usuario").value.trim();
    const contraseña = document.getElementById("contraseña").value;

    try {
      const user = await api.login(usuario, contraseña);
      currentUser = user;
      localStorage.setItem("king_perfum_user", JSON.stringify(user));
      showApp();
    } catch (err) {
      loginError.textContent = err.message || "Error al iniciar sesión";
    }
  });
}

function showApp() {
  loginScreen.classList.remove("active");
  appScreen.classList.add("active");
  userNameEl.textContent = currentUser.nombreCompleto || currentUser.usuario;
  loadVentas();
  loadProductos();
  loadCategorias();
  loadClientes();
  loadReportes();
}

function logout() {
  currentUser = null;
  localStorage.removeItem("king_perfum_user");
  appScreen.classList.remove("active");
  loginScreen.classList.add("active");
  loginForm.reset();
  loginError.textContent = "";
}

// Navegación
function initNavigation() {
  btnLogout.addEventListener("click", logout);

  document.querySelectorAll(".nav-btn[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      document
        .querySelectorAll(".nav-btn[data-section]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".section")
        .forEach((s) => s.classList.remove("active"));
      document.getElementById(`section-${section}`).classList.add("active");

      if (section === "reportes") loadReportes();
      if (section === "ventas") loadVentas();
    });
  });

  // Tabs Stock
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// Ventas
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

    const precio = parseInt(producto.dataset.precio || 0, 10);
    const existing = ventaProductos.find((p) => p.producto.id === id);
    if (existing) {
      existing.cantidad += 1;
    } else {
      ventaProductos.push({
        producto: {
          id,
          nombre: producto.textContent.trim(),
          precioDeVenta: precio,
        },
        cantidad: 1,
      });
    }
    renderVentaProductos();
  });

  // Modal tipo de venta
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

  ventaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectTipo = document.getElementById("venta-tipo");
    const tipoDeVentaId = parseInt(selectTipo.value, 10);
    const descripcionTipo = (selectTipo.selectedOptions[0]?.dataset?.descripcion || "").toLowerCase();
    const esContado = descripcionTipo.includes("contado");
    const clienteIdRaw = document.getElementById("venta-cliente").value;
    const clienteId = clienteIdRaw ? parseInt(clienteIdRaw, 10) : null;

    if (!tipoDeVentaId) {
      alert("Seleccione tipo de venta");
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
      productos,
    };
    if (clienteId) payload.cliente_id = clienteId;

    try {
      await api.createVenta(payload);
      ventaProductos = [];
      renderVentaProductos();
      ventaForm.reset();
      loadVentas();
      loadReportes();
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
      <span class="venta-linea-nombre">${p.producto.nombre} ${p.cantidad > 1 ? `x${p.cantidad}` : ""}</span>
      <label class="venta-linea-precio">Precio: <input type="number" min="0" step="100" value="${p.producto.precioDeVenta}" data-index="${i}" class="input-precio-venta" /></label>
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
    const [ventas, clientes, tipos, productos] = await Promise.all([
      api.getVentas(),
      api.getClientes(),
      api.getTiposVenta(),
      api.getProductos(),
    ]);

    // Selects venta
    const selectCliente = document.getElementById("venta-cliente");
    const selectTipo = document.getElementById("venta-tipo");
    const selectProducto = document.getElementById("producto-agregar");

    selectCliente.innerHTML =
      '<option value="">Seleccionar cliente...</option>' +
      clientes
        .map((c) => `<option value="${c.id}">${c.nombre_completo}</option>`)
        .join("");
    selectTipo.innerHTML =
      '<option value="">Seleccionar tipo...</option>' +
      tipos
        .map(
          (t) => {
            const desc = ((t.descripcion || "") + "").toLowerCase();
            return `<option value="${t.id}" data-descripcion="${desc}">${
              t.descripcion || "Tipo " + t.id
            }</option>`;
          },
        )
        .join("");
    selectProducto.innerHTML =
      '<option value="">Seleccionar producto...</option>' +
      productos
        .map(
          (p) =>
            `<option value="${p.id}" data-precio="${p.precioDeVenta}">${
              p.nombre
            } - $${p.precioDeVenta?.toLocaleString?.() || 0}</option>`,
        )
        .join("");

    // Lista ventas recientes
    const lista = document.getElementById("ventas-lista");
    if (ventas.length === 0) {
      lista.innerHTML =
        '<div class="empty-state">No hay ventas registradas</div>';
    } else {
      lista.innerHTML = ventas
        .slice(0, 20)
        .map(
          (v) => `
        <div class="venta-item">
          <strong>#${v.id}</strong> - ${
            v.cliente?.nombre_completo || "N/A"
          } - $${(v.valorTotal || 0).toLocaleString()}
          <br><small>${(v.productosDeLaVenta || []).length} producto(s)</small>
        </div>
      `,
        )
        .join("");
    }
  } catch (err) {
    console.error(err);
    document.getElementById("ventas-lista").innerHTML =
      '<div class="empty-state">Error al cargar ventas</div>';
  }
}

// Stock - Productos y Categorías
function initStock() {
  // Productos
  document
    .getElementById("btn-nuevo-producto")
    .addEventListener("click", () => {
      editingProductoId = null;
      document.getElementById("producto-form-title").textContent =
        "Nuevo Producto";
      document.getElementById("producto-form").style.display = "block";
      document.getElementById("producto-form").reset();
    });

  document
    .getElementById("btn-cancelar-producto")
    .addEventListener("click", () => {
      document.getElementById("producto-form").style.display = "none";
      editingProductoId = null;
    });

  document
    .getElementById("producto-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        nombre: document.getElementById("producto-nombre").value.trim(),
        precio_de_venta: parseInt(
          document.getElementById("producto-precio-venta").value,
          10,
        ),
        precio_compra: parseInt(
          document.getElementById("producto-precio-compra").value,
          10,
        ),
        genero: document.getElementById("producto-genero").value,
      };
      const catId = document.getElementById("producto-categoria").value;
      if (catId) data.categoria_id = parseInt(catId, 10);

      try {
        if (editingProductoId) {
          await api.updateProducto(editingProductoId, data);
        } else {
          await api.createProducto(data);
        }
        document.getElementById("producto-form").style.display = "none";
        editingProductoId = null;
        loadProductos();
      } catch (err) {
        alert(err.message || "Error al guardar producto");
      }
    });

  // Categorías
  document
    .getElementById("btn-nueva-categoria")
    .addEventListener("click", () => {
      editingCategoriaId = null;
      document.getElementById("categoria-form-title").textContent =
        "Nueva Categoría";
      document.getElementById("categoria-form").style.display = "block";
      document.getElementById("categoria-form").reset();
    });

  document
    .getElementById("btn-cancelar-categoria")
    .addEventListener("click", () => {
      document.getElementById("categoria-form").style.display = "none";
      editingCategoriaId = null;
    });

  document
    .getElementById("categoria-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        nombre: document.getElementById("categoria-nombre").value.trim(),
        descripcion:
          document.getElementById("categoria-descripcion").value.trim() ||
          undefined,
      };

      try {
        if (editingCategoriaId) {
          await api.updateCategoria(editingCategoriaId, data);
        } else {
          await api.createCategoria(data);
        }
        document.getElementById("categoria-form").style.display = "none";
        editingCategoriaId = null;
        loadCategorias();
        loadProductos();
      } catch (err) {
        alert(err.message || "Error al guardar categoría");
      }
    });
}

async function loadProductos() {
  try {
    const productos = await api.getProductos();
    const container = document.getElementById("productos-lista");

    if (productos.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No hay productos. Cree uno nuevo.</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio Venta</th>
            <th>Precio Compra</th>
            <th>Género</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${productos
            .map(
              (p) => `
            <tr>
              <td>${p.nombre}</td>
              <td>$${(p.precioDeVenta || 0).toLocaleString()}</td>
              <td>$${(p.precioCompra || 0).toLocaleString()}</td>
              <td>${p.genero || "-"}</td>
              <td>${p.categoria?.nombre || "-"}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm btn-edit-producto" data-id="${
                  p.id
                }">Editar</button>
                <button class="btn btn-secondary btn-sm btn-delete-producto" data-id="${
                  p.id
                }">Deshabilitar</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    container.querySelectorAll(".btn-edit-producto").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.dataset.id, 10);
        const p = productos.find((x) => x.id === id);
        if (!p) return;
        editingProductoId = id;
        document.getElementById("producto-form-title").textContent =
          "Editar Producto";
        document.getElementById("producto-form").style.display = "block";
        document.getElementById("producto-nombre").value = p.nombre;
        document.getElementById("producto-precio-venta").value =
          p.precioDeVenta;
        document.getElementById("producto-precio-compra").value =
          p.precioCompra;
        document.getElementById("producto-genero").value = p.genero || "M";
        document.getElementById("producto-categoria").value =
          p.categoriaId || "";
      });
    });

    container.querySelectorAll(".btn-delete-producto").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Deshabilitar este producto? No aparecerá en ventas ni en listados.")) return;
        try {
          await api.deleteProducto(parseInt(btn.dataset.id, 10));
          loadProductos();
        } catch (err) {
          alert(err.message || "Error al deshabilitar");
        }
      });
    });
  } catch (err) {
    document.getElementById("productos-lista").innerHTML =
      '<div class="empty-state">Error al cargar productos</div>';
  }
}

async function loadCategorias() {
  try {
    const categorias = await api.getCategorias();
    const container = document.getElementById("categorias-lista");
    const selectProducto = document.getElementById("producto-categoria");

    selectProducto.innerHTML =
      '<option value="">Sin categoría</option>' +
      categorias
        .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
        .join("");

    if (categorias.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No hay categorías. Cree una nueva.</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${categorias
            .map(
              (c) => `
            <tr>
              <td>${c.nombre}</td>
              <td>${c.descripcion || "-"}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm btn-edit-categoria" data-id="${
                  c.id
                }">Editar</button>
                <button class="btn btn-secondary btn-sm btn-delete-categoria" data-id="${
                  c.id
                }">Eliminar</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    container.querySelectorAll(".btn-edit-categoria").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        const c = categorias.find((x) => x.id === id);
        if (!c) return;
        editingCategoriaId = id;
        document.getElementById("categoria-form-title").textContent =
          "Editar Categoría";
        document.getElementById("categoria-form").style.display = "block";
        document.getElementById("categoria-nombre").value = c.nombre;
        document.getElementById("categoria-descripcion").value =
          c.descripcion || "";
      });
    });

    container.querySelectorAll(".btn-delete-categoria").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta categoría?")) return;
        try {
          await api.deleteCategoria(parseInt(btn.dataset.id, 10));
          loadCategorias();
          loadProductos();
        } catch (err) {
          alert(err.message || "Error al eliminar");
        }
      });
    });
  } catch (err) {
    document.getElementById("categorias-lista").innerHTML =
      '<div class="empty-state">Error al cargar categorías</div>';
  }
}

// Clientes y Abonos
function initClientes() {
  document.getElementById("btn-nuevo-cliente").addEventListener("click", () => {
    editingClienteId = null;
    document.getElementById("cliente-form-title").textContent = "Nuevo Cliente";
    document.getElementById("cliente-form").style.display = "block";
    document.getElementById("cliente-form").reset();
    document.getElementById("cliente-deuda").value = 0;
  });

  document
    .getElementById("btn-cancelar-cliente")
    .addEventListener("click", () => {
      document.getElementById("cliente-form").style.display = "none";
      editingClienteId = null;
    });

  document
    .getElementById("cliente-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        nombre_completo: document.getElementById("cliente-nombre").value.trim(),
        deuda:
          parseInt(document.getElementById("cliente-deuda").value, 10) || 0,
      };

      try {
        if (editingClienteId) {
          await api.updateCliente(editingClienteId, data);
        } else {
          await api.createCliente(data);
        }
        document.getElementById("cliente-form").style.display = "none";
        editingClienteId = null;
        loadClientes();
      } catch (err) {
        alert(err.message || "Error al guardar cliente");
      }
    });

  document
    .getElementById("abono-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const clienteId = parseInt(
        document.getElementById("abono-cliente-id").value,
        10,
      );
      const valorAbono = parseInt(
        document.getElementById("abono-valor").value,
        10,
      );
      const deudaActual = parseInt(
        document
          .getElementById("abono-deuda-actual")
          .textContent.replace(/\D/g, ""),
        10,
      );

      if (valorAbono > deudaActual) {
        alert("El abono no puede ser mayor a la deuda actual");
        return;
      }

      const valorPost = deudaActual - valorAbono;

      try {
        await api.createAbono({
          cliente_id: clienteId,
          valor_pre_abono: deudaActual,
          valor_de_abono: valorAbono,
          valor_post_abono: valorPost,
        });
        await api.updateCliente(clienteId, { deuda: valorPost });
        document.getElementById("abono-valor").value = "";
        loadClientes();
        showClienteDetalle(clienteId);
      } catch (err) {
        alert(err.message || "Error al registrar abono");
      }
    });
}

async function loadClientes() {
  try {
    const clientes = await api.getClientes();
    const lista = document.getElementById("clientes-lista");

    if (clientes.length === 0) {
      lista.innerHTML = '<div class="empty-state">No hay clientes</div>';
      document.getElementById("cliente-detalle").innerHTML =
        '<p class="placeholder">Seleccione un cliente</p>';
      document.getElementById("abono-form-container").style.display = "none";
      return;
    }

    lista.innerHTML = clientes
      .map(
        (c) => `
      <div class="list-item" data-id="${c.id}">
        ${c.nombre_completo} - Deuda: $${(c.deuda || 0).toLocaleString()}
      </div>
    `,
      )
      .join("");

    lista.querySelectorAll(".list-item").forEach((el) => {
      el.addEventListener("click", () =>
        showClienteDetalle(parseInt(el.dataset.id, 10)),
      );
    });
  } catch (err) {
    document.getElementById("clientes-lista").innerHTML =
      '<div class="empty-state">Error al cargar clientes</div>';
  }
}

async function showClienteDetalle(clienteId) {
  try {
    const [cliente, abonos] = await Promise.all([
      api.getCliente(clienteId),
      api.getAbonos(clienteId),
    ]);

    if (!cliente) return;

    const detalle = document.getElementById("cliente-detalle");
    detalle.innerHTML = `
      <div class="cliente-info">
        <p><strong>${cliente.nombre_completo}</strong></p>
        <p class="deuda">Deuda actual: $${(
          cliente.deuda || 0
        ).toLocaleString()}</p>
      </div>
      <h5>Historial de Abonos</h5>
      <div class="abonos-list">
        ${
          abonos.length === 0
            ? '<p class="placeholder">Sin abonos registrados</p>'
            : abonos
                .map(
                  (a) =>
                    `<div class="abono-item">Abono: $${(
                      a.valorDeAbono || 0
                    ).toLocaleString()} - Deuda anterior: $${(
                      a.valorPreAbono || 0
                    ).toLocaleString()} → Nueva: $${(
                      a.valorPostAbono || 0
                    ).toLocaleString()}</div>`,
                )
                .join("")
        }
      </div>
    `;

    document.getElementById("abono-cliente-id").value = clienteId;
    document.getElementById("abono-deuda-actual").textContent = (
      cliente.deuda || 0
    ).toLocaleString();
    document.getElementById("abono-form-container").style.display = "block";
  } catch (err) {
    document.getElementById("cliente-detalle").innerHTML =
      '<p class="placeholder">Error al cargar detalle</p>';
  }
}

// Reportes
async function loadReportes() {
  try {
    const ventas = await api.getVentas();
    const totalVentas = ventas.length;
    const valorTotal = ventas.reduce((sum, v) => sum + (v.valorTotal || 0), 0);

    document.getElementById("stat-total-ventas").textContent = totalVentas;
    document.getElementById("stat-valor-total").textContent =
      "$" + valorTotal.toLocaleString();

    // Ventas por tipo
    const porTipo = {};
    ventas.forEach((v) => {
      const tipo = v.tipoDeVenta?.descripcion || "Sin tipo";
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    });

    document.getElementById("ventas-por-tipo").innerHTML =
      Object.entries(porTipo)
        .map(
          ([tipo, count]) =>
            `<div class="reporte-item"><span>${tipo}</span><span>${count} venta(s)</span></div>`,
        )
        .join("") || '<div class="empty-state">Sin datos</div>';

    // Historial
    const reportesLista = document.getElementById("reportes-ventas-lista");
    if (ventas.length === 0) {
      reportesLista.innerHTML = '<div class="empty-state">No hay ventas</div>';
    } else {
      reportesLista.innerHTML = ventas
        .slice(0, 30)
        .map((v) => {
          const prods = (v.productosDeLaVenta || [])
            .map((pv) => pv.producto?.nombre || "Producto")
            .join(", ");
          return `
          <div class="venta-item">
            <strong>#${v.id}</strong> - ${
            v.cliente?.nombre_completo || "N/A"
          } - $${(v.valorTotal || 0).toLocaleString()}
            <br><small>Productos: ${prods || "-"}</small>
          </div>
        `;
        })
        .join("");
    }
  } catch (err) {
    document.getElementById("stat-total-ventas").textContent = "0";
    document.getElementById("stat-valor-total").textContent = "$0";
    document.getElementById("ventas-por-tipo").innerHTML =
      '<div class="empty-state">Error al cargar</div>';
    document.getElementById("reportes-ventas-lista").innerHTML =
      '<div class="empty-state">Error al cargar ventas</div>';
  }
}
