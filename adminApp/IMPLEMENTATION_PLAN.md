# 🍱 Local Tiffin Service — Admin & Delivery Frontend

> **Goal:** Build a high-performance, responsive web application (`adminApp`) for delivery agents and administrators. This app mirrors the premium design language of the customer app while focusing on operational efficiency, real-time tracking, and robust data management.

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

#### Delivery Agent Operations (Public Landing)
| # | Feature | API Used | Description |
|---|---------|----------|-------------|
| F1 | **Daily Order List** | `get_orders_by_date_slot` | View all orders for the current day, toggleable by Lunch/Dinner. |
| F2 | **Quick Search** | Client-side | Search orders by name, mobile, or address locally for zero latency. |
| F3 | **Mark Delivered** | `mark_delivered` | Mark order as delivered. Pre-fills qty, validates $\ge$ 1. |
| F4 | **Agent Summary** | From `get_orders_by_date` | Real-time counts of Total, Delivered, and Pending orders on the landing page. |

#### Administrator Portal (Password Protected)
| # | Feature | API Used | Description |
|---|---------|----------|-------------|
| F5 | **Admin Dashboard** | `get_dashboard` | High-level metrics for Yesterday, Today, and Tomorrow. |
| F6 | **Admin Calendar** | `get_orders_by_date_slot` | Global view of orders across different dates. |
| F7 | **Customer Directory** | `get_all_users` | Searchable list of all customers + total balance tracking. |
| F8 | **Debt Alerts** | `get_negative_credits` | Highlight users with negative balances for immediate action. |
| F9 | **Manual Recharge** | `recharge_credits` | Add credits to any user's account manually. |
| F10 | **Manual Adjustment**| `reduce_credits_against_order` | Fine-grained credit deduction against specific order rows. |
| F11 | **Profile Override** | `admin_update_customer` | Change customer names or reset passwords. |
| F12 | **Menu Management** | `upsert_menu` | Update dishes and descriptions for the weekly menu. |
| F13 | **Reconciliation** | `mark_day_complete` | Finalize a day's financials and lock order states. |

### 1.2 Non-Functional Requirements
- **Low-Latency Search**: Instant filtering of hundreds of customers via local browser cache.
- **Offline Shell**: PWA support so delivery agents can see their lists even in spotty network.
- **Responsive Hybrid**: 
  - **Mobile**: "Thumb-friendly" action areas for agents and simple lists.
  - **Desktop**: Layout adapts to show sidebar navigation and side-by-side "Master-Detail" views for customer management.

---

## 2. Tech Stack Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | **Vite + React 19** (TypeScript) | Shared patterns with `customerApp`. Performance-first rendering. |
| **Styling** | **Vanilla CSS Modules** | Zero-runtime CSS. Uses shared design tokens (Orange, Outfit font). |
| **Routing** | **React Router v7** | SPAs with protected admin routes. |
| **Caching** | **React Context + `localStorage`** | Stale-while-revalidate pattern for instant local data access. |
| **API Client** | **Native `fetch`** | Lightweight, manageable via `api.ts` wrapper. |

---

## 3. API Integration Map

### 3.1 Admin-Facing APIs
Auth: `secret=ADMIN2026` (from `.env`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE URL (from .env)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GET  Endpoints (query params)                                  │
│  ├── get_dashboard            → Dashboard metrics               │
│  ├── get_all_users            → Full customer directory         │
│  ├── get_orders_by_date_slot  → Delivery lists + Global cal     │
│  ├── get_negative_credits     → Debt tracking                   │
│  ├── get_monthly_report       → Customer detail reporting       │
│  ├── get_credit_history       → Customer audit log              │
│  └── get_menu                 → Weekly menu preview             │
│                                                                 │
│  POST Endpoints (JSON body)                                     │
│  ├── mark_delivered           → Update delivery status          │
│  ├── recharge_credits         → Wallet recharge                 │
│  ├── admin_update_customer    → Profile override                │
│  ├── mark_day_complete        → Daily reconciliation            │
│  ├── upsert_menu              → Menu management                 │
│  └── reduce_credits_against_order → Manual credit deduction      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Screen-by-Screen Design Specification

### 4.0 Shared Design Tokens
Consistent with Project Brand:
- `--color-primary`: #FF5200 (Swiggy Orange)
- `--font-family`: 'Outfit', sans-serif

### 4.1 Delivery Landing Page (Default)
```
┌──────────────────────────┐
│  Wednesday, Apr 14 [⟳]   │   ← Auto-defaults to today
│  ┌────────────────────┐  │
│  │ Summary     L: 45/60 │  │   ← Lunch summary
│  │ Progress: [====--  ] │  │
│  └────────────────────┘  │
│  ┌──────────┐┌──────────┐│
│  │ 🌞 LUNCH ││ 🌙 DINNER││   ← Big toggle buttons
│  │  (active)││          ││
│  └──────────┘└──────────┘│
│  ┌────────────────────┐  │
│  │ 🔍 Search name...  │  │   ← Local search (no server call)
│  └────────────────────┘  │
│                          │
│  Orders (60)             │
│  ┌────────────────────┐  │
│  │ John Doe       [ 1 ] │  │   ← Pre-filled qty
│  │ 🟢 Veg               │  │
│  │ 📍 Building A, 101   │  │
│  │ [ MARK DELIVERED ]   │  │   ← Primary CTA
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Jane Smith (Skip) ⬜ │  │   ← Grayed out, non-interactive
│  └────────────────────┘  │
│                          │
│  [ LOGIN TO ADMIN ]      │   ← Link at bottom
└──────────────────────────┘
```

### 4.2 Admin Portal — Password Gate
Simple, focused screen requiring `VITE_ADMIN_PASSWORD` to unlock protected routes.

### 4.3 Admin Dashboard
```
┌──────────────────────────┐
│  Dashboard Overview      │
│                          │
│  Yesterday    Today      │
│  ┌──────┐    ┌──────┐    │
│  │  45  │    │  12  │    │   ← Stat cards (orders)
│  │Deliv'd│    │Pend'g│    │
│  └──────┘    └──────┘    │
│                          │
│  Wallet Overview         │
│  ┌──────────────────────┐│
│  │ Total Bal: ₹ 14,200  ││   ← Global health
│  │ Deficit: ₹ -450 (3)  ││   ← Negative alerts
│  └──────────────────────┘│
│                          │
├───────── Nav Bar ────────┤
│ Home  Cust  Menu  Recncl │   ← Admin navigation
└──────────────────────────┘
```

### 4.4 Customer Management (Desktop Optimization)
**Mobile:** Searchable list with tapping to open detail page.
**Desktop:** Two-pane layout. Left: Scrollable list of users. Right: Detail view of selected user.

### 4.5 Customer Deep-Dive
- **Header**: User stats + `[Recharge]` button (opens bottom sheet).
- **History View**: Merged view showing `Orders` and `Credit History` chronologically.
- **Action**: Clicking an order row reveals a `[Reduce Credits Manual]` button for adjustments (API `reduce_credits_against_order`).

---

## 5. Caching & Data Strategy

### 5.1 Local Storage Schema
| Key | Logic |
|-----|-------|
| `admin_token` | Admin portal password session |
| `admin_users` | Full customer list (TTL 10m) |
| `admin_orders_YYYY_MM_DD_SLOT` | Cache for specific delivery sheets |
| `admin_dashboard_cache` | High-level metrics |

### 5.2 Performance: Zero-Latency Search
Upon loading `admin_users`, the app holds the full array in a React Context. All search inputs trigger a `memoized` filter operation, giving instant feedback without network calls.

---

## 6. Skeleton Loading System
- **List Shimmer**: 5 placeholder cards for the delivery list.
- **Card Shimmer**: Pulse effect for dashboard stat numbers.

---

## 7. Component Architecture

### 7.1 File Structure
```
adminApp/
├── src/
│   ├── services/api.ts         ← Admin API wrapper
│   ├── context/AdminContext.tsx ← Global user/order state
│   ├── components/
│   │   ├── Sidebar/           ← Desktop navigation
│   │   ├── OrderRow/          ← Delivery list items
│   │   ├── CustCard/          ← Customer directory items
│   │   └── RechargeModal/     ← Wallet update UI
│   ├── pages/
│   │   ├── Landing/           ← Delivery Agent View
│   │   ├── Dashboard/         ← Admin Home
│   │   ├── Customers/         ← Directory + Detail
│   │   └── Operations/        ← Menu + Reconciliation
```

---

## 8. Implementation Plan

### 8.1 Phase 1: Foundation (Day 1)
- Setup Vite + Admin API layer.
- Design tokens & responsive layout shell (Sidebar/Drawer).

### 8.2 Phase 2: Delivery Agent Portal (Day 2)
- Order list fetching with Lunch/Dinner toggle.
- Mark Delivered interaction + local search implementation.

### 8.3 Phase 3: Admin Auth & Dashboard (Day 3)
- Password gate implementation.
- Stat cards and global calendar view.

### 8.4 Phase 4: Customer Directory (Day 4)
- Full user list with "Negative Balance" sorting/highlighting.
- Master-Detail layout for desktop.

### 8.5 Phase 5: Deep Operations (Day 5)
- Customer recharges and manual credit reductions.
- Menu management (Upsert Menu) interface.

### 8.6 Phase 6: Reconciliation & Polish (Day 6)
- Mark Day Complete flow.
- PWA setup & Offline banner logic.

---

## 9. Environment Configuration
`adminApp/.env`
```env
VITE_API_BASE_URL=...
VITE_API_SECRET=ADMIN2026
VITE_ADMIN_PASSWORD=...
```

---

## 10. Verification Plan

### Manual Verification
- **Cross-App Sync**: Mark delivered in Admin → verify status change in Customer App.
- **Desktop Check**: Resize browser to verify sidebar appearing and list/detail layout.
- **Search Latency**: Test search with 100+ simulated users.
- **Auth Security**: Verify Admin pages are inaccessible without the password.
