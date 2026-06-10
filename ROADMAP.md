# Feature Roadmap — System22 Field Ops

This document describes planned features for the System22 Field Ops app. It is written as a briefing for any developer or AI continuing work on this codebase.

---

## Context

This is a two-sided kitchen/bathroom remedial tracking app used in UK construction. A **manager** on a building site reports damaged or missing items via a mobile PWA. The **office** team processes the report, orders replacements through SAP, and tracks the delivery. The app has real-time messaging, push notifications, offline support, and a PostgreSQL backend.

The creator also has two standalone HTML tools (**Dispatch Omega** and **RAFT Admin**) whose best features should be integrated into this app over time. The creator is not a developer — they are an admin assistant who built everything using AI. Keep explanations simple, test changes thoroughly, and update the README with every change.

---

## Feature 1: Delivery Date Change

**Priority: High — most requested feature**

**What it does:** Allows the office to change a ticket's delivery date from within the app instead of via email. The manager receives a push notification and sees the change in the ticket's message thread.

**Backend:**
- New route: `PATCH /api/v1/tickets/:id/delivery-date`
- Requires auth + office role + UUID validation
- Accepts `{ date: "2026-07-15" }` in the body
- Updates `delivery_date` column on the ticket
- Emits socket event `ticket:updated` to the manager room and the ticket's room (`job_{ticketId}`)
- Sends push notification to manager role: "Delivery date for {ref} changed to {date}"
- Inserts a system message into the messages table: "Delivery date changed to 15 Jul 2026" with sender 'office'
- Returns the updated ticket

**Frontend office:**
- Add a "Change Date" button on the ticket detail panel next to the current delivery date
- Tapping it opens a date picker
- On confirm, calls the new endpoint
- Shows success/error feedback

**Frontend manager:**
- No changes needed — the ticket modal already displays `delivery_date` and the message thread will show the system message automatically via socket

**Pattern to follow:** Look at how `/tickets/:id/order` works in `ticketActions.ts` — it updates the ticket, emits socket events, sends a push notification, and returns the updated ticket. The date change follows the exact same pattern.

---

## Feature 2: Product Typeahead Search — ✅ IMPLEMENTED

**Priority: High — saves the most time for office team**

**What it does:** When the office enters ordered items for a ticket, they can start typing a product description or SAP code and get autocomplete suggestions from a product database.

**Data source:** The product list should be self-learning. Every time the office submits ordered items with a SAP code and description, any new product gets saved to a `products` table automatically. Over time the list builds itself from real usage. A one-time import from a delivery report spreadsheet (columns: Material code, Material Description) can seed the initial list.

**Backend:**
- New table: `products` with columns `id (UUID)`, `sap_code (VARCHAR(50) UNIQUE)`, `description (TEXT)`, `created_at (TIMESTAMPTZ)`
- New route: `GET /api/v1/products/search?q=600+base` — returns matching products, searched by both `sap_code` and `description` using `ILIKE`, limited to 20 results
- Modify the order submission logic in `/tickets/:id/order` — after a successful order, loop through the `ordered_items` array and upsert any new products into the `products` table (using `ON CONFLICT (sap_code) DO NOTHING`)
- Add an index on `description` for fast text search

**Frontend office:**
- Where the office currently types ordered items manually, add an autocomplete dropdown
- On each keystroke (debounced 300ms), call the search endpoint
- Show results as a dropdown list: `SAP_CODE — Description`
- Tapping a result fills in both the SAP code and description fields
- User can still type freely if the product isn't in the database (it will be learned for next time)

**Data note:** An initial seed of ~1,400 products can be imported from the daily delivery report Excel export (columns H and I: Material and Material Description). These have correct, current SAP codes.

---

## Feature 3: Forecast Dashboard

**Priority: Medium — high impact but requires SAP report upload**

**What it does:** A new tab in the manager app showing upcoming deliveries grouped by site, with colour-coded urgency tags (THIS WEEK, NEXT WEEK, OVERDUE, TBC). Data comes from the daily SAP forecast report which is uploaded as an Excel file.

**Critical constraint:** For governance reasons, the uploaded Excel data must NOT be stored on the server. All processing happens client-side in the browser. Use IndexedDB to store yesterday's data on the user's device for comparison (same pattern as offline ticket storage). The server never sees SAP report data.

**Frontend manager:**
- New tab: "Forecast" in the bottom navigation bar
- Upload button to accept an `.xls` file (the forecast report is `.xls` format, not `.xlsx` — use the `xlrd` equivalent for browser, or convert server-side)
- Parse the Excel file client-side using SheetJS (`xlsx` library, already available in the React artifact environment)
- Filter rows by the logged-in user's SAP username (column A: "Field User")
- Group by site, show plots with delivery dates, production status, check measure status
- Colour-code: overdue (red), this week (amber), next week (blue), TBC for placeholder dates like 25/12/2026
- Stats bar at top: total plots, this week count, in production count, check measures due
- Store parsed data in IndexedDB

**Changes tab within Forecast:**
- Compare today's upload against yesterday's data from IndexedDB
- Show: new orders added, orders removed, delivery dates moved, check measures completed
- Display as a simple list with emoji indicators (🆕 new, 📅 date moved, ❌ removed, ✅ CM done)

**The forecast Excel has these columns (in order):** Field User, Name 1 (site), Sold-to party, Plot, Sales Document, Cust Req Del Dt, Agreed Delivery, Status, Days, Chk Measure Status, Chk Measure Description

---

## Feature 4: Delivery Report Diff

**Priority: Medium — complementary to Forecast**

**What it does:** Similar to the forecast but for the daily delivery report. The office uploads today's delivery report Excel, the app compares it against yesterday's and shows what changed.

**Same governance constraint** — process client-side, store in IndexedDB, nothing on the server.

**The delivery report Excel has these columns:** Sales Document, Item, Purchase Order, Delivery Date, Name 1 (site), Material, Material Description, Created by, Quantity, Order Quantity

**Key comparisons:**
- Match rows by Sales Document + Item number
- Highlight: new line items, removed line items, quantity changes, delivery date changes
- Filter by Created by (SAP username)

---

## Feature 5: RAFT Quality Checks (Traffic Light System)

**Priority: Medium — fraud/quality detection**

**What it does:** When the office views a remedial ticket, the app automatically checks whether the requested items match the original kitchen order for that plot. Results are traffic-lighted:

- **GREEN** — remedial materials match the original order specification. Looks legitimate.
- **AMBER** — materials don't match the original spec, or this is a repeat remedial on the same plot. Needs investigation.
- **RED** — no original kitchen order found for this plot at all. Something is wrong.

**This requires the big SAP export** (historical order data) to be imported — approximately 181,000 rows. Unlike the forecast/delivery reports, this data WOULD need to be stored server-side to enable lookups. Discuss with IT before implementing.

**Backend:**
- New table: `order_history` with columns for sales document, material, description, quantity, account, site, plot, order type (ZCD=original kitchen, ZCR=remedial, ZADD=addition)
- New endpoint: `GET /api/v1/tickets/:id/quality-check` — looks up the ticket's developer + site + plot in `order_history`, finds the original ZCD order, compares materials against the remedial request, returns a traffic light status with explanation

**Frontend office:**
- Show a traffic light badge on each ticket in the queue: green/amber/red
- Tapping it shows the detail: "Original order had 600 Oak Door, remedial is requesting 600 Walnut Door — specification mismatch"

---

## Feature 6: Audit Trail

**Priority: High for governance**

**What it does:** Logs every action on every ticket — who did it, what changed, and when. Creates an immutable history.

**Backend:**
- New table: `audit_log` with columns `id (UUID)`, `ticket_id (UUID)`, `action (VARCHAR)`, `changed_by (VARCHAR)`, `old_value (JSONB)`, `new_value (JSONB)`, `created_at (TIMESTAMPTZ)`
- Helper function: `logAudit(ticketId, action, changedBy, oldValue, newValue)` — called from every ticket action route
- Actions to log: `created`, `accepted`, `queried`, `clarified`, `ordered`, `archived`, `delivery_date_changed`, `message_sent`
- New endpoint: `GET /api/v1/tickets/:id/history` — returns the audit log for a ticket in chronological order

**Frontend (both):**
- Timeline view on ticket detail showing all actions with timestamps and usernames
- Sits below the status stepper — the stepper shows the current state, the timeline shows how it got there

**Note:** This feature becomes much more valuable once individual user accounts (Feature 7) are implemented, because then the audit log shows "Jason changed the date" not just "manager changed the date."

---

## Feature 7: Individual User Accounts

**Priority: High for security and governance**

**What it does:** Replace the shared manager/office accounts with individual logins. Each person gets their own username and password.

**Backend:**
- Remove the `seedUsers` function that creates hardcoded accounts
- Add a user management endpoint (admin-only): `POST /api/v1/users` to create accounts, `PATCH /api/v1/users/:id` to update, `DELETE /api/v1/users/:id` to deactivate
- Each user still has a role (manager or office) but now also has a display name
- Add password change endpoint: `PATCH /api/v1/users/me/password`
- Consider adding a `deactivated` boolean column instead of deleting users, so audit history is preserved

**Frontend:**
- Login screen accepts individual credentials
- Display the user's name in the header instead of just "Sign out"
- Admin page (accessible to a new 'admin' role) for managing users

**Impact on other features:** Once individual accounts exist, every feature gets better — audit trails show real names, forecast dashboards can auto-filter by SAP username mapped to the user account, and access can be revoked per-person.

---

## Implementation Order

The recommended build sequence, based on impact and dependencies:

1. **Delivery Date Change** — quick win, most requested, no dependencies
2. **Audit Trail** — governance requirement, enables accountability
3. **Product Typeahead** — biggest time saver for office, self-learning approach needs no SAP access
4. **Individual User Accounts** — makes audit trail meaningful, improves security
5. **Forecast Dashboard** — high impact but needs client-side Excel parsing and IndexedDB storage
6. **Delivery Report Diff** — builds on the same upload/compare pattern as Forecast
7. **RAFT Quality Checks** — needs IT approval for storing SAP order history data

---

## Technical Notes for the AI

- Follow the existing pattern: routes in `backend/src/routes/`, services in `backend/src/services/`, middleware in `backend/src/middleware/`
- Every new route needs `requireAuth`, `requireRole()`, and `validateIdParam` where appropriate
- Use parameterised SQL (`$1`, `$2`) — never interpolate values into SQL strings
- Sanitise all user input with the `sanitise()` utility before database writes
- Emit socket events for real-time updates and send push notifications for important changes
- Write tests in `backend/src/__tests__/` using vitest — test validation, helpers, and middleware
- Update the README with every change — document what was added, what it does, and any new known limitations
- The creator values governance, security, and honest documentation of what's missing
- Keep explanations simple — the creator is not a developer
