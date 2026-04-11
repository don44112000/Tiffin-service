# 🍱 Local Tiffin Service — Frontend Build Tracker

---

## Phase 1: Foundation

- [ ] Initialize Vite + React + TypeScript project in `frontend/`
- [ ] Install dependencies (`react-router-dom`, `date-fns`, `lucide-react`)
- [ ] Create `.env` and `.env.example` with API URL + secret
- [ ] Create design system (`index.css`) — CSS custom properties, resets, Outfit font, Swiggy palette
- [ ] Copy assets (logo.png, bg.png) into `public/`
- [ ] Create API service layer (`src/services/api.ts`) — all 10 customer endpoints
- [ ] Create TypeScript types (`src/types/index.ts`) — Customer, Order, MonthlyReport, API payloads
- [ ] Create cache utilities (`src/utils/cache.ts`) — localStorage read/write/invalidate/timestamps
- [ ] Create `useCache` hook (`src/hooks/useCache.ts`) — stale-while-revalidate pattern
- [ ] Create Toast system — ToastContext + ToastProvider + Toast component
- [ ] Create date utilities (`src/utils/dates.ts`) — format helpers using date-fns
- [ ] Create constants (`src/utils/constants.ts`) — cache keys, route paths

---

## Phase 2: Auth + Layout Shell

- [ ] Create AuthContext (`src/context/AuthContext.tsx`) — login, logout, auto-login, refresh
- [ ] Create `useAuth` hook (`src/hooks/useAuth.ts`)
- [ ] Create ProtectedRoute wrapper component
- [ ] Create BottomNav component — 5 tabs (Home, Calendar, Add, Report, Profile)
- [ ] Create App Router (`App.tsx`) — all routes with lazy loading
- [ ] Create Skeleton component — reusable shimmer placeholder
- [ ] Create RefreshButton component
- [ ] Create LoginPage — background image, logo, form, submit, error handling, auto-login
- [ ] Create RegisterPage — 3-step wizard (Personal → Delivery Addresses [3 separate] → Plan) using `onboard_customer`

---

## Phase 3: Home Dashboard + Order Components

- [ ] Create VegIndicator component (🟢 veg / 🔴 non-veg — Swiggy style)
- [ ] Create StatusBadge component (Delivered ✅ / Pending 🟡 / Skipped ⬜)
- [ ] Create OrderCard component — slot, type, qty, address, status, action buttons
- [ ] Create BottomSheet component — slide-up modal with backdrop + drag handle
- [ ] Create StepperInput component — ±1 with min/max
- [ ] Create HomePage — greeting, credit card, today/tomorrow orders, quick actions, report banner
- [ ] Create HomePage skeletons — credit card + order cards shaped placeholders
- [ ] Implement Skip Order flow — confirmation bottom sheet → `skip_order` API → cache invalidation
- [ ] Implement Edit Order bottom sheet — type/address/qty → `update_order` API

---

## Phase 4: Calendar View (⭐ Key Feature)

- [ ] Create Calendar component — 7-column grid, month navigation (◀ ▶)
- [ ] Create CalendarDay cell — up to 2 dots (lunch/dinner), color-coded veg/non-veg/status
- [ ] Create calendar legend bar (🟢 Veg 🔴 Non-veg ⬜ Skipped ✅ Delivered)
- [ ] Create MyOrdersPage — calendar + selected-day detail section
- [ ] Implement day selection → inline expansion with order cards
- [ ] Implement month navigation → fetch `get_orders_by_user` for full month range
- [ ] Implement per-month caching (`tiffin_orders_YYYY_MM`)
- [ ] Create MyOrdersPage skeletons — calendar grid + order card placeholders
- [ ] Wire up skip/edit actions within calendar detail view

---

## Phase 5: Add Meal + Extend Plan

- [ ] Create AddMealPage — date picker, slot/type selectors, address picker (from saved addresses), qty stepper
- [ ] Wire AddMealPage to `add_order_slot` API → toast + navigate to calendar
- [ ] Create ExtendPlanPage — plan selector (segmented), start date, days stepper, preview summary
- [ ] Wire ExtendPlanPage to `extend_plan` API → toast + navigate to calendar
- [ ] Style native date picker inputs to match design system

---

## Phase 6: Report + Profile

- [ ] Create StatCard component — animated count-up number with label
- [ ] Create ReportPage — month selector, 4 stat cards, scrollable order detail list
- [ ] Wire ReportPage to `get_monthly_report` API with per-month caching
- [ ] Create ReportPage skeletons
- [ ] Create ProfilePage — user info card, edit options (name, password, manage 3 delivery addresses), logout
- [ ] Create Edit Profile bottom sheets (3 separate: name, password, manage addresses)
- [ ] Wire ProfilePage edits to `update_customer` API
- [ ] Implement Logout — confirm dialog → clear localStorage → redirect to login

---

## Phase 7: Polish & PWA

- [ ] Responsive testing — 360px, 390px, 414px, 428px viewports
- [ ] Add page transition animations (fade/slide between routes)
- [ ] Add micro-animations (button press, card hover, tab switch)
- [ ] Create empty states (no orders for a day, no report data)
- [ ] Create network error states + offline banner ("Showing cached data")
- [ ] Create PWA manifest.json (icons, theme_color, display: standalone)
- [ ] Performance audit — Lighthouse mobile run
- [ ] Accessibility pass — touch targets ≥ 44px, aria labels, focus rings
- [ ] Bundle analysis — ensure < 200KB gzipped
- [ ] Final end-to-end browser test — all flows

---

## Notes

- **Backend URL:** `https://script.google.com/macros/s/AKfycbw59cfZvzZw8h75avJxom2Aw4yOn2yhYSenBQrnW6bKIx1nZsWNU2ridDKMC5TN0JujgA/exec`
- **Secret:** `FOOD2026`
- **Assets:** `files/logo.png`, `files/opening-screen-background-image.png`
- **Design Inspiration:** Swiggy & Instamart mobile apps
- **Primary Color:** #FF5200 (Swiggy orange)
- **Font:** Outfit (Google Fonts)
