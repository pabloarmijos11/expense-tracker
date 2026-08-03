# expense-tracker

Proyecto de práctica: un gestor de gastos personales con Angular 21 y
Firebase (Auth + Firestore). A diferencia de los dos proyectos anteriores
(`prueba-landingpage`, `prueba-firestore`), este existe para practicar cuatro
cosas que no se habían tocado todavía:

- **Routing avanzado** — rutas anidadas, parámetros, query params, guards y
  resolvers.
- **Formularios** — con **Signal Forms** (`@angular/forms/signals`), la API
  de formularios de Angular 21: arrays de campos dinámicos, validación
  cruzada y validación asíncrona contra Firestore.
- **Lazy loading** — partir el bundle por secciones.
- **Autenticación** — Firebase Auth con email/contraseña, que habilita
  guards reales y reglas de seguridad de Firestore cerradas por usuario
  dueño (`ownerId`), a diferencia de `prueba-firestore` que las tiene
  abiertas.

> Estado: completado. Las nueve fases del plan están hechas (andamiaje,
> Firebase, autenticación y guards, modelo de datos y reglas de seguridad,
> routing avanzado, formulario con arrays y validación cruzada, validación
> asíncrona de nombre de categoría único, presupuestos con lazy loading, y
> tests). Ver el plan completo en
> `C:\Users\ASUS\.claude\plans\listo-entonces-me-gustar-a-lively-stroustrup.md`.

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

## Estilos

Tailwind CSS v4, sin `tailwind.config.js` (configuración vía `@theme` si
hace falta). Mismo montaje que `prueba-firestore`.

## Firebase

Proyecto propio (`expense-tracker-8869b`), separado del de
`prueba-firestore`, con Authentication (Email/Password) y Cloud Firestore
habilitados. El `firebaseConfig` vive en `src/environments/`.

Las reglas de seguridad están en `firestore.rules`, cerradas por dueño
(`ownerId == request.auth.uid`). **Editar ese archivo no basta**: hay que
publicarlas en la consola de Firebase para que rijan.

Las consultas que combinan `where('ownerId')` con `orderBy(...)` requieren
un índice compuesto por colección. Firestore los pide con un error
`failed-precondition` que incluye el enlace para crearlos.

## Desarrollo

```bash
ng serve
```

Abre `http://localhost:4200/`. La app se recarga automáticamente al
modificar el código fuente.

## Tests

```bash
ng test
```

Corre con [Vitest](https://vitest.dev/), incluido por defecto en el CLI de
Angular 21.

El SDK de Firebase se mockea con `vi.mock('firebase/auth')` y
`vi.mock('firebase/firestore')`, y los tokens `FIREBASE_AUTH` / `FIRESTORE`
se proveen como objetos vacíos: los tests no tocan la red. Se cubre lo que
cuesta verificar a mano:

- `AuthService` — registro, login, logout y la traducción de cada
  `FirebaseError` al español.
- Los guards — con sesión, sin sesión y, sobre todo, con la sesión aún sin
  restaurar: el guard no debe decidir antes de que Firebase responda, que es
  lo que evita el parpadeo hacia el login al recargar.
- La validación cruzada del gasto — las líneas contra el total, incluida la
  tolerancia de 0.01 que absorbe el error de punto flotante.
- `CategoryService.nameExists()` y el presupuesto duplicado (categoría + mes),
  más el cruce de cada presupuesto con lo realmente gastado.

## Build

```bash
ng build
```

Genera los artefactos de compilación en `dist/`.
