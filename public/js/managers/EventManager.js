class EventManager {
    constructor(authManager, taskManager, uiManager, notificationManager) {
        this.authManager = authManager;
        this.taskManager = taskManager;
        this.uiManager = uiManager;
        this.notificationManager = notificationManager;
    }

    bindEvents() {
        this.bindAuthEvents();
        this.bindNavigationEvents();
        this.bindTaskEvents();
        this.bindModalEvents();
        this.bindFilterEvents();
        this.bindSearchEvents();
        this.bindUserMenuEvents();
        this.bindTaskEventDelegation();
    }

    bindAuthEvents() {
        // 認証フォーム
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.uiManager.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.uiManager.showLoginForm();
        });

        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            this.handleRegister(e);
        });
    }

    bindNavigationEvents() {
        // ナビゲーション
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.handleViewChange(view);
            });
        });
    }

    bindTaskEvents() {
        // タスクモーダル
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.uiManager.showTaskModal();
        });

        document.getElementById('addTaskBtn2').addEventListener('click', () => {
            this.uiManager.showTaskModal();
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            this.handleTaskSubmit(e);
        });

        // ユーザー選択プルダウン
        document.getElementById('taskAssignedTo').addEventListener('change', (e) => {
            console.log('Assigned user changed:', e.target.value);
        });
    }

    bindModalEvents() {
        // タスクモーダル
        document.getElementById('taskModalClose').addEventListener('click', () => {
            this.uiManager.hideTaskModal();
        });

        document.getElementById('taskModalCancel').addEventListener('click', () => {
            this.uiManager.hideTaskModal();
        });

        // モーダル外クリック
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.uiManager.hideTaskModal();
            }
        });
    }

    bindFilterEvents() {
        // フィルター
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.handleTaskLoad();
        });

        document.getElementById('priorityFilter').addEventListener('change', () => {
            this.handleTaskLoad();
        });
    }

    bindSearchEvents() {
        // 検索
        document.getElementById('searchInput').addEventListener('input', 
            TaskUtils.debounce((e) => {
                this.handleTaskSearch(e.target.value);
            }, 300)
        );
    }

    bindUserMenuEvents() {
        // ユーザーメニュー
        document.getElementById('userAvatar').addEventListener('click', () => {
            document.getElementById('userDropdown').classList.toggle('show');
        });

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // ドロップダウン外クリック
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('userDropdown').classList.remove('show');
            }
        });
    }

    bindTaskEventDelegation() {
        console.log('Setting up task event delegation');
        
        // タスクリストコンテナにイベント委譲を設定
        const tasksList = document.getElementById('tasksList');
        const recentTasks = document.getElementById('recentTasks');
        
        if (tasksList) {
            // 既存のイベントリスナーを削除
            const newTasksList = tasksList.cloneNode(true);
            tasksList.parentNode.replaceChild(newTasksList, tasksList);
            
            // イベント委譲でクリックイベントを処理
            newTasksList.addEventListener('click', (e) => {
                this.handleTaskListClick(e);
            });
            
            console.log('Event delegation setup for tasksList');
        }
        
        if (recentTasks) {
            // 既存のイベントリスナーを削除
            const newRecentTasks = recentTasks.cloneNode(true);
            recentTasks.parentNode.replaceChild(newRecentTasks, recentTasks);
            
            // イベント委譲でクリックイベントを処理
            newRecentTasks.addEventListener('click', (e) => {
                this.handleTaskListClick(e);
            });
            
            console.log('Event delegation setup for recentTasks');
        }
    }

    handleTaskListClick(e) {
        e.stopPropagation();
        
        // チェックボックスのクリック
        if (e.target.closest('.task-checkbox')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                const taskId = taskItem.id.replace('task-', '');
                console.log('Checkbox clicked via delegation for task:', taskId);
                this.handleTaskToggle(taskId);
            }
            return;
        }
        
        // 編集ボタンのクリック
        if (e.target.closest('.task-action-btn.edit')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                const taskId = taskItem.id.replace('task-', '');
                console.log('Edit button clicked via delegation for task:', taskId);
                const task = this.taskManager.getTasks().find(t => t._id === taskId);
                if (task) {
                    this.handleTaskEdit(task);
                } else {
                    console.error('Task not found for edit:', taskId);
                }
            }
            return;
        }
        
        // 削除ボタンのクリック
        if (e.target.closest('.task-action-btn.delete')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                const taskId = taskItem.id.replace('task-', '');
                console.log('Delete button clicked via delegation for task:', taskId);
                this.handleTaskDelete(taskId);
            }
            return;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const result = await this.authManager.login(email, password);
        
        if (result.success) {
            this.uiManager.showAppContainer();
            await this.initializeAppAfterAuth();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const displayName = document.getElementById('registerDisplayName').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        const result = await this.authManager.register(username, email, displayName, password, confirmPassword);
        
        if (result.success) {
            this.uiManager.showAppContainer();
            await this.initializeAppAfterAuth();
        }
    }

    handleLogout() {
        this.authManager.logout();
        this.uiManager.showAuthContainer();
    }

    async handleViewChange(viewName) {
        this.uiManager.showView(viewName);

        // ビュー固有の処理
        if (viewName === 'tasks') {
            await this.handleTaskLoad();
        } else if (viewName === 'dashboard') {
            await this.handleDashboardLoad();
        }
    }

    async handleTaskLoad() {
        try {
            // タスクとユーザー情報を並行して読み込み
            await Promise.all([
                this.taskManager.loadTasks(),
                this.taskManager.loadAllUsers()
            ]);
            this.uiManager.renderTasks();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async handleDashboardLoad() {
        try {
            const [/* stats, */ recentTasks] = await Promise.all([
                // this.taskManager.loadStats(), // 一時的に無効化
                this.taskManager.loadRecentTasks(),
                this.taskManager.loadAllUsers() // ユーザー情報も同時に読み込み
            ]);
            
            // this.uiManager.updateStatsDisplay(stats); // 一時的に無効化
            this.uiManager.renderRecentTasks(recentTasks);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async handleTaskSearch(query) {
        try {
            await this.taskManager.searchTasks(query);
            this.uiManager.renderTasks();
        } catch (error) {
            console.error('Error searching tasks:', error);
        }
    }

    async handleTaskToggle(taskId) {
        try {
            const success = await this.taskManager.toggleTask(taskId);
            if (success) {
                await this.handleTaskLoad();
                const stats = await this.taskManager.loadStats();
                this.uiManager.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    }

    async handleTaskEdit(task) {
        try {
            await this.uiManager.populateTaskEditForm(task);
            this.uiManager.showTaskModal();
        } catch (error) {
            console.error('Error editing task:', error);
        }
    }

    async handleTaskDelete(taskId) {
        try {
            const success = await this.taskManager.deleteTask(taskId);
            if (success) {
                await this.handleTaskLoad();
                const stats = await this.taskManager.loadStats();
                this.uiManager.updateStatsDisplay(stats);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        try {
            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDescription').value.trim();
            const priority = document.getElementById('taskPriority').value;
            const dueDate = document.getElementById('taskDueDate').value;
            const assignedToUserId = document.getElementById('taskAssignedTo').value;
            
            console.log('Submitting task:', {
                title,
                description,
                priority,
                dueDate,
                assignedToUserId,
                isEdit: !!this.taskManager.getCurrentEditingTask()
            });
            
            if (!title) {
                this.notificationManager.show('error', 'エラー', 'タイトルを入力してください');
                return;
            }
            
            const user = this.authManager.getUser();
            const taskData = {
                title,
                description,
                priority,
                dueDate: dueDate || null,
                assignedTo: assignedToUserId || user._id
            };
            
            const result = await this.taskManager.saveTask(taskData);
            
            if (result.success) {
                this.uiManager.hideTaskModal();
                
                // タスクリストを再読み込み
                await Promise.all([
                    this.handleTaskLoad(),
                    (async () => {
                        const stats = await this.taskManager.loadStats();
                        this.uiManager.updateStatsDisplay(stats);
                    })()
                ]);
            }
        } catch (error) {
            console.error('Task submit error:', error);
            const action = this.taskManager.getCurrentEditingTask() ? '更新' : '作成';
            this.notificationManager.show('error', 'エラー', `タスクの${action}中にエラーが発生しました: ${error.message}`);
        }
    }

    async initializeAppAfterAuth() {
        try {
            console.log('Initializing app after authentication...');
            this.uiManager.setupUserInfo();
            
            // タスクとステータスの読み込みを順次実行
            await Promise.all([
                this.handleTaskLoad().catch(error => {
                    console.error('Failed to load tasks during initialization:', error);
                }),
                this.handleDashboardLoad().catch(error => {
                    console.error('Failed to load dashboard during initialization:', error);
                }),
                this.taskManager.loadAllUsers().catch(error => {
                    console.error('Failed to load users during initialization:', error);
                })
            ]);
            
            console.log('App initialization completed');
        } catch (error) {
            console.error('Error in initializeAppAfterAuth:', error);
            this.notificationManager.show('error', '初期化エラー', 'アプリケーションの初期化中にエラーが発生しました');
        }
    }
}
