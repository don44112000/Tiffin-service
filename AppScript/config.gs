const SECRET_CODE = "FOOD2026";
const ADMIN_SECRET = "ADMIN2026";

const SPREADSHEET_ID = "1Kbx3239fP6wYhY5aikcy2DMsZwpQTlEAPpNwbdN1gkg";

const SHEETS = {
  customers: "customers",
  orders: "orders",
  payments: "payments",
  completed_days: "completed_days",
  menu: "menu",
  credit_history: "credit_history"
};

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getSheetData(name) {
  return getSheet(name).getDataRange().getValues();
}

// ── Timezone & Date Utilities ──────────────────────────────────────────────

const TIMEZONE = "Asia/Kolkata";

/**
 * Converts a raw cell value (Date object or string) to a YYYY-MM-DD string
 * in IST. This fixes the UTC-offset bug where GAS Date objects returned by
 * the Sheets API are in UTC, causing a -1 day shift for IST users.
 */
function toISTDateStr(rawDate) {
  if (rawDate instanceof Date) {
    return Utilities.formatDate(rawDate, TIMEZONE, "yyyy-MM-dd");
  }
  return String(rawDate).split("T")[0];
}

/**
 * Adds (or subtracts) days from a YYYY-MM-DD string and returns the result
 * as a YYYY-MM-DD string. Works entirely in local date arithmetic — no UTC
 * offset needed here since we never call toISOString().
 */
function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Returns true if the given YYYY-MM-DD date string exists in the
 * completed_days sheet, meaning that day has already been reconciled.
 */
function isDayCompleted(dateStr) {
  const completedData = getSheetData(SHEETS.completed_days);
  const headers = completedData[0];
  const dateIndex = headers.indexOf("date");
  for (let i = 1; i < completedData.length; i++) {
    if (toISTDateStr(completedData[i][dateIndex]) === dateStr) return true;
  }
  return false;
}

