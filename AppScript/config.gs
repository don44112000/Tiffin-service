const SECRET_CODE = "FOOD2026";
const ADMIN_SECRET = "ADMIN2026";

const SPREADSHEET_ID = "1Kbx3239fP6wYhY5aikcy2DMsZwpQTlEAPpNwbdN1gkg";

const SHEETS = {
  customers: "customers",
  orders: "orders",
  payments: "payments",
  completed_days: "completed_days",
};

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getSheetData(name) {
  return getSheet(name).getDataRange().getValues();
}
