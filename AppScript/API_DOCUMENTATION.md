# Tiffin Service — API Documentation

> **Base URL** — provided at runtime (Google Apps Script Web App deployment URL)
>
> **Content-Type** — `application/json` for all POST requests
>
> **Authentication** — via `secret` field in body (POST) or query parameter (GET)

---

## Secrets / Auth Tokens

| Role  | Parameter Key | Value (Example) |
| ----- | ------------- | --------------- |
| User  | `secret`      | `FOOD2026`      |
| Admin | `secret`      | `ADMIN2026`     |

---

## Sheets Schema

| Sheet             | Columns                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **customers**     | `user_id`, `name`, `mobile`, `password`, `address_1`, `address_2`, `address_3`, `credit_balance`, `created_at`, `is_active`                |
| **orders**        | `order_id`, `user_id`, `date`, `slot`, `type`, `address`, `quantity_ordered`, `quantity_delivered`, `credits_used`, `is_delivered`, `delivered_at`, `created_at`, `is_skipped` |
| **payments**      | *(referenced but not actively used in current code)*                                                                                       |
| **completed_days**| `completion_id`, `date`, `total_credits_deducted`, `completed_at`, `completed_by`                                                          |

---

## User APIs (secret = `FOOD2026`)

### 1. `POST` — Create Customer

**Action:** `create_customer`

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "create_customer",
  "name": "John Doe",
  "mobile": "9876543210",
  "password": "pass123",
  "address_1": "Building A, Street 1",
  "address_2": "Floor 3",
  "address_3": "Near Park"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer created",
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Error Responses:**
| Condition               | Message                          |
| ----------------------- | -------------------------------- |
| Duplicate mobile number | `"Mobile already registered"`    |
| Invalid mobile format   | `"Mobile number must be exactly 10 digits"` |
| Missing secret / wrong  | `"Unauthorized"`                 |

---

### 2. `GET` — Get Customer (Login)

**Action:** `get_customer`

**Query Parameters:**
```
?action=get_customer&secret=FOOD2026&mobile=9876543210&password=pass123
```

**Success Response (200):**
```json
{
  "success": true,
  "customer": {
    "user_id": "uuid",
    "name": "John Doe",
    "mobile": "9876543210",
    "password": "pass123",
    "address_1": "Building A, Street 1",
    "address_2": "Floor 3",
    "address_3": "Near Park",
    "credit_balance": 0,
    "created_at": "2026-04-11",
    "is_active": true
  }
}
```

**Error Responses:**
| Condition                        | Message                              |
| -------------------------------- | ------------------------------------ |
| Wrong mobile or password         | `"Invalid mobile or password"`       |
| Missing/wrong secret             | `"Unauthorized"`                     |

---

### 3. `POST` — Update Customer

**Action:** `update_customer`

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "update_customer",
  "user_id": "uuid",
  "name": "Jane Doe",
  "password": "newPass",
  "address_1": "New Address",
  "address_2": "",
  "address_3": ""
}
```
> Only include fields you want to update. Pass `""` (empty string) to clear a field.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer updated"
}
```

**Error Responses:**
| Condition          | Message                  |
| ------------------ | ------------------------ |
| Missing `user_id`  | `"user_id is required"`  |
| User not found     | `"User not found"`       |

---

### 4. `POST` — Onboard Customer

**Action:** `onboard_customer`

Creates a new customer **and** generates order rows for a date range + meal plan in one call.

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "onboard_customer",
  "name": "John Doe",
  "mobile": "9876543210",
  "password": "pass123",
  "address_1": "Building A",
  "address_2": "",
  "address_3": "",
  "plan": "both",
  "start_date": "2026-04-12",
  "end_date": "2026-04-15"
}
```

**`plan` values:** `"lunch"`, `"dinner"`, `"both"`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer onboarded successfully",
  "user_id": "uuid",
  "orders_created": 8,
  "plan": "both",
  "from": "2026-04-12",
  "to": "2026-04-15"
}
```

**Error Responses:**
| Condition                   | Message                                          |
| --------------------------- | ------------------------------------------------ |
| Missing dates               | `"start_date and end_date are required"`         |
| `start_date > end_date`     | `"start_date cannot be after end_date"`          |
| Invalid plan                | `"Invalid plan. Use lunch, dinner or both"`      |
| Invalid mobile format       | `"Mobile number must be exactly 10 digits"`      |
| Duplicate mobile            | `"Mobile already registered"`                    |

---

### 5. `POST` — Update Order

**Action:** `update_order`

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "update_order",
  "order_id": "uuid",
  "type": "non-veg",
  "address": "New delivery address",
  "quantity_ordered": 2
}
```
> Only include fields you want to update.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order updated"
}
```

**Error Responses:**
| Condition          | Message                                                        |
| ------------------ | -------------------------------------------------------------- |
| Order not found    | `"Order not found"`                                            |
| Day reconciled     | `"Cannot update order: day has already been reconciled"`       |

---

### 6. `POST` — Add Order Slot

**Action:** `add_order_slot`

Adds a single new order for a specific user, date, and slot.

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "add_order_slot",
  "user_id": "uuid",
  "date": "2026-04-12",
  "slot": "lunch",
  "address": "Building A",
  "type": "veg",
  "quantity_ordered": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order slot added",
  "order_id": "uuid"
}
```

**Error Responses:**
| Condition             | Message                                                       |
| --------------------- | ------------------------------------------------------------- |
| Missing required      | `"user_id, date, slot and address are required"`              |
| Invalid slot          | `"slot must be lunch or dinner"`                              |
| Day reconciled        | `"Cannot add order: day has already been reconciled"`         |

---

### 7. `POST` — Skip Order

**Action:** `skip_order`

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "skip_order",
  "order_id": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order skipped"
}
```

**Error Responses:**
| Condition            | Message                                                       |
| -------------------- | ------------------------------------------------------------- |
| Order not found      | `"Order not found"`                                           |
| Day reconciled       | `"Cannot skip order: day has already been reconciled"`        |
| Already delivered    | `"Cannot skip an already delivered order"`                    |

---

### 8. `POST` — Extend Plan

**Action:** `extend_plan`

**Request Body:**
```json
{
  "secret": "FOOD2026",
  "action": "extend_plan",
  "user_id": "uuid",
  "plan": "both",
  "days": 7,
  "start_date": "2026-04-16"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Plan extended successfully",
  "user_id": "uuid",
  "plan": "both",
  "from": "2026-04-16",
  "to": "2026-04-22",
  "orders_created": 14
}
```

**Error Responses:**
| Condition              | Message                                          |
| ---------------------- | ------------------------------------------------ |
| Missing required       | `"user_id, plan, days and start_date are required"` |
| `days <= 0`            | `"days must be a number greater than 0"`         |
| `days > 30`            | `"Cannot extend by more than 30 days per call"`  |
| Invalid plan           | `"Invalid plan. Use lunch, dinner or both"`      |
| User not found         | `"User not found"`                               |

---

### 9. `GET` — Get Orders by User

**Action:** `get_orders_by_user`

**Query Parameters:**
```
?action=get_orders_by_user&secret=FOOD2026&user_id=uuid&start_date=2026-04-01&end_date=2026-04-30
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 2,
  "orders": [
    {
      "order_id": "uuid",
      "user_id": "uuid",
      "date": "2026-04-12",
      "slot": "lunch",
      "type": "veg",
      "address": "Building A",
      "quantity_ordered": 1,
      "quantity_delivered": 0,
      "credits_used": 0,
      "is_delivered": false,
      "delivered_at": "",
      "created_at": "2026-04-11T...",
      "is_skipped": false
    }
  ]
}
```

**Error Responses:**
| Condition        | Message                                              |
| ---------------- | ---------------------------------------------------- |
| Missing params   | `"user_id, start_date and end_date are required"`    |

---

### 10. `GET` — Get Monthly Report (User or Admin)

**Action:** `get_monthly_report`

> Accessible with **both** user and admin secrets.

**Query Parameters:**
```
?action=get_monthly_report&secret=FOOD2026&user_id=uuid&start_date=2026-04-01&end_date=2026-04-30
```

**Success Response (200):**
```json
{
  "success": true,
  "summary": {
    "user_id": "uuid",
    "from": "2026-04-01",
    "to": "2026-04-30",
    "total_ordered": 60,
    "total_delivered": 55,
    "total_skipped": 5,
    "total_credits_deducted": 55
  },
  "orders": [
    {
      "order_id": "uuid",
      "date": "2026-04-01",
      "slot": "lunch",
      "quantity_ordered": 1,
      "quantity_delivered": 1,
      "credits_deducted": 1,
      "is_delivered": true,
      "is_skipped": false
    }
  ]
}
```

**Error Responses:**
| Condition          | Message                                        |
| ------------------ | ---------------------------------------------- |
| Missing dates      | `"start_date and end_date are required"`       |
| Missing user_id    | `"user_id is required"`                        |

---

## Admin APIs (secret = `ADMIN2026`)

### 11. `POST` — Mark Delivered

**Action:** `mark_delivered`

**Request Body:**
```json
{
  "secret": "ADMIN2026",
  "action": "mark_delivered",
  "order_id": "uuid",
  "quantity_delivered": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Delivery marked",
  "credits_used": 1
}
```

**Error Responses:**
| Condition                 | Message                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Missing `quantity_delivered` | `"quantity_delivered is required"`                            |
| `quantity_delivered <= 0` | `"quantity_delivered must be a number greater than 0"`        |
| Order not found           | `"Order not found"`                                            |
| Day reconciled            | `"Cannot mark delivered: day has already been reconciled"`     |
| Order is skipped          | `"Cannot deliver a skipped order"`                             |

---

### 12. `POST` — Recharge Credits

**Action:** `recharge_credits`

**Request Body:**
```json
{
  "secret": "ADMIN2026",
  "action": "recharge_credits",
  "user_id": "uuid",
  "amount": 30
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Credits recharged",
  "user_id": "uuid",
  "added": 30,
  "previous_balance": 0,
  "new_balance": 30
}
```

**Error Responses:**
| Condition          | Message                                   |
| ------------------ | ----------------------------------------- |
| Missing fields     | `"user_id and amount are required"`       |
| `amount <= 0`      | `"Amount must be a number greater than 0"`    |
| User not found     | `"User not found"`                        |

---

### 13. `POST` — Admin Update Customer

**Action:** `admin_update_customer`

**Request Body:**
```json
{
  "secret": "ADMIN2026",
  "action": "admin_update_customer",
  "user_id": "uuid",
  "name": "New Name",
  "new_password": "newPass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer updated"
}
```

**Error Responses:**
| Condition          | Message                  |
| ------------------ | ------------------------ |
| Missing `user_id`  | `"user_id is required"`  |
| User not found     | `"User not found"`       |

---

### 14. `GET` — Get All Users

**Action:** `get_all_users`

**Query Parameters:**
```
?action=get_all_users&secret=ADMIN2026
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 5,
  "users": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "mobile": "9876543210",
      "password": "pass123",
      "address_1": "Building A",
      "address_2": "",
      "address_3": "",
      "credit_balance": 30,
      "created_at": "2026-04-11",
      "is_active": true
    }
  ]
}
```

---

### 15. `GET` — Get Orders by Date & Slot

**Action:** `get_orders_by_date_slot`

**Query Parameters:**
```
?action=get_orders_by_date_slot&secret=ADMIN2026&date=2026-04-12&slot=lunch
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 3,
  "orders": [
    {
      "order_id": "uuid",
      "user_id": "uuid",
      "date": "2026-04-12",
      "slot": "lunch",
      "type": "veg",
      "address": "Building A",
      "quantity_ordered": 1,
      "quantity_delivered": 0,
      "credits_used": 0,
      "is_delivered": false,
      "delivered_at": "",
      "created_at": "2026-04-11T...",
      "is_skipped": false,
      "customer_name": "John Doe"
    }
  ]
}
```

**Error Responses:**
| Condition        | Message                            |
| ---------------- | ---------------------------------- |
| Missing params   | `"date and slot are required"`     |
| Invalid slot     | `"slot must be lunch or dinner"`   |

---

### 16. `GET` — Get Dashboard

**Action:** `get_dashboard`

**Query Parameters:**
```
?action=get_dashboard&secret=ADMIN2026&date=2026-04-12
```

**Success Response (200):**
```json
{
  "success": true,
  "yesterday": {
    "date": "2026-04-11",
    "lunch": {
      "total_ordered": 10,
      "total_delivered": 10,
      "veg_ordered": 8,
      "non_veg_ordered": 2,
      "veg_delivered": 8,
      "non_veg_delivered": 2,
      "skipped": 1
    },
    "dinner": { "..." : "same structure" }
  },
  "today": { "..." : "same structure" },
  "tomorrow": { "..." : "same structure" }
}
```

**Error Responses:**
| Condition      | Message                |
| -------------- | ---------------------- |
| Missing `date` | `"date is required"`   |

---

### 17. `POST` — Mark Day Complete (Reconcile)

**Action:** `mark_day_complete`

Sums `credits_used` for all non-skipped orders on the given date, deducts from each customer's `credit_balance`, and records the day as reconciled.

**Request Body:**
```json
{
  "secret": "ADMIN2026",
  "action": "mark_day_complete",
  "date": "2026-04-12"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Day reconciled successfully",
  "date": "2026-04-12",
  "total_credits_deducted": 15,
  "users_affected": 5
}
```

**Error Responses:**
| Condition          | Message                          |
| ------------------ | -------------------------------- |
| Missing `date`     | `"date is required"`             |
| Already reconciled | `"Day already reconciled"`       |

---

### 18. `GET` — Get Negative Credits

**Action:** `get_negative_credits`

**Query Parameters:**
```
?action=get_negative_credits&secret=ADMIN2026
```

**Success Response (200):**
```json
{
  "success": true,
  "total": 2,
  "users": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "mobile": "9876543210",
      "credit_balance": -5
    }
  ]
}
```

---

### 19. `POST` — Reduce Credits Against Order

**Action:** `reduce_credits_against_order`

Adds extra credits to an order. If the day is already reconciled, it also immediately deducts from the user's balance.

**Request Body:**
```json
{
  "secret": "ADMIN2026",
  "action": "reduce_credits_against_order",
  "order_id": "uuid",
  "credits_to_add": 2
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Credits added to order and deducted from user balance immediately",
  "order_id": "uuid",
  "previous_credits": 1,
  "new_credits": 3,
  "day_completed": true
}
```
> If day is NOT completed, `message` is `"Credits added to order, will be deducted at day completion"` and `day_completed` is `false`.

**Error Responses:**
| Condition            | Message                                      |
| -------------------- | -------------------------------------------- |
| Missing fields       | `"order_id and credits_to_add are required"` |
| `credits_to_add <= 0`| `"credits_to_add must be a number greater than 0"` |
| Order not found      | `"Order not found"`                          |

---

## Global Error Responses

| Condition              | Response                                             |
| ---------------------- | ---------------------------------------------------- |
| Unauthorized (wrong secret) | `{ "success": false, "message": "Unauthorized" }` |
| Unknown action (user)  | `{ "success": false, "message": "Unknown action" }` |
| Unknown action (admin) | `{ "success": false, "message": "Unknown admin action" }` |
| Unhandled exception     | `{ "success": false, "message": "<error message>" }` |
