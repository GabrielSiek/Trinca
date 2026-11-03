import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dieta-test-'));
process.env.DB_PATH = path.join(dir, 'test.db');

const { db } = await import('../src/db.ts');
const { ALIASES } = await import('../src/foods/aliases.ts');
const { mapHit } = await import('../src/foods/off.ts');
const { parseMeal } = await import('../src/foods/parse.ts');
const { findByName, searchLocal } = await import('../src/foods/search.ts');

after(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const summary = async (text: string) => (await parseMeal(text)).map((r) => [r.food?.name ?? null, r.qty, r.unit]);

test('the example in the design resolves to its seven foods and amounts', async () => {
  const rows = await summary('PF no restaurante: uns 150 g de frango grelhado, arroz, feijão, um pouco de farofa e salada com azeite. Uma Coca Zero.');
  assert.deepEqual(rows, [
    ['Frango, peito, sem pele, grelhado', 150, 'g'],
    ['Arroz, tipo 1, cozido', 150, 'g'],
    ['Feijão, carioca, cozido', 100, 'g'],
    ['Mandioca, farofa, temperada', 30, 'g'],
    ['Alface, crespa, crua', 80, 'g'],
    ['Azeite, de oliva, extra virgem', 5, 'ml'],
    ['Refrigerante cola zero', 350, 'ml'],
  ]);
});

test('counts, household measures, decimals and big units', async () => {
  assert.deepEqual(await summary('2 ovos, 3 fatias de pão integral'), [
    ['Ovo, de galinha, inteiro, cozido/10minutos', 100, 'g'],
    ['Pão, trigo, forma, integral', 75, 'g'],
  ]);
  assert.deepEqual(await summary('2 colheres de sopa de azeite'), [['Azeite, de oliva, extra virgem', 30, 'ml']]);
  assert.deepEqual(await summary('1 colher de chá de açúcar'), [['Açúcar, refinado', 5, 'g']]);
  assert.deepEqual(await summary('1,5 kg de batata'), [['Batata, inglesa, cozida', 1500, 'g']]);
  assert.deepEqual(await summary('dois pães franceses'), [['Pão, trigo, francês', 100, 'g']]);
  assert.deepEqual(await summary('bastante arroz'), [['Arroz, tipo 1, cozido', 225, 'g']]);
});

test('the longest alias wins', async () => {
  assert.deepEqual(await summary('pão de queijo'), [['Pão, de queijo, assado', 50, 'g']]);
  assert.deepEqual(await summary('arroz integral'), [['Arroz, integral, cozido', 150, 'g']]);
  assert.deepEqual(await summary('batata frita'), [['Batata, inglesa, frita', 100, 'g']]);
});

test('every alias points at a food that exists', () => {
  for (const alias of ALIASES) assert.ok(findByName(alias.food), `sem alimento: ${alias.food}`);
});

test('search ignores accents and puts everyday foods first', () => {
  assert.equal(searchLocal('feijao')[0].name, 'Feijão, carioca, cozido');
  assert.equal(searchLocal('FRANGO')[0].name, 'Frango, peito, sem pele, grelhado');
  assert.equal(searchLocal('cuscuz')[0].name, 'Cuscuz, de milho, cozido com sal');
  assert.deepEqual(searchLocal('xyzqwe'), []);
});

test('Open Food Facts hits are mapped defensively', () => {
  const food = mapHit({
    code: '7891025115595',
    product_name: 'YoPro Morango 15g',
    brands: ['YoPro'],
    quantity: '250g',
    nutriments: { 'energy-kcal_100g': 52.5, proteins_100g: 6, carbohydrates_100g: 3.69, fat_100g: '0' },
  });
  assert.deepEqual(food, {
    id: null, name: 'YoPro Morango 15g', brand: 'YoPro', source: 'Open Food Facts', sourceRef: '7891025115595', unit: 'g', kcal: 52.5, p: 6, c: 3.7, g: 0,
  });
  assert.equal(mapHit({ code: '1', product_name: 'Sem dados', nutriments: {} }), null);
  assert.equal(mapHit({ code: '1', nutriments: { 'energy-kcal_100g': 10 } }), null);
  assert.equal(mapHit({ code: '1', product_name: 'Só kJ', nutriments: { energy_100g: 418.4 } })?.kcal, 100);
  assert.equal(mapHit({ code: '1', product_name: 'Absurdo', nutriments: { 'energy-kcal_100g': 5000 } }), null);
  assert.equal(mapHit({ code: '1', product_name: 'Suco', quantity: '1 L', nutriments: { 'energy-kcal_100g': 40 } })?.unit, 'ml');
});
