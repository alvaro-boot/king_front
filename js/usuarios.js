document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

  const descripcionRol =
    (user?.rol?.descripcion || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") || "";

  const isAdmin = descripcionRol.includes("admin");

  document.getElementById("user-name").textContent =
    user.nombreCompleto || user.usuario;
  document.getElementById("btn-logout").addEventListener("click", logout);

  if (!isAdmin) {
    alert("Acceso denegado: solo administradores pueden registrar usuarios.");
    window.location.href = "ventas.html";
    return;
  }

  loadRoles();

  const usuariosForm = document.getElementById("usuarios-form");
  usuariosForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("usuarios-error");
    errorEl.textContent = "";

    try {
      const payload = {
        nombre_completo: document.getElementById("usuario-nombre-completo").value.trim(),
        usuario: document.getElementById("usuario-usuario").value.trim(),
        contraseña: document.getElementById("usuario-contraseña").value,
        rol_id: parseInt(document.getElementById("usuario-rol").value, 10),
      };

      await api.createUsuario(payload);
      alert("Usuario registrado correctamente");
      usuariosForm.reset();
      await loadRoles();
    } catch (err) {
      errorEl.textContent = err.message || "Error al registrar usuario";
    }
  });

  document.getElementById("btn-cancelar-usuario").addEventListener("click", () => {
    document.getElementById("usuarios-form").reset();
    document.getElementById("usuarios-error").textContent = "";
  });
});

async function loadRoles() {
  const select = document.getElementById("usuario-rol");
  const roles = await api.getRoles();

  select.innerHTML =
    '<option value="">Seleccionar rol...</option>' +
    (roles || [])
      .map((r) => {
        const desc = getStr(r, "descipcion") || getStr(r, "descripcion") || `Rol ${r.id}`;
        return `<option value="${r.id}">${desc}</option>`;
      })
      .join("");
}

