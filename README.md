# King Perfum - Frontend

Sistema de gestión para King Perfum desarrollado con HTML, CSS y JavaScript vanilla.

## Requisitos

- Backend NestJS corriendo en `http://localhost:3000`
- Base de datos MySQL con el schema y seed ejecutados

## Ejecución

1. **Inicia el backend** (puerto 3000):

   ```bash
   cd ../backend-king_perfum
   npm run start:dev
   ```

2. **Inicia el frontend en otro puerto** (evita conflicto con el backend):

   ```bash
   npx serve -p 5000
   ```

   Luego abre http://localhost:5000 en el navegador.

   Si abres `index.html` directamente (file://), el backend debe estar en http://localhost:3000.

3. **Credenciales por defecto** (después de ejecutar seed.sql):
   - Usuario: `admin`
   - Contraseña: `admin123`

## Configuración

Edita `config.js` para cambiar la URL del API si tu backend corre en otro puerto o host.

## Estructura de páginas

- **index.html** - Solo login. Si ya estás logueado, redirige a ventas.
- **ventas.html** - Registro de ventas
- **stock.html** - Productos y categorías
- **clientes.html** - Clientes y abonos
- **reportes.html** - Estadísticas y historial

Cada página es independiente. Al navegar entre ellas no se muestra el login si la sesión está activa.
