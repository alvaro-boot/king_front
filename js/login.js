document.addEventListener("DOMContentLoaded", () => {
  if (getCurrentUser()) {
    window.location.href = "ventas.html";
    return;
  }

  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const loginError = document.getElementById("login-error");
      loginError.textContent = "";
      const usuario = document.getElementById("usuario").value.trim();
      const contraseña = document.getElementById("contraseña").value;

      try {
        const user = await api.login(usuario, contraseña);
        localStorage.setItem("king_perfum_user", JSON.stringify(user));
        window.location.href = "ventas.html";
      } catch (err) {
        loginError.textContent = err.message || "Error al iniciar sesión";
      }
    });
});
