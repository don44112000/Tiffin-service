#!/usr/bin/env node

/**
 * Tiffin Service — PnC API Test Runner
 *
 * Usage:
 *   node run_tests.js <BASE_URL>
 *
 * Example:
 *   node run_tests.js "https://script.google.com/macros/s/.../exec"
 *
 * Runs all Positive & Negative test cases sequentially against the
 * deployed Google Apps Script web-app and prints a full report.
 */

// ─── Config ──────────────────────────────────────────────────────────
const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error("❌  Usage: node run_tests.js <BASE_URL>");
  process.exit(1);
}

const USER_SECRET  = "FOOD2026";
const ADMIN_SECRET = "ADMIN2026";

const RUN_ID = Date.now().toString();

// Unique mobiles per run — avoids collision with leftover test data
const TEST_MOBILE_1 = `90000${RUN_ID.slice(-5)}`;
const TEST_MOBILE_2 = `91000${RUN_ID.slice(-5)}`;
const TEST_MOBILE_3 = `92000${RUN_ID.slice(-5)}`;
const TEST_MOBILE_4 = `93000${RUN_ID.slice(-5)}`;
const TEST_MOBILE_5 = `94000${RUN_ID.slice(-5)}`;

// Future dates — offset by last 4 digits of RUN_ID to avoid colliding with
// previously reconciled dates left by earlier test runs.
const baseDate = new Date(Date.now() + parseInt(RUN_ID.slice(-4)) * 86400000);
const dStr = (d) => d.toISOString().split("T")[0];

const FUTURE_DATE_1          = dStr(baseDate);
const FUTURE_DATE_2          = dStr(new Date(baseDate.getTime() +     86400000));
const FUTURE_DATE_3          = dStr(new Date(baseDate.getTime() + 2 * 86400000));
const FUTURE_DATE_RANGE_START = FUTURE_DATE_1;
const FUTURE_DATE_RANGE_END   = FUTURE_DATE_3;

// Far-future dates used for extend_plan (safely beyond any reconciled range)
const EXTEND_START_1 = "2030-06-01";
const EXTEND_START_2 = "2030-06-10";

// State bag — populated by tests, read by later tests
const state = {};

// ─── HTTP Helpers ────────────────────────────────────────────────────

async function postJSON(body) {
  const res = await fetch(BASE_URL, {
    method:   "POST",
    headers:  { "Content-Type": "application/json" },
    body:     JSON.stringify(body),
    redirect: "follow",
  });
  return res.json();
}

async function getJSON(params) {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { redirect: "follow" });
  return res.json();
}

// ─── Test Framework ──────────────────────────────────────────────────

let passed  = 0;
let failed  = 0;
let skipped = 0;
const results = [];

async function test(id, description, type, fn) {
  const label = `${id} [${type}] ${description}`;
  try {
    const result = await fn();
    if (result === "SKIP") {
      skipped++;
      results.push({ id, description, type, status: "SKIP", detail: "Skipped (dependency)" });
      console.log(`  ⏭  ${label} — SKIPPED`);
      return;
    }
    passed++;
    results.push({ id, description, type, status: "PASS", detail: result || "OK" });
    console.log(`  ✅ ${label}`);
  } catch (err) {
    failed++;
    const msg = err.message || String(err);
    results.push({ id, description, type, status: "FAIL", detail: msg });
    console.log(`  ❌ ${label}`);
    console.log(`     → ${msg}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual, expected, field) {
  if (actual !== expected)
    throw new Error(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertIncludes(str, substring, field) {
  if (!String(str).includes(substring))
    throw new Error(`${field}: expected to include "${substring}", got "${str}"`);
}

function assertHasKeys(obj, keys, label) {
  keys.forEach((k) => {
    if (!(k in obj)) throw new Error(`${label}: missing key "${k}"`);
  });
}

// ─── TESTS ───────────────────────────────────────────────────────────

async function runAllTests() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     🍱  TIFFIN SERVICE — PnC API TEST SUITE  🍱        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  Base URL  : ${BASE_URL}`);
  console.log(`  Run ID    : ${RUN_ID}`);
  console.log(`  Date-1    : ${FUTURE_DATE_1}`);
  console.log(`  Started   : ${new Date().toISOString()}\n`);

  // ═══════════════════════════════════════════════════════════════════
  console.log("─── 1. Authentication & Routing ────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("1.1", "POST with no secret", "N", async () => {
    const r = await postJSON({ action: "create_customer" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unauthorized", "message");
  });

  await test("1.2", "POST with wrong secret", "N", async () => {
    const r = await postJSON({ secret: "WRONG", action: "create_customer" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unauthorized", "message");
  });

  await test("1.3", "GET with no secret", "N", async () => {
    const r = await getJSON({ action: "get_customer" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unauthorized", "message");
  });

  await test("1.4", "GET with wrong secret", "N", async () => {
    const r = await getJSON({ secret: "WRONG", action: "get_customer" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unauthorized", "message");
  });

  await test("1.5", "POST user secret + unknown action", "N", async () => {
    const r = await postJSON({ secret: USER_SECRET, action: "foobar" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unknown action", "message");
  });

  await test("1.6", "POST admin secret + unknown action", "N", async () => {
    const r = await postJSON({ secret: ADMIN_SECRET, action: "foobar" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unknown admin action", "message");
  });

  await test("1.7", "GET user secret + unknown action", "N", async () => {
    const r = await getJSON({ secret: USER_SECRET, action: "foobar" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unknown action", "message");
  });

  await test("1.8", "GET admin secret + unknown action", "N", async () => {
    const r = await getJSON({ secret: ADMIN_SECRET, action: "foobar" });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unknown admin action", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 2. Create Customer ─────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("2.1", "Create customer with all fields", "P", async () => {
    const r = await postJSON({
      secret:    USER_SECRET,
      action:    "create_customer",
      name:      `Test User ${RUN_ID}`,
      mobile:    TEST_MOBILE_1,
      password:  "test123",
      address_1: "Test Bldg A",
      address_2: "Floor 2",
      address_3: "Near School",
    });
    assertEqual(r.success, true, "success");
    assert(r.user_id, "user_id should be returned");
    state.userId1   = r.user_id;
    state.mobile1   = TEST_MOBILE_1;
    state.password1 = "test123";
    return `user_id=${r.user_id}`;
  });

  await test("2.2", "Create customer with minimal fields (no address)", "P", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      name:     `Minimal User ${RUN_ID}`,
      mobile:   TEST_MOBILE_2,
      password: "min123",
    });
    assertEqual(r.success, true, "success");
    assert(r.user_id, "user_id should be returned");
    state.userId2 = r.user_id;
    return `user_id=${r.user_id}`;
  });

  await test("2.3", "Create customer with duplicate mobile", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      name:     "Duplicate",
      mobile:   TEST_MOBILE_1,
      password: "dup",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Mobile already registered", "message");
  });

  await test("2.4", "Create customer with missing name", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      mobile:   `80000${RUN_ID.slice(-5)}`,
      password: "foo",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "name and password are required", "message");
  });

  await test("2.5", "Create customer with invalid mobile (9 digits)", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      name:     "9 Digits",
      mobile:   "999999999",
      password: "foo",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Mobile number must be exactly 10 digits", "message");
  });

  await test("2.6", "Create customer with invalid mobile (contains letters)", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      name:     "Letters",
      mobile:   "99999AAAAA",
      password: "foo",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Mobile number must be exactly 10 digits", "message");
  });

  await test("2.7", "Create customer with missing password", "N", async () => {
    const r = await postJSON({
      secret: USER_SECRET,
      action: "create_customer",
      name:   "No Pass",
      mobile: `81000${RUN_ID.slice(-5)}`,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "name and password are required", "message");
  });

  await test("2.8", "Create customer with missing mobile", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "create_customer",
      name:     "No Mobile",
      password: "foo",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Mobile number must be exactly 10 digits", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 3. Get Customer (Login) ─────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("3.1", "Login with valid credentials", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assert(r.customer, "customer object should exist");
    assertHasKeys(r.customer, [
      "user_id", "name", "mobile", "password",
      "address_1", "address_2", "address_3",
      "credit_balance", "created_at", "is_active",
    ], "customer");
    assertEqual(r.customer.name, `Test User ${RUN_ID}`, "name");
    assertEqual(r.customer.address_1, "Test Bldg A", "address_1");
    assertEqual(r.customer.credit_balance, 0, "initial credit_balance");
    return `name=${r.customer.name}`;
  });

  await test("3.2", "Login with wrong password", "N", async () => {
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1 || TEST_MOBILE_1,
      password: "WRONG",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Invalid mobile or password", "message");
  });

  await test("3.3", "Login with non-existent mobile", "N", async () => {
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   "0000000001",
      password: "x",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Invalid mobile or password", "message");
  });

  await test("3.4", "Login with missing mobile param", "N", async () => {
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      password: "x",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Invalid mobile or password", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 4. Update Customer ─────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("4.1", "Update customer name", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "update_customer",
      user_id: state.userId1,
      name:    `Updated User ${RUN_ID}`,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Customer updated", "message");
  });

  await test("4.1.a", "E2E: verify name mutation via get_customer", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.customer.name, `Updated User ${RUN_ID}`, "name should reflect update");
  });

  await test("4.2", "Update customer address to empty string (clear field)", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:    USER_SECRET,
      action:    "update_customer",
      user_id:   state.userId1,
      address_2: "",
    });
    assertEqual(r.success, true, "success");
  });

  await test("4.2.a", "E2E: verify address_2 cleared via get_customer", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.customer.address_2, "", "address_2 should be cleared");
  });

  await test("4.3", "Update customer without user_id", "N", async () => {
    const r = await postJSON({
      secret: USER_SECRET,
      action: "update_customer",
      name:   "No ID",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "user_id is required", "message");
  });

  await test("4.4", "Update customer with non-existent user_id", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "update_customer",
      user_id: "non-existent-uuid-000",
      name:    "Ghost",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "User not found", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 5. Onboard Customer ────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("5.1", "Onboard with plan=lunch, 3 days", "P", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       `Onboard Lunch ${RUN_ID}`,
      mobile:     TEST_MOBILE_3,
      password:   "ob123",
      address_1:  "Onboard Addr",
      plan:       "lunch",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_3,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.orders_created, 3, "orders_created");
    assertEqual(r.plan, "lunch", "plan");
    assertEqual(r.from, FUTURE_DATE_1, "from");
    assertEqual(r.to, FUTURE_DATE_3, "to");
    state.onboardUserId1 = r.user_id;
    return `user_id=${r.user_id}, orders=${r.orders_created}`;
  });

  await test("5.1.a", "E2E: verify onboarded orders exist via get_orders_by_user", "P", async () => {
    if (!state.onboardUserId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.onboardUserId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_3,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.total, 3, "should have exactly 3 lunch orders");
    assert(r.orders.every((o) => o.slot === "lunch"), "all orders should be lunch slot");
    assert(r.orders.every((o) => o.type === "veg"), "all orders should default to veg");
    assert(r.orders.every((o) => o.is_skipped === false), "none should be pre-skipped");
  });

  await test("5.2", "Onboard with plan=dinner, 2 days", "P", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       `Onboard Dinner ${RUN_ID}`,
      mobile:     TEST_MOBILE_4,
      password:   "ob456",
      address_1:  "Dinner Addr",
      plan:       "dinner",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_2,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.orders_created, 2, "orders_created");
    return `orders=${r.orders_created}`;
  });

  await test("5.3", "Onboard with plan=both, 2 days", "P", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       `Onboard Both ${RUN_ID}`,
      mobile:     TEST_MOBILE_5,
      password:   "ob789",
      address_1:  "Both Addr",
      plan:       "both",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_2,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.orders_created, 4, "orders_created (2 days × 2 slots)");
    return `orders=${r.orders_created}`;
  });

  await test("5.4", "Onboard with missing start_date", "N", async () => {
    const r = await postJSON({
      secret:    USER_SECRET,
      action:    "onboard_customer",
      name:      "No Dates",
      mobile:    `82${TEST_MOBILE_1.slice(2)}`,
      password:  "x",
      address_1: "A",
      plan:      "lunch",
      end_date:  FUTURE_DATE_2,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "start_date and end_date are required", "message");
  });

  await test("5.5", "Onboard with missing end_date", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       "No End",
      mobile:     `83${TEST_MOBILE_1.slice(2)}`,
      password:   "x",
      address_1:  "A",
      plan:       "lunch",
      start_date: FUTURE_DATE_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "start_date and end_date are required", "message");
  });

  await test("5.6", "Onboard with start_date > end_date", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       "Bad Range",
      mobile:     `84${TEST_MOBILE_1.slice(2)}`,
      password:   "x",
      address_1:  "A",
      plan:       "lunch",
      start_date: FUTURE_DATE_3,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "start_date cannot be after end_date", "message");
  });

  await test("5.7", "Onboard with invalid plan (brunch)", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       "Bad Plan",
      mobile:     `85${TEST_MOBILE_1.slice(2)}`,
      password:   "x",
      address_1:  "A",
      plan:       "brunch",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_2,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Invalid plan", "message");
  });

  await test("5.8", "Onboard with duplicate mobile", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "onboard_customer",
      name:       "Dup Mobile",
      mobile:     TEST_MOBILE_3,
      password:   "x",
      address_1:  "A",
      plan:       "lunch",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_2,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Mobile already registered", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 6. Add Order Slot ──────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("6.1", "Add lunch order slot for userId1", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1,
      date:    FUTURE_DATE_1,
      slot:    "lunch",
      address: "Test Bldg A",
    });
    assertEqual(r.success, true, "success");
    assert(r.order_id, "order_id should be returned");
    state.orderId_lunch = r.order_id;
    return `order_id=${r.order_id}`;
  });

  await test("6.2", "Add dinner order slot for userId1", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1,
      date:    FUTURE_DATE_1,
      slot:    "dinner",
      address: "Test Bldg A",
    });
    assertEqual(r.success, true, "success");
    assert(r.order_id, "order_id should be returned");
    state.orderId_dinner = r.order_id;
    return `order_id=${r.order_id}`;
  });

  await test("6.2.a", "E2E: verify both slots exist with correct defaults", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const lunch  = r.orders.find((o) => o.order_id === state.orderId_lunch);
    const dinner = r.orders.find((o) => o.order_id === state.orderId_dinner);
    assert(lunch  !== undefined, "lunch order should exist");
    assert(dinner !== undefined, "dinner order should exist");
    assertEqual(lunch.type,             "veg",  "lunch type should default to veg");
    assertEqual(lunch.quantity_ordered, 1,      "lunch quantity_ordered should default to 1");
    assertEqual(lunch.is_skipped,       false,  "lunch should not be pre-skipped");
    assertEqual(lunch.is_delivered,     false,  "lunch should not be pre-delivered");
  });

  await test("6.3", "Add order with missing user_id", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      date:    FUTURE_DATE_1,
      slot:    "lunch",
      address: "A",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, date, slot and address are required", "message");
  });

  await test("6.4", "Add order with missing date", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1 || "x",
      slot:    "lunch",
      address: "A",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, date, slot and address are required", "message");
  });

  await test("6.5", "Add order with missing slot", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1 || "x",
      date:    FUTURE_DATE_1,
      address: "A",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, date, slot and address are required", "message");
  });

  await test("6.6", "Add order with missing address", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1 || "x",
      date:    FUTURE_DATE_1,
      slot:    "lunch",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, date, slot and address are required", "message");
  });

  await test("6.7", "Add order with invalid slot (breakfast)", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1 || "x",
      date:    FUTURE_DATE_1,
      slot:    "breakfast",
      address: "A",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "slot must be lunch or dinner", "message");
  });

  await test("6.8", "Add order with invalid type (pizza)", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1 || "x",
      date:    FUTURE_DATE_1,
      slot:    "lunch",
      address: "A",
      type:    "pizza",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "type must be veg or non-veg", "message");
  });

  await test("6.9", "Add order with quantity_ordered = -1", "N", async () => {
    const r = await postJSON({
      secret:           USER_SECRET,
      action:           "add_order_slot",
      user_id:          state.userId1 || "x",
      date:             FUTURE_DATE_1,
      slot:             "lunch",
      address:          "A",
      quantity_ordered: -1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_ordered must be a number greater than 0", "message");
  });

  await test("6.10", "Add order with quantity_ordered = 0", "N", async () => {
    const r = await postJSON({
      secret:           USER_SECRET,
      action:           "add_order_slot",
      user_id:          state.userId1 || "x",
      date:             FUTURE_DATE_1,
      slot:             "lunch",
      address:          "A",
      quantity_ordered: 0,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_ordered must be a number greater than 0", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 7. Update Order ────────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("7.1", "Update order type to non-veg", "P", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "update_order",
      order_id: state.orderId_lunch,
      type:     "non-veg",
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Order updated", "message");
  });

  await test("7.2", "Update order quantity to 2", "P", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:           USER_SECRET,
      action:           "update_order",
      order_id:         state.orderId_lunch,
      quantity_ordered: 2,
    });
    assertEqual(r.success, true, "success");
  });

  await test("7.2.a", "E2E: verify type and quantity mutations via get_orders_by_user", "P", async () => {
    if (!state.orderId_lunch || !state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const order = r.orders.find((o) => o.order_id === state.orderId_lunch);
    assert(order !== undefined, "order should exist");
    assertEqual(order.type,             "non-veg", "type should be mutated to non-veg");
    assertEqual(order.quantity_ordered, 2,         "quantity_ordered should be 2");
  });

  await test("7.3", "Update order with non-existent order_id", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "update_order",
      order_id: "non-existent-order-uuid",
      type:     "veg",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Order not found", "message");
  });

  await test("7.4", "Update order with invalid type (pizza)", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "update_order",
      order_id: state.orderId_lunch || "x",
      type:     "pizza",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "type must be veg or non-veg", "message");
  });

  await test("7.5", "Update order with quantity_ordered = 0", "N", async () => {
    const r = await postJSON({
      secret:           USER_SECRET,
      action:           "update_order",
      order_id:         state.orderId_lunch || "x",
      quantity_ordered: 0,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_ordered must be a number greater than 0", "message");
  });

  await test("7.6", "Update order with quantity_ordered = -3", "N", async () => {
    const r = await postJSON({
      secret:           USER_SECRET,
      action:           "update_order",
      order_id:         state.orderId_lunch || "x",
      quantity_ordered: -3,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_ordered must be a number greater than 0", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 8. Get Orders by User ──────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("10.1", "Get orders for valid user + date range", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_RANGE_START,
      end_date:   FUTURE_DATE_RANGE_END,
    });
    assertEqual(r.success, true, "success");
    assert(Array.isArray(r.orders), "orders should be array");
    assert(r.total >= 2, `expected ≥ 2 orders, got ${r.total}`);
    // Verify all returned orders belong to the requested user
    assert(r.orders.every((o) => o.user_id === state.userId1), "all orders should belong to userId1");
    return `total=${r.total}`;
  });

  await test("10.2", "Get orders for date range with no orders (empty result)", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: "2020-01-01",
      end_date:   "2020-01-02",
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.total, 0, "total should be 0 for empty range");
    assert(Array.isArray(r.orders) && r.orders.length === 0, "orders should be empty array");
  });

  await test("10.3", "Get orders without user_id", "N", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_2,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, start_date and end_date are required", "message");
  });

  await test("10.4", "Get orders without start_date", "N", async () => {
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_orders_by_user",
      user_id:  state.userId1 || "x",
      end_date: FUTURE_DATE_2,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, start_date and end_date are required", "message");
  });

  await test("10.5", "Get orders with start_date > end_date", "N", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1 || "x",
      start_date: FUTURE_DATE_3,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "start_date cannot be after end_date", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 9. Skip Order ──────────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("8.1", "Skip a valid undelivered order (dinner)", "P", async () => {
    if (!state.orderId_dinner) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "skip_order",
      order_id: state.orderId_dinner,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Order skipped", "message");
    state.skippedOrderId = state.orderId_dinner;
  });

  await test("8.1.a", "E2E: verify is_skipped=true via get_orders_by_user", "P", async () => {
    if (!state.orderId_dinner || !state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const dinner = r.orders.find((o) => o.order_id === state.orderId_dinner);
    assert(dinner !== undefined, "dinner order should still be returned");
    assertEqual(dinner.is_skipped, true, "is_skipped should be true");
  });

  await test("8.2", "Skip a non-existent order_id", "N", async () => {
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "skip_order",
      order_id: "non-existent-order-uuid",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Order not found", "message");
  });

  await test("8.4", "Skip an already-skipped order (idempotency check)", "P", async () => {
    // No guard in code — second skip should succeed silently (sets true→true)
    if (!state.skippedOrderId) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "skip_order",
      order_id: state.skippedOrderId,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Order skipped", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 10. Mark Delivered (Admin) ─────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("11.1", "Mark delivery for valid order (qty=2)", "P", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.orderId_lunch,
      quantity_delivered: 2,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Delivery marked", "message");
    assertEqual(r.credits_used, 2, "credits_used should match quantity_delivered");
    state.deliveredOrderId = state.orderId_lunch;
  });

  await test("11.1.a", "E2E: verify is_delivered, quantity_delivered, credits_used in DB", "P", async () => {
    if (!state.orderId_lunch || !state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const order = r.orders.find((o) => o.order_id === state.orderId_lunch);
    assert(order !== undefined, "order should exist");
    assertEqual(order.is_delivered,     true, "is_delivered should be true");
    assertEqual(order.quantity_delivered, 2,  "quantity_delivered should be 2");
    assertEqual(order.credits_used,       2,  "credits_used should be 2");
  });

  await test("11.2", "Mark delivery with missing quantity_delivered", "N", async () => {
    const r = await postJSON({
      secret:   ADMIN_SECRET,
      action:   "mark_delivered",
      order_id: state.orderId_lunch || "x",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_delivered is required", "message");
  });

  await test("11.3", "Mark delivery with quantity_delivered = 0", "N", async () => {
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.orderId_lunch || "x",
      quantity_delivered: 0,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_delivered must be a number greater than 0", "message");
  });

  await test("11.4", "Mark delivery with quantity_delivered = -1", "N", async () => {
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.orderId_lunch || "x",
      quantity_delivered: -1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_delivered must be a number greater than 0", "message");
  });

  await test("11.5", "Mark delivery for non-existent order", "N", async () => {
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           "non-existent-order-uuid",
      quantity_delivered: 1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Order not found", "message");
  });

  await test("11.6", "Mark delivery for a skipped order", "N", async () => {
    if (!state.skippedOrderId) return "SKIP";
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.skippedOrderId,
      quantity_delivered: 1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Cannot deliver a skipped order", "message");
  });

  await test("11.7", "Mark delivery with string quantity", "N", async () => {
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.orderId_lunch || "x",
      quantity_delivered: "one",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "quantity_delivered must be a number greater than 0", "message");
  });

  await test("8.3", "Skip an already-delivered order", "N", async () => {
    if (!state.deliveredOrderId) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "skip_order",
      order_id: state.deliveredOrderId,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Cannot skip an already delivered order", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 11. Get All Users (Admin) ──────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("14.1", "Get all users", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_all_users",
    });
    assertEqual(r.success, true, "success");
    assert(Array.isArray(r.users), "users should be array");
    assert(typeof r.total === "number", "total should be a number");
    assert(r.total >= 1, `expected ≥ 1 users, got ${r.total}`);
    // Verify our test user is present
    if (state.userId1) {
      assert(r.users.some((u) => u.user_id === state.userId1), "userId1 should appear in all-users list");
    }
    return `total=${r.total}`;
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 12. Get Orders by Date & Slot (Admin) ──────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("15.1", "Get orders for specific date + lunch slot", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_orders_by_date_slot",
      date:   FUTURE_DATE_1,
      slot:   "lunch",
    });
    assertEqual(r.success, true, "success");
    assert(Array.isArray(r.grouped), "grouped should be array");
    const allOrders = r.grouped.flatMap(g => g.orders);
    // All returned orders should be for the requested date and slot
    assert(allOrders.every((o) => o.slot === "lunch"), "all orders should be lunch");
    // customer_name should be attached to each group
    if (r.grouped.length > 0) {
      assert(r.grouped.every((g) => g.customer_name !== undefined), "customer_name should be attached");
    }
    assert(r.total_users >= 2, `expected ≥ 2 users (userId1 & userId3) in lunch slot, got ${r.total_users}`);
    return `total=${r.total}, total_users=${r.total_users}, users_verified=2`;
  });

  await test("15.1.a", "Get orders for specific date + dinner slot", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_orders_by_date_slot",
      date:   FUTURE_DATE_1,
      slot:   "dinner",
    });
    assertEqual(r.success, true, "success");
    const allOrders = r.grouped.flatMap(g => g.orders);
    assert(allOrders.every((o) => o.slot === "dinner"), "all orders should be dinner");
    return `total=${r.total}, total_users=${r.total_users}`;
  });

  await test("15.2", "Get orders without date", "N", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_orders_by_date_slot",
      slot:   "lunch",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "date and slot are required", "message");
  });

  await test("15.3", "Get orders without slot", "N", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_orders_by_date_slot",
      date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "date and slot are required", "message");
  });

  await test("15.4", "Get orders with invalid slot (morning)", "N", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_orders_by_date_slot",
      date:   FUTURE_DATE_1,
      slot:   "morning",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "slot must be lunch or dinner", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 13. Get Dashboard (Admin) ──────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("16.1", "Get dashboard for valid date", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_dashboard",
      date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    ["yesterday", "today", "tomorrow"].forEach((day) => {
      assert(r[day] !== undefined, `${day} should exist`);
      assertHasKeys(r[day], ["date", "lunch", "dinner"], day);
      ["lunch", "dinner"].forEach((slot) => {
        assertHasKeys(r[day][slot], [
          "total_demand", "total_ordered", "total_delivered",
          "veg_demand", "non_veg_demand",
          "veg_ordered", "non_veg_ordered",
          "veg_delivered", "non_veg_delivered",
          "skipped", "veg_skipped", "non_veg_skipped",
        ], `${day}.${slot}`);
      });
    });
    // Date offsets must be correct relative to the requested date
    assertEqual(r.today.date,     FUTURE_DATE_1, "today.date");
    assertEqual(r.tomorrow.date,  FUTURE_DATE_2, "tomorrow.date");
    return `today.date=${r.today.date}`;
  });

  await test("16.1.a", "Dashboard: counts for FUTURE_DATE_1 lunch reflect test data", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_dashboard",
      date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const lunch = r.today.lunch;
    // userId1's lunch order is non-veg qty=2, delivered qty=2
    // onboarded users have veg qty=1 orders, not delivered
    // total_ordered only counts non-skipped orders (= to prepare)
    assert(lunch.total_ordered > 0, "today.lunch.total_ordered should be > 0");
    assert(lunch.skipped >= 0, "skipped should be a non-negative number");
    // total_demand = total_ordered + skipped (all orders placed)
    assertEqual(lunch.total_demand, lunch.total_ordered + lunch.skipped,
      "total_demand should equal total_ordered + skipped");
    // veg/nv skipped should sum to total skipped
    assertEqual(lunch.veg_skipped + lunch.non_veg_skipped, lunch.skipped,
      "veg_skipped + non_veg_skipped should equal skipped");
    // veg/nv ordered should sum to total_ordered
    assertEqual(lunch.veg_ordered + lunch.non_veg_ordered, lunch.total_ordered,
      "veg_ordered + non_veg_ordered should equal total_ordered");
    // veg_demand / non_veg_demand = ordered + skipped per type (full demand regardless of skip)
    assertEqual(lunch.veg_demand, lunch.veg_ordered + lunch.veg_skipped,
      "veg_demand should equal veg_ordered + veg_skipped");
    assertEqual(lunch.non_veg_demand, lunch.non_veg_ordered + lunch.non_veg_skipped,
      "non_veg_demand should equal non_veg_ordered + non_veg_skipped");
    // veg_demand + non_veg_demand must equal total_demand
    assertEqual(lunch.veg_demand + lunch.non_veg_demand, lunch.total_demand,
      "veg_demand + non_veg_demand should equal total_demand");
    return `demand=${lunch.total_demand}, to_prepare=${lunch.total_ordered}, skipped=${lunch.skipped}`;
  });

  await test("16.1.b", "Dashboard: dinner slot has skipped order with correct type breakdown", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_dashboard",
      date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const dinner = r.today.dinner;
    // userId1's dinner order was skipped (veg, qty=1)
    // Other onboarded users may have dinner orders too
    assert(dinner.total_demand >= 0, "dinner total_demand should be >= 0");
    assertEqual(dinner.total_demand, dinner.total_ordered + dinner.skipped,
      "dinner total_demand = total_ordered + skipped");
    assertEqual(dinner.veg_skipped + dinner.non_veg_skipped, dinner.skipped,
      "dinner veg_skipped + non_veg_skipped = skipped");
    // veg_demand / non_veg_demand = total per type (ordered + skipped)
    assertEqual(dinner.veg_demand, dinner.veg_ordered + dinner.veg_skipped,
      "dinner veg_demand = veg_ordered + veg_skipped");
    assertEqual(dinner.non_veg_demand, dinner.non_veg_ordered + dinner.non_veg_skipped,
      "dinner non_veg_demand = non_veg_ordered + non_veg_skipped");
    assertEqual(dinner.veg_demand + dinner.non_veg_demand, dinner.total_demand,
      "dinner veg_demand + non_veg_demand = total_demand");
    return `demand=${dinner.total_demand}, veg_demand=${dinner.veg_demand}, nv_demand=${dinner.non_veg_demand}, skipped=${dinner.skipped}`;
  });

  await test("16.2", "Get dashboard without date", "N", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_dashboard",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "date is required", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 14. Recharge Credits (Admin) ───────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("12.1", "Recharge credits for userId1 (+30)", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1,
      amount:  30,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Credits recharged", "message");
    assertEqual(r.added, 30, "added");
    assertEqual(r.previous_balance, 0, "previous_balance should be 0");
    assertEqual(r.new_balance, 30, "new_balance should be 30");
    return `prev=${r.previous_balance}, new=${r.new_balance}`;
  });

  await test("12.1.a", "E2E: verify credit_balance = 30 via get_customer", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.customer.credit_balance, 30, "credit_balance should be exactly 30");
  });

  await test("12.1.b", "Recharge credits for userId1 again (+20) — cumulative", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1,
      amount:  20,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.previous_balance, 30, "previous_balance should be 30 from prior recharge");
    assertEqual(r.new_balance, 50, "new_balance should be 50 (cumulative)");
    return `new_balance=${r.new_balance}`;
  });

  await test("12.1.c", "E2E: verify credit_balance = 50 after second recharge", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.customer.credit_balance, 50, "credit_balance should be 50 after two recharges");
  });

  await test("12.2", "Recharge with missing user_id", "N", async () => {
    const r = await postJSON({
      secret: ADMIN_SECRET,
      action: "recharge_credits",
      amount: 10,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "user_id and amount are required", "message");
  });

  await test("12.3", "Recharge with missing amount", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1 || "x",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "user_id and amount are required", "message");
  });

  await test("12.4", "Recharge with amount = 0", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1 || "x",
      amount:  0,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Amount must be a number greater than 0", "message");
  });

  await test("12.5", "Recharge with amount = -10", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1 || "x",
      amount:  -10,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Amount must be a number greater than 0", "message");
  });

  await test("12.6", "Recharge with string amount", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: state.userId1 || "x",
      amount:  "ten",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Amount must be a number greater than 0", "message");
  });

  await test("12.7", "Recharge for non-existent user", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "recharge_credits",
      user_id: "non-existent-uuid",
      amount:  10,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "User not found", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 15. Admin Update Customer ──────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("13.1", "Admin update customer name", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "admin_update_customer",
      user_id: state.userId1,
      name:    `Admin Updated ${RUN_ID}`,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Customer updated", "message");
  });

  await test("13.1.a", "E2E: verify admin name update via get_customer", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.customer.name, `Admin Updated ${RUN_ID}`, "name should reflect admin update");
  });

  await test("13.2", "Admin reset password", "P", async () => {
    if (!state.userId1) return "SKIP";
    state.oldPassword1 = state.password1;
    const r = await postJSON({
      secret:       ADMIN_SECRET,
      action:       "admin_update_customer",
      user_id:      state.userId1,
      new_password: "adminReset123",
    });
    assertEqual(r.success, true, "success");
    state.password1 = "adminReset123";
  });

  await test("13.2.a", "E2E: old password should now fail login", "P", async () => {
    if (!state.mobile1 || !state.oldPassword1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.oldPassword1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Invalid mobile or password", "old password should be rejected");
  });

  await test("13.2.b", "E2E: new password should succeed login", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,   // "adminReset123"
    });
    assertEqual(r.success, true, "success");
    assert(r.customer, "customer should be returned with new password");
  });

  await test("13.3", "Admin update without user_id", "N", async () => {
    const r = await postJSON({
      secret: ADMIN_SECRET,
      action: "admin_update_customer",
      name:   "No ID",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "user_id is required", "message");
  });

  await test("13.4", "Admin update with non-existent user_id", "N", async () => {
    const r = await postJSON({
      secret:  ADMIN_SECRET,
      action:  "admin_update_customer",
      user_id: "non-existent-uuid",
      name:    "Ghost",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "User not found", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 16. Reduce Credits Against Order (Admin) ───────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("20.1", "Add credits to order (day NOT yet completed)", "P", async () => {
    if (!state.deliveredOrderId) return "SKIP";
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       state.deliveredOrderId,
      credits_to_add: 1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.day_completed, false, "day_completed should be false");
    assertEqual(r.previous_credits, 2, "previous credits_used should be 2 (from delivery)");
    assertEqual(r.new_credits, 3, "new credits_used should be 3");
    return `prev=${r.previous_credits}, new=${r.new_credits}`;
  });

  await test("20.1.a", "E2E: verify credits_used=3 on order via get_orders_by_user", "P", async () => {
    if (!state.deliveredOrderId || !state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_1,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    const order = r.orders.find((o) => o.order_id === state.deliveredOrderId);
    assert(order !== undefined, "order should exist");
    assertEqual(order.credits_used, 3, "credits_used should be 3 after reduce_credits");
  });

  await test("20.3", "Missing order_id", "N", async () => {
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      credits_to_add: 1,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "order_id and credits_to_add are required", "message");
  });

  await test("20.4", "Missing credits_to_add", "N", async () => {
    const r = await postJSON({
      secret:   ADMIN_SECRET,
      action:   "reduce_credits_against_order",
      order_id: state.deliveredOrderId || "x",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "order_id and credits_to_add are required", "message");
  });

  await test("20.5", "credits_to_add = 0", "N", async () => {
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       state.deliveredOrderId || "x",
      credits_to_add: 0,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "credits_to_add must be a number greater than 0", "message");
  });

  await test("20.6", "credits_to_add = -5", "N", async () => {
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       state.deliveredOrderId || "x",
      credits_to_add: -5,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "credits_to_add must be a number greater than 0", "message");
  });

  await test("20.7", "Non-existent order_id", "N", async () => {
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       "non-existent-uuid",
      credits_to_add: 1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Order not found", "message");
  });

  await test("20.8", "credits_to_add as string", "N", async () => {
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       state.deliveredOrderId || "x",
      credits_to_add: "two",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "credits_to_add must be a number greater than 0", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 17. Mark Day Complete (Admin) ──────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  // Snapshot balance before reconciliation so we can verify the math afterward.
  // Expected: balance=50, credits_used on orderId_lunch=3, orderId_dinner=skipped(0)
  // → expected deduction = 3, post-reconciliation balance = 47
  await test("17.0", "Snapshot balance before reconciliation", "P", async () => {
    if (!state.mobile1) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    state.preReconciliationBalance = r.customer.credit_balance;
    return `pre_balance=${r.customer.credit_balance}`;
  });

  await test("17.1", "Mark day complete for FUTURE_DATE_1", "P", async () => {
    const r = await postJSON({
      secret: ADMIN_SECRET,
      action: "mark_day_complete",
      date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Day reconciled successfully", "message");
    assertEqual(r.date, FUTURE_DATE_1, "reconciled date should match");
    assert(typeof r.total_credits_deducted === "number", "total_credits_deducted should be a number");
    assert(typeof r.users_affected === "number", "users_affected should be a number");
    state.reconciledDate = FUTURE_DATE_1;
    return `credits_deducted=${r.total_credits_deducted}, users=${r.users_affected}`;
  });

  await test("17.1.a", "E2E: verify userId1 balance reduced by exactly 3 after reconciliation", "P", async () => {
    if (!state.mobile1 || state.preReconciliationBalance === undefined) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    const expectedBalance = state.preReconciliationBalance - 3;
    assertEqual(r.customer.credit_balance, expectedBalance,
      `balance should be preBalance(${state.preReconciliationBalance}) - 3 = ${expectedBalance}`);
    state.postReconciliationBalance = r.customer.credit_balance;
    return `new_balance=${r.customer.credit_balance}`;
  });

  await test("17.2", "Mark day complete without date", "N", async () => {
    const r = await postJSON({
      secret: ADMIN_SECRET,
      action: "mark_day_complete",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "date is required", "message");
  });

  await test("17.3", "Mark same day complete again (idempotency guard)", "N", async () => {
    if (!state.reconciledDate) return "SKIP";
    const r = await postJSON({
      secret: ADMIN_SECRET,
      action: "mark_day_complete",
      date:   state.reconciledDate,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Day already reconciled", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 18. Post-Reconciliation Guards ────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("18.1", "Update order on reconciled day is blocked", "N", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "update_order",
      order_id: state.orderId_lunch,
      type:     "veg",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Cannot update order", "message");
  });

  await test("18.2", "Add order slot on reconciled day is blocked", "N", async () => {
    if (!state.userId1 || !state.reconciledDate) return "SKIP";
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "add_order_slot",
      user_id: state.userId1,
      date:    state.reconciledDate,
      slot:    "lunch",
      address: "A",
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Cannot add order", "message");
  });

  await test("18.3", "Skip order on reconciled day is blocked", "N", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:   USER_SECRET,
      action:   "skip_order",
      order_id: state.orderId_lunch,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Cannot skip order", "message");
  });

  await test("18.4", "Mark delivered on reconciled day is blocked", "N", async () => {
    if (!state.orderId_lunch) return "SKIP";
    const r = await postJSON({
      secret:             ADMIN_SECRET,
      action:             "mark_delivered",
      order_id:           state.orderId_lunch,
      quantity_delivered: 1,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Cannot mark delivered", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 19. Reduce Credits (Post-Reconciliation) ───────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("20.2", "Add credits to order (day IS completed → immediate deduction)", "P", async () => {
    if (!state.deliveredOrderId) return "SKIP";
    const r = await postJSON({
      secret:         ADMIN_SECRET,
      action:         "reduce_credits_against_order",
      order_id:       state.deliveredOrderId,
      credits_to_add: 1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.day_completed, true, "day_completed should be true");
    assertEqual(r.previous_credits, 3, "previous credits_used should be 3");
    assertEqual(r.new_credits, 4, "new credits_used should be 4");
    return `immediate_deduction=true, new_credits=${r.new_credits}`;
  });

  await test("20.2.a", "E2E: verify balance decreased by 1 immediately after reduce_credits", "P", async () => {
    if (!state.mobile1 || state.postReconciliationBalance === undefined) return "SKIP";
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_customer",
      mobile:   state.mobile1,
      password: state.password1,
    });
    assertEqual(r.success, true, "success");
    const expectedBalance = state.postReconciliationBalance - 1;
    assertEqual(r.customer.credit_balance, expectedBalance,
      `balance should drop by 1 to ${expectedBalance} after immediate deduction`);
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 20. Get Negative Credits (Admin) ───────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("19.1", "Get negative credits list", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_negative_credits",
    });
    assertEqual(r.success, true, "success");
    assert(Array.isArray(r.users), "users should be array");
    assert(typeof r.total === "number", "total should be a number");
    // All returned entries should actually have negative balances
    assert(r.users.every((u) => u.credit_balance < 0), "all returned users must have negative balance");
    return `total=${r.total}`;
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 21. Monthly Report ─────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("21.1", "Get monthly report for valid user (user secret)", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_monthly_report",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_RANGE_START,
      end_date:   FUTURE_DATE_RANGE_END,
    });
    assertEqual(r.success, true, "success");
    assert(r.summary, "summary should exist");
    assertHasKeys(r.summary, [
      "user_id", "from", "to",
      "total_ordered", "total_delivered", "total_skipped", "total_credits_deducted",
    ], "summary");
    assert(Array.isArray(r.orders), "orders should be array");
    assertEqual(r.summary.user_id, state.userId1, "summary.user_id should match");
    // userId1 had one lunch order delivered (qty=2), one dinner skipped
    assertEqual(r.summary.total_delivered, 2, "total_delivered should be 2");
    assertEqual(r.summary.total_skipped,   1, "total_skipped should be 1");
    return `total_ordered=${r.summary.total_ordered}, total_delivered=${r.summary.total_delivered}`;
  });

  await test("21.1.a", "Get monthly report via admin secret", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await getJSON({
      secret:     ADMIN_SECRET,
      action:     "get_monthly_report",
      user_id:    state.userId1,
      start_date: FUTURE_DATE_RANGE_START,
      end_date:   FUTURE_DATE_RANGE_END,
    });
    assertEqual(r.success, true, "success");
    assert(r.summary, "admin should also get summary");
    assert(Array.isArray(r.orders), "admin should also get orders");
  });

  await test("21.2", "Monthly report missing start_date", "N", async () => {
    const r = await getJSON({
      secret:   USER_SECRET,
      action:   "get_monthly_report",
      user_id:  state.userId1 || "x",
      end_date: FUTURE_DATE_RANGE_END,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "start_date and end_date are required", "message");
  });

  await test("21.3", "Monthly report missing end_date", "N", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_monthly_report",
      user_id:    state.userId1 || "x",
      start_date: FUTURE_DATE_RANGE_START,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "start_date and end_date are required", "message");
  });

  await test("21.4", "Monthly report missing user_id", "N", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_monthly_report",
      start_date: FUTURE_DATE_RANGE_START,
      end_date:   FUTURE_DATE_RANGE_END,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id is required", "message");
  });

  await test("21.5", "Monthly report with start_date > end_date", "N", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_monthly_report",
      user_id:    state.userId1 || "x",
      start_date: FUTURE_DATE_3,
      end_date:   FUTURE_DATE_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "start_date cannot be after end_date", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 22. Extend Plan ────────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("9.1", "Extend plan by 5 days, plan=lunch", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1,
      plan:       "lunch",
      days:       5,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.orders_created, 5, "orders_created should be 5");
    assertEqual(r.plan, "lunch", "plan");
    return `from=${r.from}, to=${r.to}`;
  });

  await test("9.1.a", "E2E: verify extend_plan created 5 lunch orders in DB", "P", async () => {
    if (!state.userId1) return "SKIP";
    const extendEnd = new Date(EXTEND_START_1);
    extendEnd.setDate(extendEnd.getDate() + 4);
    const endStr = extendEnd.toISOString().split("T")[0];
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_orders_by_user",
      user_id:    state.userId1,
      start_date: EXTEND_START_1,
      end_date:   endStr,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.total, 5, "should have exactly 5 orders");
    assert(r.orders.every((o) => o.slot === "lunch"), "all should be lunch");
  });

  await test("9.2", "Extend plan by 3 days, plan=both", "P", async () => {
    if (!state.userId1) return "SKIP";
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1,
      plan:       "both",
      days:       3,
      start_date: EXTEND_START_2,
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.orders_created, 6, "orders_created should be 6 (3 days × 2 slots)");
  });

  await test("9.3", "Extend with missing user_id", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      plan:       "lunch",
      days:       5,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, plan, days and start_date are required", "message");
  });

  await test("9.4", "Extend with missing start_date", "N", async () => {
    const r = await postJSON({
      secret:  USER_SECRET,
      action:  "extend_plan",
      user_id: state.userId1 || "x",
      plan:    "lunch",
      days:    5,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "user_id, plan, days and start_date are required", "message");
  });

  await test("9.5", "Extend with days = 0", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1 || "x",
      plan:       "lunch",
      days:       0,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "days must be a number greater than 0", "message");
  });

  await test("9.6", "Extend with days = -5", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1 || "x",
      plan:       "lunch",
      days:       -5,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "days must be a number greater than 0", "message");
  });

  await test("9.7", "Extend with days = 31 (over cap)", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1 || "x",
      plan:       "lunch",
      days:       31,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Cannot extend by more than 30 days per call", "message");
  });

  await test("9.8", "Extend with invalid plan (brunch)", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1 || "x",
      plan:       "brunch",
      days:       5,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "Invalid plan", "message");
  });

  await test("9.9", "Extend with days as string (five)", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    state.userId1 || "x",
      plan:       "lunch",
      days:       "five",
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "days must be a number greater than 0", "message");
  });

  await test("9.10", "Extend with non-existent user", "N", async () => {
    const r = await postJSON({
      secret:     USER_SECRET,
      action:     "extend_plan",
      user_id:    "non-existent-uuid",
      plan:       "lunch",
      days:       5,
      start_date: EXTEND_START_1,
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "User not found", "message");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 22. Menu APIs ──────────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  await test("22.1", "Upsert Monday Lunch", "P", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      day:       "monday",
      slot:      "lunch",
      dish_name: "Veg Pulao",
      description: "Initial description",
    });
    assertEqual(r.success, true, "success");
    assertIncludes(r.message, "Menu created", "message");
    assert(r.menu_id, "menu_id should be returned");
  });

  await test("22.2", "Upsert Monday Dinner", "P", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      day:       "monday",
      slot:      "dinner",
      dish_name: "Dal Tadka",
    });
    assertEqual(r.success, true, "success");
    assertIncludes(r.message, "Menu created", "message");
  });

  await test("22.3", "Update existing menu (Monday Lunch)", "P", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      day:       "monday",
      slot:      "lunch",
      dish_name: "Special Veg Pulao",
      description: "Served with raita and pickle",
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.message, "Menu updated", "message");
  });

  await test("22.4", "Upsert menu with missing day", "N", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      slot:      "lunch",
      dish_name: "Missing Day",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "day, slot and dish_name are required", "message");
  });

  await test("22.5", "Upsert menu with invalid day", "N", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      day:       "funday",
      slot:      "lunch",
      dish_name: "Bad Day",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Invalid day", "message");
  });

  await test("22.6", "Upsert menu with invalid slot", "N", async () => {
    const r = await postJSON({
      secret:    ADMIN_SECRET,
      action:    "upsert_menu",
      day:       "monday",
      slot:      "snack",
      dish_name: "Bad Slot",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "slot must be lunch or dinner", "message");
  });

  await test("22.7", "Get full week menu", "P", async () => {
    const r = await getJSON({
      secret: USER_SECRET,
      action: "get_menu",
    });
    assertEqual(r.success, true, "success");
    assert(r.menu.length >= 2, "should have at least 2 items");
  });

  await test("22.8", "Get menu for specific day (Monday)", "P", async () => {
    const r = await getJSON({
      secret: USER_SECRET,
      action: "get_menu",
      day:    "monday",
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.total, 2, "total for Monday");
    assert(r.menu.every(m => m.day === "monday"), "all items should be monday");
  });

  await test("22.9", "Get menu for specific day & slot (Monday Lunch)", "P", async () => {
    const r = await getJSON({
      secret: USER_SECRET,
      action: "get_menu",
      day:    "monday",
      slot:   "lunch",
    });
    assertEqual(r.success, true, "success");
    assertEqual(r.total, 1, "total for Monday Lunch");
    assertEqual(r.menu[0].dish_name, "Special Veg Pulao", "dish name");
  });

  await test("22.10", "Upsert menu with User secret (Unauthorized)", "N", async () => {
    const r = await postJSON({
      secret:    USER_SECRET,
      action:    "upsert_menu",
      day:       "monday",
      slot:      "lunch",
      dish_name: "Hacker Menu",
    });
    assertEqual(r.success, false, "success");
    assertEqual(r.message, "Unknown action", "message");
  });

  await test("22.11", "Get menu with Admin secret", "P", async () => {
    const r = await getJSON({
      secret: ADMIN_SECRET,
      action: "get_menu",
    });
    assertEqual(r.success, true, "success");
    assert(r.menu.length >= 2, "admin should be able to get menu");
  });

  // ═══════════════════════════════════════════════════════════════════
  console.log("\n─── 23. Credit History ─────────────────────────────────────");
  // ═══════════════════════════════════════════════════════════════════

  const TODAY = new Date();
  const START_DATE = new Date(TODAY); START_DATE.setDate(TODAY.getDate() - 1);
  const END_DATE = new Date(TODAY); END_DATE.setDate(TODAY.getDate() + 1);
  
  const START_STR = START_DATE.toISOString().split("T")[0];
  const END_STR = END_DATE.toISOString().split("T")[0];

  await test("23.1", "Get credit history for userId1 (User)", "P", async () => {
    const r = await getJSON({
      secret:     USER_SECRET,
      action:     "get_credit_history",
      user_id:    state.userId1,
      start_date: START_STR,
      end_date:   END_STR,
    });
    assertEqual(r.success, true, "success");
    assert(r.summary.total_credited !== undefined, "has summary");
    assert(Array.isArray(r.history), "history is array");
  });

  await test("23.2", "Verify recharge log exists", "P", async () => {
    const r = await getJSON({
      secret:     ADMIN_SECRET,
      action:     "get_credit_history",
      user_id:    state.userId1,
      start_date: START_STR,
      end_date:   END_STR,
    });
    const recharge = r.history.find(h => h.reason === "recharge");
    assert(recharge, "recharge log should exist");
    assertEqual(recharge.type, "credit", "recharge type");
  });

  await test("23.3", "Get credit history missing params", "N", async () => {
    const r = await getJSON({
      secret: USER_SECRET,
      action: "get_credit_history",
      user_id: state.userId1,
      // missing dates
    });
    assertEqual(r.success, false, "success");
    assertIncludes(r.message, "required", "message should mention required fields");
  });

  // ═══════════════════════════════════════════════════════════════════
  //                       FINAL REPORT
  // ═══════════════════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    📊  FINAL REPORT                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const total = passed + failed + skipped;
  console.log(`  Total    : ${total}`);
  console.log(`  ✅ Passed : ${passed}`);
  console.log(`  ❌ Failed : ${failed}`);
  console.log(`  ⏭  Skipped: ${skipped}`);
  const ran = total - skipped;
  console.log(`  Success  : ${ran > 0 ? ((passed / ran) * 100).toFixed(1) : "N/A"}%`);
  console.log(`  Finished : ${new Date().toISOString()}\n`);

  if (failed > 0) {
    console.log("─── Failed Tests ───────────────────────────────────────\n");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  ❌ ${r.id} [${r.type}] ${r.description}`);
        console.log(`     → ${r.detail}\n`);
      });
  }

  if (skipped > 0) {
    console.log("─── Skipped Tests ──────────────────────────────────────\n");
    results
      .filter((r) => r.status === "SKIP")
      .forEach((r) => {
        console.log(`  ⏭  ${r.id} [${r.type}] ${r.description}`);
      });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

// ─── Entry point ─────────────────────────────────────────────────────
runAllTests().catch((err) => {
  console.error("💥  Unhandled error:", err);
  process.exit(2);
});
