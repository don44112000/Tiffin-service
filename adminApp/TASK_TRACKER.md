# 🍱 Local Tiffin Service — Admin App Build Tracker

---

## Phase 1: Foundation & Ops Setup
- [ ] Initialize Vite + React + TypeScript project in `adminApp/`
- [ ] Install shared dependencies (`react-router-dom`, `date-fns`, `lucide-react`)
- [ ] Create `.env` with `ADMIN_SECRET` and `ADMIN_PASSWORD`
- [ ] Sync design system patterns from `customerApp/src/index.css`
- [ ] Setup Admin-specific API service layer (`src/services/api.ts`)
- [ ] Implement `useCache` hook and `requestQueue` for optimized performance
- [ ] Create core UI components (Shared with Customer App logic where possible)

---

## Phase 2: Delivery Agent Portal (Landing Page)
- [ ] Create `DeliveryLandingPage.tsx`
- [ ] Implement Slot Toggle (Lunch / Dinner) — defaults to current slot
- [ ] Implement Searchable Order List (Local filtering for mobile performance)
- [ ] Implement Summary Header (Total, Delivered, Pending stats)
- [ ] Implement `mark_delivered` interaction with quantity validation ($\ge$ 1)
- [ ] UI Polish: Gray out skipped orders, checkmark delivered orders

---

## Phase 3: Admin Auth & Operations Dashboard
- [ ] Create Password Gate (Check against `VITE_ADMIN_PASSWORD`)
- [ ] Create `AdminPortalLayout` with Sidebar (Desktop) / Hamburger (Mobile)
- [ ] Create `DashboardPage.tsx` with stats from `get_dashboard`
- [ ] Create `GlobalCalendar.tsx` for daily order overview
- [ ] Implement date navigation — defaulting to current date on load

---

## Phase 4: Customer Directory & Debt Management
- [ ] Create `CustomerDirectoryPage.tsx`
- [ ] Implement Global Customer Search (Local filtering)
- [ ] Implement "Negative Balance" highlight card at the top
- [ ] Create `CustomerDetailLayout` — side-by-side on desktop views

---

## Phase 5: Customer Deep-Dive & Wallet Ops
- [ ] Create `CustomerDetailPage.tsx`
- [ ] Implement **Profile Info**: Name and Password edits
- [ ] Implement **Wallet Ops**: Manual Credit Recharge flow
- [ ] Implement **Activity Log**: Credit history records
- [ ] Implement **Monthly Usage**: Monthly reports with month switcher
- [ ] Implement **Manual Adjustments**: "Reduce credits manual" on specific order rows

---

## Phase 6: Operational Management Tools
- [ ] Create `MenuManagementPage.tsx` — CRUD interface for weekly menu
- [ ] Create `ReconciliationPage.tsx` — UI for marking days as complete
- [ ] Implement confirmation modals for high-impact admin actions

---

## Phase 7: Desktop Polish & PWA
- [ ] Responsive UI Audit: Ensure 2-column layouts on desktop
- [ ] Add page transition and micro-animations
- [ ] Setup PWA manifest and service worker
- [ ] Performance audit for large customer lists
- [ ] Final End-to-End verification of all Admin/Delivery flows

---

## Notes
- **Admin Secret:** `ADMIN2026`
- **Password Gate:** Client-side check against `.env`
- **Performance:** All searches are local-first to minimize GAS overhead.
- **Design:** Swiggy Premium Orange (#FF5200) + Outfit Typography.
