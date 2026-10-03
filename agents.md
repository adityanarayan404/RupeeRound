# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately
- The port is strict (`strictPort: true`); don't start a second dev server

## Toolchain

- Node.js 22 and pnpm 10, pinned in `.mise.toml`
- Use `pnpm` for installs and scripts (`pnpm-lock.yaml` is the lockfile); don't use npm or yarn
- Scripts: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm format` (oxfmt)

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `tsconfig.json` - Strict TypeScript config; `@/*` maps to `./src/*`
- `.mise.toml` - Toolchain versions for Node.js and pnpm
- `.figma/make/site.json` - Site metadata (title, description, language, favicon, Open Graph image, analytics, custom scripts)

## Figma Make specifics

- `index.html` contains `<!-- figma:* -->` comment slots (`figma:lang`, `figma:title`, `figma:head-start`, etc.). Don't edit or remove them; `vite.config.ts` fills them from `.figma/make/site.json`. Change the page title, description, language or favicon in `site.json`, not in `index.html`.
- Files matching `src/**/*.stories.{ts,tsx,js,jsx}` are registered with the Figma Make design surface. Keep that naming for component stories.
- Don't modify the Figma plugins in `vite.config.ts` or anything under `.figma/` unless the task is explicitly about them.
- When moving a component to a new file, update its imports rather than leaving the old module as a bare re-export.

## Dependencies

- Runtime: React 19 and React DOM 19
- Routing: React Router v7 (`react-router`)
- Charts: Recharts v3
- Icons: `lucide-react`
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

Prefer these libraries over adding new ones for the same job.

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Assets

Images, fonts, video, audio, archives and other binary files are tracked with Git LFS (see `.gitattributes`). Make sure Git LFS is installed before committing them.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Import from `src` with the `@/` alias (for example `@/components/Header`) rather than long relative paths.
- TypeScript runs in strict mode; keep code type-safe and avoid `any`.
