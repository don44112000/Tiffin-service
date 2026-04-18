# Tiffin Admin & Delivery Portal — Complete Refactor Plan

> **Goal:** Tear down the existing adminApp and rebuild it from the ground up, replicating the proven patterns from the customerApp (caching, API proxy, request queuing, toast system, loading states, skeleton loaders, pull-to-refresh). The result is a production-grade, mobile-first + desktop-optimized operations portal for delivery agents and administrators.

---

## Table of Contents

1. [Why Refactor](#1-why-refactor)
2. [Architecture & Patterns (from customerApp)](#2-architecture--patterns-from-customerapp)
3. [Tech Stack](#3-tech-stack)
4. [API Integration Map](#4-api-integration-map)
5. [TypeScript Types](#5-typescript-types)
6. [File Structure](#6-file-structure)
7. [Routing & Auth](#7-routing--auth)
8. [Caching & Data Strategy](#8-caching--data-strategy)
9. [Screen-by-Screen Design Specification](#9-screen-by-screen-design-specification)
10. [Component Library](#10-component-library)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. Why Refactor

The current adminApp has critical issues that make it unreliable and poor quality:

### Blocking Bugs
- **CustomerDetailPage** — `getMonthlyReport` and `reduceCreditsAgainstOrder` are called but never imported. Page crashes on load.
- **MenuManagementPage** — Never fetches existing menu from backend. Data lost on every refresh. The `get_menu` API is never called.
- **AdminPortalLayout** — Mobile content renders underneath the fixed header. Users can't see the top of any page on mobile.
- **ReconciliationPage** — Audit log is entirely hardcoded fake data. Estimated credits use a dummy `orders * 100` formula.

### Architectural Problems
- **No API proxy** — Vite config has no proxy setup. In production, there's no Netlify function to inject the admin secret server-side. The secret is exposed in every client-side request.
- **No toast system** — Errors and successes are invisible or use `window.alert()` / `window.prompt()`.
- **No loading context** — No global loading indicator. Individual pages manage their own loading inconsistently.
- **No pull-to-refresh** — Mobile users have no way to refresh data other than hard-reloading the browser.
- **Inconsistent caching** — `useCache` hook exists but isn't used consistently. Some pages fetch directly, others use cache with wrong dependency arrays causing infinite re-fetches.
- **Hardcoded business logic** — Dashboard profit = `orders * 100`, reconciliation shows fake audit entries.
- **Type safety holes** — `null as any` casts, unvalidated API responses, missing generic constraints.

### UX Problems
- **No skeleton loaders** — Pages either show nothing or show broken partial UI during loading.
- **No error states** — When API calls fail, users see blank screens with no feedback.
- **No confirmation flows** — Destructive actions (reconciliation, credit deduction) use browser `prompt()` instead of proper modals.
- **Desktop layout broken on mobile** — Sidebar overlaps content, padding missing, no responsive adaptation.

### What We Keep
- Nothing. Complete rewrite using customerApp patterns as the blueprint.

---

## 2. Architecture & Patterns (from customerApp)

Every pattern below is proven in the customerApp and will be replicated identically:

### 2.1 API Proxy Pattern
```
[Browser] → /api/proxy?action=X → [Vite Dev Proxy / Netlify Function] → [Google Apps Script]
                                         ↑ Secret injected here (server-side)
```
- Dev: Vite `server.proxy` rewrites `/api/proxy` to `VITE_API_BASE_URL`
- Prod: Netlify serverless function forwards request with secret injected into body/params
- Client never sees `ADMIN2026` — it's only in env vars on the server

### 2.2 Request Queue
```
apiGet/apiPost → requestQueue.add(task, { silent? }) → fetch()
                        ↓
              Concurrency limit (max from env)
              Tracks interactive vs silent requests
              Notifies LoadingContext subscribers
```

### 2.3 Cache-First Data Flow
```
Page Mount
  ├── Read localStorage (instant)
  │   ├── Data exists → Render immediately → Check TTL
  │   │    ├── Stale → Background refresh (isRefreshing=true) → Update
  │   │    └── Fresh → Done
  │   └── No data → Show skeleton (isLoading=true) → Fetch → Render + cache
  └── Refresh button / Pull-to-refresh
       └── isRefreshing=true → Fetch → Update UI + cache
```

### 2.4 Context Provider Stack
```
BrowserRouter
  → AdminAuthProvider        (admin session: password-based)
    → LoadingProvider         (subscribes to requestQueue state)
      → ToastProvider         (toast queue with auto-dismiss)
        → AppLayout           (routes + global UI)
```

### 2.5 Error Handling Chain
```
API layer (throws on !ok or !success)
  → useCache (catches, sets error state, keeps stale data)
    → Page (shows error banner + stale data, or error state if no cache)
      → Toast (showToast for mutation errors)
```

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Vite + React 19 + TypeScript | Identical to customerApp |
| **Styling** | CSS Modules + Design Tokens | Zero-runtime, scoped, shared tokens |
| **Routing** | React Router v7 | Same as customerApp |
| **State** | React Context + localStorage | AuthContext, LoadingContext, ToastContext |
| **HTTP** | Native fetch + RequestQueue | Queued, typed, silent/interactive modes |
| **Icons** | Lucide React | Tree-shakeable, consistent with customerApp |
| **Dates** | date-fns | Same as customerApp |
| **Font** | Outfit (Google Fonts) | Same as customerApp |

### Dependencies (package.json)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "lucide-react": "^0.400.0",
    "date-fns": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "@netlify/functions": "^2.0.0"
  }
}
```

---

## 4. API Integration Map

### 4.1 All Admin Endpoints

```
┌──────────────────────────────────────────────────────────────────┐
│                    BASE URL (from .env)                           │
│  /api/proxy → Netlify Function → Google Apps Script               │
│  Secret: ADMIN2026 (injected server-side, NEVER in client code)   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  GET Endpoints                                                     │
│  ├── get_dashboard            → 3-day summary (yesterday/today/    │
│  │                              tomorrow) with slot breakdowns     │
│  ├── get_all_users            → Full customer list                 │
│  ├── get_orders_by_date_slot  → Orders for date+slot, grouped      │
│  │                              by customer                        │
│  ├── get_negative_credits     → Customers with negative balance    │
│  ├── get_monthly_report       → User's order summary for range     │
│  ├── get_credit_history       → User's credit transactions         │
│  └── get_menu                 → Weekly menu (all or filtered)      │
│                                                                    │
│  POST Endpoints                                                    │
│  ├── mark_delivered           → Mark order delivered + set credits  │
│  ├── recharge_credits         → Add credits to user balance        │
│  ├── admin_update_customer    → Edit user name/password            │
│  ├── mark_day_complete        → Reconcile day (deduct credits)     │
│  ├── reduce_credits_against_order → Add credits to specific order  │
│  └── upsert_menu              → Create/update menu item            │
│                                                                    │
│  Total: 13 endpoints (7 GET + 6 POST)                             │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 API Service Layer Design

```typescript
// src/services/api.ts

const BASE_URL = '/api/proxy';

async function apiGet<T>(action: string, params?: Record<string, string>): Promise<T>
async function apiPost<T>(action: string, body: Record<string, unknown>): Promise<T>

// Dashboard & Overview
export const getDashboard = (date: string) => apiGet<DashboardResponse>('get_dashboard', { date });
export const getAllUsers = () => apiGet<AllUsersResponse>('get_all_users');
export const getNegativeCredits = () => apiGet<NegativeCreditsResponse>('get_negative_credits');

// Order Operations (Delivery Agent)
export const getOrdersByDateSlot = (date: string, slot: string) =>
  apiGet<OrdersByDateSlotResponse>('get_orders_by_date_slot', { date, slot });
export const markDelivered = (orderId: string, quantityDelivered: number) =>
  apiPost<MarkDeliveredResponse>('mark_delivered', { order_id: orderId, quantity_delivered: quantityDelivered });

// Customer Management
export const rechargeCredits = (userId: string, amount: number) =>
  apiPost<RechargeResponse>('recharge_credits', { user_id: userId, amount });
export const adminUpdateCustomer = (userId: string, data: { name?: string; new_password?: string }) =>
  apiPost<GenericResponse>('admin_update_customer', { user_id: userId, ...data });

// Reports & History
export const getMonthlyReport = (userId: string, startDate: string, endDate: string) =>
  apiGet<MonthlyReportResponse>('get_monthly_report', { user_id: userId, start_date: startDate, end_date: endDate });
export const getCreditHistory = (userId: string, startDate: string, endDate: string) =>
  apiGet<CreditHistoryResponse>('get_credit_history', { user_id: userId, start_date: startDate, end_date: endDate });

// Reconciliation
export const markDayComplete = (date: string) =>
  apiPost<ReconcileResponse>('mark_day_complete', { date });

// Menu Management
export const getMenu = (day?: string, slot?: string) =>
  apiGet<MenuResponse>('get_menu', { ...(day && { day }), ...(slot && { slot }) });
export const upsertMenu = (day: string, slot: string, dishName: string, description?: string) =>
  apiPost<UpsertMenuResponse>('upsert_menu', { day, slot, dish_name: dishName, ...(description && { description }) });

// Credit Adjustments
export const reduceCreditsAgainstOrder = (orderId: string, creditsToAdd: number) =>
  apiPost<ReduceCreditsResponse>('reduce_credits_against_order', { order_id: orderId, credits_to_add: creditsToAdd });
```

---

## 5. TypeScript Types

```typescript
// src/types/index.ts

// ─── Data Models ───

export interface Customer {
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

export interface Order {
  order_id: string;
  user_id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  type: 'veg' | 'non-veg';
  address: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_used: number;
  is_delivered: boolean;
  delivered_at: string;
  created_at: string;
  is_skipped: boolean;
}

export interface GroupedOrders {
  user_id: string;
  customer_name: string;
  orders: Order[];
}

export interface SlotSummary {
  total_ordered: number;
  total_delivered: number;
  veg_ordered: number;
  non_veg_ordered: number;
  veg_delivered: number;
  non_veg_delivered: number;
  skipped: number;
}

export interface DaySummary {
  date: string;
  lunch: SlotSummary;
  dinner: SlotSummary;
}

export interface MenuItem {
  menu_id: string;
  day: string;
  slot: 'lunch' | 'dinner';
  dish_name: string;
  description: string;
}

export interface CreditHistoryItem {
  history_id: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  created_at: string;
}

export interface MonthlyReportSummary {
  user_id: string;
  from: string;
  to: string;
  total_ordered: number;
  total_delivered: number;
  total_skipped: number;
  total_credits_deducted: number;
}

export interface MonthlyReportOrder {
  order_id: string;
  date: string;
  slot: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_deducted: number;
  is_delivered: boolean;
  is_skipped: boolean;
}

// ─── API Responses ───

export interface DashboardResponse {
  success: boolean;
  yesterday: DaySummary;
  today: DaySummary;
  tomorrow: DaySummary;
}

export interface AllUsersResponse {
  success: boolean;
  total: number;
  users: Customer[];
}

export interface OrdersByDateSlotResponse {
  success: boolean;
  total: number;
  total_users: number;
  grouped: GroupedOrders[];
}

export interface NegativeCreditsResponse {
  success: boolean;
  total: number;
  users: Pick<Customer, 'user_id' | 'name' | 'mobile' | 'credit_balance'>[];
}

export interface MonthlyReportResponse {
  success: boolean;
  summary: MonthlyReportSummary;
  orders: MonthlyReportOrder[];
}

export interface CreditHistoryResponse {
  success: boolean;
  summary: { total_credited: number; total_debited: number; net: number };
  total: number;
  history: CreditHistoryItem[];
}

export interface MenuResponse {
  success: boolean;
  total: number;
  menu: MenuItem[];
}

export interface MarkDeliveredResponse {
  success: boolean;
  message: string;
  credits_used: number;
}

export interface RechargeResponse {
  success: boolean;
  message: string;
  user_id: string;
  added: number;
  previous_balance: number;
  new_balance: number;
}

export interface ReconcileResponse {
  success: boolean;
  message: string;
  date: string;
  total_credits_deducted: number;
  users_affected: number;
}

export interface UpsertMenuResponse {
  success: boolean;
  message: string;
  menu_id: string;
}

export interface ReduceCreditsResponse {
  success: boolean;
  message: string;
  order_id: string;
  previous_credits: number;
  new_credits: number;
  day_completed: boolean;
}

export interface GenericResponse {
  success: boolean;
  message: string;
}
```

---

## 6. File Structure

```
adminApp/
├── .env                                ← Environment variables
├── .env.example                        ← Template (committed)
├── .gitignore
├── index.html                          ← Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts                      ← Vite config WITH dev proxy
├── netlify.toml                        ← Netlify build + redirect config
│
├── netlify/
│   └── functions/
│       └── proxy.ts                    ← Serverless proxy (injects ADMIN2026)
│
├── public/
│   ├── favicon.svg
│   └── manifest.json                   ← PWA manifest
│
└── src/
    ├── main.tsx                        ← React entry
    ├── App.tsx                         ← Router + provider stack + layout
    ├── index.css                       ← Design system tokens + global styles
    │
    ├── types/
    │   └── index.ts                    ← All TypeScript interfaces
    │
    ├── services/
    │   ├── api.ts                      ← API wrapper (13 admin endpoints)
    │   └── queueManager.ts            ← Request concurrency queue
    │
    ├── hooks/
    │   ├── useCache.ts                 ← Stale-while-revalidate hook
    │   ├── useAuth.ts                  ← Re-export from AuthContext
    │   └── useToast.ts                 ← Re-export from ToastContext
    │
    ├── context/
    │   ├── AuthContext.tsx             ← Admin auth (password-based)
    │   ├── ToastContext.tsx            ← Toast notification queue
    │   └── LoadingContext.tsx          ← Global loading state from queue
    │
    ├── utils/
    │   ├── cache.ts                    ← localStorage wrapper
    │   ├── constants.ts               ← Routes, cache keys, config
    │   └── dates.ts                    ← Date formatting helpers
    │
    ├── components/
    │   ├── AppLayout/
    │   │   ├── AppLayout.tsx           ← Responsive shell (sidebar + mobile nav)
    │   │   └── AppLayout.module.css
    │   ├── BottomSheet/
    │   │   ├── BottomSheet.tsx         ← Slide-up modal (from customerApp)
    │   │   └── BottomSheet.module.css
    │   ├── Toast/
    │   │   ├── ToastContainer.tsx      ← Toast renderer
    │   │   └── Toast.module.css
    │   ├── GlobalLoader/
    │   │   ├── GlobalLoader.tsx        ← Top progress bar
    │   │   └── GlobalLoader.module.css
    │   ├── Skeleton/
    │   │   ├── Skeleton.tsx            ← Base + page-specific skeletons
    │   │   └── Skeleton.module.css
    │   ├── OrderDeliveryCard/
    │   │   ├── OrderDeliveryCard.tsx   ← Delivery agent order item
    │   │   └── OrderDeliveryCard.module.css
    │   ├── CustomerCard/
    │   │   ├── CustomerCard.tsx        ← Customer list item
    │   │   └── CustomerCard.module.css
    │   ├── StatCard/
    │   │   ├── StatCard.tsx            ← Dashboard stat card
    │   │   └── StatCard.module.css
    │   ├── SearchBar/
    │   │   ├── SearchBar.tsx
    │   │   └── SearchBar.module.css
    │   ├── VegIndicator/
    │   │   ├── VegIndicator.tsx
    │   │   └── VegIndicator.module.css
    │   ├── StatusBadge/
    │   │   ├── StatusBadge.tsx
    │   │   └── StatusBadge.module.css
    │   ├── PullToRefresh/
    │   │   ├── PullToRefresh.tsx
    │   │   └── PullToRefresh.module.css
    │   └── ConfirmDialog/
    │       ├── ConfirmDialog.tsx       ← Replaces window.confirm/prompt
    │       └── ConfirmDialog.module.css
    │
    └── pages/
        ├── DeliveryPage/
        │   ├── DeliveryPage.tsx        ← Delivery agent view (public)
        │   └── DeliveryPage.module.css
        ├── AdminLogin/
        │   ├── AdminLoginPage.tsx
        │   └── AdminLoginPage.module.css
        ├── Dashboard/
        │   ├── DashboardPage.tsx
        │   └── DashboardPage.module.css
        ├── Customers/
        │   ├── CustomerDirectoryPage.tsx
        │   └── CustomerDirectoryPage.module.css
        ├── CustomerDetail/
        │   ├── CustomerDetailPage.tsx
        │   └── CustomerDetailPage.module.css
        ├── Menu/
        │   ├── MenuPage.tsx
        │   └── MenuPage.module.css
        └── Reconciliation/
            ├── ReconciliationPage.tsx
            └── ReconciliationPage.module.css
```

---

## 7. Routing & Auth

### 7.1 Route Map

| Path | Page | Auth | Layout |
|------|------|------|--------|
| `/` | DeliveryPage | None | Standalone (no sidebar) |
| `/admin/login` | AdminLoginPage | None | Standalone |
| `/admin/dashboard` | DashboardPage | Admin | AppLayout (sidebar) |
| `/admin/customers` | CustomerDirectoryPage | Admin | AppLayout |
| `/admin/customers/:userId` | CustomerDetailPage | Admin | AppLayout |
| `/admin/menu` | MenuPage | Admin | AppLayout |
| `/admin/reconciliation` | ReconciliationPage | Admin | AppLayout |
| `*` | Redirect to `/` | — | — |

### 7.2 Auth Model

The admin app has a simple password-based gate (no user accounts for admins):

```typescript
// AuthContext
interface AdminAuthContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;  // validates against VITE_ADMIN_PASSWORD
  logout: () => void;
}
```

- **Login**: Validates password client-side against env var. On success, stores `tiffin_admin_auth = true` in localStorage.
- **Logout**: Removes auth flag + clears all admin cache.
- **Guard**: `<ProtectedRoute>` checks `isAdmin`. If false, redirects to `/admin/login`.
- **API auth**: The `ADMIN2026` secret is injected server-side by the proxy. Client never sends it.

### 7.3 App.tsx Structure

```typescript
<BrowserRouter>
  <AdminAuthProvider>
    <LoadingProvider>
      <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<DeliveryPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin (protected + layout) */}
          <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomerDirectoryPage />} />
            <Route path="customers/:userId" element={<CustomerDetailPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
        <GlobalLoader />
      </ToastProvider>
    </LoadingProvider>
  </AdminAuthProvider>
</BrowserRouter>
```

---

## 8. Caching & Data Strategy

### 8.1 Cache Keys & TTL

| Key | Data | TTL | Invalidated By |
|-----|------|-----|---------------|
| `tiffin_admin_auth` | `"true"` | Permanent | Logout |
| `tiffin_admin_users` | Customer[] | 5 min | Recharge, update customer |
| `tiffin_admin_dashboard_{date}` | DashboardResponse | 5 min | Mark delivered, reconcile |
| `tiffin_admin_orders_{date}_{slot}` | OrdersByDateSlotResponse | 2 min | Mark delivered |
| `tiffin_admin_negative` | NegativeCreditsResponse | 5 min | Recharge, reconcile |
| `tiffin_admin_menu` | MenuResponse | 10 min | Upsert menu |
| `tiffin_admin_report_{userId}_{ym}` | MonthlyReportResponse | 5 min | — |
| `tiffin_admin_history_{userId}_{ym}` | CreditHistoryResponse | 5 min | Recharge |
| `tiffin_admin_cache_timestamps` | Record<string, number> | — | — |

### 8.2 Mutation → Cache Invalidation Map

| Mutation | Invalidate | Then |
|----------|-----------|------|
| `mark_delivered` | `orders_{date}_{slot}`, `dashboard_{date}` | Refresh current view |
| `recharge_credits` | `users`, `negative`, `history_{userId}_{ym}` | Refresh + toast |
| `mark_day_complete` | `dashboard_{date}`, `orders_{date}_*`, `negative`, `users` | Refresh + success state |
| `upsert_menu` | `menu` | Refresh menu grid |
| `admin_update_customer` | `users` | Refresh + toast |
| `reduce_credits_against_order` | `orders_{date}_{slot}`, `history_{userId}_{ym}`, `users` | Refresh + toast |

### 8.3 useCache Hook (from customerApp)

```typescript
function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CACHE_TTL
): {
  data: T | null;
  isLoading: boolean;      // true on first load (no cache) → show skeleton
  isRefreshing: boolean;    // true on background refresh → show stale + indicator
  error: string | null;
  refresh: () => void;      // manual refresh trigger
}
```

---

## 9. Screen-by-Screen Design Specification

### Design System (shared with customerApp)

```css
/* Identical tokens from customerApp */
--color-primary: #FF5200;
--color-primary-light: #FF7A45;
--color-primary-dark: #E04000;
--color-bg: #F4F4F5;
--color-surface: #FFFFFF;
--color-text-primary: #1B1B1B;
--color-text-secondary: #6B6B6B;
--color-text-tertiary: #9B9B9B;
--color-success: #00B87A;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
--color-veg: #0F8A3C;
--color-nonveg: #B5282D;
--color-border: #E8E8E8;

/* Admin-specific additions */
--color-admin-accent: #6366F1;         /* Indigo for admin-specific elements */
--color-admin-accent-light: #818CF8;
--color-sidebar-bg: #1B1B1B;           /* Dark sidebar */
--color-sidebar-text: #E8E8E8;
--color-sidebar-active: #FF5200;

/* Layout */
--sidebar-width: 260px;
--topbar-height: 56px;
--nav-height: 64px;                    /* Mobile bottom nav */
```

### 9.1 Delivery Page (Public — `/`)

The primary tool for the delivery agent. Mobile-optimized, fast, no login required.

```
┌──────────────────────────────────┐
│  Tiffin Delivery        [Admin] │   ← Top bar with admin link
├──────────────────────────────────┤
│                                  │
│  ◀  Wed, Apr 15  ▶              │   ← Date nav (tap arrows or swipe)
│  [Today] [Tomorrow]              │   ← Quick date buttons
│                                  │
│  ┌──────────┐ ┌──────────┐      │
│  │ Lunch    │ │ Dinner   │      │   ← Slot toggle (auto-selects by time)
│  │ (active) │ │          │      │
│  └──────────┘ └──────────┘      │
│                                  │
│  ┌─────────────────────────────┐│
│  │ 12 Total  8 Done  3 Left  1││   ← Summary strip
│  │           Skip              ││
│  └─────────────────────────────┘│
│                                  │
│  [Search by name, mobile...]     │   ← Search bar
│                                  │
│  ┌─────────────────────────────┐│
│  │ John Doe                    ││
│  │ 9876543210                  ││
│  │ Building A, Street 1       ││
│  │ Veg  ·  Qty: 1             ││
│  │                             ││
│  │  [-]  1  [+]   [Deliver]   ││   ← Qty controls + deliver button
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │ Jane Smith           ✓ 1:30││   ← Delivered state (green check + time)
│  │ 9123456780                  ││
│  │ Office Tower, Floor 3      ││
│  │ Non-veg  ·  Qty: 1         ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │ ─── Skipped ───            ││   ← Skipped (greyed out, no actions)
│  │ Bob Williams                ││
│  │ 9111222333                  ││
│  └─────────────────────────────┘│
│                                  │
└──────────────────────────────────┘
```

**Data:** `get_orders_by_date_slot` → grouped by customer → flatten to list
**Interactions:**
- Date arrows navigate ±1 day. "Today"/"Tomorrow" buttons for quick access
- Slot toggle switches between lunch/dinner. Auto-selects: before 2pm = lunch, after = dinner
- Search filters locally (name, mobile, address)
- Qty stepper adjusts delivery quantity (min 1, max = quantity_ordered)
- "Deliver" button → calls `mark_delivered` → shows toast → refreshes list
- Pull-to-refresh to re-fetch
- Summary strip shows live counts from current filtered data
- Delivered orders move to bottom of list, skipped orders at very bottom

**Cache:** `tiffin_admin_orders_{date}_{slot}`, TTL 2 min
**Skeleton:** 4 card placeholders

---

### 9.2 Admin Login (`/admin/login`)

```
┌──────────────────────────────────┐
│                                  │
│          [← Back]                │   ← Returns to delivery page
│                                  │
│     ┌──────────────────┐         │
│     │  Admin Portal    │         │
│     │  Operations &    │         │
│     │  Management      │         │
│     └──────────────────┘         │
│                                  │
│     ┌──────────────────┐         │
│     │ Password         │         │   ← Password input
│     └──────────────────┘         │
│                                  │
│     ┌──────────────────┐         │
│     │   Enter Admin ▶  │         │   ← Login button
│     └──────────────────┘         │
│                                  │
│     Invalid password             │   ← Error message (conditional)
│                                  │
└──────────────────────────────────┘
```

**Behavior:** Validates password against `VITE_ADMIN_PASSWORD` env var. On success → stores auth in localStorage → redirects to `/admin/dashboard`.

---

### 9.3 Dashboard (`/admin/dashboard`)

The admin's home screen. All real data from `get_dashboard` API.

```
MOBILE                                    DESKTOP (with sidebar)
┌────────────────────────┐               ┌──────────┬──────────────────────────────┐
│  ☰  Dashboard    [⟳]  │               │ Sidebar  │  Dashboard             [⟳]  │
├────────────────────────┤               │          │                              │
│                        │               │ Dashboard│  Today — Wed, Apr 15         │
│  Today — Wed, Apr 15   │               │ Customers│                              │
│                        │               │ Menu     │  ┌──────┐┌──────┐┌──────┐    │
│  ┌──────┐ ┌──────┐    │               │ Reconcile│  │Active│ │Today │ │ Debt │    │
│  │Active│ │Today │    │               │          │  │Users │ │Orders│ │Users │    │
│  │Users │ │Orders│    │               │ ──────── │  │  12  │ │  45  │ │  3   │    │
│  │  12  │ │  45  │    │               │ Agent ▶  │  └──────┘└──────┘└──────┘    │
│  └──────┘ └──────┘    │               │ Logout   │                              │
│  ┌──────┐ ┌──────┐    │               │          │  Yesterday                   │
│  │ Debt │ │Tmrw  │    │               │          │  ┌────────────────────────┐   │
│  │Users │ │Orders│    │               │          │  │ Lunch: 20 ord, 18 del │   │
│  │  3   │ │  40  │    │               │          │  │ Dinner: 15 ord, 15 del│   │
│  └──────┘ └──────┘    │               │          │  └────────────────────────┘   │
│                        │               │          │                              │
│  Yesterday             │               │          │  Today                       │
│  ┌─────────────────┐  │               │          │  ┌────────────────────────┐   │
│  │ Lunch    Dinner  │  │               │          │  │ L: 25/20  D: 20/12   │   │
│  │ 20 ord   15 ord  │  │               │          │  │ Veg: 30  Non-veg: 15 │   │
│  │ 18 del   15 del  │  │               │          │  │ Skipped: 3           │   │
│  │ 2 skip   0 skip  │  │               │          │  └────────────────────────┘   │
│  └─────────────────┘  │               │          │                              │
│                        │               │          │  Tomorrow                    │
│  Today                 │               │          │  ┌────────────────────────┐   │
│  ┌─────────────────┐  │               │          │  │ L: 22 ord  D: 18 ord │   │
│  │ Lunch    Dinner  │  │               │          │  │ Veg: 28  Non-veg: 12 │   │
│  │ 25 ord   20 ord  │  │               │          │  └────────────────────────┘   │
│  │ 20 del   12 del  │  │               │          │                              │
│  │ Veg:15  NV:10   │  │               │          │  Negative Balances (3)       │
│  │ 3 skip   1 skip  │  │               │          │  ┌────────────────────────┐   │
│  └─────────────────┘  │               │          │  │ John Doe    -5 credits │   │
│                        │               │          │  │ Jane Smith  -12 credits│   │
│  Tomorrow              │               │          │  │ Bob W.      -3 credits │   │
│  ┌─────────────────┐  │               │          │  └────────────────────────┘   │
│  │ Lunch    Dinner  │  │               │          │                              │
│  │ 22 ord   18 ord  │  │               │          │  Quick Actions               │
│  │ Veg:16  NV:6    │  │               │          │  [Reconcile Today]           │
│  └─────────────────┘  │               │          │  [Manage Menu]               │
│                        │               │          │  [View All Customers]        │
│  Negative Balances (3) │               └──────────┴──────────────────────────────┘
│  ┌─────────────────┐  │
│  │ John    -5      │  │
│  │ Jane    -12     │  │
│  │ Bob     -3      │  │
│  └─────────────────┘  │
│                        │
│  Quick Actions         │
│  [Reconcile] [Menu]   │
│  [Customers]           │
│                        │
├────────────────────────┤
│ Home  Cust  Menu  Rec  │   ← Mobile bottom nav (admin pages only)
└────────────────────────┘
```

**Data Sources:**
- Stats cards → `get_dashboard` (real data: active_users calculated from users, order counts from dashboard)
- Negative balances → `get_negative_credits`
- All fetched in parallel on mount

**Each day section shows (from `get_dashboard` API):**
- Lunch: total_ordered / total_delivered, veg_ordered, non_veg_ordered, skipped
- Dinner: same breakdown
- Totals calculated client-side by summing lunch + dinner

**Stat Cards:**
- Active Users → from `get_all_users` (count where is_active = true)
- Today's Orders → `today.lunch.total_ordered + today.dinner.total_ordered`
- Tomorrow's Orders → same from tomorrow
- Debt Users → from `get_negative_credits` (total count)

**Negative Balances Section:**
- Shows users with credit_balance < 0
- Each row: name + balance (red)
- Tap → navigates to `/admin/customers/:userId`

**Quick Actions:** Navigate to reconciliation, menu, customers pages

**Cache:** `tiffin_admin_dashboard_{date}` + `tiffin_admin_negative`, both 5 min TTL

---

### 9.4 Customer Directory (`/admin/customers`)

```
┌──────────────────────────────────┐
│  ☰  Customers (42)        [⟳]  │
├──────────────────────────────────┤
│                                  │
│  [All Customers]  [Debtors (3)] │   ← Filter tabs
│                                  │
│  [Search by name or mobile...]   │
│                                  │
│  ┌─────────────────────────────┐│
│  │ JD  John Doe               ││   ← Avatar initials
│  │     9876543210              ││
│  │     Balance: 30 credits  ▶  ││   ← Green balance
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ JS  Jane Smith     DEBT    ││   ← Red DEBT badge
│  │     9123456780              ││
│  │     Balance: -12 credits ▶  ││   ← Red balance
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ BW  Bob Williams           ││
│  │     9111222333              ││
│  │     Balance: 0 credits   ▶  ││
│  └─────────────────────────────┘│
│  ...                             │
│                                  │
├──────────────────────────────────┤
│ Home  Cust  Menu  Rec           │
└──────────────────────────────────┘
```

**Data:** `get_all_users` → sorted by name
**Interactions:**
- Tab "All" vs "Debtors" (credit_balance < 0)
- Search filters by name or mobile (local, instant)
- Tap card → navigate to `/admin/customers/:userId`
- Pull-to-refresh

**Cache:** `tiffin_admin_users`, 5 min TTL

---

### 9.5 Customer Detail (`/admin/customers/:userId`)

```
┌──────────────────────────────────┐
│  ← Customer Detail         [⟳] │
├──────────────────────────────────┤
│                                  │
│  ┌─────────────────────────────┐│
│  │  JD  John Doe              ││   ← Profile header
│  │      9876543210             ││
│  │      Member since Apr 2026  ││
│  │      [Edit Profile]         ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │  Credit Balance             ││
│  │  30 credits                 ││   ← Green if positive, red if negative
│  │  [Recharge Credits]         ││   ← Opens bottom sheet
│  └─────────────────────────────┘│
│                                  │
│  Addresses                       │
│  ┌─────────────────────────────┐│
│  │  1: Building A, Street 1   ││
│  │  2: Office Tower, Floor 3  ││
│  │  3: —                       ││
│  └─────────────────────────────┘│
│                                  │
│  [Credit History] [Usage Report] │   ← Tab toggle
│                                  │
│  ── Credit History ──            │   (when tab active)
│  ┌─────────────────────────────┐│
│  │ Apr 12  +30  Recharge      ││   ← Green for credit
│  │ Apr 12  -15  Day Completion││   ← Red for debit
│  │ Apr 11  -8   Day Completion││
│  │ Apr 10  +50  Recharge      ││
│  └─────────────────────────────┘│
│                                  │
│  ── Usage Report ──              │   (when tab active)
│  ┌─────────────────────────────┐│
│  │ ◀  April 2026  ▶           ││   ← Month selector
│  │                             ││
│  │ Ordered: 60  Delivered: 55  ││
│  │ Skipped: 5   Credits: 55   ││
│  │                             ││
│  │ Apr 1  L  1/1  ✓           ││   ← Order rows
│  │ Apr 1  D  1/1  ✓           ││
│  │ Apr 2  L  1/0  Skip        ││
│  │ Apr 2  D  1/1  ✓           ││
│  └─────────────────────────────┘│
│                                  │
├──────────────────────────────────┤
│ Home  Cust  Menu  Rec           │
└──────────────────────────────────┘
```

**Data Sources:**
- Customer from cached `get_all_users` (find by userId) — no extra API call
- Credit history → `get_credit_history` (last 3 months)
- Usage report → `get_monthly_report` (selected month)

**Bottom Sheets:**
1. **Recharge Credits** — Amount input + Confirm → `recharge_credits` API → toast with new balance
2. **Edit Profile** — Name + New Password fields → `admin_update_customer` API → toast

**Cache:** History and report cached per userId + month

---

### 9.6 Menu Management (`/admin/menu`)

```
┌──────────────────────────────────┐
│  ☰  Weekly Menu            [⟳] │
├──────────────────────────────────┤
│                                  │
│  ┌─────────────────────────────┐│
│  │  MONDAY                     ││
│  │  ┌────────────────────────┐ ││
│  │  │ Lunch                  │ ││
│  │  │ Veg Pulao              │ ││   ← Dish name
│  │  │ With raita and pickle  │ ││   ← Description
│  │  │ [Edit]                 │ ││
│  │  └────────────────────────┘ ││
│  │  ┌────────────────────────┐ ││
│  │  │ Dinner                 │ ││
│  │  │ No dish set            │ ││   ← Empty state
│  │  │ [Add Dish]             │ ││
│  │  └────────────────────────┘ ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │  TUESDAY                    ││
│  │  ┌────────────────────────┐ ││
│  │  │ Lunch                  │ ││
│  │  │ Dal Rice               │ ││
│  │  │ Comfort food classic   │ ││
│  │  │ [Edit]                 │ ││
│  │  └────────────────────────┘ ││
│  │  ┌────────────────────────┐ ││
│  │  │ Dinner                 │ ││
│  │  │ Paneer Butter Masala   │ ││
│  │  │ Rich and creamy        │ ││
│  │  │ [Edit]                 │ ││
│  │  └────────────────────────┘ ││
│  └─────────────────────────────┘│
│  ...                             │
│                                  │
├──────────────────────────────────┤
│ Home  Cust  Menu  Rec           │
└──────────────────────────────────┘

── Edit Dish (Bottom Sheet) ──
┌─────────────────────────────────┐
│  ━━━━ (handle)                  │
│  Edit Monday Lunch              │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Dish Name                │   │
│  │ Veg Pulao                │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ Description (optional)   │   │
│  │ With raita and pickle    │   │
│  └──────────────────────────┘   │
│                                 │
│  [Save Changes]                 │
└─────────────────────────────────┘
```

**Data:** `get_menu` → all 14 slots → organized into 7-day grid
**Interactions:**
- "Edit" / "Add Dish" → opens bottom sheet with pre-filled form
- Save → `upsert_menu` API → invalidate cache → refresh → toast
- Pull-to-refresh reloads from API

**Cache:** `tiffin_admin_menu`, 10 min TTL

---

### 9.7 Reconciliation (`/admin/reconciliation`)

```
┌──────────────────────────────────┐
│  ☰  Reconciliation         [⟳] │
├──────────────────────────────────┤
│                                  │
│  ┌─────────────────────────────┐│
│  │  Select Date                ││
│  │  ◀  Wed, Apr 15, 2026  ▶   ││   ← Date picker
│  └─────────────────────────────┘│
│                                  │
│  ── Day Summary ──               │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │  Lunch                      ││
│  │  Ordered: 25  Delivered: 20 ││
│  │  Skipped: 3   Veg: 15      ││
│  │  Non-veg: 10                ││
│  │                             ││
│  │  Dinner                     ││
│  │  Ordered: 20  Delivered: 12 ││
│  │  Skipped: 1   Veg: 14      ││
│  │  Non-veg: 6                 ││
│  │                             ││
│  │  ─────────────────────      ││
│  │  Total Credits to Deduct    ││
│  │  (sum of delivered credits) ││
│  │  = 32 credits               ││   ← Real calculation from data
│  │  Across 15 customers        ││
│  │                             ││
│  └─────────────────────────────┘│
│                                  │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │  ⚠ This action is           ││
│  │  irreversible. Credits      ││
│  │  will be deducted from all  ││
│  │  customers for this day.    ││
│  │                             ││
│  │  [Reconcile This Day]       ││   ← Primary action (red/warning)
│  │                             ││
│  └─────────────────────────────┘│
│                                  │
│  ── OR ──                        │
│                                  │
│  ┌─────────────────────────────┐│
│  │  ✓ Day Already Reconciled   ││   ← If day is done
│  │  Reconciled at 8:30 PM      ││
│  │  Total: 32 credits          ││
│  │  Users affected: 15         ││
│  └─────────────────────────────┘│
│                                  │
├──────────────────────────────────┤
│ Home  Cust  Menu  Rec           │
└──────────────────────────────────┘

── Confirmation Dialog ──
┌─────────────────────────────────┐
│                                 │
│  Reconcile April 15?            │
│                                 │
│  This will deduct credits       │
│  from all customers with        │
│  deliveries on this day.        │
│  This cannot be undone.         │
│                                 │
│  [Cancel]    [Confirm]          │
│                                 │
└─────────────────────────────────┘
```

**Data:** `get_dashboard` for the selected date → extract day summary
**Real credit calculation:** Sum `lunch.total_delivered + dinner.total_delivered` (since 1 delivery = 1 credit in the backend)
**Interactions:**
- Date picker navigates to any past/present day
- "Reconcile" button → ConfirmDialog → `mark_day_complete` API → success state + toast
- If day already reconciled (API returns error "Day already reconciled"), show the "already done" state
- Pull-to-refresh

**Cache:** Uses dashboard cache for the selected date

---

### 9.8 AppLayout (Responsive Shell)

```
MOBILE (<1024px)                        DESKTOP (≥1024px)
┌───────────────────────┐              ┌──────────┬──────────────────────┐
│  ☰  Page Title  [⟳]  │              │          │                      │
├───────────────────────┤              │ TIFFIN   │                      │
│                       │              │ ADMIN    │                      │
│                       │              │          │                      │
│   Page Content        │              │ ──────── │   Page Content       │
│                       │              │          │                      │
│                       │              │ Dashboard│                      │
│                       │              │ Customers│                      │
│                       │              │ Menu     │                      │
│                       │              │ Reconcile│                      │
│                       │              │          │                      │
│                       │              │ ──────── │                      │
│                       │              │          │                      │
├───────────────────────┤              │ Agent ▶  │                      │
│ Dash Cust Menu  Rec   │              │ Logout   │                      │
└───────────────────────┘              └──────────┴──────────────────────┘

Mobile hamburger opens a slide-out drawer identical to the desktop sidebar.
```

**Mobile:**
- Top bar: hamburger menu + page title + refresh button
- Bottom nav: 4 tabs (Dashboard, Customers, Menu, Reconciliation) with active indicator
- Hamburger opens drawer overlay with full nav + agent view link + logout

**Desktop:**
- Fixed sidebar (260px) with dark background
- Brand name at top
- Nav links with active highlight
- Agent view link + logout at bottom
- Main content fills remaining width with comfortable padding

---

## 10. Component Library

### Core Components (replicated from customerApp)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **BottomSheet** | Slide-up modal with portal rendering | `isOpen`, `onClose`, `title`, `children` |
| **ToastContainer** | Renders toast notifications | — (reads from ToastContext) |
| **GlobalLoader** | Top progress bar for interactive requests | — (reads from LoadingContext) |
| **Skeleton** | Shimmer placeholder + page-specific presets | `width`, `height`, `borderRadius` |
| **PullToRefresh** | Touch gesture refresh on mobile | `onRefresh`, `children` |
| **ConfirmDialog** | Replaces `window.confirm()` and `window.prompt()` | `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `variant` |
| **SearchBar** | Debounced search input with clear button | `value`, `onChange`, `placeholder` |
| **VegIndicator** | Green/red dot for veg/non-veg | `type: 'veg' \| 'non-veg'` |
| **StatusBadge** | Delivered/Pending/Skipped badge | `status`, `deliveredAt?` |
| **StatCard** | Dashboard metric card with icon | `label`, `value`, `icon`, `color`, `onClick?` |

### Admin-Specific Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **AppLayout** | Responsive sidebar + mobile nav shell | `children` (via Outlet) |
| **OrderDeliveryCard** | Delivery agent order card with qty controls | `order`, `customerName`, `onDeliver` |
| **CustomerCard** | Customer list item with balance badge | `customer`, `onClick` |
| **RechargeSheet** | Bottom sheet for credit recharge | `isOpen`, `onClose`, `userId`, `onSuccess` |
| **EditCustomerSheet** | Bottom sheet for profile edit | `isOpen`, `onClose`, `customer`, `onSuccess` |
| **MenuItemCard** | Single menu slot display/edit trigger | `menuItem?`, `day`, `slot`, `onEdit` |
| **EditMenuSheet** | Bottom sheet for dish edit | `isOpen`, `onClose`, `day`, `slot`, `menuItem?`, `onSuccess` |
| **DaySummaryCard** | Yesterday/Today/Tomorrow stat block | `daySummary`, `label` |

---

## 11. Implementation Phases

### Phase 1: Foundation (Clean Slate)

Delete all existing `src/` files. Set up the project infrastructure from scratch.

| # | Task | Details |
|---|------|---------|
| 1.1 | **Reset src/** | Remove all existing source files |
| 1.2 | **Setup vite.config.ts** | Add dev proxy for `/api/proxy` → `VITE_API_BASE_URL` |
| 1.3 | **Create netlify.toml** | Build config + `/api/proxy` redirect to function |
| 1.4 | **Create netlify/functions/proxy.ts** | Serverless proxy injecting `ADMIN2026` secret |
| 1.5 | **Update .env** | Clean env vars: `VITE_API_BASE_URL`, `VITE_API_SECRET`, `VITE_ADMIN_PASSWORD`, `VITE_MAX_CONCURRENT_REQUESTS` |
| 1.6 | **Create index.css** | Full design system (tokens from customerApp + admin additions) |
| 1.7 | **Create types/index.ts** | All TypeScript interfaces |
| 1.8 | **Create services/queueManager.ts** | Request queue (copy from customerApp) |
| 1.9 | **Create services/api.ts** | All 13 admin endpoints using proxy |
| 1.10 | **Create utils/cache.ts** | localStorage wrapper (from customerApp pattern) |
| 1.11 | **Create utils/constants.ts** | Routes, cache keys, cache TTLs |
| 1.12 | **Create utils/dates.ts** | Date formatting helpers |
| 1.13 | **Create hooks/useCache.ts** | Stale-while-revalidate hook (from customerApp) |
| 1.14 | **Create context/AuthContext.tsx** | Admin auth (password gate) |
| 1.15 | **Create context/ToastContext.tsx** | Toast system (from customerApp) |
| 1.16 | **Create context/LoadingContext.tsx** | Global loading state (from customerApp) |
| 1.17 | **Create main.tsx + App.tsx** | Entry point + router + provider stack |
| 1.18 | **Update index.html** | Clean HTML with proper meta tags |
| 1.19 | **Update package.json** | Clean dependencies, add `@netlify/functions` |

### Phase 2: Core Components

| # | Task | Details |
|---|------|---------|
| 2.1 | **BottomSheet** | Portal-rendered slide-up modal |
| 2.2 | **ToastContainer** | Toast renderer |
| 2.3 | **GlobalLoader** | Progress bar |
| 2.4 | **Skeleton** | Base shimmer + page-specific presets (Delivery, Dashboard, CustomerList, CustomerDetail, Menu, Reconciliation) |
| 2.5 | **PullToRefresh** | Touch gesture refresh |
| 2.6 | **ConfirmDialog** | Replaces window.confirm/prompt |
| 2.7 | **SearchBar** | Debounced input |
| 2.8 | **VegIndicator** | Veg/non-veg dot |
| 2.9 | **StatusBadge** | Delivered/Pending/Skipped |
| 2.10 | **StatCard** | Dashboard stat card |

### Phase 3: AppLayout + Auth + Delivery Page

| # | Task | Details |
|---|------|---------|
| 3.1 | **AppLayout** | Responsive sidebar (desktop) + bottom nav (mobile) + hamburger drawer |
| 3.2 | **AdminLoginPage** | Password form + auth context integration |
| 3.3 | **OrderDeliveryCard** | Order card with qty stepper + deliver button |
| 3.4 | **DeliveryPage** | Full delivery agent view: date nav, slot toggle, summary strip, search, order list, mark delivered, pull-to-refresh |

### Phase 4: Dashboard + Customer Directory

| # | Task | Details |
|---|------|---------|
| 4.1 | **DaySummaryCard** | Yesterday/Today/Tomorrow summary block |
| 4.2 | **DashboardPage** | Stat cards, 3-day summary, negative balances, quick actions |
| 4.3 | **CustomerCard** | Customer list item |
| 4.4 | **CustomerDirectoryPage** | Full list, search, All/Debtors tabs |

### Phase 5: Customer Detail

| # | Task | Details |
|---|------|---------|
| 5.1 | **RechargeSheet** | Recharge bottom sheet with amount input |
| 5.2 | **EditCustomerSheet** | Edit profile bottom sheet |
| 5.3 | **CustomerDetailPage** | Profile, balance, addresses, credit history tab, usage report tab, recharge, edit |

### Phase 6: Menu + Reconciliation

| # | Task | Details |
|---|------|---------|
| 6.1 | **MenuItemCard** | Single menu slot card |
| 6.2 | **EditMenuSheet** | Bottom sheet for dish editing |
| 6.3 | **MenuPage** | Full 7-day grid fetched from `get_menu` API |
| 6.4 | **ReconciliationPage** | Date picker, real day summary, reconcile button, confirm dialog, success state |

### Phase 7: Polish & Testing

| # | Task | Details |
|---|------|---------|
| 7.1 | **Responsive testing** | Test all pages at 360px, 768px, 1024px, 1440px |
| 7.2 | **Error states** | Empty states, API error states, offline banner |
| 7.3 | **Animations** | Page transitions, card hover, button press, toast slide |
| 7.4 | **PWA manifest** | Icons, theme color, standalone display |
| 7.5 | **Skeleton polish** | Ensure every page has proper skeleton matching real layout |
| 7.6 | **Accessibility** | Touch targets >= 44px, aria labels, focus management |
| 7.7 | **End-to-end testing** | Test all flows against live backend |

---

## Environment Configuration

### `.env`
```env
VITE_API_BASE_URL=https://script.google.com/macros/s/AKfycbw59cfZvzZw8h75avJxom2Aw4yOn2yhYSenBQrnW6bKIx1nZsWNU2ridDKMC5TN0JujgA/exec
VITE_API_SECRET=ADMIN2026
VITE_ADMIN_PASSWORD=1234
VITE_APP_NAME=Tiffin Admin
VITE_APP_TAGLINE=Operations & Delivery Portal
VITE_MAX_CONCURRENT_REQUESTS=60
```

### `.env.example`
```env
VITE_API_BASE_URL=<your-google-apps-script-deployment-url>
VITE_API_SECRET=<admin-secret-code>
VITE_ADMIN_PASSWORD=<admin-portal-password>
VITE_APP_NAME=Tiffin Admin
VITE_APP_TAGLINE=Operations & Delivery Portal
VITE_MAX_CONCURRENT_REQUESTS=60
```

---

## Verification Checklist

### Delivery Agent Flow
- [ ] Date navigation works (arrows + Today/Tomorrow)
- [ ] Slot toggle switches data
- [ ] Orders load with proper skeleton → data
- [ ] Search filters instantly
- [ ] Mark delivered → toast → list refreshes
- [ ] Qty stepper respects min/max
- [ ] Delivered orders show timestamp
- [ ] Skipped orders greyed out
- [ ] Pull-to-refresh works

### Admin Flow
- [ ] Login validates password
- [ ] Dashboard shows real stats from API
- [ ] Negative balances section shows real debtors
- [ ] Customer list loads, searches, filters
- [ ] Customer detail shows profile, balance, addresses
- [ ] Recharge credits → toast with new balance
- [ ] Credit history loads with real transactions
- [ ] Monthly report loads with real data
- [ ] Edit customer works
- [ ] Menu loads existing dishes from API
- [ ] Menu edit/add saves to API
- [ ] Reconciliation shows real day summary
- [ ] Reconcile → confirm → success state
- [ ] Already-reconciled day shows correct state

### Cross-Cutting
- [ ] Skeleton loaders on every page
- [ ] Toast notifications for every mutation
- [ ] Global loader for interactive requests
- [ ] Cache works (stale-while-revalidate)
- [ ] Pull-to-refresh on every data page
- [ ] Mobile responsive (360px → 428px)
- [ ] Desktop responsive (1024px → 1440px)
- [ ] Sidebar collapses on mobile, shows on desktop
- [ ] Bottom nav shows on mobile admin pages
- [ ] Error states when API fails
- [ ] No hardcoded data anywhere

---

> **This plan is the single source of truth for the refactor. Every file, every component, every API call, every interaction is specified above. Implementation proceeds phase by phase, each phase building on the previous. The customerApp's proven patterns (caching, queueing, toasts, loading, skeletons) are replicated exactly.**
