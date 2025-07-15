const SPREADSHEET_ID = '1dG4vyqKarYzfGoJPwlwUquduPzQ9ODyGgFwlXlsrUb4'; // 設定ファイルから取得したスプレッドシートID
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
    tasksSheet.getRange(1, 1, 1, 11).setValues([['id', 'title', 'description', 'priority', 'startDate', 'dueDate', 'assignedTo', 'status', 'dependencies', 'createdAt', 'updatedAt']]);
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
      case 'getUsersWithPasswords':
        result = handleGetUsersWithPasswords();
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
      case 'getTasks':
        result = handleGetTasks(requestBody.payload);
        break;
      case 'getUserStats':
        result = handleGetUserStats(requestBody.payload);
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
      case 'getUsers':
        result = handleGetUsers(requestBody.payload);
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
  if (!email || !password) {
    throw new Error('メールアドレスとパスワードは必須です。');
  }
  
  const userRow = findRowByEmail(usersSheet, email);
  if (userRow === -1) {
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }

  const headers = getSheetHeaders(usersSheet);
  const userData = usersSheet.getRange(userRow, 1, 1, usersSheet.getLastColumn()).getValues()[0];
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

  if (findRowByEmail(usersSheet, email) !== -1) {
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
  usersSheet.appendRow(objectToSheetRow(usersSheet, newUser));
  
  // レスポンスからパスワードを除外
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

function handleGetUserStats(payload) {
  try {
    const tasks = sheetToObjects(tasksSheet);
    
    // 各ステータスのタスク数を計算
    const stats = {
      total: tasks.length,
      pending: tasks.filter(task => task.status === 'pending').length,
      'in-progress': tasks.filter(task => task.status === 'in-progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
      cancelled: tasks.filter(task => task.status === 'cancelled').length
    };
    
    return { stats: stats };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw new Error('Failed to load user statistics');
  }
}

function handleGetUsersWithPasswords() {
  // 認証目的でのみ使用 - ハッシュ化されたパスワードを含む
  return sheetToObjects(usersSheet);
}

// Task Handlers
function handleGetTasks(payload = {}) {
  try {
    let tasks = sheetToObjects(tasksSheet);
    
    // 依存関係の情報を含むタスクデータを取得
    tasks = getTasksWithDependencyInfo(tasks);
    
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
    startDate: payload.startDate || '',
    dueDate: payload.dueDate || '',
    assignedTo: payload.assignedTo || '',
    status: 'pending',
    dependencies: JSON.stringify(payload.dependencies || []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // 依存関係の検証
  if (payload.dependencies && payload.dependencies.length > 0) {
    validateDependencies(payload.dependencies);
  }
  
  tasksSheet.appendRow(objectToSheetRow(tasksSheet, newTask));
  
  // 依存関係を持つタスクのレスポンス用にJSONをパース
  const responseTask = { ...newTask };
  responseTask.dependencies = JSON.parse(responseTask.dependencies || '[]');
  
  return responseTask;
}

function handleUpdateTask(payload) {
  const { id, ...updates } = payload;
  if (!id) throw new Error('Task ID is required for update.');
  const row = findRowById(tasksSheet, id);
  if (row === -1) throw new Error('Task not found.');

  const headers = getSheetHeaders(tasksSheet);
  const taskData = tasksSheet.getRange(row, 1, 1, tasksSheet.getLastColumn());
  const taskValues = taskData.getValues()[0];
  
  // updatedAtを追加
  updates.updatedAt = new Date().toISOString();

  console.log('Update Task Debug:', {
    id: id,
    updates: updates,
    headers: headers,
    originalValues: taskValues
  });

  // 特定のフィールドのみを更新対象として許可
  const allowedFields = ['title', 'description', 'priority', 'startDate', 'dueDate', 'assignedTo', 'status', 'dependencies', 'createdAt', 'updatedAt'];
  const safeUpdates = {};
  
  // 許可されたフィールドのみを処理
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      if (key === 'dependencies') {
        // 依存関係の場合はJSON文字列として保存
        safeUpdates[key] = JSON.stringify(updates[key] || []);
      } else {
        safeUpdates[key] = updates[key];
      }
    } else {
      console.log(`Ignoring unknown field: ${key}`);
    }
  });

  // 依存関係の検証
  if (updates.dependencies && updates.dependencies.length > 0) {
    validateDependencies(updates.dependencies, id);
  }

  console.log('Safe updates:', safeUpdates);

  const newValues = headers.map((header, i) => {
    if (safeUpdates.hasOwnProperty(header)) {
      console.log(`Updating field ${header} from ${taskValues[i]} to ${safeUpdates[header]}`);
      return safeUpdates[header];
    }
    return taskValues[i];
  });

  console.log('Headers:', headers);
  console.log('New values to write:', newValues);
  
  // 各フィールドの対応を確認
  headers.forEach((header, i) => {
    console.log(`Column ${i}: ${header} = ${newValues[i]}`);
  });

  taskData.setValues([newValues]);
  
  const updatedTask = {};
  headers.forEach((h, i) => {
    if (h === 'dependencies') {
      // 依存関係の場合はJSONとしてパース
      updatedTask[h] = JSON.parse(newValues[i] || '[]');
    } else {
      updatedTask[h] = newValues[i];
    }
  });

  console.log('Updated task result:', updatedTask);
  return updatedTask;
}

function handleDeleteTask({ id }) {
  if (!id) throw new Error('Task ID is required for deletion.');
  const row = findRowById(tasksSheet, id);
  if (row === -1) throw new Error('Task not found.');
  tasksSheet.deleteRow(row);
  return { id };
}

// 依存関係の検証
function validateDependencies(dependencies, excludeTaskId = null) {
  if (!dependencies || dependencies.length === 0) {
    return;
  }
  
  const allTasks = sheetToObjects(tasksSheet);
  
  for (const depId of dependencies) {
    // 自分自身を依存関係に設定することを防ぐ
    if (depId === excludeTaskId) {
      throw new Error('タスクは自分自身に依存することはできません。');
    }
    
    // 依存するタスクが存在するかチェック
    const dependencyTask = allTasks.find(task => task.id === depId);
    if (!dependencyTask) {
      throw new Error(`依存するタスク (ID: ${depId}) が見つかりません。`);
    }
    
    // 循環依存をチェック
    if (hasCircularDependency(allTasks, excludeTaskId, depId)) {
      throw new Error('循環依存が検出されました。');
    }
  }
}

// 循環依存のチェック
function hasCircularDependency(allTasks, fromTaskId, toTaskId, visited = new Set()) {
  if (visited.has(toTaskId)) {
    return true;
  }
  
  visited.add(toTaskId);
  
  const toTask = allTasks.find(task => task.id === toTaskId);
  if (!toTask) {
    return false;
  }
  
  const toDependencies = JSON.parse(toTask.dependencies || '[]');
  
  for (const depId of toDependencies) {
    if (depId === fromTaskId) {
      return true;
    }
    
    if (hasCircularDependency(allTasks, fromTaskId, depId, new Set(visited))) {
      return true;
    }
  }
  
  return false;
}

// 依存関係の情報を含むタスクの詳細を取得
function getTasksWithDependencyInfo(tasks) {
  return tasks.map(task => {
    const dependencies = JSON.parse(task.dependencies || '[]');
    const dependencyTasks = dependencies.map(depId => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask ? {
        id: depTask.id,
        title: depTask.title,
        status: depTask.status
      } : null;
    }).filter(dep => dep !== null);
    
    return {
      ...task,
      dependencies: dependencies,
      dependencyTasks: dependencyTasks
    };
  });
}
