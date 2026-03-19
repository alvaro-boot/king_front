/**
 * API Client para King Perfum Backend
 * Configura la URL base y realiza las peticiones HTTP
 */

const API_BASE =
  (typeof CONFIG !== "undefined" && CONFIG.API_BASE) || "http://localhost:3000";

async function doRequest(baseUrl, endpoint, options) {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  if (
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData)
  ) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    return { ok: false, status: response.status, error, response };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { ok: true, data };
}

async function request(endpoint, options = {}) {
  let result = await doRequest(API_BASE, endpoint, options);

  // Si 404 y usamos /api, intentar sin /api (o viceversa)
  if (!result.ok && result.status === 404) {
    const baseNorm = API_BASE.endsWith("/")
      ? API_BASE.slice(0, -1)
      : API_BASE;
    const altBase = baseNorm.endsWith("/api")
      ? baseNorm.replace(/\/api\/?$/, "")
      : baseNorm + "/api";
    result = await doRequest(altBase, endpoint, options);
  }

  if (!result.ok) {
    const msg = result.error?.message || `Error ${result.status}`;
    if (result.status === 404) {
      throw new Error(
        msg +
          ". Prueba: 1) Abrir el front con 'npx serve -p 5000' (no file://). 2) Backend en puerto 3000.",
      );
    }
    throw new Error(msg);
  }

  return result.data;
}

const api = {
  // Login (ruta /auth/login en el backend)
  login: (usuario, contraseña) =>
    request("/auth/login", {
      method: "POST",
      body: { usuario, contraseña },
    }),

  // Categorías
  getCategorias: () => request("/categorias"),
  createCategoria: (data) =>
    request("/categorias", { method: "POST", body: data }),
  updateCategoria: (id, data) =>
    request(`/categorias/${id}`, { method: "PATCH", body: data }),
  deleteCategoria: (id) => request(`/categorias/${id}`, { method: "DELETE" }),

  // Productos
  getProductos: () => request("/productos"),
  createProducto: (data) =>
    request("/productos", { method: "POST", body: data }),
  updateProducto: (id, data) =>
    request(`/productos/${id}`, { method: "PATCH", body: data }),
  deleteProducto: (id) => request(`/productos/${id}`, { method: "DELETE" }),

  // Clientes
  getClientes: () => request("/clientes"),
  getCliente: (id) => request(`/clientes/${id}`),
  createCliente: (data) => request("/clientes", { method: "POST", body: data }),
  updateCliente: (id, data) =>
    request(`/clientes/${id}`, { method: "PATCH", body: data }),
  deleteCliente: (id) => request(`/clientes/${id}`, { method: "DELETE" }),

  // Abonos
  getAbonos: (clienteId) =>
    request(clienteId ? `/abonos?clienteId=${clienteId}` : "/abonos"),
  createAbono: (data) => request("/abonos", { method: "POST", body: data }),

  // Tipos de venta
  getTiposVenta: () => request("/tipos-de-venta"),
  createTipoVenta: (data) =>
    request("/tipos-de-venta", { method: "POST", body: data }),

  // Tipos de pago
  getTiposPago: () => request("/tipos-de-pago"),
  getTipoPago: (id) => request(`/tipos-de-pago/${id}`),
  createTipoPago: (data) =>
    request("/tipos-de-pago", { method: "POST", body: data }),
  updateTipoPago: (id, data) =>
    request(`/tipos-de-pago/${id}`, { method: "PATCH", body: data }),
  deleteTipoPago: (id) =>
    request(`/tipos-de-pago/${id}`, { method: "DELETE" }),

  // Ventas
  getVentas: () => request("/ventas"),
  getMisVentas: (vendedorId) =>
    request(`/ventas/mis?vendedorId=${encodeURIComponent(vendedorId)}`),
  createVenta: (data) => request("/ventas", { method: "POST", body: data }),
  getVenta: (id) => request(`/ventas/${id}`),

  // Comisiones
  getComisiones: (vendedorId) =>
    vendedorId != null
      ? request(`/comisiones?vendedorId=${encodeURIComponent(vendedorId)}`)
      : request("/comisiones"),

  // Roles
  getRoles: () => request("/roles"),

  // Usuarios
  getUsuarios: () => request("/usuarios"),
  createUsuario: (data) => request("/usuarios", { method: "POST", body: data }),
};
