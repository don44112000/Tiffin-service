function createCustomer(body) {
  const sheet = getSheet(SHEETS.customers);
  const data = getSheetData(SHEETS.customers);

  if (!body.name || !body.password) {
    return response({ success: false, message: "name and password are required" });
  }

  if (!body.mobile || !/^\d{10}$/.test(String(body.mobile))) {
    return response({ success: false, message: "Mobile number must be exactly 10 digits" });
  }

  // Check duplicate mobile
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(body.mobile)) {
      return response({ success: false, message: "Mobile already registered" });
    }
  }

  // Generate user_id — UUID guarantees uniqueness, no sheet read needed
  const userId = Utilities.getUuid();
  const now = new Date().toISOString().split("T")[0];

  sheet.appendRow([
    userId,
    body.name,
    body.mobile,
    body.password,
    body.address_1 || "",
    body.address_2 || "",
    body.address_3 || "",
    0,
    now,
    true,
  ]);

  return response({
    success: true,
    message: "Customer created",
    user_id: userId,
  });
}

function getCustomer(params) {
  const data = getSheetData(SHEETS.customers);
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const mobileMatch = String(row[2]) === String(params.mobile);
    const passwordMatch = String(row[3]) === String(params.password);

    if (mobileMatch && passwordMatch) {
      const customer = {};
      headers.forEach((header, index) => {
        customer[header] = row[index];
      });
      return response({ success: true, customer });
    }
  }

  return response({ success: false, message: "Invalid mobile or password" });
}

function updateCustomer(body) {
  if (!body.user_id) {
    return response({ success: false, message: "user_id is required" });
  }

  const sheet = getSheet(SHEETS.customers);
  const data = getSheetData(SHEETS.customers);
  const headers = data[0];

  const userIdIndex = headers.indexOf("user_id");
  const nameIndex = headers.indexOf("name");
  const passwordIndex = headers.indexOf("password");
  const address1Index = headers.indexOf("address_1");
  const address2Index = headers.indexOf("address_2");
  const address3Index = headers.indexOf("address_3");

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdIndex] === body.user_id) {
      const rowData = [...data[i]];

      // Use !== undefined so callers can explicitly pass "" to clear a field
      if (body.name !== undefined) rowData[nameIndex] = body.name;
      if (body.password !== undefined) rowData[passwordIndex] = body.password;
      if (body.address_1 !== undefined) rowData[address1Index] = body.address_1;
      if (body.address_2 !== undefined) rowData[address2Index] = body.address_2;
      if (body.address_3 !== undefined) rowData[address3Index] = body.address_3;

      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return response({ success: true, message: "Customer updated" });
    }
  }

  return response({ success: false, message: "User not found" });
}
