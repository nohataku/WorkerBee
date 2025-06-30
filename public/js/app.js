class TaskerApp {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('tasker_token');
        this.socket = null;
        this.currentView = 'dashboard';
        this.tasks = [];
        this.currentEditingTask = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkAuthentication();
    }

    bindEvents() {
        // 認証フォーム
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            this.handleRegister(e);
        });

        // ナビゲーション
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.showView(view);
            });
        });

        // ユーザーメニュー
        document.getElementById('userAvatar').addEventListener('click', () => {
            document.getElementById('userDropdown').classList.toggle('show');
        });

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // タスクモーダル
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showTaskModal();
        });

        document.getElementById('addTaskBtn2').addEventListener('click', () => {
            this.showTaskModal();
        });

        document.getElementById('taskModalClose').addEventListener('click', () => {
            this.hideTaskModal();
        });

        document.getElementById('taskModalCancel').addEventListener('click', () => {
            this.hideTaskModal();
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            this.handleTaskSubmit(e);
        });

        // フィルター
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.loadTasks();
        });

        document.getElementById('priorityFilter').addEventListener('change', () => {
            this.loadTasks();
        });

        // 検索
        document.getElementById('searchInput').addEventListener('input', 
            this.debounce((e) => {
                this.searchTasks(e.target.value);
            }, 300)
        );

        // ユーザー検索
        document.getElementById('taskAssignedTo').addEventListener('input',
            this.debounce((e) => {
                this.searchUsers(e.target.value);
            }, 300)
        );

        // モーダル外クリック
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideTaskModal();
            }
        });

        // ドロップダウン外クリック
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('userDropdown').classList.remove('show');
            }
        });
    }

    async checkAuthentication() {
        if (!this.token) {
            this.showAuthContainer();
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/verify', 'POST');
            if (response.success) {
                this.user = response.data.user;
                this.showAppContainer();
                this.initializeApp();
            } else {
                this.clearAuth();
                this.showAuthContainer();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.clearAuth();
            this.showAuthContainer();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', {
                email,
                password
            });

            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('tasker_token', this.token);
                
                this.showNotification('success', 'ログイン成功', 'ようこそ！');
                this.showAppContainer();
                this.initializeApp();
            } else {
                this.showNotification('error', 'ログインエラー', response.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('error', 'ログインエラー', 'ログイン中にエラーが発生しました');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const displayName = document.getElementById('registerDisplayName').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (password !== confirmPassword) {
            this.showNotification('error', 'パスワードエラー', 'パスワードが一致しません');
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/register', 'POST', {
                username,
                email,
                displayName,
                password
            });

            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('tasker_token', this.token);
                
                this.showNotification('success', '登録成功', 'アカウントが作成されました！');
                this.showAppContainer();
                this.initializeApp();
            } else {
                this.showNotification('error', '登録エラー', response.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('error', '登録エラー', '登録中にエラーが発生しました');
        }
    }

    logout() {
        this.clearAuth();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.showAuthContainer();
        this.showNotification('info', 'ログアウト', 'ログアウトしました');
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('tasker_token');
    }

    showAuthContainer() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }

    showAppContainer() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'grid';
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
    }

    showRegisterForm() {
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
    }

    initializeApp() {
        this.setupUserInfo();
        this.initializeSocket();
        this.loadTasks();
        this.loadStats();
    }

    setupUserInfo() {
        document.getElementById('userName').textContent = this.user.displayName;
        document.getElementById('userEmail').textContent = this.user.email;
        
        // アバターの初期化
        const avatar = document.getElementById('userAvatar');
        if (this.user.avatar) {
            avatar.innerHTML = `<img src="${this.user.avatar}" alt="Avatar">`;
        } else {
            avatar.innerHTML = `<i class="fas fa-user"></i>`;
        }
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.socket.emit('join-room', this.user._id);
        });

        this.socket.on('task-created', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.showNotification('info', '新しいタスク', `「${data.task.title}」が割り当てられました`);
                this.loadTasks();
                this.loadStats();
            }
        });

        this.socket.on('task-updated', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.showNotification('info', 'タスク更新', `「${data.task.title}」が更新されました`);
                this.loadTasks();
                this.loadStats();
            }
        });

        this.socket.on('task-deleted', (data) => {
            this.loadTasks();
            this.loadStats();
        });
    }

    showView(viewName) {
        // ナビゲーションアイテムの更新
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // ビューの切り替え
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');

        this.currentView = viewName;

        // ビュー固有の処理
        if (viewName === 'tasks') {
            this.loadTasks();
        } else if (viewName === 'dashboard') {
            this.loadStats();
            this.loadRecentTasks();
        }
    }

    async loadTasks() {
        try {
            const statusFilter = document.getElementById('statusFilter')?.value || 'all';
            const priorityFilter = document.getElementById('priorityFilter')?.value || '';
            
            const params = new URLSearchParams({
                status: statusFilter,
                limit: 50
            });

            if (priorityFilter) {
                params.append('priority', priorityFilter);
            }

            const response = await this.apiCall(`/api/tasks?${params}`);
            
            if (response.success) {
                this.tasks = response.data.tasks;
                this.renderTasks();
            } else {
                this.showNotification('error', 'エラー', 'タスクの取得に失敗しました');
            }
        } catch (error) {
            console.error('Load tasks error:', error);
            this.showNotification('error', 'エラー', 'タスクの取得中にエラーが発生しました');
        }
    }

    async loadRecentTasks() {
        try {
            const response = await this.apiCall('/api/tasks?limit=5&sortBy=createdAt&sortOrder=desc');
            
            if (response.success) {
                this.renderRecentTasks(response.data.tasks);
            }
        } catch (error) {
            console.error('Load recent tasks error:', error);
        }
    }

    renderTasks() {
        const container = document.getElementById('tasksList');
        const emptyState = document.getElementById('tasksEmpty');
        
        if (this.tasks.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';
        
        container.innerHTML = this.tasks.map(task => this.createTaskHTML(task)).join('');
        
        // イベントリスナーの追加
        this.tasks.forEach(task => {
            const taskElement = document.getElementById(`task-${task._id}`);
            if (taskElement) {
                const checkbox = taskElement.querySelector('.task-checkbox');
                const editBtn = taskElement.querySelector('.task-action-btn.edit');
                const deleteBtn = taskElement.querySelector('.task-action-btn.delete');
                
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTask(task._id);
                });
                
                if (editBtn) {
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editTask(task);
                    });
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteTask(task._id);
                    });
                }
            }
        });
    }

    renderRecentTasks(tasks) {
        const container = document.getElementById('recentTasks');
        
        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">最近のタスクがありません</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
        
        // イベントリスナーの追加
        tasks.forEach(task => {
            const taskElement = document.getElementById(`task-${task._id}`);
            if (taskElement) {
                const checkbox = taskElement.querySelector('.task-checkbox');
                
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTask(task._id);
                });
            }
        });
    }

    createTaskHTML(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && !task.completed;
        const dueDateStr = dueDate ? this.formatDate(dueDate) : '';
        
        const assigneeInitials = task.assignedTo.displayName
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase();

        const canEdit = task.createdBy._id === this.user._id;
        const canDelete = task.createdBy._id === this.user._id;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task._id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-priority ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                        ${dueDateStr ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i> ${dueDateStr}
                        </span>` : ''}
                        <span class="task-assignee">
                            <div class="task-assignee-avatar">${assigneeInitials}</div>
                            ${task.assignedTo.displayName}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    ${canEdit ? '<button class="task-action-btn edit" title="編集"><i class="fas fa-edit"></i></button>' : ''}
                    ${canDelete ? '<button class="task-action-btn delete" title="削除"><i class="fas fa-trash"></i></button>' : ''}
                </div>
            </div>
        `;
    }

    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) return;
            
            const response = await this.apiCall(`/api/tasks/${taskId}`, 'PUT', {
                completed: !task.completed
            });
            
            if (response.success) {
                this.loadTasks();
                this.loadStats();
                
                const action = response.data.task.completed ? '完了' : '未完了に変更';
                this.showNotification('success', 'タスク更新', `タスクを${action}しました`);
                
                // Socket通知
                if (this.socket) {
                    this.socket.emit('task-updated', response.data.task);
                }
            } else {
                this.showNotification('error', 'エラー', 'タスクの更新に失敗しました');
            }
        } catch (error) {
            console.error('Toggle task error:', error);
            this.showNotification('error', 'エラー', 'タスクの更新中にエラーが発生しました');
        }
    }

    editTask(task) {
        this.currentEditingTask = task;
        
        document.getElementById('taskModalTitle').textContent = 'タスクを編集';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            document.getElementById('taskDueDate').value = date.toISOString().slice(0, 16);
        }
        
        document.getElementById('taskAssignedTo').value = task.assignedTo.displayName;
        document.getElementById('taskAssignedTo').dataset.userId = task.assignedTo._id;
        
        this.showTaskModal();
    }

    async deleteTask(taskId) {
        if (!confirm('このタスクを削除しますか？')) {
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/tasks/${taskId}`, 'DELETE');
            
            if (response.success) {
                this.loadTasks();
                this.loadStats();
                this.showNotification('success', 'タスク削除', 'タスクを削除しました');
                
                // Socket通知
                if (this.socket) {
                    this.socket.emit('task-updated', { taskId, deleted: true });
                }
            } else {
                this.showNotification('error', 'エラー', 'タスクの削除に失敗しました');
            }
        } catch (error) {
            console.error('Delete task error:', error);
            this.showNotification('error', 'エラー', 'タスクの削除中にエラーが発生しました');
        }
    }

    showTaskModal() {
        document.getElementById('taskModal').classList.add('show');
    }

    hideTaskModal() {
        document.getElementById('taskModal').classList.remove('show');
        document.getElementById('taskForm').reset();
        document.getElementById('taskAssignedTo').dataset.userId = '';
        document.getElementById('userSearchResults').style.display = 'none';
        this.currentEditingTask = null;
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const assignedToUserId = document.getElementById('taskAssignedTo').dataset.userId;
        
        if (!title) {
            this.showNotification('error', 'エラー', 'タイトルを入力してください');
            return;
        }
        
        const taskData = {
            title,
            description,
            priority,
            dueDate: dueDate || null,
            assignedTo: assignedToUserId || this.user._id
        };
        
        try {
            let response;
            if (this.currentEditingTask) {
                response = await this.apiCall(`/api/tasks/${this.currentEditingTask._id}`, 'PUT', taskData);
            } else {
                response = await this.apiCall('/api/tasks', 'POST', taskData);
            }
            
            if (response.success) {
                this.hideTaskModal();
                this.loadTasks();
                this.loadStats();
                
                const action = this.currentEditingTask ? '更新' : '作成';
                this.showNotification('success', `タスク${action}`, `タスクを${action}しました`);
                
                // Socket通知
                if (this.socket) {
                    this.socket.emit('task-updated', response.data.task);
                }
            } else {
                this.showNotification('error', 'エラー', response.message);
            }
        } catch (error) {
            console.error('Task submit error:', error);
            this.showNotification('error', 'エラー', 'タスクの保存中にエラーが発生しました');
        }
    }

    async searchUsers(query) {
        if (!query || query.length < 2) {
            document.getElementById('userSearchResults').style.display = 'none';
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/users/search?q=${encodeURIComponent(query)}`);
            
            if (response.success) {
                this.renderUserSearchResults(response.data.users);
            }
        } catch (error) {
            console.error('User search error:', error);
        }
    }

    renderUserSearchResults(users) {
        const container = document.getElementById('userSearchResults');
        
        if (users.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = users.map(user => {
            const initials = user.displayName
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
                
            return `
                <div class="user-search-result" data-user-id="${user._id}">
                    <div class="user-search-result-avatar">${initials}</div>
                    <div class="user-search-result-info">
                        <div class="user-search-result-name">${this.escapeHtml(user.displayName)}</div>
                        <div class="user-search-result-email">${this.escapeHtml(user.email)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.style.display = 'block';
        
        // イベントリスナー追加
        users.forEach(user => {
            const element = container.querySelector(`[data-user-id="${user._id}"]`);
            element.addEventListener('click', () => {
                document.getElementById('taskAssignedTo').value = user.displayName;
                document.getElementById('taskAssignedTo').dataset.userId = user._id;
                container.style.display = 'none';
            });
        });
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/api/tasks/stats/user');
            
            if (response.success) {
                const stats = response.data.stats;
                this.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }

    updateStatsDisplay(stats) {
        document.getElementById('totalTasks').textContent = stats.total || 0;
        document.getElementById('completedTasks').textContent = stats.completed || 0;
        document.getElementById('pendingTasks').textContent = stats.pending || 0;
        document.getElementById('overdueTasks').textContent = stats.overdue || 0;
    }

    async searchTasks(query) {
        if (!query.trim()) {
            this.loadTasks();
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/tasks?search=${encodeURIComponent(query)}`);
            
            if (response.success) {
                this.tasks = response.data.tasks;
                this.renderTasks();
            }
        } catch (error) {
            console.error('Search tasks error:', error);
        }
    }

    showNotification(type, title, message) {
        const container = document.getElementById('notifications');
        const id = Date.now().toString();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // 閉じるボタン
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // 自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check';
            case 'error': return 'fa-exclamation-triangle';
            case 'warning': return 'fa-exclamation';
            case 'info': return 'fa-info';
            default: return 'fa-info';
        }
    }

    getPriorityLabel(priority) {
        switch (priority) {
            case 'low': return '低';
            case 'medium': return '中';
            case 'high': return '高';
            case 'urgent': return '緊急';
            default: return '中';
        }
    }

    formatDate(date) {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return '今日';
        } else if (days === 1) {
            return '明日';
        } else if (days === -1) {
            return '昨日';
        } else if (days > 1) {
            return `${days}日後`;
        } else {
            return `${Math.abs(days)}日前`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async apiCall(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            options.headers.Authorization = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (response.status === 401) {
            this.clearAuth();
            this.showAuthContainer();
            throw new Error('認証が必要です');
        }
        
        return await response.json();
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new TaskerApp();
});
