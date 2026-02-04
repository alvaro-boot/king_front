/**
 * Autenticación - King Perfum
 */

function getCurrentUser() {
  try {
    const saved = localStorage.getItem("king_perfum_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("king_perfum_user");
  window.location.href = "index.html";
}
