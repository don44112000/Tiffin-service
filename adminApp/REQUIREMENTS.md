# 🍱 Local Tiffin Service — Admin & Delivery App Requirements

> **Goal:** Build a secondary web application (`adminApp`) for delivery agents and administrators to manage daily operations, track deliveries, handle customer accounts, and perform financial reconciliation.

---

## 1. Application Overview

The app serves two distinct user personas:
1.  **Delivery Agents:** Minimal access to view daily delivery lists and mark orders as delivered.
2.  **Administrators:** Full access to dashboard stats, customer management, credit recharges, menu updates, and daily reconciliation.

---

## 2. Functional Requirements

### 2.1 Delivery Agent View (Landing Page)
The default view when the app is opened. 

| Feature | API Action | Description |
|---|---|---|
| **Date Selection** | Client-side | Defaults to "Today" on load. |
| **Slot Toggle** | Client-side | Switch between **Lunch** and **Dinner**. |
| **Orders List** | `get_orders_by_date_slot` | List of all orders for the selected date/slot. |
| **Summary Card** | `get_orders_by_date_slot` | Top-level summary of total, delivered, and pending orders for the slot. |
| **Search** | Client-side | Filter orders by **Name**, **Mobile**, or **Address**. |
| **Mark Delivered** | `mark_delivered` | Button to mark an order. Pre-fills qty with `quantity_ordered`. |
| **Delivery Rules** | Validation | 1. Quantity must be $\ge$ 1 to submit.<br>2. **Skipped** orders are grayed out and cannot be marked. |
| **Admin Access** | Password Check | Button redirecting to Admin Portal via password (from `.env`). |

### 2.2 Admin Portal (Protected)
Requires a secure password stored in the application's environment configuration.

#### A. Dashboard & Operations
| Feature | API Action | Description |
|---|---|---|
| **Dashboard Stats** | `get_dashboard` | Visual overview of active users, total orders, and credit status. |
| **Daily Calendar** | `get_orders_by_date_slot` | Calendar view (similar to Customer App) showing day-wise totals. |
| **Menu Management**| `upsert_menu` | Form to update dishes and descriptions for the weekly menu. |
| **Reconciliation** | `mark_day_complete` | Finalize a day to deduct credits from all customers and lock orders. |

#### B. Customer Management 
| Feature | API Action | Description |
|---|---|---|
| **Customer List** | `get_all_users` | Searchable list of all customers. |
| **Debt Tracker** | `get_negative_credits` | Prominent card showing users with negative balances. |
| **Customer Detail** | Combined | Tapping a customer opens a comprehensive profile view. |

#### C. Customer Detail View (Deep Dive)
When viewing a specific customer:
- **Profile Edit:** Change name or reset password (`admin_update_customer`).
- **Wallet Ops:** Recharge credits manually (`recharge_credits`).
- **Activity Log:** View full credit history (`get_credit_history`).
- **Monthly Usage:** Load monthly reports (`get_monthly_report`) with month switching.
- **Order History:** List of all orders (including skipped).
- **Manual Adjustment:** "Reduce credits manual" against a specific order row (`reduce_credits_against_order`).

---

## 3. UX & Technical Specifications

### 3.1 Design Guidelines
- **Mobile-First:** Optimized for delivery agents on the move.
- **Visual Consistency:** Same design tokens as `customerApp` (Orange primary, Outfit font).
- **Default State:** Any page with a date context must default to the **Current Day**.
- **States:** 
    - Clear distinction between `Delivered`, `Pending`, and `Skipped`.
    - Real-time search filters for lists.

### 3.2 Tech Stack (Proposed)
- **Framework:** Vite + React (TypeScript)
- **Styling:** CSS Modules
- **State Management:** React Context (for Admin Login session)
- **Routing:** React Router v7

---

## 4. Environment Configuration
`adminApp/.env`
- `VITE_API_BASE_URL`: (Same as customer app)
- `VITE_API_SECRET`: `ADMIN2026`
- `VITE_ADMIN_PASSWORD`: Secure password for portal access.

---

## 5. Implementation Phases (Draft)

1.  **Phase 1:** Setup & Delivery Agent Landing Page (List + Search + Mark Delivered).
2.  **Phase 2:** Admin Authentication & Dashboard Integration.
3.  **Phase 3:** Customer List & Negative Balance tracking.
4.  **Phase 4:** Customer Detail View (Recharge, Edit, Reports).
5.  **Phase 5:** Menu Management & Day Reconciliation.
6.  **Phase 6:** Performance Polish & Deployment.
