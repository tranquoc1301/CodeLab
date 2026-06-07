# Admin Panel Design

## Goal

Build a complete admin panel for CodeLab under `/admin/*` in the existing `frontend/` React application. The admin panel must follow the layout and interaction patterns of `satnaing/shadcn-admin` while staying compatible with this repository's current routing, auth store, API client, Tailwind tokens, and available backend contracts.

## References

- `https://github.com/satnaing/shadcn-admin`
- `https://v3.shadcn.com/docs/components/sidebar`

Key patterns to mirror:

- Dedicated admin shell with `SidebarProvider`, collapsible `Sidebar`, `SidebarInset`, mobile trigger, and route-driven active navigation
- Page header with title on the left and primary action on the right
- Card-wrapped content areas for data tables
- Dialog and alert-dialog flows for create/edit/delete

## Scope

Implement these admin routes:

- `/admin` -> overview dashboard
- `/admin/problems`
- `/admin/topics`
- `/admin/users`
- `/admin/submissions`

Create the admin API layer, query hooks, shared admin UI components, page components, and route wiring in `src/App.tsx` and `src/app/router/routes.ts`.

Do not modify internals of:

- `src/features/auth/`
- `src/features/problems/`
- `src/features/submissions/`
- `src/features/profile/`
- `src/features/editor/`

## Constraints

- Reuse the existing Axios client in `src/shared/api/index.ts`
- Reuse `useAuth()` from `src/app/store/auth`
- Do not add a second app shell for admin. Admin must live inside the existing Vite app with route-based layout separation
- Use semantic theme tokens only
- Keep all interactions keyboard-accessible
- Do not assume backend returns richer data than the stated contracts

## Existing System Realities

The current frontend differs from the pasted request in a few important ways:

- Routes are defined in `src/app/router/routes.ts`, not `src/app/router.ts`
- `react-router-dom` is version 7.x, but the app uses the `Routes`/`Route` API compatible with the existing code
- Shared `User` and `Submission` types do not fully match the admin contracts
- The repo already includes sidebar color tokens in `src/index.css`, but it does not yet expose the shadcn sidebar primitives in `src/shared/components/ui`
- Backend code visible in this repo does not expose admin routes or a user `role` field, so frontend code must tolerate backend shape drift rather than hard-coding optimistic assumptions

## Architecture

### Route separation

`src/App.tsx` will split the application into two route groups:

- User-facing routes continue to render within the current shell using `Header`, bounded `main`, and `Footer`
- Admin routes render in a dedicated branch outside that shell

Implementation shape:

- Keep `QueryClientProvider`, `BrowserRouter`, and `AuthInitializer` at the top level
- Add `AdminRoute` that redirects to `/` unless `isAuthenticated` is true and `user?.role === "admin"`
- Detect `location.pathname.startsWith("/admin")`
- Render either the admin route tree or the user route tree, rather than trying to nest admin inside the current `main`

This avoids leaking `Header`, `Footer`, max-width constraints, and problem-page layout logic into admin pages.

### Admin layout

`AdminLayout` will use the shadcn sidebar composition:

- `SidebarProvider`
- `AdminSidebar`
- `SidebarInset`
- a dedicated header row with `SidebarTrigger`, breadcrumbs, and a route-derived page title
- a padded `main` that renders `Outlet`

The layout is full-height and independent from the public site shell.

## Data Model Strategy

Admin pages will define local admin-facing types instead of mutating existing feature types. This keeps admin contracts isolated from public problem and submission flows.

Planned admin types:

- `AdminProblem`
- `AdminTopic`
- `AdminUser`
- `AdminSubmission`
- paginated list response helpers
- request payload types for create/update operations

These can live in the admin API modules or a local admin types file if repetition becomes meaningful.

## API Strategy

Each admin API module will:

- use the shared `api` client
- send query params only when values are present
- return normalized typed responses
- keep transport logic thin and page logic out of the API layer

Endpoints:

- `GET/POST/PATCH/DELETE /api/admin/problems`
- `GET/POST/PATCH/DELETE /api/admin/topics`
- `GET /api/admin/users`
- `GET /api/admin/submissions`

## Query and Mutation Strategy

TanStack Query hooks will be created per resource:

- `useAdminProblems`
- `useAdminTopics`
- `useAdminUsers`
- `useAdminSubmissions`

Mutation rules:

- problem/topic create/update/delete invalidate their corresponding admin list queries
- successful destructive actions show a toast
- dialog components own submit state, while hooks own server interaction

## UI Components

### AdminSidebar

Responsibilities:

- render admin navigation items with Lucide icons
- highlight the active route
- support sidebar collapse behavior and mobile drawer behavior through the shadcn sidebar primitives
- render admin identity in the footer with avatar initial and display name

Navigation items:

- Overview
- Problems
- Topics
- Users
- Submissions

### AdminDataTable

Responsibilities:

- render a consistent card-contained table shell
- show five skeleton rows while loading
- show a clear empty state when there is no data
- provide simple previous/next pagination and page summary text

Implementation note:

The requested `ColumnDef<T>[]` API implies TanStack Table, but that dependency is not currently installed. For this codebase, the safer approach is:

- keep the component generic and reusable
- accept declarative column definitions shaped locally for this repo
- render a semantic table with shadcn `Table`, `Button`, and `Skeleton`

This keeps the UI and behavior aligned with the spec without adding a new dependency.

### ConfirmDialog

Use `AlertDialog` for delete confirmation with:

- controlled open state
- loading-safe confirm button
- explicit title and consequence text

## Page Designs

### OverviewPage

- four statistic cards in a responsive grid
- each card displays icon, label, and total count
- loading state uses skeletons instead of spinners
- no charts or analytics widgets

Data source:

- one lightweight query per resource, using `limit=1` where practical and reading `total`

### ProblemsPage

- page header with title and `Add Problem` button
- debounced search synced to `?search=`
- paginated table inside a `Card`
- columns for index, title, difficulty, topics, limits, created date, actions

Create/edit flow:

- `Dialog` containing a `react-hook-form` + `zod` form
- `slug` auto-derived from `title` until manually edited
- topic multi-select built from shadcn primitives available in the repo after adding missing ones
- inline server error display on submit failure
- close dialog and show success toast on success

Delete flow:

- icon button opens `ConfirmDialog`
- confirmed delete triggers mutation and refreshes the table

### TopicsPage

- same page-header/table/dialog rhythm as `ProblemsPage`
- lighter form with `name`, `slug`, and optional `description`

### UsersPage

- read-only table
- debounced search synced to URL
- role badge if role exists in the returned payload
- if role is absent, render a safe fallback label rather than crashing

### SubmissionsPage

This page intentionally follows the real system constraints instead of optimistic assumptions.

- read-only table
- filter by `status`
- optional search field only if the backend contract for this repo supports it cleanly; otherwise omit text search
- user/problem columns prefer human-readable fields if returned, else fallback to `user_id` and `problem_id`
- runtime and memory values normalize to ms / MB for display

This is the explicit agreed direction: prioritize system fit and stability over a richer but speculative UX.

## Form Behavior

Validation:

- `title` / `name`: required, minimum length enforcement
- `slug`: required and editable
- `difficulty`: enum validation
- `time_limit_ms` and `memory_limit_mb`: numeric minimums
- `description`: required for problems, optional for topics

Usability rules:

- every icon-only button has an `aria-label`
- submit buttons show pending state
- Escape closes dialogs
- controls meet the minimum touch target requirement through button/input sizing and spacing

## Missing Primitive Strategy

The repo already has several shadcn primitives, but admin work likely requires additional components such as:

- `sidebar`
- `table`
- `alert-dialog`
- `command`
- possibly `form`

If these are missing, add them through the local shadcn setup before importing them. Any generated files should be reviewed and only adjusted where needed for repo conventions.

## Error Handling

- API errors propagate to pages and dialogs
- mutation failures show inline dialog errors rather than silent fallback
- list pages render empty or error states explicitly
- no broad catch-and-ignore behavior in admin features beyond what already exists in shared auth code

## Testing and Verification

Minimum verification target after implementation:

- type-check / build the frontend
- confirm admin routes render outside the public shell
- verify sidebar navigation, dialog open/close, and query invalidation flows
- verify pages do not crash when optional fields such as `role`, joined names, or richer submission metadata are absent

## Implementation Plan Boundary

This spec covers one implementation slice and is small enough for a single execution plan:

- add any missing UI primitives
- add admin route constants and route branching
- implement admin APIs and hooks
- implement shared admin components
- implement five admin pages
- run build/lint verification and fix issues
