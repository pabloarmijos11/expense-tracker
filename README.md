# expense-tracker

Gestor de gastos personales. Cada usuario registra sus gastos con un desglose
opcional por líneas, los clasifica en categorías propias y fija presupuestos
mensuales por categoría para ver cuánto le queda del mes.

**Demo: https://expense-tracker-pablo.vercel.app**

**Informe técnico:** [Signal Forms, reglas de seguridad y el fallo que cambió las
pruebas](docs/informe-tecnico.pdf) (PDF, septiembre 2026)

Hecho con Angular 21 y Firebase (Authentication + Firestore). Hace falta crear
una cuenta para entrar: todos los datos están cerrados por usuario dueño.

## Qué tiene de interesante

- **Signal Forms** (`@angular/forms/signals`), la API de formularios que estrena
  Angular 21: arrays de campos dinámicos para las líneas del gasto, validación
  cruzada entre las líneas y el total, y validación asíncrona contra Firestore
  para impedir dos categorías con el mismo nombre.
- **Routing avanzado** — rutas anidadas, parámetros, query params, guards y
  resolvers.
- **Lazy loading** — la sección de presupuestos se carga aparte.
- **66 tests unitarios** repartidos en 18 archivos, que corren sin tocar la red.
- **Reglas de seguridad de Firestore** cerradas por dueño, con `ownerId`
  inmutable tras la creación y validación de forma de cada documento.

## Stack

| Pieza | Versión |
|---|---|
| Angular | 21.2 |
| Firebase (Auth + Firestore) | 12.17 |
| Tailwind CSS | 4.3 (configurado con `@theme`, sin `tailwind.config.js`) |
| Vitest + jsdom | 4.0 / 28 |
| TypeScript | 5.9 |

## Cómo instalar y correr

```bash
npm install
npm start          # servidor de desarrollo en http://localhost:4200
npm run build      # build de producción
npm test           # tests unitarios
```

## Estructura de carpetas

```
src/app/
├── core/            # guards, resolvers, tokens de inyección (Firestore/Auth), modelos
├── auth/            # login, registro, AuthService
├── expenses/        # lista, detalle, formulario, ExpenseService
├── categories/      # gestión de categorías, CategoryService
├── budgets/         # presupuestos mensuales — sección con lazy loading
├── shared/          # layout, navbar, not-found
├── app.routes.ts
└── app.config.ts    # providers, incluida la inicialización de Firebase
```

## Firebase

El `firebaseConfig` vive en `src/environments/` y está versionado a propósito:
en una app web esas claves viajan dentro del bundle de JavaScript y cualquiera
puede leerlas desde el navegador. No son un secreto. Lo que protege los datos
son las reglas de seguridad, no esconder la configuración.

Las reglas están en `firestore.rules`, cerradas por dueño
(`ownerId == request.auth.uid`). **Editar ese archivo no basta**: hay que
publicarlas desde la consola de Firebase para que rijan de verdad.

Las consultas que combinan `where('ownerId')` con `orderBy(...)` necesitan un
índice compuesto por colección. Firestore los pide con un error
`failed-precondition` que incluye el enlace para crearlos.

## Tests

```bash
npm test
```

Corren con [Vitest](https://vitest.dev/), el runner que Angular 21 trae por
defecto. El SDK de Firebase se sustituye con `vi.mock('firebase/auth')` y
`vi.mock('firebase/firestore')`, y los tokens `FIREBASE_AUTH` / `FIRESTORE` se
proveen como objetos vacíos: ningún test abre una conexión. Se cubre lo que
cuesta verificar a mano:

- `AuthService` — registro, login, logout y la traducción de cada
  `FirebaseError` al español.
- Los guards — con sesión, sin sesión y, sobre todo, con la sesión aún sin
  restaurar: el guard no debe decidir antes de que Firebase responda, que es lo
  que evita el parpadeo hacia el login al recargar.
- La validación cruzada del gasto — las líneas contra el total, incluida la
  tolerancia de 0.01 que absorbe el error de punto flotante.
- `CategoryService.nameExists()` y el presupuesto duplicado (categoría + mes),
  más el cruce de cada presupuesto con lo realmente gastado.

## Integración continua

Cada push y cada pull request pasan los tests unitarios y un build de
producción (`.github/workflows/ci.yml`). Si esto pasa en local, el CI también:

```bash
npm test -- --watch=false
npm run build
```

## Despliegue

Vercel, con la configuración en `vercel.json` para que quede versionada y se
pueda explicar en un commit, en vez de vivir en un formulario web.

La app es una SPA, así que hay un rewrite que manda cualquier ruta no
encontrada a `index.html`. Sin él, recargar la página en `/budgets` daría 404:
ese archivo no existe en el disco, la ruta solo existe dentro del router de
Angular. El rewrite no se adelanta al sistema de archivos, así que los assets
estáticos se siguen sirviendo como tales.

## Limitaciones conocidas

- `nameExists()` distingue mayúsculas: `comida` y `Comida` conviven como
  categorías distintas. Arreglarlo pide un campo `nameLower`, que obliga a
  tocar el `hasOnly` de las reglas y republicarlas.
- La unicidad de categoría + mes en los presupuestos se valida en el cliente y
  no puede estar en las reglas: las reglas no saben buscar "que no exista
  ninguno igual" en una colección.

## Licencia

[MIT](LICENSE).
