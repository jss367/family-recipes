export interface PlannerState {
	pantry: string;
	menu: string[];
	checked: string[];
}

const storageKey = 'family-recipes:planner:v1';
const emptyState = (): PlannerState => ({ pantry: '', menu: [], checked: [] });

export function readState(): PlannerState {
	try {
		const state: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
		if (!state || typeof state !== 'object') return emptyState();
		const raw = state as Partial<PlannerState>;
		return {
			pantry: typeof raw.pantry === 'string' ? raw.pantry : '',
			menu: Array.isArray(raw.menu) ? [...new Set(raw.menu.filter((id): id is string => typeof id === 'string'))] : [],
			checked: Array.isArray(raw.checked) ? raw.checked.filter((id): id is string => typeof id === 'string') : [],
		};
	} catch { return emptyState(); }
}

export let state = readState();

export function saveState(): void {
	let saved = true;
	try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { saved = false; }
	document.querySelectorAll('[data-storage-note]').forEach((note) => {
		note.textContent = saved ? 'Saved in this browser.' : 'Browser storage is unavailable. Keep this page open to keep your plan.';
	});
	window.dispatchEvent(new Event('planner-change'));
}

window.addEventListener('storage', (event) => {
	if (event.key === storageKey || event.key === null) {
		state = readState();
		window.dispatchEvent(new Event('planner-change'));
	}
});
