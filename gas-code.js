const SPREADSHEET_ID = '1dG4vyqKarYzfGoJPwlwUquduPzQ9ODyGgFwlXlsrUb4';

// キャッシュ設定
const CACHE_DURATION = 30 * 1000; // 30秒
const cache = new Map();

// スプレッドシートの接続を最適化
let ss = null;
let tasksSheet = null;
let usersSheet = null;

function getSpreadsheet() {
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return ss;
}

function getTasksSheet() {
  if (!tasksSheet) {
    tasksSheet = getSpreadsheet().getSheetByName('Tasks');
  }
  return tasksSheet;
}

function getUsersSheet() {
  if (!usersSheet) {
    usersSheet = getSpreadsheet().getSheetByName('Users');
  }
  return usersSheet;
}

// --- Utils ---
function generateId() {
  return Utilities.getUuid();
}

// キャッシュ機能
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}

function invalidateCache(pattern = null) {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

function getSheetHeaders(sheet) {
  if (!sheet) return [];
  
  const cacheKey = `headers_${sheet.getName()}`;
  let headers = getCachedData(cacheKey);
  
  if (!headers) {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) return [];
    const range = sheet.getRange(1, 1, 1, lastColumn);
    headers = range.getValues()[0];
    setCachedData(cacheKey, headers);
  }
  
  return headers;
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
  
  const cacheKey = `sheet_data_${sheet.getName()}`;
  let cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const headers = getSheetHeaders(sheet);
  if (headers.length === 0) return [];
  
  const lastColumn = sheet.getLastColumn();
  
  // バッチでデータを取得して処理速度を向上
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const result = data.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || "";
    });
    return obj;
  });
  
  setCachedData(cacheKey, result);
  return result;
}

function objectToSheetRow(sheet, obj) {
  const headers = getSheetHeaders(sheet);
  return headers.map(header => obj[header] || "");
}

// シートの初期化（ヘッダーが存在しない場合に追加）
function initializeSheets() {
  // Usersシートの初期化
  const users = getUsersSheet();
  if (users && users.getLastRow() === 0) {
    users.getRange(1, 1, 1, 6).setValues([['id', 'username', 'email', 'displayName', 'password', 'createdAt']]);
  }
  
  // Tasksシートの初期化
  const tasks = getTasksSheet();
  if (tasks && tasks.getLastRow() === 0) {
    tasks.getRange(1, 1, 1, 9).setValues([['id', 'title', 'description', 'priority', 'dueDate', 'assignedTo', 'status', 'createdAt', 'updatedAt']]);
  }
}

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  // CORSヘッダーとキャッシュヘッダーを設定
  const response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // 軽量な初期化処理
    if (!ss) initializeSheets();
    
    let result;
    switch (action) {
      case 'getTasks':
        result = handleGetTasks();
        break;
      case 'getUsers':
        result = handleGetUsers();
        break;
      case 'getUsersWithPasswords':
        result = handleGetUsersWithPasswords();
        break;
      default:
        throw new Error('Invalid action');
    }
    
    return response.setContent(JSON.stringify({ success: true, data: result }));
  } catch (error) {
    return response.setContent(JSON.stringify({ success: false, message: error.message }));
  }
}

/**
 * プリフライトリクエスト（OPTIONS）の処理
 */
function doOptions(e) {
  return HtmlService.createHtmlOutput('')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const requestBody = JSON.parse(e.postData.contents);
  const action = requestBody.action;
  
  // 高速レスポンス設定
  const response = ContentService.createTextOutput();
  response.setMimeType(ContentService.MimeType.JSON);

  try {
    // 軽量な初期化処理
    if (!ss) initializeSheets();
    
    let result;
    switch (action) {
      case 'login':
        result = handleLogin(requestBody.payload);
        break;
      case 'register':
        result = handleRegister(requestBody.payload);
        break;
      case 'getTasks':
        result = handleGetTasks(requestBody.payload);
        break;
      case 'getUserStats':
        result = handleGetUserStats(requestBody.payload);
        break;
      case 'createTask':
        result = handleCreateTask(requestBody.payload);
        invalidateCache('Tasks'); // タスク関連キャッシュを無効化
        break;
      case 'updateTask':
        result = handleUpdateTask(requestBody.payload);
        invalidateCache('Tasks'); // タスク関連キャッシュを無効化
        break;
      case 'deleteTask':
        result = handleDeleteTask(requestBody.payload);
        invalidateCache('Tasks'); // タスク関連キャッシュを無効化
        break;
      case 'getUsers':
        result = handleGetUsers(requestBody.payload);
        break;
      default:
        throw new Error('Invalid action');
    }
    
    return response.setContent(JSON.stringify({ success: true, data: result }));
  } catch (error) {
    return response.setContent(JSON.stringify({ success: false, message: error.message }));
  }
}

// --- Action Handlers ---

// User Handlers
function handleLogin({ email, password }) {
  if (!email || !password) {
    throw new Error('メールアドレスとパスワードは必須です。');
  }
  
  const userRow = findRowByEmail(getUsersSheet(), email);
  if (userRow === -1) {
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }

  const headers = getSheetHeaders(getUsersSheet());
  const userData = getUsersSheet().getRange(userRow, 1, 1, getUsersSheet().getLastColumn()).getValues()[0];
  const user = {};
  headers.forEach((h, i) => user[h] = userData[i]);

  // ハッシュ化されたパスワード照合
  if (user.password !== password) {
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }
  
  // レスポンスからパスワードを除外
  delete user.password;
  return { user };
}

function handleRegister(payload) {
  const { username, email, displayName, password } = payload;
  if (!username || !email || !displayName || !password) {
    throw new Error('すべての必須フィールドを入力してください。');
  }

  if (findRowByEmail(getUsersSheet(), email) !== -1) {
    throw new Error('このメールアドレスは既に登録されています。');
  }

  const newUser = {
    id: generateId(),
    username,
    email,
    displayName,
    password, // ハッシュ化されたパスワードとして保存
    createdAt: new Date().toISOString(),
  };
  
  getUsersSheet().appendRow(objectToSheetRow(getUsersSheet(), newUser));
  
  // キャッシュを無効化
  invalidateCache('Users');
  
  // レスポンスからパスワードを除外
  delete newUser.password;
  return { user: newUser };
}

function handleGetUsers() {
  const cacheKey = 'users_all';
  let users = getCachedData(cacheKey);
  
  if (!users) {
    users = sheetToObjects(getUsersSheet());
    // Remove password from all users before sending
    users = users.map(u => {
      delete u.password;
      return u;
    });
    setCachedData(cacheKey, users);
  }
  
  return users;
}

function handleGetUserStats(payload) {
  try {
    const cacheKey = 'user_stats';
    let stats = getCachedData(cacheKey);
    
    if (!stats) {
      const tasks = sheetToObjects(getTasksSheet());
      
      // 各ステータスのタスク数を計算
      stats = {
        total: tasks.length,
        pending: tasks.filter(task => task.status === 'pending').length,
        'in-progress': tasks.filter(task => task.status === 'in-progress').length,
        completed: tasks.filter(task => task.status === 'completed').length,
        cancelled: tasks.filter(task => task.status === 'cancelled').length
      };
      
      setCachedData(cacheKey, stats);
    }
    
    return { stats: stats };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw new Error('Failed to load user statistics');
  }
}

function handleGetUsersWithPasswords() {
  // 認証目的でのみ使用 - ハッシュ化されたパスワードを含む
  return sheetToObjects(getUsersSheet());
}

// Task Handlers
function handleGetTasks(payload = {}) {
  try {
    const cacheKey = `tasks_${JSON.stringify(payload)}`;
    let tasks = getCachedData(cacheKey);
    
    if (!tasks) {
      tasks = sheetToObjects(getTasksSheet());
      
      // フィルタリング処理
      if (payload.status && payload.status !== 'all') {
        tasks = tasks.filter(task => task.status === payload.status);
      }
      
      if (payload.priority) {
        tasks = tasks.filter(task => task.priority === payload.priority);
      }
      
      // ソート処理
      if (payload.sortBy) {
        const sortOrder = payload.sortOrder === 'desc' ? -1 : 1;
        tasks.sort((a, b) => {
          const aVal = a[payload.sortBy];
          const bVal = b[payload.sortBy];
          
          if (payload.sortBy === 'createdAt' || payload.sortBy === 'updatedAt' || payload.sortBy === 'dueDate') {
            // 日付の比較
            const aDate = new Date(aVal || 0);
            const bDate = new Date(bVal || 0);
            return sortOrder * (aDate - bDate);
          } else {
            // 文字列の比較
            return sortOrder * (aVal || '').localeCompare(bVal || '');
          }
        });
      }
      
      setCachedData(cacheKey, tasks);
    }
    
    // リミット処理
    if (payload.limit) {
      const limit = parseInt(payload.limit);
      if (!isNaN(limit) && limit > 0) {
        tasks = tasks.slice(0, limit);
      }
    }
    
    return { tasks: tasks };
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw new Error('Failed to load tasks');
  }
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
