function upsertMenu(body) {
  if (!body.day || !body.slot || !body.dish_name) {
    return response({ success: false, message: "day, slot and dish_name are required" });
  }

  if (!["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].includes(body.day)) {
    return response({ success: false, message: "Invalid day" });
  }

  if (!["lunch","dinner"].includes(body.slot)) {
    return response({ success: false, message: "slot must be lunch or dinner" });
  }

  const sheet = getSheet(SHEETS.menu);
  const data = getSheetData(SHEETS.menu);
  const headers = data[0];

  const menuIdIndex = headers.indexOf("menu_id");
  const dayIndex = headers.indexOf("day");
  const slotIndex = headers.indexOf("slot");
  const dishNameIndex = headers.indexOf("dish_name");
  const descriptionIndex = headers.indexOf("description");

  // Try to find existing row
  for (let i = 1; i < data.length; i++) {
    if (data[i][dayIndex] === body.day && data[i][slotIndex] === body.slot) {
      const rowNumber = i + 1;
      sheet.getRange(rowNumber, dishNameIndex + 1).setValue(body.dish_name);
      sheet.getRange(rowNumber, descriptionIndex + 1).setValue(body.description || "");
      return response({ success: true, message: "Menu updated", menu_id: data[i][menuIdIndex] });
    }
  }

  // If not found insert new row
  const menuId = Utilities.getUuid();
  sheet.appendRow([
    menuId,
    body.day,
    body.slot,
    body.dish_name,
    body.description || ""
  ]);

  return response({ success: true, message: "Menu created", menu_id: menuId });
}

// ─────────────────────────────────────────────

function getMenu(params) {
  const data = getSheetData(SHEETS.menu);
  const headers = data[0];

  const dayIndex = headers.indexOf("day");
  const slotIndex = headers.indexOf("slot");
  const dishNameIndex = headers.indexOf("dish_name");
  const descriptionIndex = headers.indexOf("description");
  const menuIdIndex = headers.indexOf("menu_id");

  // If day is passed return only that day
  // If slot also passed return only that slot
  // Otherwise return full week

  const menu = [];
  for (let i = 1; i < data.length; i++) {
    if (params.day && data[i][dayIndex] !== params.day) continue;
    if (params.slot && data[i][slotIndex] !== params.slot) continue;

    menu.push({
      menu_id: data[i][menuIdIndex],
      day: data[i][dayIndex],
      slot: data[i][slotIndex],
      dish_name: data[i][dishNameIndex],
      description: data[i][descriptionIndex]
    });
  }

  return response({ success: true, total: menu.length, menu });
}
