import test from 'node:test';
import assert from 'node:assert/strict';
import { coverage, groceryList, inPantry, parseIngredient, parsePantry, recipeIngredients, type PlannerRecipe } from '../src/lib/ingredients.ts';

const recipe = (id: string, ingredients: string[]): PlannerRecipe => ({ id, title: id, ingredients, servings: 4, url: `/recipes/${id}/` });

test('pantry input supports plurals, aliases, case, and multiple separators', () => {
	assert.deepEqual(parsePantry(' Tofu, PEPPERS; rice\nscallions, tofu, garbanzo beans'), ['tofu', 'pepper', 'rice', 'green onion', 'chickpea']);
});

test('generic pantry ingredients match varieties without matching derived ingredients', () => {
	const pantry = parsePantry('tofu, rice, peppers, tomatoes, garlic, cumin');
	for (const line of ['200g extra-firm tofu', '1/2 cup jasmine rice', '1 red bell pepper', '14 oz crushed or diced tomatoes', '4 garlic cloves, minced', '1 tsp ground cumin']) {
		assert.equal(inPantry(parseIngredient(line), pantry), true, line);
	}
	for (const line of ['1 tsp rice vinegar', '1 tsp black pepper', '1 tsp red pepper flakes', '1 tsp garlic powder', '2 tbsp tomato paste', '1 tsp cumin seeds']) {
		assert.equal(inPantry(parseIngredient(line), pantry), false, line);
	}
});

test('alternatives accept either choice and combined staples require both', () => {
	assert.equal(inPantry(parseIngredient('1 tbsp tamari or soy sauce'), ['soy sauce']), true);
	assert.equal(inPantry(parseIngredient('Lemon juice and powdered sugar, for serving'), ['lemon juice']), false);
	const match = coverage(['Salt and black pepper, to taste'], ['salt']);
	assert.equal(match.total, 2);
	assert.deepEqual(match.missing.map((item) => item.name), ['black pepper']);
});

test('coverage excludes water, ice and optional extras, but counts required staples', () => {
	const match = coverage(['200g extra-firm tofu', '1 cup rice', '1 cup water, divided', 'Ice cubes (optional)', '1 tbsp sesame seeds (optional)', '1 tsp salt'], ['tofu', 'rice']);
	assert.equal(match.total, 3);
	assert.equal(match.score, 2 / 3);
	assert.equal(match.missing[0]?.name, 'salt');
	assert.equal(coverage(['1 cup water'], []).score, 0);
});

test('grocery list combines compatible volumes and garlic counts across recipes', () => {
	const list = groceryList([
		recipe('soup', ['1 tablespoon extra-virgin olive oil', '4 garlic cloves, minced']),
		recipe('pasta', ['2 teaspoons olive oil', '3 large garlic cloves, peeled']),
	]);
	assert.equal(list.length, 2);
	assert.deepEqual(list.find((item) => item.name === 'garlic')?.amounts, ['7 cloves']);
	assert.deepEqual(list.find((item) => item.name === 'olive oil')?.amounts, ['1⅔ tbsp']);
	assert.equal(list[0]?.sources.length, 2);
	assert.deepEqual(groceryList([recipe('a', ['200g extra-firm tofu, cubed']), recipe('b', ['200g extra-firm tofu'])])[0]?.amounts, ['400 g']);
});

test('mixed units stay explicit and package sizes, ranges, and extra amounts survive', () => {
	const list = groceryList([
		recipe('a', ['200g extra-firm tofu', '1 to 2 tablespoons coconut oil', '2 (15 oz) cans chickpeas, drained', '1 tsp salt, plus more to taste']),
		recipe('b', ['8 oz extra-firm tofu']),
	]);
	assert.deepEqual(list.find((item) => item.name === 'extra firm tofu')?.amounts, ['200 g', '8 oz']);
	assert.deepEqual(list.find((item) => item.name === 'coconut oil')?.amounts, ['1 to 2 tablespoons coconut oil']);
	assert.deepEqual(list.find((item) => item.name === 'chickpea')?.amounts, ['2 (15 oz) cans chickpeas, drained']);
	assert.deepEqual(list.find((item) => item.name === 'salt')?.amounts, ['1 tsp salt, plus more to taste']);
});

test('different preparations and foods are not merged into incorrect totals', () => {
	const list = groceryList([recipe('a', ['1 cup cooked basmati rice', '1 cup basmati rice', '1 teaspoon ground ginger', '1 teaspoon fresh ginger', '1 teaspoon cumin seeds', '1 teaspoon ground cumin', '1 tablespoon vegan butter', '1 tablespoon butter'])]);
	assert.equal(list.length, 8);
	assert.equal(parseIngredient('Pinch of ground cloves').name, 'clove');
	assert.equal(parseIngredient('1-inch piece fresh ginger').name, 'ginger');
});

test('a changed grocery quantity resets its checkbox identity; menu reordering does not', () => {
	const a = recipe('a', ['2 garlic cloves']);
	const b = recipe('b', ['3 garlic cloves']);
	assert.notEqual(groceryList([a])[0]?.checkKey, groceryList([a, b])[0]?.checkKey);
	assert.equal(groceryList([a, b])[0]?.checkKey, groceryList([b, a])[0]?.checkKey);
});

test('optional items remain optional only when every recipe marks them optional', () => {
	assert.equal(groceryList([recipe('a', ['1 tsp salt (optional)'])])[0]?.optional, true);
	assert.equal(groceryList([recipe('a', ['1 tsp salt (optional)']), recipe('b', ['1 tsp salt'])])[0]?.optional, false);
	assert.equal(recipeIngredients(['1 cup cold water', '1 cup ice']).length, 0);
});

test('comma lists retain all groceries and do not mark a whole topping list covered by one item', () => {
	const topping = parseIngredient('Vegan sour cream, avocado, scallions, shredded vegan cheese, and pickled red onions, for serving (optional)');
	assert.equal(inPantry(topping, ['vegan sour cream']), false);
	assert.equal(inPantry(topping, parsePantry('vegan sour cream, avocado, scallions, vegan cheese, pickled red onions')), true);
	assert.ok(topping.name.includes('avocado'));
	assert.equal(topping.quantity, undefined);
	assert.equal(parseIngredient('2 cups mango pulp (Alphonso mango pulp preferred, if available)').name, 'mango pulp');
	assert.equal(inPantry(parseIngredient('1 cup fresh or frozen blueberries'), parsePantry('blueberries')), true);
});

test('comma-separated alternatives and shared nouns match the actual ingredient', () => {
	const fruit = parseIngredient('12 oz fresh raspberries, blueberries, blackberries, or sliced strawberries, or 1 lb dark cherries, pitted and halved');
	assert.equal(inPantry(fruit, parsePantry('blueberries')), true);
	const powder = parseIngredient('1/2 cup vanilla or unflavored protein powder');
	assert.equal(inPantry(powder, ['vanilla']), false);
	assert.equal(inPantry(powder, ['vanilla protein powder']), true);
});

test('repeated unmeasured amounts remain counted and vague pieces are not summed as whole foods', () => {
	const list = groceryList([recipe('a', ['2 (15 oz) cans chickpeas']), recipe('b', ['2 (15 oz) cans chickpeas'])]);
	assert.deepEqual(list[0]?.amounts, ['2 × (2 (15 oz) cans chickpeas)']);
	assert.equal(parseIngredient('1 small piece fresh ginger').quantity, undefined);
	assert.equal(parseIngredient('1 pinch ground cardamom').quantity, undefined);
});
