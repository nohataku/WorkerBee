const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // TODO: ここにあなたのスプレッドシートIDを入力してください
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const tasksSheet = ss.getSheetByName('Tasks');
const usersSheet = ss.getSheetByName('Users');

// --- Utils ---
function generateId() {
  return Utilities.getUuid();
}

function getSheetHeaders(sheet) {
  if (!sheet) return [];
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  const range = sheet.getRange(1, 1, 1, lastColumn);
  return range.getValues()[0];
}

function findRowById(sheet, id) {
  if (!sheet || !id) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1; // ヘッダー行のみまたは空の場合
  
  const idColumn = getSheetHeaders(sheet).indexOf('id') + 1;
  if (idColumn === 0) return -1;
  
  const data = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == id) {
      return i + 2; // 1-based index + header row
    }
  }
  return -1;
}

function findRowByEmail(sheet, email) {
  if (!sheet || !email) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1; // ヘッダー行のみまたは空の場合
  
  const emailColumn = getSheetHeaders(sheet).indexOf('email') + 1;
  if (emailColumn === 0) return -1;
  
  const data = sheet.getRange(2, emailColumn, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == email) {
      return i + 2; // 1-based index + header row
    }
  }
  return -1;
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // ヘッダー行のみまたは空の場合
  
  const headers = getSheetHeaders(sheet);
  if (headers.length === 0) return [];
  
  const lastColumn = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || "";
    });
    return obj;
  });
}

function objectToSheetRow(sheet, obj) {
  const headers = getSheetHeaders(sheet);
  return headers.map(header => obj[header] || "");
}

// シートの初期化（ヘッダーが存在しない場合に追加）
function initializeSheets() {
  // Usersシートの初期化
  if (usersSheet && usersSheet.getLastRow() === 0) {
    usersSheet.getRange(1, 1, 1, 6).setValues([['id', 'username', 'email', 'displayName', 'password', 'createdAt']]);
  }
  
  // Tasksシートの初期化
  if (tasksSheet && tasksSheet.getLastRow() === 0) {
    tasksSheet.getRange(1, 1, 1, 9).setValues([['id', 'title', 'description', 'priority', 'dueDate', 'assignedTo', 'status', 'createdAt', 'updatedAt']]);
  }
}

// --- Web App Entry Points ---
function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  let result;

  try {
    initializeSheets(); // シートを初期化
    
    switch (action) {
      case 'getTasks':
        result = handleGetTasks();
        break;
      case 'getUsers':
        result = handleGetUsers();
        break;
      default:
        throw new Error('Invalid action');
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const requestBody = JSON.parse(e.postData.contents);
  const action = requestBody.action;
  let result;

  try {
    initializeSheets(); // シートを初期化
    
    switch (action) {
      case 'login':
        result = handleLogin(requestBody.payload);
        break;
      case 'register':
        result = handleRegister(requestBody.payload);
        break;
      case 'createTask':
        result = handleCreateTask(requestBody.payload);
        break;
      case 'updateTask':
        result = handleUpdateTask(requestBody.payload);
        break;
      case 'deleteTask':
        result = handleDeleteTask(requestBody.payload);
        break;
      default:
        throw new Error('Invalid action');
    }
     return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Action Handlers ---

// User Handlers
function handleLogin({ email, password }) {
  if (!email || !password) throw new Error('Email and password are required.');
  const userRow = findRowByEmail(usersSheet, email);
  if (userRow === -1) throw new Error('User not found.');

  const headers = getSheetHeaders(usersSheet);
  const userData = usersSheet.getRange(userRow, 1, 1, usersSheet.getLastColumn()).getValues()[0];
  const user = {};
  headers.forEach((h, i) => user[h] = userData[i]);

  // In a real app, use bcrypt or similar for password hashing.
  // For simplicity, we are storing plain text passwords. THIS IS NOT SECURE.
  if (user.password !== password) {
    throw new Error('Invalid password.');
  }
  delete user.password; // Don't send password to client
  return { user };
}

function handleRegister(payload) {
  const { username, email, displayName, password } = payload;
  if (!username || !email || !displayName || !password) throw new Error('Missing required fields.');

  if (findRowByEmail(usersSheet, email) !== -1) {
    throw new Error('Email already exists.');
  }

  const newUser = {
    id: generateId(),
    username,
    email,
    displayName,
    password, // Again, plain text password for simplicity. NOT SECURE.
    createdAt: new Date().toISOString(),
  };
  usersSheet.appendRow(objectToSheetRow(usersSheet, newUser));
  delete newUser.password;
  return { user: newUser };
}

function handleGetUsers() {
  const users = sheetToObjects(usersSheet);
  // Remove password from all users before sending
  return users.map(u => {
    delete u.password;
    return u;
  });
}

// Task Handlers
function handleGetTasks() {
  return sheetToObjects(tasksSheet);
}

function handleCreateTask(payload) {
  const newTask = {
    id: generateId(),
    title: payload.title,
    description: payload.description || '',
    priority: payload.priority || 'medium',
    dueDate: payload.dueDate || '',
    assignedTo: payload.assignedTo || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasksSheet.appendRow(objectToSheetRow(tasksSheet, newTask));
  return newTask;
}

function handleUpdateTask(payload) {
  const { id, ...updates } = payload;
  if (!id) throw new Error('Task ID is required for update.');
  const row = findRowById(tasksSheet, id);
  if (row === -1) throw new Error('Task not found.');

  const headers = getSheetHeaders(tasksSheet);
  const taskData = tasksSheet.getRange(row, 1, 1, tasksSheet.getLastColumn());
  const taskValues = taskData.getValues()[0];
  
  updates.updatedAt = new Date().toISOString();

  const newValues = headers.map((header, i) => {
    return updates.hasOwnProperty(header) ? updates[header] : taskValues[i];
  });

  taskData.setValues([newValues]);
  
  const updatedTask = {};
  headers.forEach((h, i) => updatedTask[h] = newValues[i]);

  return updatedTask;
}

function handleDeleteTask({ id }) {
  if (!id) throw new Error('Task ID is required for deletion.');
  const row = findRowById(tasksSheet, id);
  if (row === -1) throw new Error('Task not found.');
  tasksSheet.deleteRow(row);
  return { id };
}
