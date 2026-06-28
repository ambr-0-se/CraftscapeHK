# Repository Guidelines

## Project Structure & Module Organization
- Frontend React and TypeScript code lives at the repository root: UI components in `components/`, routed screens in `pages/`, reusable views in `views/`, and shared state in `contexts/`. Types centralize in `types.ts` and domain data in `constants.ts`.
- Assets for localization reside in `locales/`, while seed scripts and database helpers are kept in `seed-data.cjs`, `database.cjs`, and the mirrored `.js` builds.
- The NestJS backend is isolated under `server/` (see its own `README.md`).
- MVP production-readiness objectives are tracked in `docs/MVP_OBJECTIVE_TRACKER.md`. When starting or finishing work in a concurrent worktree, update the relevant objective status, worktree name, owner, date, and notes.

## Build, Test, and Development Commands
- Frontend: `npm install` then `npm run dev` launches Vite on port 3000; `npm run build` outputs production assets in `dist/`; `npm run preview` serves that build locally.
- Backend: from `server/`, run `npm install` followed by `npm run start:dev` for live reload, `npm run build` for production output, and `npm run start:prod` to boot the compiled server. Use `npm run seed` to populate local data and `npm run lint`/`npm run format` before submitting changes.
- For lightweight API testing, run `npm run dev:stack` and hit the NestJS endpoints on http://localhost:3001.

## Concurrent Objective Workflow
- Before implementing any MVP objective, confirm the objective, exact scope, acceptance requirements, likely touched files/systems, dependencies, and explicit out-of-scope items with the user. Do not start production code edits until this kickoff is confirmed.
- Each worktree should own one primary objective from `docs/MVP_OBJECTIVE_TRACKER.md`. Mark it `In Progress` with the worktree name before coding, and update status/notes when pausing, handing off, opening review, or completing work.
- For UI/UX changes, follow `DESIGN.md` and create a lightweight standalone HTML design preview before modifying React production code. Get user approval on the preview first. This applies to onboarding, booking, checkout, artisan dashboard, co-creation approval, listings, profiles, messaging, and major empty/error/success states.
- Tiny UI fixes are exempt from the HTML preview gate only when they do not alter layout, flow, visual direction, or design system behavior.
- Do not invent private shared contracts in isolated worktrees. Coordinate changes to shared types/statuses for events-as-workshops, bookings, orders, payments, co-creation requests, and messages before implementation.

## Coding Style & Naming Conventions
- Use TypeScript throughout; favor explicit interfaces exported from `types.ts` and `enums.ts`. React components and files follow `PascalCase`, while hooks, helper functions, and variables remain in `camelCase`.
- Indent with two spaces and prefer multiline readability over inline nesting. Co-locate component-specific styles or assets beside the component.
- Keep copy strings in `locales/` and route shared constants through `constants.ts` to avoid drift.

## Testing Guidelines
- Backend tests use Jest; place unit specs alongside source files as `*.spec.ts` and run `npm run test` or `npm run test:cov` inside `server/` to keep coverage healthy and catch regressions early.
- The frontend currently relies on type safety and manual QA. When adding UI logic, include lightweight integration coverage (e.g., Playwright or Vitest) and ensure `npm run build` passes before opening a PR.

## Commit & Pull Request Guidelines
- Suggest commit title at the end of each large change, but no need to automatically run the git add and push command.
- Follow conventional commits observed in history (`refactor:`, `feat:`, `UX:`) and write imperative, present-tense summaries under 72 characters.
- Each PR should describe scope, testing performed (`npm run build`, `npm run test`, etc.), and link related issues. Attach UI screenshots or recordings whenever you alter user-facing flows and call out localization updates so reviewers can verify both languages.
