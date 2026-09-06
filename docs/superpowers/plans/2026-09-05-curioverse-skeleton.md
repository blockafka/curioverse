# Curioverse Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a parallel-friendly web/API monorepo skeleton for the Curioverse hackathon project.

**Architecture:** Use a responsive React/Vite web app, a TypeScript/Hono API, and a shared Zod contract package. Keep Zhihu and AI integrations behind provider interfaces, and keep demo fixtures available for local development and fallback demonstrations.

**Tech Stack:** React, TypeScript, Vite, Hono, Zod, npm workspaces.

## Global Constraints

- The web app must support both mobile and desktop browser viewports.
- Browser code must never contain Zhihu or AI secrets.
- The web app and API must communicate through typed JSON contracts.
- Every exploration node must expose source references.
- This skeleton must not implement the final exploration orchestration.

---

### Task 1: Create workspace and package boundaries

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `packages/contracts/package.json`

- [x] **Step 1: Define npm workspace packages**

Add `apps/*` and `packages/*` as workspaces and provide `dev:web`, `dev:api`, `typecheck`, and `build` scripts.

- [x] **Step 2: Add package-local scripts and dependencies**

Declare the React/Vite dependencies for `apps/web`, Hono dependencies for `apps/api`, and Zod for `packages/contracts`.

- [x] **Step 3: Add shared compiler and environment defaults**

Configure strict TypeScript defaults, ignore generated files and local secrets, and document `PORT`, `VITE_API_BASE_URL`, `ZHIHU_API_KEY`, and `AI_API_KEY` in `.env.example`.

- [x] **Step 4: Verify workspace metadata**

Run `node -e "const p=require('./package.json'); if (!p.workspaces || p.workspaces.length !== 2) process.exit(1)"` from the repository root. Expected: exit code `0`.

### Task 2: Add the shared exploration contract

**Files:**
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/exploration.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `fixtures/exploration-demo.json`

- [x] **Step 1: Define schemas and inferred types**

Define `SourceRefSchema`, `ExplorationNodeSchema`, `ExplorationSessionSchema`, `CreateExplorationRequestSchema`, `ChooseExplorationRequestSchema`, and `ExplorationFeedbackSchema`, then export their inferred types.

- [x] **Step 2: Add representative fixture data**

Create one valid session with story, counterpoint, and application nodes, each containing source references and choices.

- [x] **Step 3: Verify the fixture shape**

Run a TypeScript or Zod validation script after dependencies are installed. Expected: the fixture parses as an `ExplorationSession` without validation errors.

### Task 3: Add the web and API application skeletons

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/routes/exploration.ts`
- Create: `apps/api/src/domain/exploration-orchestrator.ts`
- Create: `apps/api/src/providers/zhihu-provider.ts`
- Create: `apps/api/src/providers/ai-provider.ts`
- Create: `apps/api/src/cache/response-cache.ts`

- [x] **Step 1: Add the responsive web entry point**

Create a Vite HTML entry and a minimal React screen titled `瞬悉全宇宙`; configure the Vite `/api` proxy to `http://localhost:8787`.

- [x] **Step 2: Add the typed frontend API client**

Implement `createExploration(input)` so it validates the request and response with the shared contracts.

- [x] **Step 3: Add the API health route and exploration route placeholders**

Expose `GET /health` and the four planned exploration endpoints. Return explicit `501` responses for unconnected orchestration, persistence, choices, and feedback.

- [x] **Step 4: Add provider interfaces and cache boundary**

Define independent `ZhihuProvider`, `AiProvider`, `ExplorationOrchestrator`, and `ResponseCache` interfaces so later contributors can implement each component without changing the route contract.

- [x] **Step 5: Verify the scaffold**

After installing dependencies, run `npm run typecheck` and `npm run build`. Expected: both commands exit with code `0`; the API health endpoint returns `{ "ok": true, "service": "curioverse-api" }`.

### Task 4: Document the handoff boundaries

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/superpowers/plans/2026-09-05-curioverse-skeleton.md`

- [x] **Step 1: Document local commands and ownership boundaries**

Record the package responsibilities, local ports, API key rule, source-reference rule, and parallel-development conventions.

- [x] **Step 2: Review the plan for consistency**

Confirm every path exists in the scaffold, every shared type name is consistent, and no final exploration behavior is claimed as implemented.

- [x] **Step 3: Commit the skeleton**

Run `git add .`, `git commit -m "chore: add parallel development skeleton"`, and push the current branch to the configured `origin` remote.
