import { saveState, state } from '../lib/planner-state';

function updateButtons() {
	document.querySelectorAll<HTMLButtonElement>('[data-menu-recipe]').forEach((button) => {
		const selected = state.menu.includes(button.dataset.menuRecipe!);
		button.textContent = selected ? '✓ Added to menu' : '+ Add to menu';
		button.setAttribute('aria-pressed', String(selected));
		button.setAttribute('aria-label', `${selected ? 'Remove' : 'Add'} ${button.dataset.recipeTitle} ${selected ? 'from' : 'to'} menu`);
	});
	document.querySelectorAll('[data-menu-count]').forEach((label) => {
		label.textContent = `${state.menu.length} recipe${state.menu.length === 1 ? '' : 's'}`;
	});
}

document.querySelectorAll<HTMLButtonElement>('[data-menu-recipe]').forEach((button) => {
	button.addEventListener('click', () => {
		const id = button.dataset.menuRecipe!;
		const selected = state.menu.includes(id);
		state.menu = selected ? state.menu.filter((entry) => entry !== id) : [...state.menu, id];
		saveState();
		const status = document.querySelector('[data-menu-status]') ?? document.querySelector('#planner-status');
		if (status) status.textContent = `${button.dataset.recipeTitle} ${selected ? 'removed from' : 'added to'} your menu.`;
	});
});
window.addEventListener('planner-change', updateButtons);
updateButtons();
