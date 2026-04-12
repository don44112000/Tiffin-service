# 🍱 Local Tiffin Service — Customer Frontend

> **Goal:** Build a mobile-first, Swiggy/Instamart-inspired Progressive Web App for customers of the Local Tiffin Service to manage their accounts, view orders, skip/modify meals, extend plans, and track monthly usage.

---

## Table of Contents

1. [Requirements Specification](#1-requirements-specification)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [API Integration Map](#3-api-integration-map)
4. [Screen-by-Screen Design Specification](#4-screen-by-screen-design-specification)
5. [Caching & Data Strategy](#5-caching--data-strategy)
6. [Skeleton Loading System](#6-skeleton-loading-system)
7. [Component Architecture](#7-component-architecture)
8. [Implementation Plan](#8-implementation-plan)
9. [Environment Configuration](#9-environment-configuration)
10. [Verification Plan](#10-verification-plan)

---

## 1. Requirements Specification

### 1.1 Functional Requirements

#### Authentication & Profile
| # | Feature | API Used | Description |
|---|---------|----------|-------------|
| F1 | **Login** | `GET get_customer` | Mobile + password login. Cache user profile in `localStorage`. |
| F2 | **Registration** | `POST create_customer` | New customer signup with name, mobile, password, up to 3 saved delivery addresses. |
| F3 | **Onboarding** | `POST onboard_customer` | Register → save addresses → choose plan (lunch/dinner/both) → set date range → auto-generate orders. Combined registration + plan setup flow. |
| F4 | **Edit Profile** | `POST update_customer` | Update name, password, manage 3 saved delivery addresses. |
| F5 | **Logout** | Client-side | Clear all cached data + redirect to login. |

#### Order Management
| # | Feature | API Used | Description |
|---|---------|----------|-------------|
| F6 | **View Orders (Calendar)** | `GET get_orders_by_user` | Calendar-style view showing day-wise orders with veg/non-veg and lunch/dinner differentiation. |
| F7 | **Order Detail Modal** | Client-side (from cached data) | Tap a day → modal with full order details (slot, type, qty, delivery status, credits). |
| F8 | **Skip Order** | `POST skip_order` | Skip a future order (before reconciliation). Confirmation dialog → API call. |
| F9 | **Update Order** | `POST update_order` | Change meal type (veg/non-veg), delivery address, quantity for a future order. |
| F10 | **Add Order Slot** | `POST add_order_slot` | Add a single extra meal (lunch or dinner) for a specific date. |
| F11 | **Extend Plan** | `POST extend_plan` | Extend subscription by N days with chosen plan from a start date. |

#### Reporting & Credits
| # | Feature | API Used | Description |
|---|---------|----------|-------------|
| F12 | **Monthly Report** | `GET get_monthly_report` | Summary cards: total ordered, delivered, skipped, credits deducted. Detailed order table below. |
| F13 | **Credit Balance** | From `get_customer` response | Display prominently on dashboard. Cached from login/refresh. |

#### UX Requirements
| # | Feature | Description |
|---|---------|-------------|
| U1 | **Skeleton Loading** | Every page shows content-shaped skeleton placeholders during API calls. No spinners. |
| U2 | **Cache-First Strategy** | On login, cache user profile. On each screen mount, show cached data instantly → fetch fresh data in background → update UI. |
| U3 | **Refresh Button** | Every screen has a pull/tap refresh that re-fetches from API and updates cache. |
| U4 | **Offline Graceful Degradation** | If API fails, show cached data with a "Showing cached data" banner. |
| U5 | **Toast Notifications** | Success/error toasts for all mutation operations (skip, update, extend, etc.). |
| U6 | **Bottom Navigation** | Swiggy-style bottom tab bar: Home, Calendar, Add Meal, Report, Profile. |

### 1.2 Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| N1 | **Mobile-First** | Designed for 360px–428px viewports. Desktop is secondary (max-width container). |
| N2 | **Lighthouse Performance** | ≥ 90 on mobile. |
| N3 | **First Contentful Paint** | < 1.5s. |
| N4 | **Bundle Size** | < 200KB gzipped (total JS + CSS). |
| N5 | **Accessibility** | WCAG 2.1 AA — touch targets ≥ 44px, proper contrast ratios. |
| N6 | **PWA** | Installable with manifest.json, offline shell, service worker caching. |

---

## 2. Tech Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **Vite + React 19** (TypeScript) | Ultra-fast HMR, tree-shaking, tiny runtime. React for component model + hooks for state/cache management. |
| **Styling** | **Vanilla CSS Modules** | Zero runtime cost, scoped by default, full control for Swiggy-like designs. CSS custom properties for theming. |
| **Routing** | **React Router v7** | Client-side SPA routing with lazy loading per route. |
| **State / Cache** | **React Context + `localStorage`** | Lightweight. No Redux overhead. Custom `useCache` hook wraps localStorage. |
| **HTTP Client** | **Native `fetch`** | No axios needed. Custom `api.ts` wrapper with retry, timeout, error handling. |
| **Icons** | **Lucide React** | Lightweight, tree-shakeable icon set. |
| **Fonts** | **Google Fonts: Outfit** | Modern, clean, premium feel matching Swiggy's typography style. |
| **Date Handling** | **date-fns** | Tree-shakeable date utility (only import what we use). |
| **Animations** | **CSS @keyframes + transitions** | No animation library needed. Custom micro-animations. |

### Why Not Vanilla JS?
The calendar view, order management mutations, and caching layer have enough component complexity that React's declarative model will save significant development time and prevent bugs. The Vite build ensures the bundle stays tiny.

---

## 3. API Integration Map

### 3.1 Customer-Facing APIs Only

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE URL (from .env)                         │
│  https://script.google.com/macros/s/AKfycbw.../exec            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GET  Endpoints (query params)                                  │
│  ├── get_customer       → Login / Refresh profile               │
│  ├── get_orders_by_user → Calendar view data                    │
│  └── get_monthly_report → Monthly summary + order list          │
│                                                                 │
│  POST Endpoints (JSON body)                                     │
│  ├── create_customer     → Registration (standalone)            │
│  ├── onboard_customer    → Registration + plan setup            │
│  ├── update_customer     → Edit profile                         │
│  ├── update_order        → Modify order (type/address/qty)      │
│  ├── add_order_slot      → Add extra meal for a date            │
│  ├── skip_order          → Skip a future order                  │
│  └── extend_plan         → Extend subscription                  │
│                                                                 │
│  Auth: secret=FOOD2026 (sent with every request)                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 API Service Layer Design

```typescript
// src/services/api.ts — Unified API wrapper

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SECRET = import.meta.env.VITE_API_SECRET;

// GET helper — appends query params including secret
async function apiGet<T>(action: string, params: Record<string, string>): Promise<T>

// POST helper — sends JSON body with secret
async function apiPost<T>(action: string, body: Record<string, unknown>): Promise<T>

// Specific API functions:
export const loginCustomer = (mobile: string, password: string) => ...
export const createCustomer = (data: CreateCustomerPayload) => ...
export const onboardCustomer = (data: OnboardPayload) => ...
export const updateCustomer = (data: UpdateCustomerPayload) => ...
export const getOrdersByUser = (userId: string, startDate: string, endDate: string) => ...
export const getMonthlyReport = (userId: string, startDate: string, endDate: string) => ...
export const updateOrder = (data: UpdateOrderPayload) => ...
export const addOrderSlot = (data: AddOrderSlotPayload) => ...
export const skipOrder = (orderId: string) => ...
export const extendPlan = (data: ExtendPlanPayload) => ...
```

> [!IMPORTANT]
> **CORS Handling:** Google Apps Script web apps return CORS headers for `no-cors` mode on some browsers. The API wrapper must handle this — typically GAS deployed as "Anyone" works with standard fetch. We'll test and add `mode: 'cors'` or use the redirect-follow approach if needed.

### 3.3 TypeScript Types (from API responses)

```typescript
interface Customer {
  user_id: string;
  name: string;
  mobile: string;
  password: string;
  address_1: string;
  address_2: string;
  address_3: string;
  credit_balance: number;
  created_at: string;
  is_active: boolean;
}

interface Order {
  order_id: string;
  user_id: string;
  date: string;         // "YYYY-MM-DD"
  slot: "lunch" | "dinner";
  type: "veg" | "non-veg";
  address: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_used: number;
  is_delivered: boolean;
  delivered_at: string;
  created_at: string;
  is_skipped: boolean;
}

interface MonthlyReportSummary {
  user_id: string;
  from: string;
  to: string;
  total_ordered: number;
  total_delivered: number;
  total_skipped: number;
  total_credits_deducted: number;
}
```

---

## 4. Screen-by-Screen Design Specification

### 4.0 Design System — Swiggy/Instamart Inspired

```css
/* Color Palette */
--color-primary: #FF5200;         /* Swiggy orange */
--color-primary-light: #FF7A45;
--color-primary-dark: #E04000;
--color-bg: #F5F5F5;              /* Light grey background */
--color-surface: #FFFFFF;          /* Card surfaces */
--color-text-primary: #1B1B1B;    /* Near-black text */
--color-text-secondary: #6B6B6B;  /* Muted text */
--color-text-tertiary: #9B9B9B;
--color-success: #00B87A;         /* Green for delivered */
--color-warning: #FFB800;         /* Amber for pending */
--color-error: #FF3B3B;           /* Red for skipped/error */
--color-veg: #0F8A3C;             /* Green dot for veg */
--color-nonveg: #B5282D;          /* Red triangle for non-veg */
--color-border: #E8E8E8;
--color-skeleton: #E8E8E8;
--color-skeleton-shimmer: #F5F5F5;

/* Brand Yellow (from logo) */
--color-brand-yellow: #FFD700;

/* Typography — Outfit from Google Fonts */
--font-family: 'Outfit', sans-serif;
--font-size-xs: 0.625rem;    /* 10px */
--font-size-sm: 0.75rem;     /* 12px */
--font-size-base: 0.875rem;  /* 14px */
--font-size-md: 1rem;        /* 16px */
--font-size-lg: 1.25rem;     /* 20px */
--font-size-xl: 1.5rem;      /* 24px */
--font-size-2xl: 2rem;       /* 32px */

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
--space-2xl: 32px;

/* Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

/* Bottom nav height */
--nav-height: 64px;
```

### 4.1 Splash / Login Screen

```
┌──────────────────────────┐
│                          │
│     [Background Image]   │   ← opening-screen-background-image.png
│        blurred overlay   │
│                          │
│     ┌──────────────┐     │
│     │  Logo (round) │     │   ← logo.png in circle
│     └──────────────┘     │
│                          │
│     Local Tiffin Service │   ← Brand name
│     Since 2021           │   ← Tagline
│                          │
│  ┌────────────────────┐  │
│  │ 📱 Mobile Number   │  │   ← Input with country prefix
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🔒 Password        │  │   ← Password input with toggle
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │      LOGIN ━━━▶    │  │   ← Full-width orange CTA button
│  └────────────────────┘  │
│                          │
│  New customer? Register  │   ← Link to registration
│                          │
└──────────────────────────┘
```

**Behavior:**
- On successful login → cache `customer` object in `localStorage` under key `tiffin_user`
- Auto-login: On app mount, check `localStorage` for existing `tiffin_user`. If found, navigate directly to Home (show skeleton → re-validate with API in background)
- Login button shows a loading spinner inside the button during API call
- Error toast for invalid credentials

### 4.2 Registration / Onboarding Screen

A multi-step wizard (3 steps) inspired by Swiggy's onboarding flow:

```
Step 1: Personal Info                Step 2: Delivery Addresses         Step 3: Meal Plan
┌─────────────────────┐            ┌─────────────────────┐            ┌─────────────────────┐
│  ← Back             │            │  ← Back             │            │  ← Back             │
│                     │            │                     │            │                     │
│  Create Account     │            │  Save Your Addresses│            │  Choose Your Plan   │
│  ●━━━○━━━○          │            │  ○━━━●━━━○          │            │  ○━━━○━━━●          │
│                     │            │                     │            │                     │
│  ┌─────────────┐    │            │  You can save up to │            │  ┌─────────────┐    │
│  │ Full Name   │    │            │  3 delivery spots   │            │  │ 🌞 Lunch    │    │ ← Radio/Card
│  └─────────────┘    │            │                     │            │  └─────────────┘    │   selection
│  ┌─────────────┐    │            │  ┌─────────────┐    │            │  ┌─────────────┐    │
│  │ Mobile      │    │            │  │🏠 Address 1 │    │            │  │ 🌙 Dinner   │    │
│  └─────────────┘    │            │  │ (required)  │    │            │  └─────────────┘    │
│  ┌─────────────┐    │            │  └─────────────┘    │            │  ┌─────────────┐    │
│  │ Password    │    │            │  ┌─────────────┐    │            │  │ 🍱 Both     │    │ ← Recommended
│  └─────────────┘    │            │  │🏢 Address 2 │    │            │  └─────────────┘    │   tag
│                     │            │  │ (optional)  │    │            │                     │
│  ┌─────────────┐    │            │  └─────────────┘    │            │  Start Date: [____] │ ← Date picker
│  │   Next ━━▶  │    │            │  ┌─────────────┐    │            │  End Date:   [____] │
│  └─────────────┘    │            │  │📍 Address 3 │    │            │                     │
│                     │            │  │ (optional)  │    │            │  ┌─────────────┐    │
│  Have account? Login│            │  └─────────────┘    │            │  │ Start Plan ▶│    │
│                     │            │                     │            │  └─────────────┘    │
│                     │            │  ┌─────────────┐    │            │                     │
│                     │            │  │   Next ━━▶  │    │            │                     │
│                     │            │  └─────────────┘    │            │                     │
└─────────────────────┘            └─────────────────────┘            └─────────────────────┘
```

**Behavior:**
- Uses `onboard_customer` API (combines registration + order generation)
- Step 2: User saves up to 3 separate delivery addresses (e.g. Home, Office, Other). `address_1` is required, rest are optional. `address_1` becomes the default delivery address for generated orders.
- Progress bar at top shows current step
- Client-side validation before each step transition
- On success → auto-login (cache user) → navigate to Home
- Plan cards have illustrations and are selectable with a check animation

### 4.3 Home / Dashboard Screen

```
┌──────────────────────────┐
│  Hi, John! 👋             │   ← Greeting with user's first name
│  ┌────────────────────┐  │
│  │ 💰 Credit Balance  │  │   ← Prominent credit card
│  │     ₹ 45           │  │      Gradient background (orange → warm)
│  │   ━━━━━━━━━━━━━    │  │      Credit bar visual
│  └────────────────────┘  │
│                          │
│  Today's Meals  [⟳]      │   ← Section header + refresh
│  ┌────────────────────┐  │
│  │ 🌞 Lunch          │  │   ← Card with status
│  │ 🟢 Veg · 1 tiffin │  │
│  │ 📍 Home address    │  │   ← Shows saved address label
│  │ Status: Delivered ✅│  │   ← Green badge
│  │─────────────────── │  │
│  │ 🌙 Dinner         │  │
│  │ 🟢 Veg · 1 tiffin │  │
│  │ 📍 Building A      │  │
│  │ Status: Pending 🟡  │  │   ← Amber badge
│  │ [Skip] [Edit]      │  │   ← Action buttons (if not reconciled)
│  └────────────────────┘  │
│                          │
│  Tomorrow's Meals         │
│  ┌────────────────────┐  │
│  │ 🌞 Lunch          │  │
│  │ 🟢 Veg · 1 tiffin │  │
│  │ [Skip] [Edit]      │  │
│  │─────────────────── │  │
│  │ 🌙 Dinner         │  │
│  │ 🔴 Non-veg·1 tiffin│  │
│  │ [Skip] [Edit]      │  │
│  └────────────────────┘  │
│                          │
│  Quick Actions            │
│  ┌──────┐ ┌──────┐ ┌────┐│
│  │ Add  │ │Extend│ │View││   ← Quick action pills
│  │ Meal │ │ Plan │ │ Cal││
│  └──────┘ └──────┘ └────┘│
│                          │
│  ┌──────────────────────┐│
│  │ 📊 View This Month's ││   ← Banner link to Monthly Report
│  │    Report  ━━▶       ││
│  └──────────────────────┘│
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │   ← Bottom Navigation
│ Home Cal  Add Report Prof│
└──────────────────────────┘
```

**Data Source:**
- Today's & tomorrow's meals → `get_orders_by_user` with `start_date=today` & `end_date=tomorrow`
- Credit balance → from cached `customer` profile (refreshed on pull)

**Interactions:**
- Skip → confirmation bottom sheet → `skip_order` API → refresh
- Edit → opens order edit bottom sheet → `update_order` API
- Quick action pills → navigate to respective screens
- Pull-to-refresh (or tap ⟳) → re-fetches orders + customer profile

### 4.4 Calendar / My Orders Screen ⭐ (Key Feature)

> This is the centerpiece screen. A custom calendar component with Swiggy-style order cards.

```
┌──────────────────────────┐
│  My Orders [⟳]           │
│                          │
│  ◀  April 2026  ▶        │   ← Month navigator
│                          │
│  M  T  W  T  F  S  S    │   ← Day headers
│  ┌──┬──┬──┬──┬──┬──┬──┐  │
│  │  │  │ 1│ 2│ 3│ 4│ 5│  │
│  │  │  │🟢│🟢│🟢│🔴│🟢│  │   ← Dot indicators
│  │  │  │🟡│🟡│🟡│  │🟡│  │     🟢 = veg, 🔴 = non-veg
│  ├──┼──┼──┼──┼──┼──┼──┤  │     Top dot = lunch, Bottom = dinner
│  │ 6│ 7│ 8│ 9│10│11│12│  │     ⬜ = skipped (grey strikethrough)
│  │🟢│🟢│⬜│🟢│🟢│🟢│🟢│  │     ✅ = delivered (filled)
│  │🟡│🟡│⬜│🟡│🟡│🟢│🟡│  │
│  ├──┼──┼──┼──┼──┼──┼──┤  │
│  │13│14│15│..│  │  │  │  │
│  └──┴──┴──┴──┴──┴──┴──┘  │
│                          │
│  ── April 12 (Today) ──  │   ← Selected day header
│                          │
│  ┌────────────────────┐  │
│  │ 🌞 LUNCH           │  │   ← Order summary card for selected day
│  │ ┌──┐               │  │
│  │ │🟢│ Veg · Qty: 1  │  │   ← Veg indicator (green bordered square)
│  │ └──┘               │  │
│  │ 📍 Building A, St 1│  │
│  │ ✅ Delivered at 1:30│  │   ← Status with timestamp
│  │ Credits: 1          │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 🌙 DINNER          │  │
│  │ ┌──┐               │  │
│  │ │🟢│ Veg · Qty: 1  │  │
│  │ └──┘               │  │
│  │ 📍 Building A, St 1│  │
│  │ 🟡 Pending         │  │
│  │ [Skip] [Edit]      │  │   ← Action buttons for non-reconciled
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │
└──────────────────────────┘
```

**Calendar Day Cell Logic:**

Each calendar day cell renders up to 2 small dots (or icon indicators):

| Position | Meaning | Visual |
|----------|---------|--------|
| Top dot | Lunch order | 🟢 veg / 🔴 non-veg / ⬜ skipped / ✅ delivered |
| Bottom dot | Dinner order | Same scheme |
| No dot | No order for that slot | Empty |
| Greyed cell | All orders skipped | Light grey background |
| Today highlight | Current date | Orange ring border |

**Dot Color Legend (shown as a small legend bar below month nav):**
```
🟢 Veg  🔴 Non-veg  ⬜ Skipped  ✅ Delivered
```

**Selected Day Detail:**
- Tapping a day scrolls down (or opens a bottom sheet / inline expansion) showing order cards
- Each card has:
  - Slot (Lunch/Dinner) as header with icon
  - Veg/Non-veg indicator (Swiggy-style green square / red triangle border)
  - Quantity ordered
  - Delivery address (truncated)
  - Status badge: `Delivered ✅` (green) / `Pending 🟡` (amber) / `Skipped ⬜` (grey)
  - If **not delivered and not reconciled**: Show `[Skip]` and `[Edit]` buttons
  - Delivered timestamp if delivered

**Month Navigation:**
- Swipe left/right or use arrows to change month
- Fetches data for the full month range via `get_orders_by_user`
- Data is cached per month key: `orders_2026_04`

### 4.5 Add Meal Screen

```
┌──────────────────────────┐
│  ← Add a Meal    [⟳]    │
│                          │
│  ┌────────────────────┐  │
│  │ 📅 Select Date     │  │   ← Date picker (min: today)
│  │    April 14, 2026  │  │
│  └────────────────────┘  │
│                          │
│  Select Slot             │
│  ┌──────────┐ ┌────────┐│
│  │ 🌞 Lunch │ │🌙Dinner││   ← Toggle cards
│  │  (sel)   │ │        ││
│  └──────────┘ └────────┘│
│                          │
│  Deliver To              │   ← Pick from saved addresses
│  ┌────────────────────┐  │
│  │ 🏠 Home (selected) │  │   ← Radio list of user's
│  │ 🏢 Office          │  │     saved addresses
│  │ 📍 Other           │  │
│  └────────────────────┘  │
│                          │
│  Select Type             │
│  ┌──────────┐ ┌────────┐│
│  │ 🟢 Veg   │ │🔴NonVeg││
│  │  (sel)   │ │        ││
│  └──────────┘ └────────┘│
│                          │
│  Quantity                │
│  ┌──┐ ┌───┐ ┌──┐        │
│  │ -│ │ 1 │ │ +│        │   ← Stepper control
│  └──┘ └───┘ └──┘        │
│                          │
│  ┌────────────────────┐  │
│  │   Add Meal ━━━▶    │  │   ← CTA button
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │
└──────────────────────────┘
```

**Behavior:**
- Uses `add_order_slot` API
- Address picker shows user's saved addresses (address_1, address_2, address_3) as selectable radio options. Defaults to `address_1`.
- Default type: veg, default qty: 1
- On success → toast "Meal added!" → navigate to Calendar view
- Validates: date must be in the future and not reconciled (server-side validation handles this)

### 4.6 Extend Plan Screen

```
┌──────────────────────────┐
│  ← Extend Plan   [⟳]    │
│                          │
│  Extend your meal plan   │
│  for more days           │
│                          │
│  Plan Type               │
│  ┌──────┐┌──────┐┌─────┐│
│  │Lunch ││Dinner││ Both ││   ← Segmented control
│  │      ││      ││(sel) ││
│  └──────┘└──────┘└─────┘│
│                          │
│  ┌────────────────────┐  │
│  │ 📅 Start Date      │  │
│  │    April 16, 2026  │  │
│  └────────────────────┘  │
│                          │
│  Number of Days          │
│  ┌──┐ ┌───┐ ┌──┐        │
│  │ -│ │ 7 │ │ +│        │   ← 1 to 30
│  └──┘ └───┘ └──┘        │
│                          │
│  ┌────────────────────┐  │
│  │ Summary            │  │
│  │ Plan: Both         │  │
│  │ From: Apr 16       │  │
│  │ To:   Apr 22       │  │
│  │ Orders: 14         │  │   ← Calculated preview
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Extend Plan ━━━▶   │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │
└──────────────────────────┘
```

**Behavior:**
- Uses `extend_plan` API
- Auto-calculates end date and order count in the summary
- Days stepper: min 1, max 30
- Start date must be ≥ today
- On success → toast "Plan extended!" → navigate to Calendar

### 4.7 Monthly Report Screen

```
┌──────────────────────────┐
│  Monthly Report   [⟳]   │
│                          │
│  ◀  April 2026  ▶        │   ← Month selector
│                          │
│  ┌────────────────────┐  │
│  │ Summary             │  │   ← Stats card grid
│  │ ┌──────┐ ┌──────┐  │  │
│  │ │  60  │ │  55  │  │  │
│  │ │Ordered│ │Deliv'd│  │  │
│  │ └──────┘ └──────┘  │  │
│  │ ┌──────┐ ┌──────┐  │  │
│  │ │   5  │ │  55  │  │  │
│  │ │Skipped│ │Credits│  │  │
│  │ └──────┘ └──────┘  │  │
│  └────────────────────┘  │
│                          │
│  Order Details            │
│  ┌────────────────────┐  │
│  │ Apr 1 │ L │ 1/1 │✅│  │   ← Compact order rows
│  │ Apr 1 │ D │ 1/1 │✅│  │     Date | Slot | Ordered/Delivered | Status
│  │ Apr 2 │ L │ 1/0 │⬜│  │     Color-coded by status
│  │ Apr 2 │ D │ 1/1 │✅│  │
│  │ ...                │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │
└──────────────────────────┘
```

**Behavior:**
- Uses `get_monthly_report` API
- Month selector changes the date range → re-fetches
- Stats cards animate on load (count-up animation)
- Order detail rows are scrollable table/list
- Slot column: `L` = Lunch, `D` = Dinner
- Status icons: ✅ Delivered, ⬜ Skipped, 🟡 Pending

### 4.8 Profile Screen

```
┌──────────────────────────┐
│  My Profile       [⟳]   │
│                          │
│  ┌────────────────────┐  │
│  │  👤                │  │   ← Avatar circle with initials
│  │  John Doe          │  │
│  │  📱 9876543210     │  │
│  │  Member since Apr 2026│
│  └────────────────────┘  │
│                          │
│  Account                 │
│  ┌────────────────────┐  │
│  │ 💰 Credit Balance  │  │
│  │    ₹ 45        ━━▶│  │
│  ├────────────────────┤  │
│  │ 📝 Edit Name      ━━▶│  │   ← Opens edit modal
│  ├────────────────────┤  │
│  │ 🔒 Change Password ━━▶│  │
│  ├────────────────────┤  │
│  │ 📍 Manage Addresses━━▶│  │   ← Manage 3 saved delivery
│  └────────────────────┘  │     addresses (Home/Office/Other)
│                          │
│  ┌────────────────────┐  │
│  │ 🚪 Logout          │  │   ← Red text, confirmation dialog
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│ 🏠  📅  ➕  📊  👤      │
└──────────────────────────┘
```

**Behavior:**
- Data from cached `customer` object
- Edit Name → inline edit or bottom sheet → `update_customer`
- Change Password → bottom sheet with current + new password → `update_customer`
- Manage Addresses → bottom sheet showing 3 saved address slots (🏠 Address 1 / 🏢 Address 2 / 📍 Address 3). Each is an independent delivery address (e.g. Home, Office, Other). Address 1 is required. → `update_customer`
- Logout → confirm dialog → clear `localStorage` → navigate to Login

### 4.9 Bottom Sheet / Modal Components

Used throughout the app for:

1. **Order Detail Modal** — Full order info when tapping a calendar day
2. **Skip Confirmation** — "Are you sure you want to skip this meal?"
3. **Edit Order** — Change type (veg/non-veg), address, quantity
4. **Edit Profile Fields** — Name, password, addresses

```
┌──────────────────────────┐
│     (dimmed backdrop)    │
│                          │
│  ┌────────────────────┐  │
│  │ ━━━━ (drag handle) │  │   ← Grab handle
│  │                    │  │
│  │  Edit Order        │  │
│  │                    │  │
│  │  Type              │  │
│  │  [🟢 Veg] [🔴Nonveg]│  │
│  │                    │  │
│  │  Deliver To        │  │
│  │  ○ 🏠 Home addr   │  │   ← Pick from saved addresses
│  │  ● 🏢 Office addr │  │
│  │  └──────────────┘  │  │
│  │                    │  │
│  │  Quantity          │  │
│  │  [-] 2 [+]        │  │
│  │                    │  │
│  │  ┌──────────────┐  │  │
│  │  │ Save Changes │  │  │
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

**Animation:** Slides up from bottom with spring animation (CSS transform + transition).

---

## 5. Caching & Data Strategy

### 5.1 localStorage Schema

| Key | Type | Cached When | TTL |
|-----|------|------------|-----|
| `tiffin_user` | `Customer` object | Login / Profile refresh | Until logout |
| `tiffin_orders_YYYY_MM` | `Order[]` | Calendar view load | 5 min (stale-while-revalidate) |
| `tiffin_report_YYYY_MM` | `MonthlyReport` | Report view load | 5 min |
| `tiffin_cache_timestamps` | `Record<string, number>` | On each cache write | — |

### 5.2 Cache Flow Per Screen

```
Screen Mount
  ├── Read from localStorage
  │   ├── Data exists → Render immediately
  │   │    └── Check if stale (> 5 min)
  │   │         ├── Stale → Fetch in background → Update UI + cache
  │   │         └── Fresh → Done
  │   └── No data → Show skeleton → Fetch → Render + cache
  └── Refresh button tapped
       └── Show inline loading indicator (not skeleton) → Fetch → Update UI + cache
```

### 5.3 Custom Hook: `useCache`

```typescript
function useCache<T>(key: string, fetcher: () => Promise<T>, ttlMs = 300000) {
  const [data, setData] = useState<T | null>(readCache(key));
  const [isLoading, setIsLoading] = useState(!readCache(key));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => { /* force re-fetch, update cache */ };
  const load = async () => { /* stale-while-revalidate logic */ };

  useEffect(() => { load(); }, [key]);

  return { data, isLoading, isRefreshing, error, refresh };
}
```

### 5.4 Mutation Invalidation

When a mutation occurs (skip, update, add, extend), we must:
1. Invalidate the relevant month's orders cache
2. Re-fetch the affected date range
3. Optionally optimistically update the UI

```typescript
// After skipOrder succeeds:
invalidateCache(`tiffin_orders_${year}_${month}`);
await refresh(); // re-fetch orders for current month
```

---

## 6. Skeleton Loading System

### 6.1 Skeleton Component

A reusable `<Skeleton>` component with CSS shimmer animation:

```css
.skeleton {
  background: var(--color-skeleton);
  background-image: linear-gradient(
    90deg,
    var(--color-skeleton) 0%,
    var(--color-skeleton-shimmer) 50%,
    var(--color-skeleton) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite ease-in-out;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 6.2 Screen-Specific Skeletons

| Screen | Skeleton Shape |
|--------|---------------|
| **Home** | Credit card skeleton (rounded rect) + 2 order card skeletons (with line placeholders) |
| **Calendar** | Calendar grid skeleton (7×5 grid of squares) + 2 order card skeletons below |
| **Monthly Report** | 4 stat card skeletons (square) + 5 list row skeletons |
| **Profile** | Avatar circle + 3 line skeletons + 4 list item skeletons |
| **Add Meal** | Form field skeletons (rare — fast render, but included) |

Each skeleton matches the **exact layout** of the real content so there's no layout shift when data loads.

---

## 7. Component Architecture

### 7.1 File Structure

```
customerApp/
├── .env                        ← Environment variables
├── .env.example                ← Example env file (committed)
├── index.html                  ← Entry point
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json           ← PWA manifest
│   ├── logo.png                ← App icon (copied from /files)
│   ├── bg.png                  ← Background image (copied from /files)
│   └── favicon.ico
├── src/
│   ├── main.tsx                ← React entry point
│   ├── App.tsx                 ← Root component + router
│   ├── index.css               ← Global styles + design tokens
│   │
│   ├── services/
│   │   └── api.ts              ← API wrapper (all 10 customer endpoints)
│   │
│   ├── hooks/
│   │   ├── useCache.ts         ← Cache-first data fetching hook
│   │   ├── useAuth.ts          ← Auth context hook
│   │   └── useToast.ts         ← Toast notification hook
│   │
│   ├── context/
│   │   ├── AuthContext.tsx      ← User session provider
│   │   └── ToastContext.tsx     ← Toast notification provider
│   │
│   ├── components/
│   │   ├── BottomNav/
│   │   │   ├── BottomNav.tsx
│   │   │   └── BottomNav.module.css
│   │   ├── Skeleton/
│   │   │   ├── Skeleton.tsx
│   │   │   └── Skeleton.module.css
│   │   ├── OrderCard/
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderCard.module.css
│   │   ├── BottomSheet/
│   │   │   ├── BottomSheet.tsx
│   │   │   └── BottomSheet.module.css
│   │   ├── Calendar/
│   │   │   ├── Calendar.tsx
│   │   │   ├── CalendarDay.tsx
│   │   │   └── Calendar.module.css
│   │   ├── StatCard/
│   │   │   ├── StatCard.tsx
│   │   │   └── StatCard.module.css
│   │   ├── Toast/
│   │   │   ├── Toast.tsx
│   │   │   └── Toast.module.css
│   │   ├── VegIndicator/
│   │   │   ├── VegIndicator.tsx         ← 🟢/🔴 Swiggy-style indicator
│   │   │   └── VegIndicator.module.css
│   │   ├── RefreshButton/
│   │   │   ├── RefreshButton.tsx
│   │   │   └── RefreshButton.module.css
│   │   ├── StatusBadge/
│   │   │   ├── StatusBadge.tsx
│   │   │   └── StatusBadge.module.css
│   │   └── StepperInput/
│   │       ├── StepperInput.tsx
│   │       └── StepperInput.module.css
│   │
│   ├── pages/
│   │   ├── Login/
│   │   │   ├── LoginPage.tsx
│   │   │   └── LoginPage.module.css
│   │   ├── Register/
│   │   │   ├── RegisterPage.tsx
│   │   │   └── RegisterPage.module.css
│   │   ├── Home/
│   │   │   ├── HomePage.tsx
│   │   │   └── HomePage.module.css
│   │   ├── MyOrders/
│   │   │   ├── MyOrdersPage.tsx
│   │   │   └── MyOrdersPage.module.css
│   │   ├── AddMeal/
│   │   │   ├── AddMealPage.tsx
│   │   │   └── AddMealPage.module.css
│   │   ├── ExtendPlan/
│   │   │   ├── ExtendPlanPage.tsx
│   │   │   └── ExtendPlanPage.module.css
│   │   ├── Report/
│   │   │   ├── ReportPage.tsx
│   │   │   └── ReportPage.module.css
│   │   └── Profile/
│   │       ├── ProfilePage.tsx
│   │       └── ProfilePage.module.css
│   │
│   └── utils/
│       ├── cache.ts            ← localStorage read/write/invalidate helpers
│       ├── dates.ts            ← Date formatting helpers (using date-fns)
│       └── constants.ts        ← Cache keys, routes, etc.
```

### 7.2 Route Map

| Path | Page Component | Auth Required | Nav Tab |
|------|---------------|---------------|---------|
| `/login` | LoginPage | ❌ | — |
| `/register` | RegisterPage | ❌ | — |
| `/` | HomePage | ✅ | Home 🏠 |
| `/orders` | MyOrdersPage | ✅ | Calendar 📅 |
| `/add-meal` | AddMealPage | ✅ | Add ➕ |
| `/report` | ReportPage | ✅ | Report 📊 |
| `/profile` | ProfilePage | ✅ | Profile 👤 |
| `/extend-plan` | ExtendPlanPage | ✅ | — (from Home quick action) |

### 7.3 Auth Guard

```typescript
// ProtectedRoute wraps authenticated pages
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppSkeleton />;
  if (!user) return <Navigate to="/login" />;
  return children;
}
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Day 1)

| # | Task | Details |
|---|------|---------|
| 1.1 | **Init Vite + React + TS project** | `npx -y create-vite@latest ./ --template react-ts` inside `customerApp/` |
| 1.2 | **Install dependencies** | `react-router-dom`, `date-fns`, `lucide-react` |
| 1.3 | **Set up `.env`** | `VITE_API_BASE_URL` and `VITE_API_SECRET` |
| 1.4 | **Create design system** | `index.css` with all CSS custom properties, global resets, font imports |
| 1.5 | **Copy assets** | logo.png, bg.png from `/files` into `public/` |
| 1.6 | **Create API service** | `src/services/api.ts` with all 10 customer endpoints |
| 1.7 | **Create cache utilities** | `src/utils/cache.ts` + `src/hooks/useCache.ts` |
| 1.8 | **Create Toast system** | Context + Provider + Toast component |

### Phase 2: Auth + Layout (Day 2)

| # | Task | Details |
|---|------|---------|
| 2.1 | **AuthContext** | Login, logout, auto-login from cache, refresh profile |
| 2.2 | **LoginPage** | Full design with background image, logo, form, animations |
| 2.3 | **RegisterPage** | 3-step wizard using `onboard_customer` |
| 2.4 | **BottomNav** | 5-tab nav with active states and route indicators |
| 2.5 | **App Router setup** | Routes + ProtectedRoute wrapper |
| 2.6 | **Skeleton component** | Reusable with shimmer animation |

### Phase 3: Home + Order Cards (Day 3)

| # | Task | Details |
|---|------|---------|
| 3.1 | **HomePage** | Credit balance card, today/tomorrow orders, quick actions |
| 3.2 | **OrderCard** | Reusable order display with veg indicator, status badge, actions |
| 3.3 | **VegIndicator** | Swiggy-style green square / red triangle |
| 3.4 | **StatusBadge** | Delivered/Pending/Skipped states |
| 3.5 | **Skip flow** | Confirmation bottom sheet → API → cache invalidation |
| 3.6 | **Edit order bottom sheet** | Edit type, address, qty → API |

### Phase 4: Calendar View (Day 4)

| # | Task | Details |
|---|------|---------|
| 4.1 | **Calendar component** | 7-column grid, month navigation, dot indicators per day |
| 4.2 | **CalendarDay cell** | Up to 2 dots (lunch/dinner), color-coded, tap handler |
| 4.3 | **Day detail section** | Inline expansion or scroll-to showing order cards for selected day |
| 4.4 | **Legend bar** | Small legend below month nav |
| 4.5 | **Month data fetching** | Full-month `get_orders_by_user` with caching per month |

### Phase 5: Add Meal + Extend Plan (Day 5)

| # | Task | Details |
|---|------|---------|
| 5.1 | **AddMealPage** | Date picker, slot/type selectors, address, qty stepper |
| 5.2 | **ExtendPlanPage** | Plan selector, start date, days stepper, preview summary |
| 5.3 | **StepperInput component** | Reusable ±1 stepper with min/max |
| 5.4 | **Date picker styling** | Native `<input type="date">` styled to match design system |

### Phase 6: Report + Profile (Day 6)

| # | Task | Details |
|---|------|---------|
| 6.1 | **ReportPage** | Month selector, 4 stat cards (animated count-up), order list |
| 6.2 | **StatCard** | Animated number display with label |
| 6.3 | **ProfilePage** | User info, edit options (name, password, addresses), logout |
| 6.4 | **Edit profile bottom sheets** | 3 separate bottom sheets for name, password, addresses |

### Phase 7: Polish & PWA (Day 7)

| # | Task | Details |
|---|------|---------|
| 7.1 | **Responsive testing** | Test on 360px, 390px, 414px, 428px viewports |
| 7.2 | **Animations polish** | Page transitions, micro-interactions, spring physics |
| 7.3 | **Error states** | Empty states, network error states, offline banner |
| 7.4 | **PWA manifest** | Icons, theme color, display standalone |
| 7.5 | **Performance audit** | Lighthouse run, bundle analysis, lazy loading |
| 7.6 | **Accessibility audit** | Touch targets, aria labels, focus management |

---

## 9. Environment Configuration

### `.env` file (at `customerApp/.env`)

```env
# API Configuration
VITE_API_BASE_URL=https://script.google.com/macros/s/AKfycbw59cfZvzZw8h75avJxom2Aw4yOn2yhYSenBQrnW6bKIx1nZsWNU2ridDKMC5TN0JujgA/exec
VITE_API_SECRET=FOOD2026

# App Configuration
VITE_APP_NAME=Local Tiffin Service
VITE_APP_TAGLINE=Homemade meals, delivered daily
```

### `.env.example` (committed to git)

```env
# API Configuration
VITE_API_BASE_URL=<your-google-apps-script-deployment-url>
VITE_API_SECRET=<user-secret-code>

# App Configuration
VITE_APP_NAME=Local Tiffin Service
VITE_APP_TAGLINE=Homemade meals, delivered daily
```

> [!WARNING]
> The `VITE_API_SECRET` is exposed to the client. This is by design for this use case (Google Apps Script with shared secret), but should be noted as a security limitation. In production, you'd proxy through a backend.

---

## 10. Verification Plan

### Automated Checks

| # | Check | Command |
|---|-------|---------|
| V1 | TypeScript compilation | `npm run build` (no errors) |
| V2 | Dev server starts | `npm run dev` → loads at localhost |
| V3 | Lighthouse mobile score | ≥ 90 Performance, ≥ 90 Accessibility |

### Browser Testing (via browser subagent)

| # | Test | Steps |
|---|------|-------|
| B1 | Login flow | Navigate to login → enter credentials → verify redirect to Home |
| B2 | Registration flow | 3-step wizard → verify success → auto-login |
| B3 | Home screen data | Verify credit balance, today's orders render |
| B4 | Calendar navigation | Switch months → verify dots render → tap day → verify detail |
| B5 | Skip order | Tap skip → confirm → verify toast + order status update |
| B6 | Add meal | Fill form → submit → verify success toast |
| B7 | Monthly report | Select month → verify stats + order list |
| B8 | Profile edit | Edit name → save → verify update persists |
| B9 | Skeleton loading | Disable cache → reload → verify skeletons appear |
| B10 | Refresh buttons | Tap refresh on each page → verify data re-fetches |

### Manual Verification (User)

- [ ] Test on physical mobile device (Chrome on Android / Safari on iOS)
- [ ] Verify PWA installation ("Add to Home Screen")
- [ ] Test with slow 3G network throttling
- [ ] Verify all API operations against live backend

---

## User Review Required

> [!IMPORTANT]
> **Tech Stack Confirmation:** I'm proposing **Vite + React (TypeScript)** with **CSS Modules**. This gives us component-level styling, type safety, and blazing fast builds. If you'd prefer a different framework (vanilla JS, Preact, Svelte, etc.), please let me know.

> [!IMPORTANT]
> **Registration Flow:** The API supports both `create_customer` (registration only) and `onboard_customer` (registration + plan setup). I'm proposing to use `onboard_customer` as the **primary registration flow** (3-step wizard that creates the account AND sets up the meal plan in one go). The standalone `create_customer` won't have a separate UI — users always register through the onboarding flow. Is that acceptable, or should there be a "register without choosing a plan" option?

> [!IMPORTANT]
> **Calendar Day Detail:** Two options for showing order details when a day is tapped:
> - **Option A:** Inline expansion below the calendar (stays on same scroll position)
> - **Option B:** Bottom sheet modal (slides up, more Swiggy-like)
> 
> I'm leaning towards **Option A** for the default view with a "View Details" link that opens **Option B** for the full modal. Thoughts?

## Open Questions

1. **Branding:** The logo uses yellow/black. Should the primary color be orange (#FF5200, Swiggy-style) or yellow (#FFD700, matching the logo)? I'm proposing orange for the UI with the yellow logo as-is.

2. **Currency:** The credit system appears to be unit-based (1 credit = 1 tiffin delivered). Should we display credits as `₹ 45` or just `45 credits`? The API uses the term `credit_balance`.

3. **Order Type Default:** When extending a plan, all orders default to "veg". Should the user be able to set a default preference (veg/non-veg) that applies to all new orders?

4. **Notifications:** Should we implement browser push notifications for order delivery status, or is this out of scope for now?
