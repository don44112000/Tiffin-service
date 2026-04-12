function getAllUsers(params) {
  const data = getSheetData(SHEETS.customers);
  const headers = data[0];

  const users = [];
  for (let i = 1; i < data.length; i++) {
    const user = {};
    headers.forEach((header, index) => {
      user[header] = data[i][index];
    });
    users.push(user);
  }

  return response({ success: true, total: users.length, users });
}

function rechargeCredits(body) {
  if (!body.user_id || body.amount == null) {
    return response({
      success: false,
      message: "user_id and amount are required",
    });
  }

  if (typeof body.amount !== "number" || body.amount <= 0) {
    return response({
      success: false,
      message: "Amount must be a number greater than 0",
    });
  }

  const sheet = getSheet(SHEETS.customers);
  const data = getSheetData(SHEETS.customers);
  const headers = data[0];

  const userIdIndex = headers.indexOf("user_id");
  const creditIndex = headers.indexOf("credit_balance");

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] === body.user_id) {
      const currentBalance = data[i][creditIndex] || 0;
      const newBalance = currentBalance + body.amount;
      sheet.getRange(i + 1, creditIndex + 1).setValue(newBalance);
      logCreditHistory(body.user_id, "credit", body.amount, "recharge");

      return response({
        success: true,
        message: "Credits recharged",
        user_id: body.user_id,
        added: body.amount,
        previous_balance: currentBalance,
        new_balance: newBalance,
      });
    }
  }

  return response({ success: false, message: "User not found" });
}

function adminUpdateCustomer(body) {
  if (!body.user_id) {
    return response({ success: false, message: "user_id is required" });
  }

  const sheet = getSheet(SHEETS.customers);
  const data = getSheetData(SHEETS.customers);
  const headers = data[0];

  const userIdIndex = headers.indexOf("user_id");
  const passwordIndex = headers.indexOf("password");
  const nameIndex = headers.indexOf("name");

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] === body.user_id) {
      const rowData = [...data[i]];

      // Use !== undefined so callers can explicitly pass "" to clear a field
      if (body.new_password !== undefined) rowData[passwordIndex] = body.new_password;
      if (body.name !== undefined) rowData[nameIndex] = body.name;

      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return response({ success: true, message: "Customer updated" });
    }
  }

  return response({ success: false, message: "User not found" });
}

function getDashboard(params) {
  if (!params.date) {
    return response({ success: false, message: "date is required" });
  }

  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const dateIndex = headers.indexOf("date");
  const slotIndex = headers.indexOf("slot");
  const typeIndex = headers.indexOf("type");
  const qtyOrderedIndex = headers.indexOf("quantity_ordered");
  const qtyDeliveredIndex = headers.indexOf("quantity_delivered");
  const isSkippedIndex = headers.indexOf("is_skipped");

  // params.date is the "today" anchor. Shift by ±1 using local date arithmetic
  // (no UTC conversion) so IST users always get the correct calendar dates.
  const todayStr    = params.date;
  const yesterdayStr = shiftDate(params.date, -1);
  const tomorrowStr  = shiftDate(params.date, 1);

  function buildSummary(targetDateStr) {
    const summary = {
      date: targetDateStr,
      lunch: {
        total_ordered: 0,
        total_delivered: 0,
        veg_ordered: 0,
        non_veg_ordered: 0,
        veg_delivered: 0,
        non_veg_delivered: 0,
        skipped: 0,
      },
      dinner: {
        total_ordered: 0,
        total_delivered: 0,
        veg_ordered: 0,
        non_veg_ordered: 0,
        veg_delivered: 0,
        non_veg_delivered: 0,
        skipped: 0,
      },
    };

    for (let i = 1; i < data.length; i++) {
      // toISTDateStr converts sheet Date objects to IST YYYY-MM-DD strings,
      // fixing the UTC-midnight off-by-one day that previously occurred.
      const orderDateStr = toISTDateStr(data[i][dateIndex]);
      if (orderDateStr !== targetDateStr) continue;

      const slot = data[i][slotIndex];
      const type = data[i][typeIndex];
      const qtyOrdered = data[i][qtyOrderedIndex] || 0;
      const qtyDelivered = data[i][qtyDeliveredIndex] || 0;
      const isSkipped = data[i][isSkippedIndex] === true;

      if (!summary[slot]) continue;

      if (isSkipped) {
        summary[slot].skipped += qtyOrdered;
        continue;
      }

      summary[slot].total_ordered += qtyOrdered;
      summary[slot].total_delivered += qtyDelivered;

      if (type === "veg") {
        summary[slot].veg_ordered += qtyOrdered;
        summary[slot].veg_delivered += qtyDelivered;
      } else if (type === "non-veg") {
        summary[slot].non_veg_ordered += qtyOrdered;
        summary[slot].non_veg_delivered += qtyDelivered;
      }
    }

    return summary;
  }

  return response({
    success: true,
    yesterday: buildSummary(yesterdayStr),
    today:     buildSummary(todayStr),
    tomorrow:  buildSummary(tomorrowStr),
  });
}

function markDayComplete(body) {
  if (!body.date) {
    return response({ success: false, message: "date is required" });
  }

  // Check if day already completed
  const completedData = getSheetData(SHEETS.completed_days);
  const completedHeaders = completedData[0];
  const completedDateIndex = completedHeaders.indexOf("date");

  for (let i = 1; i < completedData.length; i++) {
    const completedDate = toISTDateStr(completedData[i][completedDateIndex]);
    if (completedDate === body.date) {
      return response({ success: false, message: "Day already reconciled" });
    }
  }

  // Get all orders for that day
  const ordersData = getSheetData(SHEETS.orders);
  const orderHeaders = ordersData[0];
  const dateIndex = orderHeaders.indexOf("date");
  const userIdIndex = orderHeaders.indexOf("user_id");
  const creditsIndex = orderHeaders.indexOf("credits_used");
  const isSkippedIndex = orderHeaders.indexOf("is_skipped");

  // Build user_id -> total credits map for that day
  const creditMap = {};
  for (let i = 1; i < ordersData.length; i++) {
    const orderDate = toISTDateStr(ordersData[i][dateIndex]);
    if (orderDate !== body.date) continue;
    if (ordersData[i][isSkippedIndex] === true) continue;

    const userId = ordersData[i][userIdIndex];
    const credits = ordersData[i][creditsIndex] || 0;
    creditMap[userId] = (creditMap[userId] || 0) + credits;
  }

  // Deduct credits from each user
  const customerSheet = getSheet(SHEETS.customers);
  const customerData = getSheetData(SHEETS.customers);
  const customerHeaders = customerData[0];
  const customerUserIdIndex = customerHeaders.indexOf("user_id");
  const creditBalanceIndex = customerHeaders.indexOf("credit_balance");

  let totalCreditsDeducted = 0;

  for (let i = 1; i < customerData.length; i++) {
    const userId = customerData[i][customerUserIdIndex];
    if (!creditMap[userId]) continue;

    const currentBalance = customerData[i][creditBalanceIndex] || 0;
    const deduction = creditMap[userId];
    const newBalance = currentBalance - deduction;

    customerSheet.getRange(i + 1, creditBalanceIndex + 1).setValue(newBalance);
    logCreditHistory(userId, "debit", deduction, "day_completion");
    totalCreditsDeducted += deduction;
  }

  // Record completion
  const completedSheet = getSheet(SHEETS.completed_days);
  const completionId = Utilities.getUuid();
  const now = new Date().toISOString();

  completedSheet.appendRow([
    completionId,
    body.date,
    totalCreditsDeducted,
    now,
    "ADMIN",
  ]);

  return response({
    success: true,
    message: "Day reconciled successfully",
    date: body.date,
    total_credits_deducted: totalCreditsDeducted,
    users_affected: Object.keys(creditMap).length,
  });
}

// ─────────────────────────────────────────────

function getNegativeCredits(params) {
  const customerData = getSheetData(SHEETS.customers);
  const customerHeaders = customerData[0];

  const userIdIndex = customerHeaders.indexOf("user_id");
  const nameIndex = customerHeaders.indexOf("name");
  const mobileIndex = customerHeaders.indexOf("mobile");
  const creditBalanceIndex = customerHeaders.indexOf("credit_balance");

  const users = [];
  for (let i = 1; i < customerData.length; i++) {
    const balance = customerData[i][creditBalanceIndex];
    if (balance < 0) {
      users.push({
        user_id: customerData[i][userIdIndex],
        name: customerData[i][nameIndex],
        mobile: customerData[i][mobileIndex],
        credit_balance: balance,
      });
    }
  }

  return response({ success: true, total: users.length, users });
}

// ─────────────────────────────────────────────

function reduceCreditsAgainstOrder(body) {
  if (!body.order_id || body.credits_to_add == null) {
    return response({
      success: false,
      message: "order_id and credits_to_add are required",
    });
  }

  if (typeof body.credits_to_add !== "number" || body.credits_to_add <= 0) {
    return response({
      success: false,
      message: "credits_to_add must be a number greater than 0",
    });
  }

  // Find the order
  const orderSheet = getSheet(SHEETS.orders);
  const ordersData = getSheetData(SHEETS.orders);
  const orderHeaders = ordersData[0];

  const orderIdIndex = orderHeaders.indexOf("order_id");
  const creditsIndex = orderHeaders.indexOf("credits_used");
  const userIdIndex = orderHeaders.indexOf("user_id");
  const dateIndex = orderHeaders.indexOf("date");

  let orderRow = null;
  let orderUserId = null;
  let orderDate = null;
  let currentCredits = 0;

  for (let i = 1; i < ordersData.length; i++) {
    if (ordersData[i][orderIdIndex] === body.order_id) {
      orderRow = i + 1;
      orderUserId = ordersData[i][userIdIndex];
      currentCredits = ordersData[i][creditsIndex] || 0;

      orderDate = toISTDateStr(ordersData[i][dateIndex]);
      break;
    }
  }

  if (!orderRow) {
    return response({ success: false, message: "Order not found" });
  }

  // Update credits_used on order
  const newCredits = currentCredits + body.credits_to_add;
  const orderRowData = [...ordersData[orderRow - 1]];
  orderRowData[creditsIndex] = newCredits;
  orderSheet.getRange(orderRow, 1, 1, orderRowData.length).setValues([orderRowData]);

  // Check if day is already completed — use a distinct name to avoid
  // shadowing the global isDayCompleted() helper from config.gs
  const dayAlreadyClosed = isDayCompleted(orderDate);

  // If day already completed, deduct immediately from user balance
  if (dayAlreadyClosed) {
    const customerSheet = getSheet(SHEETS.customers);
    const customerData = getSheetData(SHEETS.customers);
    const customerHeaders = customerData[0];
    const customerUserIdIndex = customerHeaders.indexOf("user_id");
    const creditBalanceIndex = customerHeaders.indexOf("credit_balance");

    for (let i = 1; i < customerData.length; i++) {
      if (customerData[i][customerUserIdIndex] === orderUserId) {
        const currentBalance = customerData[i][creditBalanceIndex] || 0;
        const custRowData = [...customerData[i]];
        custRowData[creditBalanceIndex] = currentBalance - body.credits_to_add;
        customerSheet.getRange(i + 1, 1, 1, custRowData.length).setValues([custRowData]);
        logCreditHistory(orderUserId, "debit", body.credits_to_add, "manual_adjustment");
        break;
      }
    }
  }

  return response({
    success: true,
    message: dayAlreadyClosed
      ? "Credits added to order and deducted from user balance immediately"
      : "Credits added to order, will be deducted at day completion",
    order_id: body.order_id,
    previous_credits: currentCredits,
    new_credits: newCredits,
    day_completed: dayAlreadyClosed,
  });
}

// ─────────────────────────────────────────────

function getMonthlyReport(params) {
  if (!params.start_date || !params.end_date) {
    return response({
      success: false,
      message: "start_date and end_date are required",
    });
  }

  if (new Date(params.start_date) > new Date(params.end_date)) {
    return response({ success: false, message: "start_date cannot be after end_date" });
  }

  if (!params.user_id) {
    return response({ success: false, message: "user_id is required" });
  }

  const data = getSheetData(SHEETS.orders);
  const headers = data[0];

  const userIdIndex = headers.indexOf("user_id");
  const dateIndex = headers.indexOf("date");
  const slotIndex = headers.indexOf("slot");
  const qtyOrderedIndex = headers.indexOf("quantity_ordered");
  const qtyDeliveredIndex = headers.indexOf("quantity_delivered");
  const creditsIndex = headers.indexOf("credits_used");
  const isDeliveredIndex = headers.indexOf("is_delivered");
  const isSkippedIndex = headers.indexOf("is_skipped");
  const orderIdIndex = headers.indexOf("order_id");

  // Use string comparison (YYYY-MM-DD is lexicographically sortable) to avoid
  // the UTC-vs-IST off-by-one bug. Comparison is inclusive on both ends.
  const startDateStr = params.start_date;
  const endDateStr = params.end_date;

  // Summary counters
  let totalOrdered = 0;
  let totalDelivered = 0;
  let totalSkipped = 0;
  let totalCreditsDeducted = 0;

  const orders = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] !== params.user_id) continue;

    const orderDateStr = toISTDateStr(data[i][dateIndex]);
    if (orderDateStr < startDateStr || orderDateStr > endDateStr) continue;

    const qtyOrdered = data[i][qtyOrderedIndex] || 0;
    const qtyDelivered = data[i][qtyDeliveredIndex] || 0;
    const credits = data[i][creditsIndex] || 0;
    const isSkipped = data[i][isSkippedIndex] === true;
    const isDelivered = data[i][isDeliveredIndex] === true;

    // Summary
    if (isSkipped) {
      totalSkipped += qtyOrdered;
    } else {
      totalOrdered += qtyOrdered;
      totalDelivered += qtyDelivered;
      totalCreditsDeducted += credits;
    }

    orders.push({
      order_id: data[i][orderIdIndex],
      date: orderDateStr,
      slot: data[i][slotIndex],
      quantity_ordered: qtyOrdered,
      quantity_delivered: qtyDelivered,
      credits_deducted: credits,
      is_delivered: isDelivered,
      is_skipped: isSkipped,
    });
  }

  return response({
    success: true,
    summary: {
      user_id: params.user_id,
      from: params.start_date,
      to: params.end_date,
      total_ordered: totalOrdered,
      total_delivered: totalDelivered,
      total_skipped: totalSkipped,
      total_credits_deducted: totalCreditsDeducted,
    },
    orders,
  });
}

function logCreditHistory(userId, type, amount, reason) {
  const sheet = getSheet(SHEETS.credit_history);
  
  // Initialize headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["history_id", "user_id", "date", "type", "amount", "reason", "created_at"]);
  }

  const historyId = Utilities.getUuid();
  const date = toISTDateStr(new Date());
  const createdAt = new Date().toISOString();

  sheet.appendRow([
    historyId,
    userId,
    date,
    type,
    amount,
    reason,
    createdAt
  ]);
}

function getCreditHistory(params) {
  if (!params.user_id || !params.start_date || !params.end_date) {
    return response({
      success: false,
      message: "user_id, start_date and end_date are required",
    });
  }

  const sheet = getSheet(SHEETS.credit_history);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const historyIdIndex = headers.indexOf("history_id");
  const userIdIndex = headers.indexOf("user_id");
  const dateIndex = headers.indexOf("date");
  const typeIndex = headers.indexOf("type");
  const amountIndex = headers.indexOf("amount");
  const reasonIndex = headers.indexOf("reason");
  const createdAtIndex = headers.indexOf("created_at");

  // Validate headers exist
  if (userIdIndex === -1 || dateIndex === -1 || reasonIndex === -1) {
    return response({ success: false, message: "Credit history sheet headers missing or invalid" });
  }

  let totalCredited = 0;
  let totalDebited = 0;
  const history = [];

  const startDateStr = params.start_date;
  const endDateStr = params.end_date;

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] !== params.user_id) continue;

    const rowDateStr = toISTDateStr(data[i][dateIndex]);
    
    if (rowDateStr >= startDateStr && rowDateStr <= endDateStr) {
      const amount = Number(data[i][amountIndex]);
      const type = data[i][typeIndex];

      if (type === "credit") totalCredited += amount;
      if (type === "debit") totalDebited += amount;

      history.push({
        history_id: data[i][historyIdIndex],
        date: rowDateStr,
        type: type,
        amount: amount,
        reason: data[i][reasonIndex],
        created_at: data[i][createdAtIndex]
      });
    }
  }

  return response({
    success: true,
    summary: {
      total_credited: totalCredited,
      total_debited: totalDebited,
      net: totalCredited - totalDebited
    },
    total: history.length,
    history: history
  });
}
