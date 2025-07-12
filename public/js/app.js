class WorkerBeeApp {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('workerbee_token');
        this.socket = null;
        this.currentView = 'dashboard';
        this.tasks = [];
        this.currentEditingTask = null;
        
        // パスワードハッシュ化用のソルト
        this.passwordSalt = 'workerbee2025salt';
        
        this.init();
    }

    // SHA-256ハッシュ化関数
    async sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // パスワードハッシュ化関数
    async hashPassword(password) {
        return await this.sha256(password + this.passwordSalt);
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

        // ユーザー選択プルダウン
        document.getElementById('taskAssignedTo').addEventListener('change', (e) => {
            // プルダウンの値が変更された時の処理（必要に応じて）
            console.log('Assigned user changed:', e.target.value);
        });

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
            const response = await this.apiCall('/api/auth/verify', 'GET');
            if (response.success) {
                this.user = response.data.user;
                this.showAppContainer();
                this.initializeApp();
            } else {
                this.clearAuth();
                this.showAuthContainer();
            }
        } catch (error) {
            // 認証チェック失敗時は、通知を表示せずに静かに認証画面に戻す
            console.error('Authentication check failed:', error);
            this.clearAuth();
            this.showAuthContainer();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        console.log('Starting login process...');

        try {
            // パスワードをハッシュ化してから送信
            const hashedPassword = await this.hashPassword(password);
            console.log('Password hashed for transmission');

            const response = await this.apiCall('/api/auth/login', 'POST', {
                email,
                password: hashedPassword
            });

            console.log('Login API response:', response);

            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('workerbee_token', this.token);
                
                console.log('Login successful, showing notification...');
                this.showNotification('success', 'ログイン成功', 'ようこそ！');
                
                console.log('Showing app container...');
                this.showAppContainer();
                
                console.log('Starting app initialization...');
                // 認証は既に完了しているので、直接アプリを初期化
                this.setupUserInfo();
                console.log('setupUserInfo completed');
                
                this.initializeSocket();
                console.log('initializeSocket completed');
                
                // イベント委譲を設定
                this.setupTaskEventDelegation();
                console.log('setupTaskEventDelegation completed');
                
                this.loadTasks();
                console.log('loadTasks started');
                
                this.loadStats();
                console.log('loadStats started');
                
                this.loadAllUsers();
                console.log('loadAllUsers started');
                
                console.log('App initialization completed');
            } else {
                console.log('Login failed:', response.message);
                this.showNotification('error', 'ログインエラー', response.message || 'ログインに失敗しました');
            }
        } catch (error) {
            console.error('Login error:', error);
            // 認証関連のエラーは除外（既に適切に処理されているため）
            if (!error.message.includes('認証が必要です')) {
                console.log('Showing login error notification...');
                this.showNotification('error', 'ログインエラー', 'ログイン中にエラーが発生しました');
            }
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
            // パスワードをハッシュ化してから送信
            const hashedPassword = await this.hashPassword(password);
            console.log('Password hashed for registration');

            const response = await this.apiCall('/api/auth/register', 'POST', {
                username,
                email,
                displayName,
                password: hashedPassword
            });

            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('workerbee_token', this.token);
                
                this.showNotification('success', '登録成功', 'アカウントが作成されました！');
                this.showAppContainer();
                
                // 認証は既に完了しているので、直接アプリを初期化
                this.setupUserInfo();
                this.initializeSocket();
                this.setupTaskEventDelegation();
                this.loadTasks();
                this.loadStats();
                this.loadAllUsers();
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
        localStorage.removeItem('workerbee_token');
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
        try {
            console.log('Initializing app...');
            this.setupUserInfo();
            this.initializeSocket();
            
            // イベント委譲を設定
            this.setupTaskEventDelegation();
            
            // タスクとステータスの読み込みを順次実行
            Promise.all([
                this.loadTasks().catch(error => {
                    console.error('Failed to load tasks during initialization:', error);
                }),
                this.loadStats().catch(error => {
                    console.error('Failed to load stats during initialization:', error);
                }),
                this.loadAllUsers().catch(error => {
                    console.error('Failed to load users during initialization:', error);
                })
            ]).then(() => {
                console.log('App initialization completed');
            }).catch(error => {
                console.error('App initialization failed:', error);
                this.showNotification('warning', '初期化警告', '一部のデータの読み込みに失敗しました');
            });
        } catch (error) {
            console.error('Error in initializeApp:', error);
            this.showNotification('error', '初期化エラー', 'アプリケーションの初期化中にエラーが発生しました');
        }
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
        // Socket.ioが利用可能かチェック
        if (typeof io === 'undefined') {
            console.log('Socket.io is not available, skipping socket initialization');
            return;
        }
        
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
            
            const response = await this.apiCall(`/api/tasks?${params}`);
            
            console.log('Load tasks response:', response);
            
            if (response && response.success) {
                this.tasks = response.data?.tasks || [];
                console.log('Tasks loaded:', this.tasks.length);
                this.renderTasks();
            } else {
                console.error('Failed to load tasks:', response);
                this.showNotification('error', 'エラー', response?.message || 'タスクの取得に失敗しました');
                // エラーの場合でも空のタスクリストを表示
                this.tasks = [];
                this.renderTasks();
            }
        } catch (error) {
            console.error('Load tasks error:', error);
            this.showNotification('error', 'エラー', `タスクの取得中にエラーが発生しました: ${error.message}`);
            // エラーの場合でも空のタスクリストを表示
            this.tasks = [];
            this.renderTasks();
        }
    }

    async loadRecentTasks() {
        try {
            console.log('Loading recent tasks...');
            const response = await this.apiCall('/api/tasks?limit=5&sortBy=createdAt&sortOrder=desc');
            
            console.log('Load recent tasks response:', response);
            
            if (response && response.success) {
                this.renderRecentTasks(response.data?.tasks || []);
            } else {
                console.error('Failed to load recent tasks:', response);
                this.renderRecentTasks([]);
            }
        } catch (error) {
            console.error('Load recent tasks error:', error);
            this.renderRecentTasks([]);
        }
    }

    renderTasks() {
        try {
            const container = document.getElementById('tasksList');
            const emptyState = document.getElementById('tasksEmpty');
            
            if (!container || !emptyState) {
                console.error('Task container elements not found');
                return;
            }
            
            if (!this.tasks || this.tasks.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            container.style.display = 'block';
            emptyState.style.display = 'none';
            
            // タスクHTMLを生成
            container.innerHTML = this.tasks.map(task => {
                try {
                    return this.createTaskHTML(task);
                } catch (error) {
                    console.error('Error creating task HTML:', error, task);
                    return `<div class="task-item error">タスクの表示でエラーが発生しました: ${task?.title || 'Unknown'}</div>`;
                }
            }).join('');
            
            console.log('Tasks rendered:', this.tasks.length, 'items');
            
        } catch (error) {
            console.error('Error in renderTasks:', error);
            const container = document.getElementById('tasksList');
            if (container) {
                container.innerHTML = '<div class="error">タスクの表示でエラーが発生しました</div>';
            }
        }
    }

    addTaskEventListeners() {
        console.log('Adding task event listeners for', this.tasks.length, 'tasks');
        
        this.tasks.forEach(task => {
            try {
                const taskElement = document.getElementById(`task-${task._id}`);
                if (!taskElement) {
                    console.warn('Task element not found:', `task-${task._id}`);
                    return;
                }

                console.log('Adding listeners for task:', task._id);

                // チェックボックスのイベントリスナー
                const checkbox = taskElement.querySelector('.task-checkbox');
                if (checkbox) {
                    // 既存のイベントリスナーを削除
                    const newCheckbox = checkbox.cloneNode(true);
                    checkbox.parentNode.replaceChild(newCheckbox, checkbox);
                    
                    newCheckbox.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('Checkbox clicked for task:', task._id);
                        this.toggleTask(task._id);
                    });
                }
                
                // 編集ボタンのイベントリスナー
                const editBtn = taskElement.querySelector('.task-action-btn.edit');
                if (editBtn) {
                    // 既存のイベントリスナーを削除
                    const newEditBtn = editBtn.cloneNode(true);
                    editBtn.parentNode.replaceChild(newEditBtn, editBtn);
                    
                    newEditBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('Edit button clicked for task:', task._id);
                        this.editTask(task);
                    });
                    
                    console.log('Edit button listener added for task:', task._id);
                } else {
                    console.warn('Edit button not found for task:', task._id);
                }
                
                // 削除ボタンのイベントリスナー
                const deleteBtn = taskElement.querySelector('.task-action-btn.delete');
                if (deleteBtn) {
                    // 既存のイベントリスナーを削除
                    const newDeleteBtn = deleteBtn.cloneNode(true);
                    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                    
                    newDeleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('Delete button clicked for task:', task._id);
                        this.deleteTask(task._id);
                    });
                    
                    console.log('Delete button listener added for task:', task._id);
                }
                
            } catch (error) {
                console.error('Error adding event listeners for task:', error, task);
            }
        });
        
        console.log('Task event listeners setup completed');
    }

    renderRecentTasks(tasks) {
        const container = document.getElementById('recentTasks');
        
        if (!container) {
            console.error('Recent tasks container not found');
            return;
        }
        
        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">最近のタスクがありません</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
        
        console.log('Recent tasks rendered:', tasks.length, 'items');
    }

    createTaskHTML(task) {
        try {
            // タスクデータの検証
            if (!task || !task._id) {
                throw new Error('Invalid task data');
            }

            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && !task.completed;
            const dueDateStr = dueDate ? this.formatDate(dueDate) : '';
            
            // assignedToの安全な処理
            let assigneeInitials = '';
            let assigneeName = '未割り当て';
            
            if (task.assignedTo && task.assignedTo.displayName) {
                assigneeName = task.assignedTo.displayName;
                assigneeInitials = assigneeName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase();
            }

            // createdByの安全な処理と権限チェック
            const canEdit = true; // すべてのユーザーがタスクを編集可能にする
            const canDelete = task.createdBy && this.user && task.createdBy._id === this.user._id;
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task._id}">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title || 'タイトルなし')}</div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority || 'medium'}">${this.getPriorityLabel(task.priority || 'medium')}</span>
                            ${dueDateStr ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                                <i class="fas fa-calendar"></i> ${dueDateStr}
                            </span>` : ''}
                            <span class="task-assignee">
                                <div class="task-assignee-avatar">${assigneeInitials || '?'}</div>
                                ${assigneeName}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit" title="編集" data-task-id="${task._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${canDelete ? `<button class="task-action-btn delete" title="削除" data-task-id="${task._id}">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error in createTaskHTML:', error, task);
            return `
                <div class="task-item error">
                    <div class="task-content">
                        <div class="task-title">エラー: タスクの表示に失敗しました</div>
                        <div class="task-meta">
                            <span class="error-details">${error.message}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) {
                console.error('Task not found:', taskId);
                this.showNotification('error', 'エラー', 'タスクが見つかりません');
                return;
            }
            
            console.log('Toggling task:', taskId, 'current completed:', task.completed);
            
            // completedとstatusの両方を送信して互換性を確保
            const newCompleted = !task.completed;
            const newStatus = newCompleted ? 'completed' : 'pending';
            
            const response = await this.apiCall(`/api/tasks/${taskId}`, 'PUT', {
                completed: newCompleted,
                status: newStatus
            });
            
            console.log('Toggle task response:', response);
            
            if (response && response.success) {
                // タスクリストを再読み込み
                await this.loadTasks();
                await this.loadStats();
                
                const action = newCompleted ? '完了' : '未完了に変更';
                this.showNotification('success', 'タスク更新', `タスクを${action}しました`);
                
                // Socket通知
                if (this.socket) {
                    this.socket.emit('task-updated', response.data);
                }
            } else {
                console.error('Toggle task failed:', response);
                this.showNotification('error', 'エラー', response?.message || 'タスクの更新に失敗しました');
            }
        } catch (error) {
            console.error('Toggle task error:', error);
            this.showNotification('error', 'エラー', `タスクの更新中にエラーが発生しました: ${error.message}`);
        }
    }

    async editTask(task) {
        try {
            console.log('Editing task:', task);
            
            if (!task || !task._id) {
                console.error('Invalid task data for editing:', task);
                this.showNotification('error', 'エラー', '無効なタスクデータです');
                return;
            }

            // 最新のタスクデータを取得
            let taskData = task;
            try {
                taskData = await this.getTaskDetails(task._id);
                console.log('Latest task data retrieved:', taskData);
            } catch (error) {
                console.warn('Failed to get latest task details, using current data:', error);
                // 現在のタスクデータを使用して続行
            }

            this.currentEditingTask = taskData;
            
            // モーダルタイトルを設定
            const modalTitle = document.getElementById('taskModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'タスクを編集';
            }
            
            // フォームフィールドを設定
            const titleField = document.getElementById('taskTitle');
            const descriptionField = document.getElementById('taskDescription');
            const priorityField = document.getElementById('taskPriority');
            const dueDateField = document.getElementById('taskDueDate');
            const assignedToField = document.getElementById('taskAssignedTo');
            
            // フィールドの安全な設定
            if (titleField) titleField.value = taskData?.title || '';
            if (descriptionField) descriptionField.value = taskData?.description || '';
            if (priorityField) priorityField.value = taskData?.priority || 'medium';
            
            // 期限日の設定
            if (dueDateField) {
                dueDateField.value = ''; // まずクリア
                if (taskData?.dueDate) {
                    try {
                        const date = new Date(taskData.dueDate);
                        if (!isNaN(date.getTime())) {
                            // 日時フィールド用のフォーマット（YYYY-MM-DDTHH:mm）
                            dueDateField.value = date.toISOString().slice(0, 16);
                        }
                    } catch (error) {
                        console.warn('Invalid due date format:', taskData.dueDate, error);
                    }
                }
            }
            
            // 担当者の設定
            if (assignedToField) {
                // 最初にユーザーリストを読み込み
                await this.loadAllUsers();
                
                if (taskData?.assignedTo?._id) {
                    assignedToField.value = taskData.assignedTo._id;
                } else if (taskData?.assignedTo?.id) {
                    assignedToField.value = taskData.assignedTo.id;
                } else {
                    assignedToField.value = this.user?._id || this.user?.id || '';
                }
                
                console.log('Assigned user set to:', assignedToField.value);
            }
            
            console.log('Task edit form populated successfully');
            this.showTaskModal();
        } catch (error) {
            console.error('Error in editTask:', error);
            this.showNotification('error', 'エラー', `タスク編集フォームの表示中にエラーが発生しました: ${error.message}`);
        }
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

    async showTaskModal() {
        try {
            console.log('=== SHOWING TASK MODAL ===');
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.classList.add('show');
                
                // 新規作成の場合、タイトルを設定
                if (!this.currentEditingTask) {
                    const modalTitle = document.getElementById('taskModalTitle');
                    if (modalTitle) {
                        modalTitle.textContent = '新しいタスク';
                    }
                }
                
                console.log('Modal shown, now loading users...');
                
                // ユーザーリストを読み込み
                const users = await this.loadAllUsers();
                console.log('Users loaded in showTaskModal:', users);
                
                console.log('Task modal shown:', this.currentEditingTask ? 'Edit mode' : 'Create mode');
            } else {
                console.error('Task modal element not found');
            }
        } catch (error) {
            console.error('Error showing task modal:', error);
        }
    }

    hideTaskModal() {
        try {
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.classList.remove('show');
            }
            
            // フォームをリセット
            const form = document.getElementById('taskForm');
            if (form) {
                form.reset();
            }
            
            // 担当者プルダウンのリセット
            const assignedToField = document.getElementById('taskAssignedTo');
            if (assignedToField) {
                assignedToField.value = '';
            }
            
            // ユーザー検索結果を非表示（互換性のため保持）
            const searchResults = document.getElementById('userSearchResults');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
            
            // 編集中のタスクをクリア
            this.currentEditingTask = null;
            
            console.log('Task modal hidden and form reset');
        } catch (error) {
            console.error('Error hiding task modal:', error);
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
                isEdit: !!this.currentEditingTask
            });
            
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
            
            let response;
            let action;
            
            if (this.currentEditingTask) {
                console.log('Updating task:', this.currentEditingTask._id, taskData);
                response = await this.apiCall(`/api/tasks/${this.currentEditingTask._id}`, 'PUT', taskData);
                action = '更新';
            } else {
                console.log('Creating new task:', taskData);
                response = await this.apiCall('/api/tasks', 'POST', taskData);
                action = '作成';
            }
            
            console.log('Task submit response:', response);
            
            if (response && response.success) {
                this.hideTaskModal();
                
                // タスクリストを再読み込み
                await Promise.all([
                    this.loadTasks(),
                    this.loadStats()
                ]);
                
                this.showNotification('success', `タスク${action}`, `タスクを${action}しました`);
                
                // Socket通知
                if (this.socket) {
                    this.socket.emit('task-updated', response.data);
                }
            } else {
                console.error('Task submit failed:', response);
                this.showNotification('error', 'エラー', response?.message || `タスクの${action}に失敗しました`);
            }
        } catch (error) {
            console.error('Task submit error:', error);
            const action = this.currentEditingTask ? '更新' : '作成';
            this.showNotification('error', 'エラー', `タスクの${action}中にエラーが発生しました: ${error.message}`);
        }
    }

    // 古いユーザー検索メソッド（プルダウンに変更したためコメントアウト）
    /*
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
    */

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
        try {
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

            console.log(`API Call: ${method} ${url}`, data ? { data } : '');
            
            const response = await fetch(url, options);
            
            // レスポンスのステータスをチェック
            if (!response.ok) {
                console.error(`HTTP Error: ${response.status} ${response.statusText}`);
                
                // 401エラーの場合、認証をクリアしてログイン画面に戻す（ただし、ログインエンドポイント自体は除く）
                if (response.status === 401 && !url.includes('/login')) {
                    console.log('Unauthorized, redirecting to login...');
                    this.clearAuth();
                    this.showAuthContainer();
                    throw new Error('認証が必要です');
                }
                
                // その他のHTTPエラー
                let errorMessage = `サーバーエラー: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // JSONパースエラーの場合はデフォルトメッセージを使用
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log(`API Response: ${method} ${url}`, result);
            
            return result;
        } catch (error) {
            console.error(`API Call Error: ${method} ${url}`, error);
            throw error;
        }
    }

    async getTaskDetails(taskId) {
        try {
            console.log('Getting task details for:', taskId);
            const response = await this.apiCall(`/api/tasks/${taskId}`, 'GET');
            
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

    async loadAllUsers() {
        try {
            console.log('=== LOADING ALL USERS ===');
            console.log('Loading all users for dropdown...');
            
            // まずデフォルトユーザーを設定（フォールバック）
            this.setupDefaultUsers();
            
            try {
                const response = await this.apiCall('/api/users');
                console.log('Users API response:', response);
                
                if (response && response.success) {
                    const users = response.data.users || [];
                    console.log('All users loaded from API:', users.length, 'users');
                    console.log('User data:', users);
                    
                    if (users.length > 0) {
                        this.setupUserDropdown(users);
                        return users;
                    } else {
                        console.log('No users returned from API, keeping default users');
                        return [];
                    }
                } else {
                    console.error('Failed to load users from API:', response);
                    console.log('Keeping default users');
                    return [];
                }
            } catch (apiError) {
                console.error('API call failed:', apiError);
                console.log('Keeping default users due to API error');
                return [];
            }
            
        } catch (error) {
            console.error('Load all users error:', error);
            // エラーの場合もデフォルトユーザーを設定
            this.setupDefaultUsers();
            return [];
        }
    }

    setupDefaultUsers() {
        console.log('Setting up default users...');
        console.log('Current user:', this.user);
        
        const defaultUsers = [];
        
        // 現在のユーザーを追加
        if (this.user) {
            defaultUsers.push({
                _id: this.user._id || this.user.id || 'current-user',
                displayName: this.user.displayName || this.user.username || 'あなた',
                email: this.user.email || ''
            });
        }
        
        // テスト用のユーザーも追加
        defaultUsers.push({
            _id: 'test-user-1',
            displayName: 'テストユーザー1',
            email: 'test1@example.com'
        });
        
        defaultUsers.push({
            _id: 'test-user-2',
            displayName: 'テストユーザー2', 
            email: 'test2@example.com'
        });
        
        console.log('Default users to setup:', defaultUsers);
        this.setupUserDropdown(defaultUsers);
    }

    setupUserDropdown(users) {
        try {
            console.log('=== SETUP USER DROPDOWN ===');
            const dropdown = document.getElementById('taskAssignedTo');
            if (!dropdown) {
                console.error('User dropdown element not found');
                return;
            }

            console.log('Dropdown element found:', dropdown);
            console.log('Current dropdown children:', dropdown.children.length);
            console.log('Setting up dropdown with users:', users);

            // 既存のオプションをクリア（最初の「選択してください」オプションは保持）
            while (dropdown.children.length > 1) {
                dropdown.removeChild(dropdown.lastChild);
            }

            console.log('Cleared dropdown, remaining children:', dropdown.children.length);

            // ユーザーオプションを追加
            users.forEach((user, index) => {
                console.log(`Adding user ${index}:`, user);
                
                const option = document.createElement('option');
                option.value = user._id || user.id || `user-${index}`;
                option.textContent = `${user.displayName || user.username || 'Unknown'} (${user.email || ''})`;
                
                console.log('Created option:', option.value, option.textContent);
                
                dropdown.appendChild(option);
                
                console.log('Added option to dropdown');
            });

            console.log('Final dropdown children count:', dropdown.children.length);
            console.log('User dropdown populated with', users.length, 'users');
            
            // ドロップダウンのHTMLを確認
            console.log('Dropdown HTML:', dropdown.outerHTML);
            
        } catch (error) {
            console.error('Error setting up user dropdown:', error);
        }
    }

    setupTaskEventDelegation() {
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
                e.stopPropagation();
                
                // チェックボックスのクリック
                if (e.target.closest('.task-checkbox')) {
                    const taskItem = e.target.closest('.task-item');
                    if (taskItem) {
                        const taskId = taskItem.id.replace('task-', '');
                        console.log('Checkbox clicked via delegation for task:', taskId);
                        this.toggleTask(taskId);
                    }
                    return;
                }
                
                // 編集ボタンのクリック
                if (e.target.closest('.task-action-btn.edit')) {
                    const taskItem = e.target.closest('.task-item');
                    if (taskItem) {
                        const taskId = taskItem.id.replace('task-', '');
                        console.log('Edit button clicked via delegation for task:', taskId);
                        const task = this.tasks.find(t => t._id === taskId);
                        if (task) {
                            this.editTask(task);
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
                        this.deleteTask(taskId);
                    }
                    return;
                }
            });
            
            console.log('Event delegation setup for tasksList');
        }
        
        if (recentTasks) {
            // 既存のイベントリスナーを削除
            const newRecentTasks = recentTasks.cloneNode(true);
            recentTasks.parentNode.replaceChild(newRecentTasks, recentTasks);
            
            // イベント委譲でクリックイベントを処理
            newRecentTasks.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // チェックボックスのクリック
                if (e.target.closest('.task-checkbox')) {
                    const taskItem = e.target.closest('.task-item');
                    if (taskItem) {
                        const taskId = taskItem.id.replace('task-', '');
                        console.log('Recent task checkbox clicked via delegation for task:', taskId);
                        this.toggleTask(taskId);
                    }
                    return;
                }
                
                // 編集ボタンのクリック
                if (e.target.closest('.task-action-btn.edit')) {
                    const taskItem = e.target.closest('.task-item');
                    if (taskItem) {
                        const taskId = taskItem.id.replace('task-', '');
                        console.log('Recent task edit button clicked via delegation for task:', taskId);
                        const task = this.tasks.find(t => t._id === taskId);
                        if (task) {
                            this.editTask(task);
                        } else {
                            console.error('Task not found for edit:', taskId);
                        }
                    }
                    return;
                }
            });
            
            console.log('Event delegation setup for recentTasks');
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting WorkerBee App...');
    try {
        new WorkerBeeApp();
        console.log('WorkerBee App instance created successfully');
    } catch (error) {
        console.error('Failed to create WorkerBee App instance:', error);
        // エラー表示用の基本的なHTML要素があれば使用
        const errorContainer = document.getElementById('notifications');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="notification error">
                    <div class="notification-content">
                        <div class="notification-title">アプリケーションエラー</div>
                        <div class="notification-message">アプリケーションの起動に失敗しました: ${error.message}</div>
                    </div>
                </div>
            `;
        }
    }
});
