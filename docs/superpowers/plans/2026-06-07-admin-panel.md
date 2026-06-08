# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate `/admin/*` management interface for CodeLab with its own shell, CRUD for problems/topics, read-only users/submissions pages, and resilient frontend data handling against the current backend contracts.

**Architecture:** Add a route-separated admin shell in `src/App.tsx`, implement admin-specific API/hooks/components under `src/features/admin/`, and fill the missing UI primitives in `src/shared/components/ui/` so the admin experience can mirror `shadcn-admin` patterns without adding new dependencies. Use local admin types and defensive normalization so pages stay stable even when backend payloads omit richer joined fields.

**Tech Stack:** React 19, TypeScript, React Router, TanStack Query v5, Zustand auth store, existing Axios client, Tailwind CSS, Lucide, Sonner, react-hook-form, zod.

---

### Task 1: Add missing admin UI primitives

**Files:**
- Create: `frontend/src/shared/components/ui/table.tsx`
- Create: `frontend/src/shared/components/ui/alert-dialog.tsx`
- Create: `frontend/src/shared/components/ui/sidebar.tsx`
- Modify: `frontend/src/shared/components/ui/index.ts`

- [ ] Implement lightweight `Table`, `AlertDialog`, and `Sidebar` primitives compatible with the repo’s current `shared/ui` conventions and no new dependencies.
- [ ] Export the new primitives from `frontend/src/shared/components/ui/index.ts`.
- [ ] Verify the new primitives type-check by running `npm run build` after the feature wiring is complete.

### Task 2: Add admin route constants and shared admin data helpers

**Files:**
- Modify: `frontend/src/app/router/routes.ts`
- Create: `frontend/src/features/admin/api/types.ts`

- [ ] Add `ADMIN`, `ADMIN_PROBLEMS`, `ADMIN_TOPICS`, `ADMIN_USERS`, and `ADMIN_SUBMISSIONS` route constants and helper builders where useful.
- [ ] Define admin-local request/response/types in `frontend/src/features/admin/api/types.ts`.
- [ ] Include normalization helpers for defensive handling of missing optional backend fields.

### Task 3: Implement admin API modules and React Query hooks

**Files:**
- Create: `frontend/src/features/admin/api/problems.ts`
- Create: `frontend/src/features/admin/api/topics.ts`
- Create: `frontend/src/features/admin/api/users.ts`
- Create: `frontend/src/features/admin/api/submissions.ts`
- Create: `frontend/src/features/admin/hooks/useAdminProblems.ts`
- Create: `frontend/src/features/admin/hooks/useAdminTopics.ts`
- Create: `frontend/src/features/admin/hooks/useAdminUsers.ts`
- Create: `frontend/src/features/admin/hooks/useAdminSubmissions.ts`

- [ ] Build thin API wrappers on top of the shared Axios client.
- [ ] Implement query hooks and mutations with `["admin", ...]` query keys and proper invalidation.
- [ ] Surface mutation success with toasts and preserve actionable error messages for dialogs/pages.

### Task 4: Implement shared admin components

**Files:**
- Create: `frontend/src/features/admin/components/AdminSidebar.tsx`
- Create: `frontend/src/features/admin/components/AdminDataTable.tsx`
- Create: `frontend/src/features/admin/components/ConfirmDialog.tsx`

- [ ] Build the admin sidebar with active nav, collapse support, mobile drawer behavior, and current-user footer.
- [ ] Build a reusable admin table with loading skeletons, empty state, and simple prev/next pagination.
- [ ] Build a reusable confirmation dialog for destructive actions.

### Task 5: Implement admin pages

**Files:**
- Create: `frontend/src/features/admin/pages/AdminLayout.tsx`
- Create: `frontend/src/features/admin/pages/OverviewPage.tsx`
- Create: `frontend/src/features/admin/pages/ProblemsPage.tsx`
- Create: `frontend/src/features/admin/pages/TopicsPage.tsx`
- Create: `frontend/src/features/admin/pages/UsersPage.tsx`
- Create: `frontend/src/features/admin/pages/SubmissionsPage.tsx`

- [ ] Add the separate admin shell layout with route-derived breadcrumb/title.
- [ ] Implement overview cards using the admin queries.
- [ ] Implement problems/topics CRUD pages with dialog forms, slug auto-fill, URL-backed search, and delete confirmation.
- [ ] Implement users/submissions read-only pages, keeping submissions constrained to safe filters and ID fallbacks.

### Task 6: Wire admin routes into the app shell

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] Add lazy-loaded admin pages and `AdminRoute`.
- [ ] Split admin routing away from the public `Header`/`Footer` shell.
- [ ] Ensure `/admin/*` pages render full-height without the public site `main` width wrapper.

### Task 7: Verify and clean up

**Files:**
- Modify: any touched files as needed from verification results

- [ ] Run `npm run build` in `frontend/` and fix TypeScript/build issues.
- [ ] Run `npm run lint` in `frontend/` if the codebase remains lint-clean enough for the admin changes to be meaningful.
- [ ] Review the final UI logic for accessibility basics: Escape on dialogs, icon button labels, safe empty states, and disabled pagination boundaries.
