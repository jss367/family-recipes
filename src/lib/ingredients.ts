export interface Ingredient {
	text: string;
	name: string;
	key: string;
	optional: boolean;
	quantity?: { amount: number; unit: string };
}

export interface PlannerRecipe {
	id: string;
	title: string;
	servings: number;
	url: string;
	ingredients: string[];
}

const number = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
const amountPattern = new RegExp(`^(${number})(?:\\s*(?:to|–|-)\\s*${number})?\\s*`);
const units: Record<string, [string, number]> = {
	tsp: ['tsp', 1], teaspoon: ['tsp', 1], teaspoons: ['tsp', 1],
	tbsp: ['tsp', 3], tablespoon: ['tsp', 3], tablespoons: ['tsp', 3],
	cup: ['tsp', 48], cups: ['tsp', 48],
	g: ['g', 1], gram: ['g', 1], grams: ['g', 1], kg: ['g', 1000],
	oz: ['oz', 1], ounce: ['oz', 1], ounces: ['oz', 1], lb: ['oz', 16], pounds: ['oz', 16],
	clove: ['cloves', 1], cloves: ['cloves', 1],
	can: ['cans', 1], cans: ['cans', 1], stick: ['sticks', 1], sticks: ['sticks', 1],
	bunch: ['bunches', 1], bunches: ['bunches', 1], head: ['heads', 1], heads: ['heads', 1],
	sprig: ['sprigs', 1], sprigs: ['sprigs', 1], stalk: ['stalks', 1], stalks: ['stalks', 1],
	scoop: ['scoops', 1], scoops: ['scoops', 1], sheet: ['sheets', 1], sheets: ['sheets', 1],
};

function value(raw: string): number {
	return raw.split(/\s+/).reduce((total, part) => {
		const [n, d = '1'] = part.split('/');
		return total + Number(n) / Number(d);
	}, 0);
}

export function normalizeName(raw: string): string {
	return raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[’']/g, '').replace(/-/g, ' ')
		.replace(/\bfresh or frozen\b/g, '')
		.replace(/\b(extra virgin|low sodium|no salt added|full fat|high protein|plant based)\b/g, (word) => word === 'plant based' ? 'plant' : '')
		.replace(/\b(fresh|frozen|raw|dry|cold|warm|large|medium|small|ripe|packed|chopped|finely|roughly|thinly|sliced|grated|shredded|peeled|shelled|creamy|unsweetened|plain|baby)\b/g, '')
		.replace(/\b(kosher|sea|fine) salt\b/g, 'salt')
		.replace(/\bgarlic cloves?\b/g, 'garlic')
		.replace(/\bgarbanzo beans?\b/g, 'chickpea')
		.replace(/\bsemolina\b/g, 'rava')
		.replace(/\btapioca pearls\b/g, 'sabudana')
		.replace(/\b(?:yellow|white) onions?\b/g, 'onion')
		.replace(/\bscallions?\b/g, 'green onion')
		.replace(/\bvegetable stock\b/g, 'vegetable broth')
		.replace(/\bconfectioners sugar\b/g, 'powdered sugar')
		.replace(/\b(?:granulated|cane) sugar\b/g, 'sugar')
		.replace(/\b(?:old fashioned )?rolled oats\b/g, 'oats')
		.replace(/\bcilantro leaves(?: and tender stems)?\b/g, 'cilantro')
		.replace(/\bbasil leaves\b/g, 'basil')
		.replace(/\b(?:fresh )?mint leaves\b/g, 'mint')
		.replace(/\bground (cumin|coriander|cinnamon|cardamom|nutmeg|turmeric|cloves)\b/g, '$1')
		.replace(/\bcurry leaves\b/g, 'curry leaf')
		.replace(/\bkale leaves\b/g, 'kale')
		.replace(/\b(cauliflower|broccoli) florets\b/g, '$1')
		.replace(/\bcelery stalks\b/g, 'celery')
		.replace(/\bcoriander leaves\b/g, 'cilantro')
		.replace(/\bmilk of choice\b/g, 'milk')
		.replace(/\b(?:pieces|piece|block|of)\b/g, '')
		.replace(/\b(tomato|potato)es\b/g, '$1')
		.replace(/\bpeaches\b/g, 'peach')
		.replace(/\b(blueberr|raspberr|blackberr|strawberr|berr)ies\b/g, '$1y')
		.replace(/\b(onion|pepper|carrot|egg|lemon|lime|bean|lentil|chickpea|cashew|walnut|pecan|hazelnut|seed|shallot|mushroom|banana|tortilla|date|peach|clove|jalapeno)s\b/g, '$1')
		.replace(/\s+/g, ' ').trim();
}

export function parseIngredient(text: string): Ingredient {
	// Strip preparation notes, but retain lists such as “sour cream, avocado, and cheese”.
	let name = text.replace(/\([^)]*\)/g, '').split(';')[0]!.split(/,\s*(?:divided|finely|thinly|roughly|chopped|sliced|shredded|grated|minced|peeled|pitted|diced|cubed|cored|cut|broken|halved|rinsed|drained|crushed|zested|juiced|softened|melted|toasted|torn|thawed|mixed|one\b|for\b|plus\b|to\b|as needed|preferably|ripe|woody|stems|large stems|well.stirred|unsweetened|assorted|slit|flaky|florets|remove)/i)[0]!.trim();
	const approximate = /^(?:scant|about|pinch|handful)\b/i.test(name);
	name = name.replace(/^(?:scant|about)\s+/i, '');
	const match = name.match(amountPattern);
	let quantity: Ingredient['quantity'];
	if (match) {
		name = name.slice(match[0].length).replace(/^packed\s+/, '');
		const unitMatch = name.match(/^([a-z]+)\b\s*/i);
		const unit = unitMatch && units[unitMatch[1]!.toLowerCase()];
		if (unit) name = name.slice(unitMatch![0].length);
		const garlicCloves = /\bgarlic cloves?\b/i.test(name);
		// Keep ranges, package sizes, alternatives, and extra amounts verbatim.
		if (!approximate && match[0].trim() === match[1] && !name.includes(',') && !/\(|\bor\b|\band\b|\bplus\b|inch|\bto\b|\b(?:piece|handful|pinch|pinches)\b/i.test(text)) {
			quantity = { amount: value(match[1]!) * (unit?.[1] ?? 1), unit: unit?.[0] ?? (garlicCloves ? 'cloves' : '') };
		}
	}
	name = name.replace(/^(?:-?inch\s+)?(?:piece|handful|pinches|pinch)\s+(?:of\s+)?/i, '');
	name = normalizeName(name);
	return { text, name: name || text, key: name || text, optional: /\boptional\b/i.test(text), quantity };
}

export function recipeIngredients(lines: string[]): Ingredient[] {
	return lines.flatMap((line) => {
		// These combined staples must each be accounted for in pantry matching.
		if (/^(?:kosher )?salt and (?:black pepper|sugar),/i.test(line)) {
			return line.split(',')[0]!.split(' and ').map((part) => parseIngredient(`${part}, to taste`));
		}
		return [parseIngredient(line)];
	}).filter((item) => !/^(?:water|ice(?: cubes)?)$/.test(item.name));
}

export function parsePantry(text: string): string[] {
	return [...new Set(text.split(/[,;\n]+/).map((part) => normalizeName(part.trim())).filter(Boolean))];
}

function matchesName(name: string, pantry: string): boolean {
	if (name === pantry) return true;
	const families: Record<string, RegExp> = {
		rice: /^(?:(?:cooked|long grain|white|brown|basmati|jasmine) )*rice$/,
		tofu: /^(?:(?:extra firm|firm|silken) )?tofu$/,
		pepper: /^(?:(?:red|green|yellow|orange) )?bell pepper$/,
		'bell pepper': /^(?:(?:red|green|yellow|orange) )?bell pepper$/,
		onion: /^(?:(?:red|yellow|white) )?onion$/,
		lentil: /^(?:(?:split|red|yellow|black|green|brown) )*lentil$/,
		milk: /^(?:(?:whole|soy|almond|oat|plant|coconut) )?milk(?: choice)?$/,
		flour: /^(?:all purpose )?flour$/,
		salt: /^(?:flaky )?salt$/,
		tomato: /^(?:(?:crushed|diced|whole|peeled|or) )*tomato$/,
		chickpea: /^(?:canned )?chickpea$/,
		lemon: /^lemon(?: juice)?$/,
		lime: /^lime(?: juice)?$/,
		'curry powder': /^(?:madras )?curry powder$/,
		'sesame oil': /^(?:toasted )?sesame oil$/,
		jalapeno: /^jalapeno(?: pepper)?$/,
		serrano: /^serrano(?: pepper)?$/,
		oregano: /^(?:(?:dried|mexican) )?oregano$/,
		thyme: /^(?:dried )?thyme$/,
	};
	return families[pantry]?.test(name) ?? false;
}

export function inPantry(item: Ingredient, pantry: string[]): boolean {
	// Alternatives can be satisfied by either choice; combinations require every part.
	if (pantry.some((entry) => matchesName(item.name, entry))) return true;
	const matchesChoice = (choice: string) => pantry.some((entry) => matchesName(parseIngredient(choice).name, entry));
	if (/,\s*or\s/.test(item.name)) return item.name.split(/,\s*(?:or\s+)?|\s+or\s+/).some(matchesChoice);
	return item.name.split(/,\s*(?:and\s+)?|\s+and\s+/).every((part) => {
		const choices = part.split(/\s+or\s+/);
		const suffix = part.match(/\b(protein powder|mushroom|pepper|tomato)$/)?.[1];
		return choices.some((choice) => matchesChoice(suffix && /^(vanilla|unflavored|shiitake|white|serrano|jalapeno|crushed|diced)$/.test(choice) ? `${choice} ${suffix}` : choice));
	});
}

export function coverage(lines: string[], pantry: string[]) {
	const required = recipeIngredients(lines).filter((item) => !item.optional);
	const matched = required.filter((item) => inPantry(item, pantry));
	const missing = required.filter((item) => !inPantry(item, pantry));
	return { matched, missing, total: required.length, score: required.length ? matched.length / required.length : 0 };
}

export interface GroceryItem {
	key: string;
	checkKey: string;
	name: string;
	ingredient: Ingredient;
	optional: boolean;
	amounts: string[];
	sources: { recipe: string; text: string }[];
}

export function formatAmount(amount: number): string {
	const rounded = Math.round(amount * 100) / 100;
	const whole = Math.floor(rounded);
	const fraction = rounded - whole;
	for (const [decimal, label] of [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']] as const) {
		if (Math.abs(fraction - decimal) < 0.006) return `${whole || ''}${label}`;
	}
	return String(rounded);
}

function formatQuantity(amount: number, unit: string): string {
	if (unit === 'tsp' && amount >= 12) return `${formatAmount(amount / 48)} cups`;
	if (unit === 'tsp' && amount >= 3) return `${formatAmount(amount / 3)} tbsp`;
	return `${formatAmount(amount)} ${unit}`.trim();
}

export function groceryList(recipes: PlannerRecipe[]): GroceryItem[] {
	const groups = new Map<string, { ingredient: Ingredient; entries: { id: string; recipe: string; ingredient: Ingredient }[] }>();
	for (const recipe of recipes) for (const ingredient of recipeIngredients(recipe.ingredients)) {
		const group = groups.get(ingredient.key) ?? { ingredient, entries: [] };
		group.entries.push({ id: recipe.id, recipe: recipe.title, ingredient });
		groups.set(ingredient.key, group);
	}
	return [...groups.entries()].map(([key, { ingredient, entries }]) => {
		const totals = new Map<string, number>();
		const unmeasured = new Map<string, number>();
		for (const { ingredient: item } of entries) {
			if (item.quantity) totals.set(item.quantity.unit, (totals.get(item.quantity.unit) ?? 0) + item.quantity.amount);
			else unmeasured.set(item.text, (unmeasured.get(item.text) ?? 0) + 1);
		}
		return {
			key, name: ingredient.name, ingredient,
			checkKey: JSON.stringify([key, entries.map((entry) => [entry.id, entry.ingredient.text]).sort()]),
			optional: entries.every((entry) => entry.ingredient.optional),
			amounts: [...totals].map(([unit, amount]) => formatQuantity(amount, unit)).concat([...unmeasured].map(([text, count]) => count > 1 ? `${count} × (${text})` : text)),
			sources: entries.map((entry) => ({ recipe: entry.recipe, text: entry.ingredient.text })),
		};
	}).sort((a, b) => a.name.localeCompare(b.name));
}
