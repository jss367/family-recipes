import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const recipes = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/recipes' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		image: z.string(),
		imageAlt: z.string(),
		category: z.string(),
		tags: z.array(z.string()).default([]),
		prepTime: z.number().int().nonnegative(),
		cookTime: z.number().int().nonnegative(),
		servings: z.number().int().positive(),
		author: z.string().optional(),
		dateAdded: z.coerce.date(),
		ingredients: z.union([
			z.array(z.string().min(1)).min(1),
			z.array(z.object({
				heading: z.string().min(1),
				items: z.array(z.string().min(1)).min(1),
			})).min(1),
		]),
	}).transform((recipe) => ({
		...recipe,
		ingredientGroups: typeof recipe.ingredients[0] === 'string'
			? []
			: recipe.ingredients as { heading: string; items: string[] }[],
		// Keep search, pantry matching, and grocery lists independent of headings.
		ingredients: recipe.ingredients.flatMap((item) => typeof item === 'string' ? [item] : item.items),
	})),
});

export const collections = { recipes };
