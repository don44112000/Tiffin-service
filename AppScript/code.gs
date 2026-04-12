function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // ── Admin routes ──
    if (body.secret === ADMIN_SECRET) {
      if (action === "mark_delivered") return markDelivered(body);
      if (action === "recharge_credits") return rechargeCredits(body);
      if (action === "admin_update_customer") return adminUpdateCustomer(body);
      if (action === "mark_day_complete") return markDayComplete(body);
      if (action === "reduce_credits_against_order")
        return reduceCreditsAgainstOrder(body);
      if (action === "upsert_menu") return upsertMenu(body);
      return response({ success: false, message: "Unknown admin action" });
    }

    // ── User routes ──
    if (body.secret !== SECRET_CODE) {
      return response({ success: false, message: "Unauthorized" });
    }

    if (action === "create_customer") return createCustomer(body);
    if (action === "update_customer") return updateCustomer(body);
    if (action === "onboard_customer") return onboardCustomer(body);
    if (action === "update_order") return updateOrder(body);
    if (action === "add_order_slot") return addOrderSlot(body);
    if (action === "skip_order") return skipOrder(body);
    if (action === "extend_plan") return extendPlan(body);

    return response({ success: false, message: "Unknown action" });
  } catch (err) {
    return response({ success: false, message: err.message });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    // ── Admin routes ──
    if (e.parameter.secret === ADMIN_SECRET) {
      if (action === "get_all_users") return getAllUsers(e.parameter);
      if (action === "get_orders_by_date_slot")
        return getOrdersByDateSlot(e.parameter);
      if (action === "get_dashboard") return getDashboard(e.parameter);
      if (action === "get_negative_credits")
        return getNegativeCredits(e.parameter);
      if (action === "get_monthly_report") return getMonthlyReport(e.parameter);
      if (action === "get_menu") return getMenu(e.parameter);
      if (action === "get_credit_history") return getCreditHistory(e.parameter);
      return response({ success: false, message: "Unknown admin action" });
    }

    // ── User routes ──
    if (e.parameter.secret !== SECRET_CODE) {
      return response({ success: false, message: "Unauthorized" });
    }

    if (action === "get_customer") return getCustomer(e.parameter);
    if (action === "get_orders_by_user") return getOrdersByUser(e.parameter);
    if (action === "get_monthly_report") return getMonthlyReport(e.parameter);
    if (action === "get_menu") return getMenu(e.parameter);
    if (action === "get_credit_history") return getCreditHistory(e.parameter);
    return response({ success: false, message: "Unknown action" });
  } catch (err) {
    return response({ success: false, message: err.message });
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
