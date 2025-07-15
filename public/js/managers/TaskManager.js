class TaskManager {
    constructor(apiClient, notificationManager, socketManager = null) {
        this.apiClient = apiClient;
        this.notificationManager = notificationManager;
        this.socketManager = socketManager;
        this.tasks = [];
        this.currentEditingTask = null;
        this.allUsers = [];
        this.uiManager = null; // UIManagerの参照を保持
        this.authManager = null; // AuthManagerの参照を保持
        this.ganttManager = null; // GanttManagerの参照を保持
        
        // リアルタイム更新のイベントリスナーを設定
        this.setupRealtimeListeners();
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    setGanttManager(ganttManager) {
        this.ganttManager = ganttManager;
    }

    getTasks() {
        return this.tasks;
    }

    setCurrentEditingTask(task) {
        this.currentEditingTask = task;
    }

    getCurrentEditingTask() {
        return this.currentEditingTask;
    }

    async loadTasks() {
        try {
            console.log('Loading tasks...');
            
            const statusFilter = document.getElementById('statusFilter')?.value || 'all';
            const priorityFilter = document.getElementById('priorityFilter')?.value || '';
            
            console.log('Filters applied:', { statusFilter, priorityFilter });
            
            const params = new URLSearchParams({
                status: statusFilter,
                limit: 50
            });

            if (priorityFilter) {
                params.append('priority', priorityFilter);
            }

            console.log('Request params:', params.toString());
            
            const response = await this.apiClient.call(`/api/tasks?${params}`);
            
            console.log('Load tasks response:', response);
            
            if (response && response.tasks) {
                // レスポンスに直接tasksプロパティがある場合
                this.tasks = response.tasks || [];
                console.log('Tasks loaded from response.tasks:', this.tasks.length);
                console.log('First few tasks:', this.tasks.slice(0, 3));
                this.updateViews();
                return this.tasks;
            } else if (Array.isArray(response)) {
                // レスポンスが直接配列の場合（GAS環境の可能性）
                this.tasks = response;
                console.log('Tasks loaded from array response:', this.tasks.length);
                console.log('First few tasks:', this.tasks.slice(0, 3));
                this.updateViews();
                return this.tasks;
            } else if (response && response.success && response.data) {
                // Node.js環境ではsuccess/data形式
                this.tasks = response.data.tasks || [];
                console.log('Tasks loaded from response.data.tasks:', this.tasks.length);
                console.log('First few tasks:', this.tasks.slice(0, 3));
                this.updateViews();
                return this.tasks;
            } else {
                console.error('Failed to load tasks:', response);
                this.notificationManager.show('error', 'エラー', 'タスクの取得に失敗しました');
                this.tasks = [];
                return this.tasks;
            }
        } catch (error) {
            console.error('Load tasks error:', error);
            this.notificationManager.show('error', 'エラー', `タスクの取得中にエラーが発生しました: ${error.message}`);
            this.tasks = [];
            return this.tasks;
        }
    }

    async loadRecentTasks() {
        try {
            console.log('Loading recent tasks...');
            const response = await this.apiClient.call('/api/tasks?limit=5&sortBy=createdAt&sortOrder=desc');
            
            console.log('Load recent tasks response:', response);
            
            if (response && response.tasks) {
                // レスポンスに直接tasksプロパティがある場合
                return response.tasks || [];
            } else if (Array.isArray(response)) {
                // レスポンスが直接配列の場合（GAS環境の可能性）
                return response;
            } else if (response && response.success && response.data) {
                // Node.js環境ではsuccess/data形式
                return response.data.tasks || [];
            } else {
                console.error('Failed to load recent tasks:', response);
                return [];
            }
        } catch (error) {
            console.error('Load recent tasks error:', error);
            return [];
        }
    }

    async getTaskDetails(taskId) {
        try {
            console.log('Getting task details for:', taskId);
            const response = await this.apiClient.call(`/api/tasks/${taskId}`, 'GET');
            
            if (response && response.success) {
                console.log('Task details retrieved:', response.data.task);
                return response.data.task;
            } else {
                throw new Error(response?.message || 'タスクの詳細取得に失敗しました');
            }
        } catch (error) {
            console.error('Get task details error:', error);
            throw error;
        }
    }

    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => (t._id === taskId || t.id === taskId));
            if (!task) {
                console.error('Task not found:', taskId);
                this.notificationManager.show('error', 'エラー', 'タスクが見つかりません');
                return;
            }
            
            console.log('Toggling task:', taskId, 'current completed:', task.completed);
            
            // completedとstatusの両方を送信して互換性を確保
            const newCompleted = !task.completed;
            const newStatus = newCompleted ? 'completed' : 'pending';
            
            const response = await this.apiClient.call(`/api/tasks/${taskId}`, 'PUT', {
                completed: newCompleted,
                status: newStatus
            });
            
            console.log('Toggle task response:', response);
            
            // GAS環境では、ApiClientがresult.dataを直接返すため、responseにはタスクオブジェクトが含まれる
            if (response && (response.id || response._id)) {
                const action = newCompleted ? '完了' : '未完了に変更';
                this.notificationManager.show('success', 'タスク更新', `タスクを${action}しました`);
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response);
                }
                
                return true;
            } else if (response && response.success) {
                // Node.js環境の場合（success/data形式）
                const action = newCompleted ? '完了' : '未完了に変更';
                this.notificationManager.show('success', 'タスク更新', `タスクを${action}しました`);
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response.data);
                }
                
                return true;
            } else {
                console.error('Toggle task failed:', response);
                this.notificationManager.show('error', 'エラー', response?.message || 'タスクの更新に失敗しました');
                return false;
            }
        } catch (error) {
            console.error('Toggle task error:', error);
            this.notificationManager.show('error', 'エラー', `タスクの更新中にエラーが発生しました: ${error.message}`);
            return false;
        }
    }

    async deleteTask(taskId) {
        if (!confirm('このタスクを削除しますか？')) {
            return false;
        }
        
        try {
            const response = await this.apiClient.call(`/api/tasks/${taskId}`, 'DELETE');
            
            console.log('Delete task response:', response);
            
            // GAS環境では、削除成功時に削除されたタスクオブジェクトまたは成功メッセージが返される
            // レスポンスが存在し、エラーメッセージがない場合は成功とみなす
            if (response && !response.error) {
                this.notificationManager.show('success', 'タスク削除', 'タスクを削除しました');
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', { taskId, deleted: true });
                }
                
                return true;
            } else if (response && response.success) {
                // Node.js環境の場合（success/data形式）
                this.notificationManager.show('success', 'タスク削除', 'タスクを削除しました');
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', { taskId, deleted: true });
                }
                
                return true;
            } else {
                console.error('Delete task failed:', response);
                this.notificationManager.show('error', 'エラー', response?.message || 'タスクの削除に失敗しました');
                return false;
            }
        } catch (error) {
            console.error('Delete task error:', error);
            this.notificationManager.show('error', 'エラー', 'タスクの削除中にエラーが発生しました');
            return false;
        }
    }

    async saveTask(taskData) {
        try {
            let response;
            let action;
            
            // 開始日と期限日の検証
            this.validateTaskDates(taskData);
            
            if (this.currentEditingTask) {
                const taskId = this.currentEditingTask._id || this.currentEditingTask.id;
                console.log('Updating task:', taskId, taskData);
                response = await this.apiClient.call(`/api/tasks/${taskId}`, 'PUT', taskData);
                action = '更新';
            } else {
                console.log('Creating new task:', taskData);
                response = await this.apiClient.call('/api/tasks', 'POST', taskData);
                action = '作成';
            }
            
            console.log('Task submit response:', response);
            
            // GAS環境では、ApiClientがresult.dataを直接返すため、responseにはタスクオブジェクトが含まれる
            // タスクオブジェクトには通常idプロパティが含まれるため、これで成功を判定
            if (response && (response.id || response._id)) {
                console.log(`Task ${action} successful:`, response);
                this.notificationManager.show('success', `タスク${action}`, `タスクを${action}しました`);
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response);
                }
                
                return { success: true, data: response };
            } else if (response && response.success) {
                // Node.js環境の場合（success/data形式）
                this.notificationManager.show('success', `タスク${action}`, `タスクを${action}しました`);
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response.data);
                }
                
                return { success: true, data: response.data };
            } else {
                console.error('Task submit failed:', response);
                this.notificationManager.show('error', 'エラー', response?.message || `タスクの${action}に失敗しました`);
                return { success: false, message: response?.message };
            }
        } catch (error) {
            console.error('Task submit error:', error);
            const action = this.currentEditingTask ? '更新' : '作成';
            this.notificationManager.show('error', 'エラー', `タスクの${action}中にエラーが発生しました: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async searchTasks(query) {
        if (!query.trim()) {
            return await this.loadTasks();
        }
        
        try {
            const response = await this.apiClient.call(`/api/tasks?search=${encodeURIComponent(query)}`);
            
            console.log('Search tasks response:', response);
            
            // GAS環境では、ApiClientがresult.dataを直接返すため、responseには配列が含まれる
            if (Array.isArray(response)) {
                this.tasks = response;
                return this.tasks;
            } else if (response && response.success) {
                // Node.js環境の場合（success/data形式）
                this.tasks = response.data.tasks || [];
                return this.tasks;
            }
            return [];
        } catch (error) {
            console.error('Search tasks error:', error);
            return [];
        }
    }

    async loadStats() {
        // Client-side stats calculation using loaded tasks
        if (!Array.isArray(this.tasks)) {
            // Ensure tasks are loaded
            await this.loadTasks();
        }
        const now = new Date();
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.status === 'completed').length;
        const pending = this.tasks.filter(task => task.status === 'pending').length;
        const overdue = this.tasks.filter(task => {
            if (task.status === 'completed') return false;
            if (!task.dueDate) return false;
            return new Date(task.dueDate) < now;
        }).length;
        const stats = { total, completed, pending, overdue };
        console.log('TaskManager.loadStats: Calculated client stats:', stats);
        return stats;
    }

    async loadAllUsers() {
        try {
            console.log('=== LOADING ALL USERS ===');
            
            // キャッシュされたユーザーがある場合は一旦それを返し、バックグラウンドで更新
            if (this.allUsers.length > 0) {
                console.log('Using cached users, updating in background...');
                // バックグラウンドで更新
                this.updateUsersInBackground();
                return this.allUsers;
            }
            
            console.log('Loading all users for dropdown...');
            
            const response = await this.apiClient.call('/api/users');
            console.log('Users API response:', response);
            
            if (response && Array.isArray(response)) {
                // GAS環境では、レスポンスが直接配列で返される
                this.allUsers = response;
                console.log('All users loaded from API (Array):', this.allUsers.length, 'users');
                
                // ローカルストレージにキャッシュ
                this.cacheUsers(this.allUsers);
                return this.allUsers;
            } else if (response && response.success && response.data) {
                // Node.js環境では、success/data形式で返される
                this.allUsers = response.data.users || response.data || [];
                console.log('All users loaded from API (Object):', this.allUsers.length, 'users');
                
                // ローカルストレージにキャッシュ
                this.cacheUsers(this.allUsers);
                return this.allUsers;
            } else {
                console.log('No users data in response, trying cache...');
                // APIからデータが取得できない場合、キャッシュから復元を試行
                const cachedUsers = this.getCachedUsers();
                if (cachedUsers && cachedUsers.length > 0) {
                    console.log('Using cached users:', cachedUsers.length);
                    this.allUsers = cachedUsers;
                    return this.allUsers;
                }
                
                this.allUsers = [];
                return this.allUsers;
            }
        } catch (error) {
            console.error('Load all users error:', error);
            
            // エラー時もキャッシュから復元を試行
            const cachedUsers = this.getCachedUsers();
            if (cachedUsers && cachedUsers.length > 0) {
                console.log('Using cached users due to API error:', cachedUsers.length);
                this.allUsers = cachedUsers;
                return this.allUsers;
            }
            
            this.allUsers = [];
            return this.allUsers;
        }
    }

    // バックグラウンドでユーザーリストを更新
    async updateUsersInBackground() {
        try {
            const response = await this.apiClient.call('/api/users');
            if (response && Array.isArray(response)) {
                this.allUsers = response;
                this.cacheUsers(this.allUsers);
            } else if (response && response.success && response.data) {
                this.allUsers = response.data.users || response.data || [];
                this.cacheUsers(this.allUsers);
            }
        } catch (error) {
            console.warn('Background user update failed:', error);
        }
    }

    // ユーザーリストをローカルストレージにキャッシュ
    cacheUsers(users) {
        try {
            const cacheData = {
                users: users,
                timestamp: Date.now()
            };
            localStorage.setItem('workerbee_users_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache users:', error);
        }
    }

    // キャッシュからユーザーリストを取得
    getCachedUsers() {
        try {
            const cached = localStorage.getItem('workerbee_users_cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                // 24時間以内のキャッシュのみ使用
                if (Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000) {
                    return cacheData.users;
                }
            }
        } catch (error) {
            console.warn('Failed to get cached users:', error);
        }
        return null;
    }

    getAllUsers() {
        console.log('TaskManager.getAllUsers called, returning:', this.allUsers.length, 'users');
        console.log('AllUsers data:', this.allUsers);
        return this.allUsers;
    }

    // ユーザーリストを取得（現在のユーザーを確実に含める）
    async ensureUsersIncludeCurrentUser() {
        let users = await this.loadAllUsers();
        
        // 現在のユーザーがリストに含まれていない場合は追加
        if (this.authManager) {
            const currentUser = this.authManager.getUser();
            if (currentUser && !users.find(u => u._id === currentUser._id || u.id === currentUser.id)) {
                console.log('Adding current user to users list');
                users = [...users, currentUser];
                this.allUsers = users;
            }
        }
        
        return users;
    }

    updateViews() {
        // UIManagerが設定されている場合、ビューを更新
        if (this.uiManager) {
            this.uiManager.updateViews();
        }
    }

    async updateTask(taskId, updateData) {
        try {
            console.log('TaskManager.updateTask called with:', {
                taskId: taskId,
                updateData: updateData,
                updateDataType: typeof updateData,
                updateDataKeys: Object.keys(updateData)
            });
            
            // 日付の検証
            if (updateData.startDate || updateData.dueDate) {
                try {
                    this.validateTaskDates(updateData);
                } catch (error) {
                    this.notificationManager.show('error', '日付エラー', error.message);
                    return { success: false, error: error.message };
                }
            }
            
            // 依存関係の検証
            if (updateData.dependencies) {
                this.validateDependencies(taskId, updateData.dependencies);
            }
            
            // ステータス変更の検証
            if (updateData.status && !this.canUpdateTaskStatus(taskId, updateData.status)) {
                return { success: false, error: 'ステータスの変更が依存関係により制限されています' };
            }
            
            const response = await this.apiClient.call(`/api/tasks/${taskId}`, 'PUT', updateData);
            
            console.log('Update task response:', response);
            
            // GAS環境では、ApiClientがresult.dataを直接返すため、responseにはタスクオブジェクトが含まれる
            if (response && (response.id || response._id)) {
                console.log('Task update successful:', response);
                
                // ローカルのタスクリストを更新
                const taskIndex = this.tasks.findIndex(t => (t._id === taskId || t.id === taskId));
                if (taskIndex !== -1) {
                    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updateData };
                }
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response);
                }
                
                return { success: true, data: response };
            } else if (response && response.success) {
                // Node.js環境の場合（success/data形式）
                console.log('Task update successful (Node.js):', response);
                
                // ローカルのタスクリストを更新
                const taskIndex = this.tasks.findIndex(t => (t._id === taskId || t.id === taskId));
                if (taskIndex !== -1) {
                    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updateData };
                }
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', response.data);
                }
                
                return { success: true, data: response.data };
            } else {
                console.error('Task update failed:', response);
                return { success: false, message: response?.message || 'タスクの更新に失敗しました' };
            }
        } catch (error) {
            console.error('Update task error:', error);
            return { success: false, error: error.message };
        }
    }

    editTask(task) {
        console.log('Editing task:', task);
        
        // 編集中のタスクを設定
        this.setCurrentEditingTask(task);
        
        // UIManagerを通じてタスクモーダルを開く
        if (this.uiManager) {
            this.uiManager.openTaskModal('edit', task);
        } else {
            console.warn('UIManager not available for task editing');
        }
    }

    setupRealtimeListeners() {
        if (!this.socketManager) return;

        // リアルタイムタスク更新を受信
        this.socketManager.on('task-updated', (taskData) => {
            console.log('Received task update:', taskData);
            this.handleRealtimeTaskUpdate(taskData);
        });

        // リアルタイムタスク削除を受信
        this.socketManager.on('task-deleted', (taskId) => {
            console.log('Received task deletion:', taskId);
            this.handleRealtimeTaskDelete(taskId);
        });

        // リアルタイムタスク追加を受信
        this.socketManager.on('task-added', (taskData) => {
            console.log('Received task addition:', taskData);
            this.handleRealtimeTaskAdd(taskData);
        });
    }

    handleRealtimeTaskUpdate(taskData) {
        // ローカルタスクリストを更新
        const taskIndex = this.tasks.findIndex(t => t._id === taskData._id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = taskData;
        }

        // GanttManagerに通知
        if (this.ganttManager) {
            this.ganttManager.onTaskUpdated(taskData);
        }

        // UIManagerに通知
        if (this.uiManager) {
            this.uiManager.onTaskUpdated(taskData);
        }
    }

    handleRealtimeTaskDelete(taskId) {
        // ローカルタスクリストから削除
        this.tasks = this.tasks.filter(t => t._id !== taskId);

        // GanttManagerに通知
        if (this.ganttManager) {
            this.ganttManager.onTaskDeleted(taskId);
        }

        // UIManagerに通知
        if (this.uiManager) {
            this.uiManager.onTaskDeleted(taskId);
        }
    }

    handleRealtimeTaskAdd(taskData) {
        // ローカルタスクリストに追加（重複チェック）
        const existingTask = this.tasks.find(t => t._id === taskData._id);
        if (!existingTask) {
            this.tasks.push(taskData);
        }

        // GanttManagerに通知
        if (this.ganttManager) {
            this.ganttManager.onTaskAdded(taskData);
        }

        // UIManagerに通知
        if (this.uiManager) {
            this.uiManager.onTaskAdded(taskData);
        }
    }

    // 依存関係の管理
    getDependentTasks(taskId) {
        return this.tasks.filter(task => 
            task.dependencies && task.dependencies.includes(taskId)
        );
    }

    getDependencyTasks(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.dependencies) return [];
        
        return task.dependencies.map(depId => 
            this.tasks.find(t => t.id === depId)
        ).filter(t => t !== undefined);
    }

    canUpdateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;
        
        // 依存関係のチェック
        if (newStatus === 'in-progress' || newStatus === 'completed') {
            const dependencies = this.getDependencyTasks(taskId);
            const incompleteDependencies = dependencies.filter(dep => 
                dep.status !== 'completed'
            );
            
            if (incompleteDependencies.length > 0) {
                const depTitles = incompleteDependencies.map(dep => dep.title).join(', ');
                this.notificationManager.show('warning', '依存関係エラー', 
                    `このタスクを${newStatus === 'in-progress' ? '進行中' : '完了'}にする前に、以下の依存タスクを完了してください: ${depTitles}`);
                return false;
            }
        }
        
        return true;
    }

    validateDependencies(taskId, dependencies) {
        // 自分自身を依存関係に設定することを防ぐ
        if (dependencies.includes(taskId)) {
            throw new Error('タスクは自分自身に依存することはできません。');
        }
        
        // 存在しないタスクIDをチェック
        const invalidDeps = dependencies.filter(depId => 
            !this.tasks.find(t => t.id === depId)
        );
        
        if (invalidDeps.length > 0) {
            throw new Error(`存在しないタスクが依存関係に含まれています: ${invalidDeps.join(', ')}`);
        }
        
        // 循環依存をチェック
        if (this.hasCircularDependency(taskId, dependencies)) {
            throw new Error('循環依存が検出されました。');
        }
        
        return true;
    }

    hasCircularDependency(fromTaskId, toDependencies, visited = new Set()) {
        for (const depId of toDependencies) {
            if (visited.has(depId)) {
                return true;
            }
            
            visited.add(depId);
            
            const depTask = this.tasks.find(t => t.id === depId);
            if (depTask && depTask.dependencies) {
                if (depTask.dependencies.includes(fromTaskId)) {
                    return true;
                }
                
                if (this.hasCircularDependency(fromTaskId, depTask.dependencies, new Set(visited))) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // 開始日と期限日の検証
    validateTaskDates(taskData) {
        const startDate = taskData.startDate ? new Date(taskData.startDate) : null;
        const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
        
        if (startDate && dueDate && startDate > dueDate) {
            throw new Error('開始日は期限日より前に設定してください');
        }
        
        return true;
    }

    // 依存関係に基づくタスクの開始可能日を計算
    calculateEarliestStartDate(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.dependencies || task.dependencies.length === 0) {
            return null;
        }
        
        let latestDependencyDate = null;
        
        for (const depId of task.dependencies) {
            const depTask = this.tasks.find(t => t.id === depId);
            if (depTask) {
                const depDueDate = depTask.dueDate ? new Date(depTask.dueDate) : null;
                if (depDueDate && (!latestDependencyDate || depDueDate > latestDependencyDate)) {
                    latestDependencyDate = depDueDate;
                }
            }
        }
        
        return latestDependencyDate;
    }
}
