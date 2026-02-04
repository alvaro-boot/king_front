/**
 * Utilidades para manejar datos del API
 * Soporta camelCase y snake_case de la respuesta del backend
 */

function get(obj, key, def = 0) {
  if (!obj) return def;
  const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  return obj[key] ?? obj[camel] ?? def;
}

function getStr(obj, key, def = "") {
  const v = get(obj, key, def);
  return v != null ? String(v) : def;
}

function getNum(obj, key, def = 0) {
  const v = get(obj, key, def);
  return typeof v === "number" ? v : parseInt(v, 10) || def;
}
