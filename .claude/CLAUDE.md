# expense-tracker — instrucciones para Claude Code

Gestor de gastos personales con Angular 21 + Firebase. Cada usuario registra sus
gastos con un desglose opcional por líneas, los clasifica en categorías propias y
fija presupuestos mensuales por categoría.

**La historia del proyecto no está aquí.** Decisiones, arquitectura razonada, qué
dejó cada fase y por qué se descartó lo que se descartó viven en el vault:
`Vault Proyectos/Wiki/Proyectos/Personales/expense-tracker.md`, en el vault
personal (repositorio privado aparte, no incluido aquí).
Este archivo solo lleva lo operativo — lo que hace falta para no meter la pata al
escribir código. Si algo de aquí contradice al vault, gana el vault.

## Stack

Versiones leídas de `package.json`, no de memoria:

| Paquete | Versión |
|---|---|
| `@angular/core`, `@angular/router`, `@angular/forms` | `^21.2.0` |
| `firebase` | `^12.17.0` |
| `tailwindcss` | `^4.3.3` |
| `vitest` / `jsdom` | `^4.0.8` / `^28.0.0` |
| `typescript` | `~5.9.2` |

Proyecto de Firebase: `expense-tracker-8869b` (propio, separado del de
`prueba-firestore`). Repositorio: `github.com/pabloarmijos11/expense-tracker`,
**público desde el 2026-09-20**, rama `master` (no `main` — reading-shelf sí
usa `main`, y esa diferencia es real, no un descuido de este archivo).

Producción: https://expense-tracker-pablo.vercel.app (Vercel, plan Hobby).
El dominio está dado de alta **como dominio del proyecto**, no
como alias de un despliegue suelto: un alias creado con `vercel alias set`
queda clavado al despliegue que existía en ese momento y seguiría sirviendo el
build viejo tras el siguiente deploy, sin avisar de nada.

## Comandos

```bash
npm start      # ng serve
npm run build  # ng build
npm test       # ng test — Vitest, 66 tests en 18 archivos spec
```

El CI (`.github/workflows/ci.yml`) corre esos dos últimos en cada push y cada
pull request. No despliega.

**El despliegue es manual, con `vercel deploy --prod`.** No por decisión, sino
porque `vercel git connect` falla: la app de Vercel en GitHub tiene acceso solo
a los repositorios que se le concedieron uno a uno, y este no está entre ellos.
Para arreglarlo hay que ir a `github.com/settings/installations` → Vercel →
*Repository access* y añadir `expense-tracker`; después `vercel git connect`
funciona y cada push a `master` despliega solo. Mientras tanto, **un push no
actualiza producción**: hay que acordarse de lanzar el deploy a mano.

## Idioma

- **Identificadores del código en inglés** (`addBudget`, `nameExists`, `ownerId`).
- **Textos de UI, mensajes de validación, documentación y commits en español**
  (`required(s.name, { message: 'El nombre es obligatorio' })`).

No es una regla global de Pablo: se decide por proyecto.

## Reglas de este proyecto

Cinco cosas que rompen algo si se ignoran. Cada una costó encontrarla.

1. **Firebase entra entero por `InjectionToken`, nunca con `@angular/fire` ni con
   un import directo del SDK.** Son cuatro tokens en `core/tokens/firebase.ts`:
   `FIRESTORE` y `FIREBASE_AUTH` (las instancias) y **`AUTH_SDK` y `FIRESTORE_SDK`
   (las funciones)**. `app.config.ts` es el único archivo que importa valores de
   `firebase/auth` o `firebase/firestore`; los servicios llaman `this.sdk.getDocs(…)`.

   **Lo que se intentó antes y no funciona: `vi.mock('firebase/firestore')`.** El
   builder de Angular empaqueta todos los specs juntos y reparte los módulos
   compartidos en chunks por su cuenta, y ese reparto no es igual en Windows que en
   Linux. El spec acababa vigilando una copia del doble mientras el servicio llamaba
   a otra: `mock.calls` vacío, `mockResolvedValue()` sin efecto. Síntoma: **66 tests
   verdes en local y 23 rojos en CI** (2026-09-18), con los 4 specs afectados siendo
   exactamente los 4 que programaban dobles con `vi.mocked()`.

   Regla, la misma que en reading-shelf: **lo que hay que sustituir en un test se
   inyecta, no se importa.** Los dobles están en `core/tokens/firebase.fake.ts`
   (`fakeAuthSdk()`, `fakeFirestoreSdk()`, `fakeFirebase()`). Un spec nuevo usa
   `providers: [...fakeFirebase().providers]` y no escribe ningún `vi.mock`.

   Dos detalles de configuración que esto arrastra: `*.fake.ts` va en el `include`
   de `tsconfig.spec.json` (usa `vi`) y en el `exclude` de `tsconfig.app.json` (o el
   build de producción falla porque ahí `vi` no existe). Y en los specs, los tipos
   del SDK se importan con `import type`, para que no quede ninguna dependencia de
   módulo en tiempo de ejecución.

2. **Todo guard y resolver empieza con `await authService.ready`.**
   `onAuthStateChanged` no responde de inmediato: al recargar, Firebase tarda un
   instante en restaurar la sesión y durante ese instante `currentUser` es `null`.
   Un guard que pregunte antes manda al login a un usuario autenticado. Hay un test
   que falla si alguien quita ese `await` — está puesto a propósito, no lo silencies.

3. **Formularios con Signal Forms (`@angular/forms/signals`), nunca Reactive ni
   template-driven.** Antes de escribir cualquier código de formulario, lee
   `~/.claude/skills/angular-developer/references/signal-forms.md`: documenta los
   patrones obligatorios y los tropiezos propios de esta API (el más común, confundir
   `form.name` con `form.name()`).

4. **`firestore.rules` no se publica desde el repo.** Editar el archivo no cambia
   nada en producción; hay que subir las reglas a mano desde la consola de Firebase.
   Darlo por hecho es un fallo de seguridad silencioso.

5. **Comparar importes con tolerancia de `0.01`, nunca con `===`.**
   `0.1 + 0.2` da `0.30000000000000004`. La condición correcta es
   `Math.abs(sum - value()) > 0.01`.

## Patrón de los servicios de datos

Los tres servicios (`ExpenseService`, `CategoryService`, `BudgetService`) siguen el
mismo molde y conviene mantenerlo:

- Signals `<entidad>`, `loading` y `error`.
- Un `effect` que reacciona a `authService.currentUser()` y (re)monta el listener de
  `onSnapshot`.
- Desuscripción registrada en `DestroyRef`, para que cambiar de usuario reemplace el
  listener sin fugas.

Cada consulta que combina `where('ownerId')` con `orderBy(...)` exige un índice
compuesto; sin él, Firestore responde `failed-precondition`.

## Pendientes conocidos

- `nameExists()` distingue mayúsculas: `comida` y `Comida` conviven como categorías
  distintas. Arreglarlo pide un campo `nameLower`, que obliga a tocar el `hasOnly` de
  las reglas y republicarlas.
- El presupuesto de bundle se ajustó al tamaño real del proyecto (commit
  `f37c948`), así que `ng build` ya no avisa. Lo que domina el bundle inicial
  sigue siendo el chunk del SDK de Firebase.
- La unicidad de `categoryId` + `month` en presupuestos es validación de cliente y no
  puede estar en las reglas: las reglas no saben buscar "ninguno igual" en una colección.

---

## Reglas generales de Angular

Lo que sigue viene de la skill `angular-developer` y aplica a cualquier proyecto
Angular, no solo a este. Se mantiene en inglés tal como lo genera la skill.

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images (does not work for inline base64 images)

### Accessibility

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like `new Date()` are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
