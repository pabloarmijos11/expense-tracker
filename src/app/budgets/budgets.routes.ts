import { Routes } from '@angular/router';
import { BudgetList } from './budget-list/budget-list';

/**
 * Rutas de la sección de presupuestos. Se exporta por defecto para que
 * `loadChildren` pueda hacer `import('./budgets/budgets.routes')` sin tener
 * que encadenar un `.then(m => m.routes)`.
 *
 * El guard vive en la ruta padre (`app.routes.ts`), no acá: un guard puesto
 * aquí dentro no evitaría la descarga del chunk, porque para leer estas rutas
 * el navegador ya tuvo que bajarlo.
 */
const routes: Routes = [{ path: '', component: BudgetList }];

export default routes;
