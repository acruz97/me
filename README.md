# Angelo Cruz: Personal Site

A single-page portfolio built with React, TypeScript, Vite, and Tailwind CSS v4. Live at https://acruz97.github.io/me/

## Develop

```bash
npm install
npm run dev
```

## Edit content

All page content lives in `src/assets/`:

- `profile.tsx`: name, title, summary, links, highlight stats, and the About blurb
- `experience.tsx`: work history
- `projects.tsx`: project cards
- `skills.tsx`: skill groups
- `education.tsx`: education

Styling (light and dark themes, responsive layout, print styles) is in `src/index.css`.

## Deploy

```bash
npm run deploy
```

This builds the site and publishes `dist/` to the `gh-pages` branch.
