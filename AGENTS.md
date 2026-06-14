# Repository Guidelines

## Project Structure & Module Organization
This repository contains a local-first Electron Markdown viewer built with Electron Vite, React, and TypeScript.

- `src/main/`: Electron main process code for file access, IPC, menus, PDF export, and security policy.
- `src/preload/`: preload bridge and renderer API types.
- `src/renderer/`: renderer entry files; `src/renderer/src/` holds React UI, styles, and Markdown helpers.
- `src/shared/`: shared document types and IPC channels.
- `tests/e2e/`: Playwright stage tests for app workflows.
- `tests/fixtures/markdown/`: Markdown samples used by tests.
- `tests/stage8/`: packaging checks.
- `build/`: installer resources, icons, and NSIS script.
- `docs/`: implementation notes and walkthroughs.

Do not commit generated folders: `out/`, `release/`, `test-results/`, `playwright-report/`, or `node_modules/`.

## Build, Test, and Development Commands

- `npm run dev`: start the Electron Vite app.
- `npm run typecheck`: run TypeScript with `--noEmit`.
- `npm run build`: typecheck and build main, preload, and renderer output into `out/`.
- `npm run dist`: build and package the Windows NSIS installer into `release/`.
- `npm test`: run Vitest tests under `src` plus stage 8 packaging tests.
- `npm run test:e2e:stage7`: run a specific Playwright stage; replace the stage number as needed.
- `npm run preview`: preview the built app.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode. Follow the existing two-space indentation, single quotes, semicolons, and named exports. Keep IPC names centralized in `src/shared/ipcChannels.ts`. Use `camelCase` for functions and variables, `PascalCase` for React components and types, and `UPPER_SNAKE_CASE` for IPC channel keys.

## Testing Guidelines
Place focused unit tests beside the implementation as `*.test.ts` or `*.test.tsx`. Put end-to-end workflow tests in `tests/e2e/stageN.spec.ts`. Update `tests/fixtures/markdown/` when Markdown behavior changes. Run `npm test` before submitting; run the relevant `test:e2e:stageN` command for UI, menu, file, or packaging workflow changes.

## Commit & Pull Request Guidelines
Recent history uses concise subjects, often with `feat:`, `fix:`, `chore:`, or `refactor:`. Keep commits scoped and describe the outcome. Pull requests should include a short summary, linked issue or task when available, tests run, and screenshots or recordings for renderer UI changes. Mention installer or file-association impact when touching `build/` or packaging settings.

## Security & Configuration Tips
Keep local file reads, writes, image resolution, and external link handling behind main-process or preload APIs. Preserve extension checks for `.md` and `.markdown`, avoid widening IPC exposure, and document any new filesystem capability with tests.
