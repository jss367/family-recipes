import { coverage, groceryList, inPantry, parsePantry, type GroceryItem, type PlannerRecipe } from '../lib/ingredients';
import { saveState, state } from '../lib/planner-state';

const recipes: PlannerRecipe[] = JSON.parse(document.querySelector('#planner-data')!.textContent!);
const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pantryInput = get<HTMLInputElement>('pantry-input');
const search = get<HTMLInputElement>('recipe-search');
const cards = [...document.querySelectorAll<HTMLElement>('[data-recipe-card]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('.filter-button[data-category]')];
const weeklyMenu = get<HTMLDetailsElement>('weekly-menu');
const status = get('planner-status');
let selectedCategory = 'all';
let menuSignature = '';
let pantrySignature: string | undefined;
let groceries: GroceryItem[] = [];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
	const node = document.createElement(tag);
	if (text) node.textContent = text;
	if (className) node.className = className;
	return node;
}

function renderCatalog() {
	const pantry = parsePantry(state.pantry);
	const query = search.value.trim().toLowerCase();
	const ranked = cards.map((card, index) => ({ card, index, match: coverage(byId.get(card.dataset.recipeId!)!.ingredients, pantry) }));
	if (pantry.length) ranked.sort((a, b) => b.match.score - a.match.score || a.match.missing.length - b.match.missing.length || a.index - b.index);
	let visibleCount = 0;
	let matchedCount = 0;
	for (const { card, match } of ranked) {
		card.hidden = !`${card.dataset.title} ${card.dataset.tags}`.includes(query) || (selectedCategory !== 'all' && card.dataset.category !== selectedCategory);
		if (!card.hidden) { visibleCount++; if (match.matched.length) matchedCount++; }
		const result = card.querySelector<HTMLElement>('[data-match-result]')!;
		result.replaceChildren();
		result.hidden = !pantry.length;
		if (pantry.length) {
			result.append(element('p', `${match.matched.length} of ${match.total} ingredients on hand`, 'match-score'));
			const progress = element('progress');
			progress.max = match.total || 1;
			progress.value = match.matched.length;
			progress.setAttribute('aria-label', 'Ingredients on hand');
			result.append(progress);
			if (match.matched.length) result.append(element('p', `Have: ${match.matched.map((item) => item.name).join(', ')}`, 'have-ingredients'));
			if (match.missing.length) {
				const details = element('details', undefined, 'missing-ingredients');
				details.append(element('summary', `${match.missing.length} missing · See ingredients`));
				const list = element('ul');
				match.missing.forEach((item) => list.append(element('li', item.text)));
				details.append(list);
				result.append(details);
			} else result.append(element('p', 'You have every required ingredient!', 'have-ingredients'));
		}
		get('recipe-grid').append(card);
	}
	get('empty-state').hidden = visibleCount > 0;
	get('match-status').textContent = pantry.length
		? `${matchedCount} of ${visibleCount} recipes match your pantry. Sorted by ingredient coverage.`
		: `${visibleCount} recipes to make and share.`;
	get('clear-pantry').hidden = !state.pantry;
}

function renderMenu() {
	const selected = state.menu.map((id) => byId.get(id)).filter((recipe): recipe is PlannerRecipe => !!recipe);
	const signature = JSON.stringify(selected.map((recipe) => recipe.id));
	if (signature !== menuSignature) {
		menuSignature = signature;
		groceries = groceryList(selected);
		state.checked = state.checked.filter((key) => groceries.some((item) => item.checkKey === key));
		const menu = get('menu-list');
		menu.replaceChildren();
		selected.forEach((recipe) => {
			const item = element('li');
			const info = element('div');
			const link = element('a', recipe.title);
			link.href = recipe.url;
			info.append(link, element('p', `Serves ${recipe.servings}`, 'helper-text'));
			const remove = element('button', 'Remove', 'text-button');
			remove.type = 'button';
			remove.setAttribute('aria-label', `Remove ${recipe.title} from menu`);
			remove.addEventListener('click', () => {
				const index = state.menu.indexOf(recipe.id);
				state.menu = state.menu.filter((id) => id !== recipe.id);
				saveState();
				status.textContent = `${recipe.title} removed from your menu.`;
				const buttons = menu.querySelectorAll('button');
				(buttons[Math.min(index, buttons.length - 1)] ?? weeklyMenu.querySelector('summary'))?.focus();
			});
			item.append(info, remove);
			menu.append(item);
		});
		const list = get('grocery-list');
		list.replaceChildren();
		groceries.forEach((item, index) => {
			const row = element('li');
			const label = element('label', undefined, 'grocery-label');
			const checkbox = element('input');
			checkbox.type = 'checkbox';
			checkbox.dataset.checkKey = item.checkKey;
			checkbox.id = `grocery-${index}`;
			checkbox.addEventListener('change', () => {
				state.checked = checkbox.checked ? [...state.checked, item.checkKey] : state.checked.filter((key) => key !== item.checkKey);
				saveState();
			});
			const description = element('span');
			description.append(element('strong', item.name, 'ingredient-name'));
			if (item.optional) description.append(element('span', 'Optional', 'optional-label'));
			description.append(element('span', item.amounts.join(' + '), 'grocery-amount'));
			label.append(checkbox, description);
			const details = element('details', undefined, 'grocery-sources');
			details.append(element('summary', `Recipe details (${item.sources.length})`));
			const sources = element('ul');
			item.sources.forEach((source) => sources.append(element('li', `${source.recipe}: ${source.text}`)));
			details.append(sources);
			row.append(label, details);
			list.append(row);
		});
	}
	const pantry = parsePantry(state.pantry);
	get<HTMLButtonElement>('check-pantry').disabled = !groceries.some((item) => inPantry(item.ingredient, pantry) && !state.checked.includes(item.checkKey));
	get<HTMLButtonElement>('reset-checks').disabled = !state.checked.length;
	let remaining = 0;
	document.querySelectorAll<HTMLInputElement>('[data-check-key]').forEach((checkbox) => {
		checkbox.checked = state.checked.includes(checkbox.dataset.checkKey!);
		checkbox.closest('li')!.classList.toggle('is-checked', checkbox.checked);
		if (!checkbox.checked) remaining++;
	});
	get('menu-empty').hidden = !!selected.length;
	get('grocery-empty').hidden = !!selected.length;
	get('grocery-tools').hidden = !selected.length;
	get('clear-menu').hidden = !selected.length;
	get('grocery-count').textContent = selected.length ? `${remaining} of ${groceries.length} left` : '';
	get<HTMLButtonElement>('copy-groceries').disabled = !remaining;
}

function render() {
	if (pantrySignature !== state.pantry) {
		pantrySignature = state.pantry;
		pantryInput.value = state.pantry;
		renderCatalog();
	}
	renderMenu();
}

get('pantry-form').addEventListener('submit', (event) => {
	event.preventDefault();
	state.pantry = pantryInput.value.trim();
	saveState();
	status.textContent = state.pantry ? 'Pantry updated. Your closest recipe matches are below.' : 'Pantry cleared. Showing all recipes.';
});
get('clear-pantry').addEventListener('click', () => {
	state.pantry = '';
	saveState();
	pantryInput.focus();
	status.textContent = 'Pantry cleared. Showing all recipes.';
});
search.addEventListener('input', renderCatalog);
filters.forEach((button) => button.addEventListener('click', () => {
	selectedCategory = button.dataset.category!;
	filters.forEach((filter) => {
		filter.classList.toggle('active', filter === button);
		filter.setAttribute('aria-pressed', String(filter === button));
	});
	renderCatalog();
}));
get('clear-menu').addEventListener('click', () => {
	state.menu = [];
	state.checked = [];
	saveState();
	status.textContent = 'Menu cleared. Choose recipes below for a new week.';
	weeklyMenu.querySelector('summary')?.focus();
});
get('check-pantry').addEventListener('click', () => {
	const pantry = parsePantry(state.pantry);
	state.checked = [...new Set([...state.checked, ...groceries.filter((item) => inPantry(item.ingredient, pantry)).map((item) => item.checkKey)])];
	saveState();
	status.textContent = 'Pantry matches checked off. Check the amounts to make sure you have enough.';
});
get('reset-checks').addEventListener('click', () => { state.checked = []; saveState(); });
get('copy-groceries').addEventListener('click', async () => {
	const remaining = groceries.filter((item) => !state.checked.includes(item.checkKey));
	const text = ['This week’s grocery list', ...remaining.map((item) => `☐ ${item.name}${item.optional ? ' (optional)' : ''} — ${item.amounts.join(' + ')}`)].join('\n');
	try {
		await navigator.clipboard.writeText(text);
		status.textContent = 'Remaining grocery list copied.';
	} catch {
		// A selectable fallback also works when clipboard permission is unavailable.
		let fallback = document.querySelector<HTMLTextAreaElement>('#copy-fallback');
		if (!fallback) {
			fallback = element('textarea');
			fallback.id = 'copy-fallback';
			fallback.setAttribute('aria-label', 'Grocery list to copy');
			fallback.readOnly = true;
			get('grocery-tools').append(fallback);
		}
		fallback.value = text;
		fallback.focus();
		fallback.select();
		status.textContent = 'Select and copy your grocery list from the text box.';
	}
});
function openMenuFromHash() { if (location.hash === '#weekly-menu') weeklyMenu.open = true; }
document.querySelector('.menu-link')?.addEventListener('click', () => { weeklyMenu.open = true; });
window.addEventListener('hashchange', openMenuFromHash);
window.addEventListener('planner-change', render);
state.menu = state.menu.filter((id) => byId.has(id));
render();
openMenuFromHash();
