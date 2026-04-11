function onboardCustomer(body) {
  // Validate date range before creating the customer
  if (!body.start_date || !body.end_date) {
    return response({ success: false, message: "start_date and end_date are required" });
  }
  const start = new Date(body.start_date);
  const end   = new Date(body.end_date);
  if (start > end) {
    return response({ success: false, message: "start_date cannot be after end_date" });
  }

  // Step 1 - Validate plan & determine slots
  const slots = [];
  if (body.plan === "lunch" || body.plan === "both") slots.push("lunch");
  if (body.plan === "dinner" || body.plan === "both") slots.push("dinner");

  if (slots.length === 0) {
    return response({
      success: false,
      message: "Invalid plan. Use lunch, dinner or both",
    });
  }

  // Step 2 - Create customer (Only executed if all validations pass)
  const customerResponse = JSON.parse(createCustomer(body).getContent());
  if (!customerResponse.success) {
    return response({ success: false, message: customerResponse.message });
  }

  const userId = customerResponse.user_id;
  const address = body.address_1;
  const sheet = getSheet(SHEETS.orders);
  const now = new Date().toISOString();

  // Step 5 - Loop through each day and each slot
  const rows = [];
  const current = new Date(start);

  while (current <= end) {
    const dateStr = toISTDateStr(current);

    slots.forEach((slot) => {
      const orderId = Utilities.getUuid();
      rows.push([
        orderId,
        userId,
        dateStr,
        slot,
        "veg",
        address,
        1,     // quantity_ordered
        0,     // quantity_delivered
        0,     // credits_used
        false, // is_delivered
        "",    // delivered_at
        now,   // created_at
        false, // is_skipped
      ]);
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
  const dateIndex = headers.indexOf("date");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      const orderDate = toISTDateStr(data[i][dateIndex]);
      if (isDayCompleted(orderDate)) {
        return response({
          success: false,
          message: "Cannot update order: day has already been reconciled",
        });
      }

      if (body.quantity_ordered !== undefined && (typeof body.quantity_ordered !== "number" || body.quantity_ordered <= 0)) {
        return response({ success: false, message: "quantity_ordered must be a number greater than 0" });
      }

      if (body.type !== undefined && !["veg", "non-veg"].includes(body.type)) {
        return response({ success: false, message: "type must be veg or non-veg" });
      }

      const rowData = [...data[i]];

      // Use !== undefined so callers can explicitly pass "" to clear a field
      if (body.type !== undefined) rowData[typeIndex] = body.type;
      if (body.address !== undefined) rowData[addressIndex] = body.address;
      if (body.quantity_ordered !== undefined) rowData[qtyIndex] = body.quantity_ordered;

      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return response({ success: true, message: "Order updated" });
    }
  }

  return response({ success: false, message: "Order not found" });
}

function addOrderSlot(body) {
  // Required field validation
  if (!body.user_id || !body.date || !body.slot || !body.address) {
    return response({
      success: false,
      message: "user_id, date, slot and address are required",
    });
  }
  if (!["lunch", "dinner"].includes(body.slot)) {
    return response({ success: false, message: "slot must be lunch or dinner" });
  }
  if (body.quantity_ordered !== undefined && (typeof body.quantity_ordered !== "number" || body.quantity_ordered <= 0)) {
    return response({ success: false, message: "quantity_ordered must be a number greater than 0" });
  }
  if (body.type !== undefined && !["veg", "non-veg"].includes(body.type)) {
    return response({ success: false, message: "type must be veg or non-veg" });
  }

  if (isDayCompleted(body.date)) {
    return response({
      success: false,
      message: "Cannot add order: day has already been reconciled",
    });
  }

  const sheet = getSheet(SHEETS.orders);
  // No sheet read needed — UUID handles IDs without querying existing rows
  const orderId = Utilities.getUuid();
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
  // Validate quantity before hitting the sheet
  if (body.quantity_delivered === undefined || body.quantity_delivered === null) {
    return response({ success: false, message: "quantity_delivered is required" });
  }
  if (typeof body.quantity_delivered !== "number" || body.quantity_delivered <= 0) {
    return response({ success: false, message: "quantity_delivered must be a number greater than 0" });
  }
  const sheet = getSheet(SHEETS.orders);
  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const orderIdIndex = headers.indexOf("order_id");
  const dateIndex = headers.indexOf("date");
  const qtyDeliveredIndex = headers.indexOf("quantity_delivered");
  const creditsIndex = headers.indexOf("credits_used");
  const isDeliveredIndex = headers.indexOf("is_delivered");
  const deliveredAtIndex = headers.indexOf("delivered_at");
  const isSkippedIndex = headers.indexOf("is_skipped");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      const orderDate = toISTDateStr(data[i][dateIndex]);
      if (isDayCompleted(orderDate)) {
        return response({
          success: false,
          message: "Cannot mark delivered: day has already been reconciled",
        });
      }

      // Cannot mark a skipped order as delivered
      if (data[i][isSkippedIndex] === true) {
        return response({
          success: false,
          message: "Cannot deliver a skipped order",
        });
      }

      const now = new Date().toISOString();
      const qty = body.quantity_delivered;

      const rowData = [...data[i]];
      rowData[qtyDeliveredIndex] = qty;
      rowData[creditsIndex] = qty; // credits_used = quantity_delivered always
      rowData[isDeliveredIndex] = true;
      rowData[deliveredAtIndex] = now;

      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
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

  if (new Date(params.start_date) > new Date(params.end_date)) {
    return response({ success: false, message: "start_date cannot be after end_date" });
  }

  const data = getSheetData(SHEETS.orders);
  const headers = data[0];
  const userIdIndex = headers.indexOf("user_id");
  const dateIndex = headers.indexOf("date");

  // Use plain string comparison (YYYY-MM-DD sorts lexicographically) so we
  // avoid UTC-vs-IST timezone shifts that Date objects introduce.
  const startDateStr = params.start_date;
  const endDateStr = params.end_date;

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] !== params.user_id) continue;

    const orderDateStr = toISTDateStr(data[i][dateIndex]);
    if (orderDateStr < startDateStr || orderDateStr > endDateStr) continue;

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
    const orderDate = toISTDateStr(data[i][dateIndex]);
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
  const dateIndex = headers.indexOf("date");
  const isSkippedIndex = headers.indexOf("is_skipped");
  const isDeliveredIndex = headers.indexOf("is_delivered");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIndex] === body.order_id) {
      const orderDate = toISTDateStr(data[i][dateIndex]);
      if (isDayCompleted(orderDate)) {
        return response({
          success: false,
          message: "Cannot skip order: day has already been reconciled",
        });
      }

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
  if (!body.user_id || !body.plan || body.days == null || !body.start_date) {
    return response({
      success: false,
      message: "user_id, plan, days and start_date are required",
    });
  }

  if (typeof body.days !== "number" || body.days <= 0) {
    return response({ success: false, message: "days must be a number greater than 0" });
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

  // Generate rows — UUID handles IDs, no sheet read needed
  const sheet = getSheet(SHEETS.orders);
  const now = new Date().toISOString();
  const rows = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = toISTDateStr(current);
    slots.forEach((slot) => {
      const orderId = Utilities.getUuid();
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
    from: toISTDateStr(startDate),
    to: toISTDateStr(endDate),
    orders_created: rows.length,
  });
}
