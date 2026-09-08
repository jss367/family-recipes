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
		ingredients: z.array(z.string()),
	}),
});

export const collections = { recipes };
