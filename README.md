# Keerthana & Julius' Family Favorite Recipes

A personal family cookbook built with Astro and Markdown, hosted on GitHub Pages.

## Add a recipe

1. Duplicate a file in `src/content/recipes/`.
2. Update the recipe details in the frontmatter and method below it.
3. Add a landscape photo to `public/images/` and set the recipe's `image` field to its path.
4. Commit and push. GitHub Actions will rebuild the site automatically.

The content schema is defined in `src/content.config.ts`. It checks required fields during the build so incomplete recipes are caught before deployment.

## Pantry and weekly menu

Enter comma-separated pantry ingredients on the home page to rank recipes by the proportion of required ingredients on hand. Open a recipe’s missing-ingredients list to see what else you need. Water, ice, and explicitly optional ingredients are excluded from the ranking. Matching checks ingredient names, not available quantities, and recognizes common varieties and aliases.

Use **Add to menu** on recipe cards or recipe pages, then open **This week’s menu & grocery list**. The checklist combines ingredients for one batch of each selected recipe at its listed serving size. Compatible quantities are totaled; ranges, alternatives, and other complex amounts retain their original wording and recipe details. Check items individually or use **Check off pantry matches**, then copy the remaining shopping list.

The pantry, menu, and checklist are saved in local browser storage and do not sync across devices. Clearing the menu starts a new plan without clearing the pantry. Changing the recipes contributing to a grocery item resets that item’s checkmark so its new quantity can be reviewed.

## Develop locally

```sh
npm install
npm run dev
```

Run validation and a production build before pushing:

```sh
npm run check
npm test
npm run build
```

## Deployment

The workflow in `.github/workflows/deploy.yml` deploys pushes to `main` through GitHub Pages. The site is configured for:

[https://jss367.github.io/family-recipes/](https://jss367.github.io/family-recipes/)

Generated recipe photography was created specifically for this project with OpenAI's built-in image generation tool.
