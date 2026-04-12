# Tiffin Service — Positive & Negative (PnC) Test Cases

> **Legend:**
> - ✅ **P** = Positive test (expected success)
> - ❌ **N** = Negative test (expected failure / error handling)
> - 🔗 **D** = Dependent on previous test's output (chained)

---

## 1. Authentication & Routing

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 1.1  | ❌ N | POST with no `secret`                          | `Unauthorized`                                |
| 1.2  | ❌ N | POST with wrong `secret`                       | `Unauthorized`                                |
| 1.3  | ❌ N | GET with no `secret`                           | `Unauthorized`                                |
| 1.4  | ❌ N | GET with wrong `secret`                        | `Unauthorized`                                |
| 1.5  | ❌ N | POST valid user secret + unknown `action`      | `Unknown action`                              |
| 1.6  | ❌ N | POST valid admin secret + unknown `action`     | `Unknown admin action`                        |
| 1.7  | ❌ N | GET valid user secret + unknown `action`       | `Unknown action`                              |
| 1.8  | ❌ N | GET valid admin secret + unknown `action`      | `Unknown admin action`                        |

---

## 2. Create Customer

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 2.1  | ✅ P | Create customer with all fields                | `success: true`, returns `user_id`            |
| 2.2  | ✅ P | Create customer with minimal fields (no addr)  | `success: true`, addresses default to `""`    |
| 2.3  | ❌ N | Create customer with duplicate mobile          | `"Mobile already registered"`                 |
| 2.4  | ❌ N | Create customer with missing `name`            | `"name and password are required"`            |
| 2.5  | ❌ N | Create customer with invalid mobile (9 digits) | `"Mobile number must be exactly 10 digits"`   |
| 2.6  | ❌ N | Create customer with invalid mobile (contains letters) | `"Mobile number must be exactly 10 digits"`   |
| 2.7  | ❌ N | Create customer with missing `password`        | `"name and password are required"`            |
| 2.8  | ❌ N | Create customer with missing mobile            | `"Mobile number must be exactly 10 digits"`   |

---

## 3. Get Customer (Login)

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 3.1  | ✅🔗P | Get customer with valid mobile + password      | `success: true`, returns customer object      |
| 3.2  | ❌ N | Get customer with wrong password               | `"Invalid mobile or password"`                |
| 3.3  | ❌ N | Get customer with non-existent mobile          | `"Invalid mobile or password"`                |
| 3.4  | ❌ N | Get customer with missing mobile param         | `"Invalid mobile or password"`                |

---

## 4. Update Customer

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 4.1  | ✅🔗P | Update customer name                           | `success: true`, `"Customer updated"`         |
| 4.2  | ✅🔗P | Update customer address to empty string        | `success: true` (field cleared)               |
| 4.3  | ❌ N | Update customer without `user_id`              | `"user_id is required"`                       |
| 4.4  | ❌ N | Update customer with non-existent `user_id`    | `"User not found"`                            |

---

## 5. Onboard Customer

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 5.1  | ✅ P | Onboard with plan=`lunch`, 3 days              | `orders_created: 3`                           |
| 5.2  | ✅ P | Onboard with plan=`dinner`, 2 days             | `orders_created: 2`                           |
| 5.3  | ✅ P | Onboard with plan=`both`, 2 days               | `orders_created: 4`                           |
| 5.4  | ❌ N | Onboard with missing `start_date`              | `"start_date and end_date are required"`      |
| 5.5  | ❌ N | Onboard with missing `end_date`                | `"start_date and end_date are required"`      |
| 5.6  | ❌ N | Onboard with `start_date > end_date`           | `"start_date cannot be after end_date"`       |
| 5.7  | ❌ N | Onboard with invalid plan (e.g. `"brunch"`)    | `"Invalid plan. Use lunch, dinner or both"`   |
| 5.8  | ❌ N | Onboard with duplicate mobile                  | `"Mobile already registered"`                 |

---

## 6. Add Order Slot

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 6.1  | ✅🔗P | Add lunch order slot for valid user + date     | `success: true`, returns `order_id`           |
| 6.2  | ✅🔗P | Add dinner order slot                          | `success: true`, returns `order_id`           |
| 6.3  | ❌ N | Add order with missing `user_id`               | `"user_id, date, slot and address are required"` |
| 6.4  | ❌ N | Add order with missing `date`                  | `"user_id, date, slot and address are required"` |
| 6.5  | ❌ N | Add order with missing `slot`                  | `"user_id, date, slot and address are required"` |
| 6.6  | ❌ N | Add order with missing `address`               | `"user_id, date, slot and address are required"` |
| 6.7  | ❌ N | Add order with invalid slot (`"breakfast"`)    | `"slot must be lunch or dinner"`              |
| 6.8  | ❌ N | Add order with invalid type (`"pizza"`)        | `"type must be veg or non-veg"`               |
| 6.9  | ❌ N | Add order with `quantity_ordered = -1`         | `"quantity_ordered must be a number greater than 0"` |
| 6.10 | ❌ N | Add order with `quantity_ordered = 0`          | `"quantity_ordered must be a number greater than 0"` |

---

## 7. Update Order

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 7.1  | ✅🔗P | Update order type to `non-veg`                 | `success: true`, `"Order updated"`            |
| 7.2  | ✅🔗P | Update order quantity                           | `success: true`, `"Order updated"`            |
| 7.3  | ❌ N | Update order with non-existent `order_id`      | `"Order not found"`                           |
| 7.4  | ❌ N | Update order with invalid type (`"pizza"`)     | `"type must be veg or non-veg"`               |
| 7.5  | ❌ N | Update order with `quantity_ordered = 0`       | `"quantity_ordered must be a number greater than 0"` |
| 7.6  | ❌ N | Update order with `quantity_ordered = -3`      | `"quantity_ordered must be a number greater than 0"` |

---

## 8. Skip Order

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 8.1  | ✅🔗P | Skip a valid, undelivered order                | `success: true`, `"Order skipped"`            |
| 8.2  | ❌ N | Skip a non-existent `order_id`                 | `"Order not found"`                           |
| 8.3  | ❌🔗N | Skip an already delivered order                | `"Cannot skip an already delivered order"`    |
| 8.4  | ✅🔗P | Skip an already-skipped order (idempotency)    | `success: true`, `"Order skipped"`            |

---

## 9. Extend Plan

| #    | Type | Test Case                                      | Expected                                      |
| ---- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 9.1  | ✅🔗P | Extend plan by 5 days, plan=`lunch`            | `orders_created: 5`                           |
| 9.2  | ✅🔗P | Extend plan by 3 days, plan=`both`             | `orders_created: 6`                           |
| 9.3  | ❌ N | Extend with missing `user_id`                  | `"user_id, plan, days and start_date are required"` |
| 9.4  | ❌ N | Extend with missing `start_date`               | `"user_id, plan, days and start_date are required"` |
| 9.5  | ❌ N | Extend with `days = 0`                         | `"days must be a number greater than 0"`      |
| 9.6  | ❌ N | Extend with `days = -5`                        | `"days must be a number greater than 0"`      |
| 9.7  | ❌ N | Extend with `days = 31`                        | `"Cannot extend by more than 30 days per call"` |
| 9.8  | ❌ N | Extend with invalid plan (`"brunch"`)          | `"Invalid plan. Use lunch, dinner or both"`   |
| 9.9  | ❌ N | Extend with `days` as a string (`"five"`)      | `"days must be a number greater than 0"`      |
| 9.10 | ❌ N | Extend with non-existent user                  | `"User not found"`                            |

---

## 10. Get Orders by User

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 10.1  | ✅🔗P | Get orders for a valid user + date range       | `success: true`, returns orders array         |
| 10.2  | ✅ P | Get orders for date range with no orders       | `success: true`, `total: 0`, empty array      |
| 10.3  | ❌ N | Get orders without `user_id`                   | `"user_id, start_date and end_date are required"` |
| 10.4  | ❌ N | Get orders without `start_date`                | `"user_id, start_date and end_date are required"` |
| 10.5  | ❌ N | Get orders with `start_date > end_date`        | `"start_date cannot be after end_date"`       |

---

## 11. Mark Delivered (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 11.1  | ✅🔗P | Mark delivery for valid order                  | `success: true`, `"Delivery marked"`          |
| 11.2  | ❌ N | Mark delivery with missing `quantity_delivered`| `"quantity_delivered is required"`             |
| 11.3  | ❌ N | Mark delivery with `quantity_delivered = 0`    | `"quantity_delivered must be a number greater than 0"`  |
| 11.4  | ❌ N | Mark delivery with `quantity_delivered = -1`   | `"quantity_delivered must be a number greater than 0"`  |
| 11.5  | ❌ N | Mark delivery for non-existent order           | `"Order not found"`                           |
| 11.6  | ❌🔗N | Mark delivery for a skipped order              | `"Cannot deliver a skipped order"`            |
| 11.7  | ❌ N | Mark delivery with string quantity (`"one"`)   | `"quantity_delivered must be a number greater than 0"` |

---

## 12. Recharge Credits (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 12.1  | ✅🔗P | Recharge credits for valid user                | `success: true`, returns balances             |
| 12.2  | ❌ N | Recharge with missing `user_id`                | `"user_id and amount are required"`           |
| 12.3  | ❌ N | Recharge with `amount = 0`                     | `"Amount must be a number greater than 0"`    |
| 12.4  | ❌ N | Recharge with `amount = -10`                   | `"Amount must be a number greater than 0"`    |
| 12.5  | ❌ N | Recharge for non-existent user                 | `"User not found"`                            |
| 12.6  | ❌ N | Recharge with `amount = "ten"` (string)        | `"Amount must be a number greater than 0"`    |
| 12.7  | ❌ N | Recharge for non-existent user                 | `"User not found"`                            |

---

## 13. Admin Update Customer

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 13.1  | ✅🔗P | Admin update customer name                     | `success: true`, `"Customer updated"`         |
| 13.2  | ✅🔗P | Admin reset password                           | `success: true`, `"Customer updated"`         |
| 13.3  | ❌ N | Admin update without `user_id`                 | `"user_id is required"`                       |
| 13.4  | ❌ N | Admin update with non-existent `user_id`       | `"User not found"`                            |

---

## 14. Get All Users (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 14.1  | ✅ P | Get all users                                  | `success: true`, returns users array          |

---

## 15. Get Orders by Date & Slot (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 15.1  | ✅🔗P | Get orders for specific date + lunch           | `success: true`, returns `grouped` array      |
| 15.1.a| ✅🔗P | Get orders for specific date + dinner          | `success: true`, returns `grouped` array      |
| 15.2  | ❌ N | Get orders without `date`                      | `"date and slot are required"`                |
| 15.3  | ❌ N | Get orders without `slot`                      | `"date and slot are required"`                |
| 15.4  | ❌ N | Get orders with invalid slot (`"morning"`)     | `"slot must be lunch or dinner"`              |

---

## 16. Get Dashboard (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 16.1  | ✅ P | Get dashboard for valid date                   | `success: true`, returns yesterday/today/tomorrow |
| 16.2  | ❌ N | Get dashboard without `date`                   | `"date is required"`                          |

---

## 17. Mark Day Complete (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 17.1  | ✅🔗P | Mark day complete for a date with orders       | `success: true`, `"Day reconciled successfully"` |
| 17.2  | ❌ N | Mark day complete without `date`               | `"date is required"`                          |
| 17.3  | ❌🔗N | Mark same day complete again (duplicate)       | `"Day already reconciled"`                    |

---

## 18. Post-Reconciliation Guards

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 18.1  | ❌🔗N | Update order on reconciled day                 | `"Cannot update order: day has already been reconciled"` |
| 18.2  | ❌🔗N | Add order slot on reconciled day               | `"Cannot add order: day has already been reconciled"` |
| 18.3  | ❌🔗N | Skip order on reconciled day                   | `"Cannot skip order: day has already been reconciled"` |
| 18.4  | ❌🔗N | Mark delivered on reconciled day               | `"Cannot mark delivered: day has already been reconciled"` |

---

## 19. Get Negative Credits (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 19.1  | ✅ P | Get negative credits list                      | `success: true`, returns users array          |

---

## 20. Reduce Credits Against Order (Admin)

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 20.1  | ✅🔗P | Add credits to order (day NOT completed)       | `success: true`, `day_completed: false`       |
| 20.2  | ✅🔗P | Add credits to order (day IS completed)        | `success: true`, `day_completed: true`        |
| 20.3  | ❌ N | Missing `order_id`                             | `"order_id and credits_to_add are required"`  |
| 20.4  | ❌ N | Missing `credits_to_add`                       | `"order_id and credits_to_add are required"`  |
| 20.5  | ❌ N | `credits_to_add = 0`                           | `"credits_to_add must be a number greater than 0"` |
| 20.6  | ❌ N | `credits_to_add = -5`                          | `"credits_to_add must be a number greater than 0"` |
| 20.7  | ❌ N | Non-existent `order_id`                        | `"Order not found"`                           |
| 20.8  | ❌ N | `credits_to_add = "10"` (string)               | `"credits_to_add must be a number greater than 0"` |

---

## 21. Monthly Report

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 21.1  | ✅🔗P | Get monthly report for valid user + date range | `success: true`, summary + orders array       |
| 21.2  | ❌ N | Missing `start_date`                           | `"start_date and end_date are required"`      |
| 21.3  | ❌ N | Missing `end_date`                             | `"start_date and end_date are required"`      |
| 21.4  | ❌ N | Missing `user_id`                              | `"user_id is required"`                       |
| 21.5  | ❌ N | Monthly report with `start_date > end_date`    | `"start_date cannot be after end_date"`       |

---

## 22. Menu APIs

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 22.1  | ✅ P | Upsert menu (Monday Lunch)                     | `success: true`, `"Menu created"`             |
| 22.2  | ✅ P | Upsert menu (Monday Dinner)                    | `success: true`, `"Menu created"`             |
| 22.3  | ✅ P | Update existing menu (Monday Lunch)            | `success: true`, `"Menu updated"`             |
| 22.4  | ❌ N | Upsert menu with missing `day`                 | `"day, slot and dish_name are required"`      |
| 22.5  | ❌ N | Upsert menu with invalid `day` (`"funday"`)    | `"Invalid day"`                               |
| 22.6  | ❌ N | Upsert menu with invalid `slot` (`"snack"`)    | `"slot must be lunch or dinner"`              |
| 22.7  | ✅ P | Get full week menu                             | `success: true`, returns list of menu items   |
| 22.8  | ✅ P | Get menu for specific day (Monday)             | `success: true`, returns only Monday items    |
| 22.9  | ✅ P | Get menu for specific day & slot               | `success: true`, returns 1 item               |
| 22.10 | ❌ N | Upsert menu with User secret                   | `"Unauthorized"`                              |
| 22.11 | ✅ P | Get menu with Admin secret                     | `success: true`, returns list of menu items   |

---

## 23. Credit History

| #     | Type | Test Case                                      | Expected                                      |
| ----- | ---- | ---------------------------------------------- | --------------------------------------------- |
| 23.1  | ✅ P | Get credit history for valid user + date range | `success: true`, summary + history array      |
| 23.2  | ✅🔗P | Verify recharge log in credit history          | `type: "credit"`, `reason: "recharge"`        |
| 23.3  | ✅🔗P | Verify day completion log in credit history    | `type: "debit"`, `reason: "day_completion"`   |
| 23.4  | ❌ N | Missing `user_id`                              | `"user_id, start_date and end_date are required"` |
| 23.5  | ❌ N | Missing `start_date`                           | `"user_id, start_date and end_date are required"` |
| 23.6  | ✅ P | Get history for date range with no movements   | `success: true`, `total: 0`, empty array      |

---

---

## Test Execution Order (Chained Flow)

The following is the recommended order for running tests sequentially, since many tests depend on data created by earlier tests:

```
1. Auth tests (1.1 – 1.8)          — stateless, no dependencies
2. Create Customer (2.1 – 2.8)     — creates test user, captures user_id
3. Get Customer (3.1 – 3.4)        — validates login for created user
4. Update Customer (4.1 – 4.4)     — updates created user fields
5. Onboard Customer (5.1 – 5.8)    — creates another user + orders, captures user_id + order data
6. Add Order Slot (6.1 – 6.10)     — adds orders for onboarded user
7. Update Order (7.1 – 7.6)        — modifies created orders
8. Get Orders by User (10.1–10.5)  — reads back orders
9. Skip Order (8.1 – 8.2, 8.4)     — skips one order, idempotency check
10. Mark Delivered (11.1 – 11.6)   — delivers another order
11. Get All Users (14.1)           — admin read
12. Get Orders by Date/Slot (15.1–15.4) — admin read
13. Get Dashboard (16.1 – 16.2)    — admin dashboard
14. Recharge Credits (12.1–12.7)   — add credits to user
15. Admin Update Customer (13.1–13.4) — admin modifies user
16. Reduce Credits (20.1, 20.3-20.8) — add credits to an order (pre-reconcile)
17. Mark Day Complete (17.1–17.3)  — reconcile the day
18. Post-Reconciliation (18.1–18.4)— verify all mutations blocked after reconciliation
19. Reduce Credits (20.2)          — add credits to an order (post-reconcile)
20. Get Negative Credits (19.1)    — check negative balances
21. Monthly Report (21.1–21.5)     — final report
22. Extend Plan (9.1–9.10)         — extend the plan
23. Menu APIs (22.1–22.11)         — admin menu management
24. Credit History (23.1–23.6)     — verify logs and summaries
25. Edge Cases (8.3, 11.7, etc.)   — run structural type checking
```

**Total Test Cases: ~110**
