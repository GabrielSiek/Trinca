import type { Food } from '../../../shared/types.ts';
import { db } from '../db.ts';
import { parseMeal } from '../foods/parse.ts';
import { searchOff } from '../foods/off.ts';
import { saveFood, searchLocal } from '../foods/search.ts';
import { badRequest, requireNumber, requireText, type Router } from '../http.ts';

export function foodRoutes(router: Router) {
  router.get('/api/foods/search', ({ query }) => searchLocal(query.get('q') ?? ''));

  router.get('/api/foods/external', ({ query }) => searchOff(query.get('q') ?? ''));

  router.post('/api/foods/parse', ({ body }) => parseMeal(requireText(body.text, 'texto', 2000)));

  // Stores a label typed by hand, or an Open Food Facts product the user picked.
  router.post('/api/foods', ({ body }) => {
    const source = body.source === 'Open Food Facts' ? 'Open Food Facts' : 'Rótulo';
    if (source === 'Open Food Facts' && !body.sourceRef) badRequest('Produto sem código');
    const food: Omit<Food, 'id'> = {
      name: requireText(body.name, 'nome', 120),
      brand: typeof body.brand === 'string' ? body.brand.slice(0, 80) : null,
      source,
      sourceRef: source === 'Open Food Facts' ? String(body.sourceRef) : null,
      unit: body.unit === 'ml' ? 'ml' : 'g',
      kcal: requireNumber(body.kcal, 'calorias', 0, 950),
      p: requireNumber(body.p, 'proteína', 0, 100),
      c: requireNumber(body.c, 'carboidrato', 0, 100),
      g: requireNumber(body.g, 'gordura', 0, 100),
    };
    return saveFood(food);
  });

  router.post('/api/foods/:id/used', ({ params }) => {
    db.prepare('UPDATE foods SET uses = uses + 1 WHERE id = ?').run(Number(params.id));
  });
}
