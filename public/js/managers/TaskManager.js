class TaskManager {
    constructor(apiClient, notificationManager, socketManager = null) {
        this.apiClient = apiClient;
        this.notificationManager = notificationManager;
        this.socketManager = socketManager;
        this.tasks = [];
        this.currentEditingTask = null;
        this.allUsers = [];
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
                // GAS環境では直接tasksが返される
                this.tasks = response.tasks || [];
                console.log('Tasks loaded:', this.tasks.length);
                return this.tasks;
            } else if (response && response.success && response.data) {
                // Node.js環境ではsuccess/data形式
                this.tasks = response.data.tasks || [];
                console.log('Tasks loaded:', this.tasks.length);
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
                // GAS環境では直接tasksが返される
                return response.tasks || [];
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
            const task = this.tasks.find(t => t._id === taskId);
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
            
            if (response && response.success) {
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
            
            if (response.success) {
                this.notificationManager.show('success', 'タスク削除', 'タスクを削除しました');
                
                // Socket通知
                if (this.socketManager) {
                    this.socketManager.emit('task-updated', { taskId, deleted: true });
                }
                
                return true;
            } else {
                this.notificationManager.show('error', 'エラー', 'タスクの削除に失敗しました');
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
            
            if (this.currentEditingTask) {
                console.log('Updating task:', this.currentEditingTask._id, taskData);
                response = await this.apiClient.call(`/api/tasks/${this.currentEditingTask._id}`, 'PUT', taskData);
                action = '更新';
            } else {
                console.log('Creating new task:', taskData);
                response = await this.apiClient.call('/api/tasks', 'POST', taskData);
                action = '作成';
            }
            
            console.log('Task submit response:', response);
            
            if (response && response.success) {
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
            
            if (response.success) {
                this.tasks = response.data.tasks;
                return this.tasks;
            }
            return [];
        } catch (error) {
            console.error('Search tasks error:', error);
            return [];
        }
    }

    async loadStats() {
        try {
            const response = await this.apiClient.call('/api/tasks/stats/user');
            
            if (response && response.stats) {
                // GAS環境では直接statsが返される
                return response.stats;
            } else if (response && response.success && response.data) {
                // Node.js環境ではsuccess/data形式
                return response.data.stats;
            }
            return null;
        } catch (error) {
            console.error('Load stats error:', error);
            return null;
        }
    }

    async loadAllUsers() {
        try {
            console.log('=== LOADING ALL USERS ===');
            console.log('Loading all users for dropdown...');
            
            const response = await this.apiClient.call('/api/users');
            console.log('Users API response:', response);
            
            if (response && Array.isArray(response)) {
                // GAS環境では、レスポンスが直接配列で返される
                this.allUsers = response;
                console.log('All users loaded from API:', this.allUsers.length, 'users');
                console.log('User data:', this.allUsers);
                return this.allUsers;
            } else if (response && response.success && response.data) {
                // Node.js環境では、success/data形式で返される
                this.allUsers = response.data.users || response.data || [];
                console.log('All users loaded from API:', this.allUsers.length, 'users');
                console.log('User data:', this.allUsers);
                return this.allUsers;
            } else {
                console.log('No users data in response:', response);
                this.allUsers = [];
                return this.allUsers;
            }
        } catch (error) {
            console.error('Load all users error:', error);
            this.allUsers = [];
            return this.allUsers;
        }
    }

    getAllUsers() {
        return this.allUsers;
    }
}
