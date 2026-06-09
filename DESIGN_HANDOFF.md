# Design Handoff — Premium Minimalist Restyle

You are being asked to apply a new visual style to an existing, working production app. **Do not refactor logic. Do not add features. Do not rename props.** This is a CSS/markup restyle only.

The mockups live in the Open Design project `remedial-premium` as static HTML:
- `office-queue-board.html`
- `office-ticket-detail.html`
- `office-login.html`
- `manager-home.html`
- `manager-new-report.html`
- `manager-login.html`
- `BRIEF.md` — what the app actually does (read this first)

If Open Design isn't running on the machine, ask the user to open the HTML files directly. They are self-contained.

---

## Hard rules

1. **One PR per phase below.** Do not bundle. Each phase must be reviewable and revertable on its own.
2. **Do not change behaviour.** No new endpoints, no new state, no renamed props, no removed components. If a component disappears from a mockup, hide it with CSS, don't delete it.
3. **Run the dev server after every phase** (`pnpm dev` in `frontend-office` and `frontend-manager`) and click through each surface. If a screen is visually broken, stop and revert that phase.
4. **The manager side is already approved** by the user. Only minor token-driven changes are expected there. **Do not redesign manager screens.** The big visual shift happens on the office side.
5. **Tests must still pass.** Run `pnpm test` in `backend/` after touching shared types. Run `pnpm build` in both frontends after every phase.
6. **Do not invent features.** Read `ROADMAP.md` — anything listed there is NOT BUILT YET. If a mockup implies a feature that doesn't exist (e.g. command palette, audit timeline, SLA timer), ignore it.
7. **No new dependencies.** Use existing Tailwind + CSS vars.

---

## What you're changing

Both frontends are React + Tailwind + CSS variables. The existing token names are in:
- `frontend-office/src/index.css`
- `frontend-manager/src/index.css`

The mockups already share a token system. The plan is to map the mockup tokens onto the existing variable names so component code mostly doesn't have to change.

### Mockup tokens → existing vars

| Mockup token | Hex | Existing var (office + manager) |
|---|---|---|
| `--bg` | `#fff` | `--surface` |
| `--hover` | `#fafafa` | `--surface-2` (office) |
| `--ink` | `#0a0a0a` | `--text` |
| `--muted` | `#525252` | `--muted` |
| `--subtle` | `#737373` | (new) `--subtle` |
| `--faint` | `#a3a3a3` | (new) `--faint` |
| `--line` | `#ededed` | `--border` |
| `--pending` | `#374151` | `--pending` |
| `--query` | `#b91c1c` | `--query` |
| `--ordered` | `#15803d` | `--ordered` |
| `--inbox` | `#a16207` | (new) `--inbox` |

Fonts: Inter for sans, JetBrains Mono for mono. Both are loaded via Google Fonts in the mockups — add a `<link>` to each frontend's `index.html`. Keep `font-feature-settings: "cv11","ss01","ss03","ss07";` on `body`.

---

## Phase 1 — Tokens + fonts (low risk, ~30 min)

**Scope:** CSS only. No component changes.

1. In `frontend-office/index.html` and `frontend-manager/index.html`, add inside `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
   ```
2. In each frontend's `src/index.css`, in the `:root` block, update the existing values (do NOT rename) to match the mockup table above. Add the three new vars (`--subtle`, `--faint`, `--inbox`).
3. On `body`, add:
   ```css
   font-family: "Inter", "SF Pro Text", -apple-system, system-ui, sans-serif;
   font-feature-settings: "cv11","ss01","ss03","ss07";
   letter-spacing: -0.011em;
   ```
4. Run `pnpm dev` in both frontends. Click through every screen. **Expected:** colours feel slightly cooler, typography sharper. Nothing should look broken. If anything is illegible or a button disappears, revert and ask the user.

**Commit:** `style(tokens): premium minimalist palette + Inter/JetBrains Mono`

---

## Phase 2 — Office queue board (the big one, ~2–3 hours)

This is the biggest visual change. The current board is a 4-column kanban with cards. The mockup is a single grouped list with hairline rows.

**Files to touch:**
- `frontend-office/src/components/QueueBoard.tsx`
- `frontend-office/src/components/QueueWorkspace.tsx`
- `frontend-office/src/components/QueueNav.tsx` (sidebar styling only)
- Possibly a new component `QueueList.tsx` for the row layout

**Do:**
1. Read `office-queue-board.html` in the OD project. The structure is:
   - 248px sidebar (no change to nav structure, just spacing/typography)
   - 60px top bar with crumbs + search trigger + "+ New report" button
   - Page header: title + meta line + view tabs (List / Board / Calendar)
   - List of ticket rows grouped by day (Today / Yesterday / Earlier this week)
2. Each row is a CSS grid: `88px 1.4fr 1fr 110px 160px 36px` — ref / dev+meta / counts / status / time / chevron.
3. Replace card styling with hairline borders (`border-b border-[var(--border)]`). No card backgrounds. No shadows.
4. Status indicator: 7px round dot + text label, NOT a filled pill.
5. Keep all existing data hooks (`useQueueBoard`, etc.) untouched. Only change JSX + classNames.
6. Mobile: at `<lg` breakpoint, keep the existing `MobileTicketWorkView` flow as-is.

**Do NOT:**
- Remove the Board/Calendar tabs from JSX — render them as inactive tabs so the user can choose later.
- Change the URL structure, queue keys, or socket events.
- Touch `useQueueBoard` hook logic.

**Test:** Hard refresh, change queues, accept a ticket, check that the row updates. Test on a 1280px and 1920px window.

**Commit:** `feat(office): hairline list view for queue board`

---

## Phase 3 — Office ticket detail (~2 hours)

**File:** `frontend-office/src/components/TicketDetailsPanel.tsx` and its parent layout.

**Current:** 3-column layout (rail + detail + chat) all visible at once.
**New:** 2-column (rail + detail), chat is a slide-over from the right when "Messages" button is clicked.

1. Read `office-ticket-detail.html`. The slide-over is `position:fixed; right:0; width:440px;`.
2. Look at `QueueWorkspace.tsx` for how the chat panel is currently rendered. The chat should now be conditionally rendered when `chatOpen` is true and styled as a fixed slide-over with a backdrop click area.
3. The detail body should be a max-width 760px reading column with 48px+ vertical padding.
4. Status stepper: 4 dots with thin lines between, NOT a coloured pill bar.
5. Items list: numbered (`01`, `02`...) with hairline dividers, not a table.
6. Action bar at the bottom: "Needs clarification" as a ghost link, "Accept ticket →" as a single black primary button.

**Keep:** All the existing handlers (`handleAccept`, `handleFlagQuery`, `handleClarified`, `handleOrdered`). All form sections (`OrderForm`, etc.) — restyle them, don't replace.

**Test:** Open a pending ticket, accept it. Open a query ticket, click Messages, send a reply, close panel. Open an ordered ticket, check the PO/delivery section renders. Print a ticket.

**Commit:** `feat(office): premium ticket detail with chat slide-over`

---

## Phase 4 — Office login (~30 min)

**File:** `frontend-office/src/auth/LoginPage.tsx` (or wherever the login form lives — grep for "Sign in").

Reference `office-login.html`. This is a small change:
- Top bar with brand mark + "v1.x" version
- Centered 380px form
- Single black primary submit button
- Footer with "All systems operational" pulse dot + Privacy / Terms / Support links

Do not change auth logic. Do not add SSO buttons (we don't have SSO).

**Commit:** `style(office): premium login screen`

---

## Phase 5 — Manager polish (~1 hour, optional)

The manager mockups (`manager-home.html`, `manager-new-report.html`, `manager-login.html`) are mostly token-driven changes that Phase 1 will cover.

If anything still feels wrong after Phase 1:
- Manager home: ticket cards should be hairline rows with status dots, not pills (`TicketListCard.tsx`)
- New report: section labels are `01·Where`, `02·What`, `03·When`, `04·Photos` style, but only restyle — don't change the form logic. The form is in `frontend-manager/src/components/TicketForm.tsx`.

**Get user approval before touching the manager side.** User has said they like it as-is.

---

## Rollback plan

Every phase is its own commit. If a phase breaks something:
```
git revert HEAD
```
That's it. Do not try to "fix forward" if you're not sure what broke.

---

## Where this can still go wrong

| Risk | Mitigation |
|---|---|
| Token change breaks an unrelated screen (e.g. error toast, modal) | Phase 1 is its own commit. Click through every screen before phase 2. |
| Tailwind arbitrary values reference `--surface` (old) and you change its meaning | Search for `var(--surface)` and `var(--border)` before phase 1 — if usage is unexpected, ask. |
| Chat slide-over breaks mobile | Test at 375px, 768px, 1280px. Mobile keeps the existing flow. |
| Removed JSX causes runtime errors in code you didn't read | Don't remove JSX. Hide with CSS or conditional rendering. |
| Type errors after touching shared components | Run `pnpm build` after every phase. Do not ignore TS errors. |

---

## Sign-off

Before opening any PR:
1. Screenshot before vs after for each phase.
2. Run `pnpm test` in `backend/`. All green.
3. Run `pnpm build` in both frontends. No errors.
4. Open the user's browser to the dev server and click through.

If you cannot satisfy all four, do not open the PR. Stop and ask the user.
