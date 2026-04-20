# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript CLI source (`src/index.ts` entrypoint plus helpers like `src/config.ts`).
- `dist/` is the compiled JavaScript output from `tsc`.
- `files/` holds sample or local document data used during development.
- `tmp/` contains scratch artifacts and should not be treated as source of truth.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run build` compiles TypeScript into `dist/`.
- `npm run package` builds and produces a native binary via `nexe`.
- `npm run package:binary` runs `nexe` directly; useful for debugging packaging issues.
- `node dist/index.js --help` runs the CLI locally after a build.

## Coding Style & Naming Conventions
- TypeScript with `strict` mode and `module` set to `NodeNext` (`tsconfig.json`).
- Indentation uses 2 spaces; files use semicolons and double quotes.
- Prefer descriptive function names (e.g., `uploadWithProgress`) and kebab-case for CLI flags.

## Testing Guidelines
- No automated test framework is configured yet.
- If you add tests, document the framework and add a script to `package.json`.
- Name new test files with a `*.test.ts` suffix and keep them near the module or in a `tests/` folder.

## Commit & Pull Request Guidelines
- Git history is informal; use short, imperative summaries with context (avoid vague messages).
- PRs should include a brief description, any relevant CLI output, and steps to validate.
- Link related issues if they exist; screenshots are generally unnecessary for this CLI.

## Configuration & Security Tips
- Runtime config lives at `~/.dockitrc.json` (created via the `config` command).
- Environment variables like `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` override config.
- Do not commit credentials or personal documents from `files/`.
