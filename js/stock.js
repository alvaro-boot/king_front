let editingProductoId = null;
let editingCategoriaId = null;

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("user-name").textContent =
    user.nombreCompleto || user.usuario;
  document.getElementById("btn-logout").addEventListener("click", logout);

  initStock();
  loadProductos();
  loadCategorias();
});

function initStock() {
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
        cantidad: parseInt(
          document.getElementById("producto-cantidad").value || "0",
          10,
        ),
        genero: document.getElementById("producto-genero").value,
      };
      const catId = document.getElementById("producto-categoria").value;
      if (catId) data.categoria_id = parseInt(catId, 10);
      try {
        if (editingProductoId)
          await api.updateProducto(editingProductoId, data);
        else await api.createProducto(data);
        document.getElementById("producto-form").style.display = "none";
        editingProductoId = null;
        loadProductos();
      } catch (err) {
        alert(err.message || "Error al guardar producto");
      }
    });

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
        if (editingCategoriaId)
          await api.updateCategoria(editingCategoriaId, data);
        else await api.createCategoria(data);
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
        <thead><tr><th>Nombre</th><th>Precio Venta</th><th>Precio Compra</th><th>Cantidad</th><th>Género</th><th>Categoría</th><th>Acciones</th></tr></thead>
        <tbody>${(productos || [])
          .map(
            (p) => `
          <tr>
            <td>${getStr(p, "nombre")}</td>
            <td>$${getNum(p, "precio_de_venta").toLocaleString()}</td>
            <td>$${getNum(p, "precio_compra").toLocaleString()}</td>
            <td>${getNum(p, "cantidad")}</td>
            <td>${getStr(p, "genero") || "-"}</td>
            <td>${getStr(p.categoria, "nombre") || "-"}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm btn-edit-producto" data-id="${
                p.id
              }">Editar</button>
              <button class="btn btn-secondary btn-sm btn-delete-producto" data-id="${
                p.id
              }">Eliminar</button>
            </td>
          </tr>
        `,
          )
          .join("")}</tbody>
      </table>
    `;
    container.querySelectorAll(".btn-edit-producto").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = productos.find((x) => x.id === parseInt(btn.dataset.id, 10));
        if (!p) return;
        editingProductoId = p.id;
        document.getElementById("producto-form-title").textContent =
          "Editar Producto";
        document.getElementById("producto-form").style.display = "block";
        document.getElementById("producto-nombre").value = getStr(p, "nombre");
        document.getElementById("producto-precio-venta").value = getNum(
          p,
          "precio_de_venta",
        );
        document.getElementById("producto-precio-compra").value = getNum(
          p,
          "precio_compra",
        );
        document.getElementById("producto-cantidad").value = getNum(
          p,
          "cantidad",
        );
        document.getElementById("producto-genero").value =
          getStr(p, "genero") || "M";
        document.getElementById("producto-categoria").value =
          (p.categoriaId ?? p.categoria_id ?? "") || "";
      });
    });
    container.querySelectorAll(".btn-delete-producto").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar este producto?")) return;
        try {
          await api.deleteProducto(parseInt(btn.dataset.id, 10));
          loadProductos();
        } catch (err) {
          alert(err.message || "Error al eliminar");
        }
      });
    });
  } catch (err) {
    console.error("Error cargando productos:", err);
    document.getElementById("productos-lista").innerHTML =
      '<div class="empty-state">Error al cargar: ' +
      (err.message || "Ver consola") +
      "</div>";
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
        <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
        <tbody>${(categorias || [])
          .map(
            (c) => `
          <tr>
            <td>${getStr(c, "nombre")}</td>
            <td>${getStr(c, "descripcion") || "-"}</td>
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
          .join("")}</tbody>
      </table>
    `;
    container.querySelectorAll(".btn-edit-categoria").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = categorias.find((x) => x.id === parseInt(btn.dataset.id, 10));
        if (!c) return;
        editingCategoriaId = c.id;
        document.getElementById("categoria-form-title").textContent =
          "Editar Categoría";
        document.getElementById("categoria-form").style.display = "block";
        document.getElementById("categoria-nombre").value = getStr(c, "nombre");
        document.getElementById("categoria-descripcion").value =
          getStr(c, "descripcion") || "";
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
    console.error("Error cargando categorías:", err);
    document.getElementById("categorias-lista").innerHTML =
      '<div class="empty-state">Error al cargar: ' +
      (err.message || "Ver consola") +
      "</div>";
  }
}
