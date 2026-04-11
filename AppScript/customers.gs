function createCustomer(body) {
  const sheet = getSheet(SHEETS.customers);
  const data = getSheetData(SHEETS.customers);

  // Check duplicate mobile
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(body.mobile)) {
      return response({ success: false, message: "Mobile already registered" });
    }
  }

  // Generate user_id
  const userId = "USR" + String(data.length).padStart(3, "0");
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
      const rowNumber = i + 1;

      if (body.name)
        sheet.getRange(rowNumber, nameIndex + 1).setValue(body.name);
      if (body.password)
        sheet.getRange(rowNumber, passwordIndex + 1).setValue(body.password);
      if (body.address_1)
        sheet.getRange(rowNumber, address1Index + 1).setValue(body.address_1);
      if (body.address_2)
        sheet.getRange(rowNumber, address2Index + 1).setValue(body.address_2);
      if (body.address_3)
        sheet.getRange(rowNumber, address3Index + 1).setValue(body.address_3);

      return response({ success: true, message: "Customer updated" });
    }
  }

  return response({ success: false, message: "User not found" });
}
