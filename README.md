# Family Recipes

A personal family cookbook built with Astro and Markdown, hosted on GitHub Pages.

## Add a recipe

1. Duplicate a file in `src/content/recipes/`.
2. Update the recipe details in the frontmatter and method below it.
3. Add a landscape photo to `public/images/` and set the recipe's `image` field to its path.
4. Commit and push. GitHub Actions will rebuild the site automatically.

The content schema is defined in `src/content.config.ts`. It checks required fields during the build so incomplete recipes are caught before deployment.

## Develop locally

```sh
npm install
npm run dev
```

Run validation and a production build before pushing:

```sh
npm run check
npm run build
```

## Deployment

The workflow in `.github/workflows/deploy.yml` deploys pushes to `main` through GitHub Pages. The site is configured for:

`[https://jss367.github.io/family-recipes/](https://jss367.github.io/family-recipes/)`

Generated recipe photography was created specifically for this project with OpenAI's built-in image generation tool.
