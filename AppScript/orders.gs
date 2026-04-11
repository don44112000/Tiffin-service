function onboardCustomer(body) {
  // Step 1 - Create customer first
  const customerResponse = JSON.parse(createCustomer(body).getContent());
  if (!customerResponse.success) {
    return response({ success: false, message: customerResponse.message });
  }

  const userId = customerResponse.user_id;
  const address = body.address_1;
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);

  // Step 2 - Generate order_id starting point
  let orderCount = data.length; // includes header row

  // Step 3 - Build date range
  const start = new Date(body.start_date);
  const end = new Date(body.end_date);
  const now = new Date().toISOString();

  // Step 4 - Determine slots based on plan
  const slots = [];
  if (body.plan === "lunch" || body.plan === "both") slots.push("lunch");
  if (body.plan === "dinner" || body.plan === "both") slots.push("dinner");

  if (slots.length === 0) {
    return response({
      success: false,
      message: "Invalid plan. Use lunch, dinner or both",
    });
  }

  // Step 5 - Loop through each day and each slot
  const rows = [];
  const current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];

    slots.forEach((slot) => {
      const orderId = "ORD" + String(orderCount).padStart(4, "0");
      rows.push([
        orderId,
        userId,
        dateStr,
        slot,
        "veg",
        address,
        1, // quantity_ordered
        0, // quantity_delivered
        0, // credits_used
        false, // is_delivered
        "", // delivered_at
        now, // created_at
        false, // is_skipped
      ]);
      orderCount++;
    });

    current.setDate(current.getDate() + 1);
  }

  // Step 6 - Batch write all rows at once
  if (rows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
      .setValues(rows);
  }

  return response({
    success: true,
    message: "Customer onboarded successfully",
    user_id: userId,
    orders_created: rows.length,
    plan: body.plan,
    from: body.start_date,
    to: body.end_date,
  });
}

function updateOrder(body) {
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const orderIdIndex = headers.indexOf("order_id");
  const typeIndex = headers.indexOf("type");
  const addressIndex = headers.indexOf("address");
  const qtyIndex = headers.indexOf("quantity_ordered");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      const rowNumber = i + 1;

      if (body.type)
        sheet.getRange(rowNumber, typeIndex + 1).setValue(body.type);
      if (body.address)
        sheet.getRange(rowNumber, addressIndex + 1).setValue(body.address);
      if (body.quantity_ordered)
        sheet.getRange(rowNumber, qtyIndex + 1).setValue(body.quantity_ordered);

      return response({ success: true, message: "Order updated" });
    }
  }

  return response({ success: false, message: "Order not found" });
}

function addOrderSlot(body) {
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);

  let orderCount = data.length;
  const orderId = "ORD" + String(orderCount).padStart(4, "0");
  const now = new Date().toISOString();

  sheet.appendRow([
    orderId,
    body.user_id,
    body.date,
    body.slot,
    body.type || "veg",
    body.address,
    body.quantity_ordered || 1,
    0,
    0,
    false,
    "",
    now,
    false, // is_skipped
  ]);

  return response({
    success: true,
    message: "Order slot added",
    order_id: orderId,
  });
}

function markDelivered(body) {
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const orderIdIndex = headers.indexOf("order_id");
  const qtyDeliveredIndex = headers.indexOf("quantity_delivered");
  const creditsIndex = headers.indexOf("credits_used");
  const isDeliveredIndex = headers.indexOf("is_delivered");
  const deliveredAtIndex = headers.indexOf("delivered_at");
  const isSkippedIndex = headers.indexOf("is_skipped");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      // Cannot mark a skipped order as delivered
      if (data[i][isSkippedIndex] === true) {
        return response({
          success: false,
          message: "Cannot deliver a skipped order",
        });
      }

      const rowNumber = i + 1;
      const now = new Date().toISOString();
      const qty = body.quantity_delivered;

      sheet.getRange(rowNumber, qtyDeliveredIndex + 1).setValue(qty);
      sheet.getRange(rowNumber, creditsIndex + 1).setValue(qty); // credits_used = quantity_delivered always
      sheet.getRange(rowNumber, isDeliveredIndex + 1).setValue(true);
      sheet.getRange(rowNumber, deliveredAtIndex + 1).setValue(now);

      return response({
        success: true,
        message: "Delivery marked",
        credits_used: qty,
      });
    }
  }

  return response({ success: false, message: "Order not found" });
}

function getOrdersByUser(params) {
  if (!params.user_id || !params.start_date || !params.end_date) {
    return response({
      success: false,
      message: "user_id, start_date and end_date are required",
    });
  }

  const data = getSheetData(SHEETS.orders);
  const headers = data[0];
  const userIdIndex = headers.indexOf("user_id");
  const dateIndex = headers.indexOf("date");

  const startDate = new Date(params.start_date);
  const endDate = new Date(params.end_date);

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] !== params.user_id) continue;

    const rawDate = data[i][dateIndex];
    const orderDate =
      rawDate instanceof Date
        ? new Date(rawDate.toISOString().split("T")[0])
        : new Date(String(rawDate).split("T")[0]);

    if (orderDate < startDate || orderDate > endDate) continue;

    const order = {};
    headers.forEach((header, index) => {
      order[header] = data[i][index];
    });
    orders.push(order);
  }

  return response({ success: true, total: orders.length, orders });
}

function getOrdersByDateSlot(params) {
  if (!params.date || !params.slot) {
    return response({ success: false, message: "date and slot are required" });
  }

  if (!["lunch", "dinner"].includes(params.slot)) {
    return response({
      success: false,
      message: "slot must be lunch or dinner",
    });
  }

  const data = getSheetData(SHEETS.orders);
  const headers = data[0];
  const dateIndex = headers.indexOf("date");
  const slotIndex = headers.indexOf("slot");
  const userIdIndex = headers.indexOf("user_id");

  // Build a user_id -> name map from customers tab
  const customerData = getSheetData(SHEETS.customers);
  const customerHeaders = customerData[0];
  const customerUserIdIndex = customerHeaders.indexOf("user_id");
  const customerNameIndex = customerHeaders.indexOf("name");

  const nameMap = {};
  for (let i = 1; i < customerData.length; i++) {
    nameMap[customerData[i][customerUserIdIndex]] =
      customerData[i][customerNameIndex];
  }

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    const rawDate = data[i][dateIndex];
    const orderDate =
      rawDate instanceof Date
        ? rawDate.toISOString().split("T")[0]
        : String(rawDate).split("T")[0];

    const dateMatch = orderDate === params.date;
    const slotMatch = data[i][slotIndex] === params.slot;

    if (dateMatch && slotMatch) {
      const order = {};
      headers.forEach((header, index) => {
        order[header] = data[i][index];
      });
      // Attach customer name
      order.customer_name = nameMap[data[i][userIdIndex]] || "Unknown";
      orders.push(order);
    }
  }

  return response({ success: true, total: orders.length, orders });
}

function skipOrder(body) {
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const orderIdIndex = headers.indexOf("order_id");
  const isSkippedIndex = headers.indexOf("is_skipped");
  const isDeliveredIndex = headers.indexOf("is_delivered");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      // Cannot skip an already delivered order
      if (data[i][isDeliveredIndex] === true) {
        return response({
          success: false,
          message: "Cannot skip an already delivered order",
        });
      }

      sheet.getRange(i + 1, isSkippedIndex + 1).setValue(true);
      return response({ success: true, message: "Order skipped" });
    }
  }

  return response({ success: false, message: "Order not found" });
}

function extendPlan(body) {
  if (!body.user_id || !body.plan || !body.days || !body.start_date) {
    return response({
      success: false,
      message: "user_id, plan, days and start_date are required",
    });
  }

  if (body.days > 30) {
    return response({
      success: false,
      message: "Cannot extend by more than 30 days per call",
    });
  }

  if (!["lunch", "dinner", "both"].includes(body.plan)) {
    return response({
      success: false,
      message: "Invalid plan. Use lunch, dinner or both",
    });
  }

  // Get customer address
  const customerData = getSheetData(SHEETS.customers);
  const customerHeaders = customerData[0];
  const customerUserIdIndex = customerHeaders.indexOf("user_id");
  const addressIndex = customerHeaders.indexOf("address_1");

  let address = "";
  for (let i = 1; i < customerData.length; i++) {
    if (customerData[i][customerUserIdIndex] === body.user_id) {
      address = customerData[i][addressIndex];
      break;
    }
  }

  if (!address) {
    return response({ success: false, message: "User not found" });
  }

  // Determine slots
  const slots = [];
  if (body.plan === "lunch" || body.plan === "both") slots.push("lunch");
  if (body.plan === "dinner" || body.plan === "both") slots.push("dinner");

  // Build date range
  const startDate = new Date(body.start_date);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + body.days - 1);

  // Generate rows
  const sheet = getSheet(SHEETS.orders);
  const allData = getSheetData(SHEETS.orders);
  let orderCount = allData.length;
  const now = new Date().toISOString();
  const rows = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    slots.forEach((slot) => {
      const orderId = "ORD" + String(orderCount).padStart(4, "0");
      rows.push([
        orderId,
        body.user_id,
        dateStr,
        slot,
        "veg",
        address,
        1,
        0,
        0,
        false,
        "",
        now,
        false,
      ]);
      orderCount++;
    });
    current.setDate(current.getDate() + 1);
  }

  if (rows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
      .setValues(rows);
  }

  return response({
    success: true,
    message: "Plan extended successfully",
    user_id: body.user_id,
    plan: body.plan,
    from: startDate.toISOString().split("T")[0],
    to: endDate.toISOString().split("T")[0],
    orders_created: rows.length,
  });
}
