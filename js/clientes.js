let editingClienteId = null;

document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

  document.getElementById("user-name").textContent =
    user.nombreCompleto || user.usuario;
  document.getElementById("btn-logout").addEventListener("click", logout);

  initClientes();
  loadClientes();
});

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
        if (editingClienteId) await api.updateCliente(editingClienteId, data);
        else await api.createCliente(data);
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
    lista.innerHTML = (clientes || [])
      .map(
        (c) => `
      <div class="list-item" data-id="${c.id}">
        ${getStr(c, "nombre_completo")} - Deuda: $${getNum(
          c,
          "deuda",
        ).toLocaleString()}
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
    console.error("Error cargando clientes:", err);
    document.getElementById("clientes-lista").innerHTML =
      '<div class="empty-state">Error al cargar: ' +
      (err.message || "Ver consola") +
      "</div>";
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
        <p><strong>${getStr(cliente, "nombre_completo")}</strong></p>
        <p class="deuda">Deuda actual: $${getNum(
          cliente,
          "deuda",
        ).toLocaleString()}</p>
      </div>
      <h5>Historial de Abonos</h5>
      <div class="abonos-list">
        ${
          !abonos || abonos.length === 0
            ? '<p class="placeholder">Sin abonos registrados</p>'
            : abonos
                .map(
                  (a) => `
          <div class="abono-item">Abono: $${getNum(
            a,
            "valor_de_abono",
          ).toLocaleString()} - Deuda anterior: $${getNum(
                    a,
                    "valor_pre_abono",
                  ).toLocaleString()} → Nueva: $${getNum(
                    a,
                    "valor_post_abono",
                  ).toLocaleString()}</div>
        `,
                )
                .join("")
        }
      </div>
    `;
    document.getElementById("abono-cliente-id").value = clienteId;
    document.getElementById("abono-deuda-actual").textContent = getNum(
      cliente,
      "deuda",
    ).toLocaleString();
    document.getElementById("abono-form-container").style.display = "block";
  } catch (err) {
    document.getElementById("cliente-detalle").innerHTML =
      '<p class="placeholder">Error al cargar detalle</p>';
  }
}
