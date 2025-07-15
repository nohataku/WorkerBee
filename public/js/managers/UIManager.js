class UIManager {
    constructor(authManager, taskManager, notificationManager) {
        this.authManager = authManager;
        this.taskManager = taskManager;
        this.notificationManager = notificationManager;
        this.currentView = 'dashboard';
        this.calendarManager = null;
        this.ganttManager = null;
        this.eventManager = null; // EventManagerの参照を追加
        this.isMobileSidebarOpen = false;
        this.initializeMobileMenu();
    }

    // EventManagerの参照を設定するメソッド
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }

    initializeMobileMenu() {
        // モバイルメニューのイベントリスナーを設定
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindMobileMenuEvents();
            });
        } else {
            // DOMが既に読み込まれている場合は直接実行
            this.bindMobileMenuEvents();
        }
    }

    bindMobileMenuEvents() {
        console.log('Binding mobile menu events...');
        
        // 既存のイベントリスナーを削除するため、関数を保存
        if (this.mobileMenuClickHandler) {
            const existingBtn = document.getElementById('mobileMenuBtn');
            if (existingBtn) {
                existingBtn.removeEventListener('click', this.mobileMenuClickHandler);
            }
        }
        
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const sidebar = document.getElementById('sidebar');

        console.log('Mobile menu elements:', {
            mobileMenuBtn,
            closeSidebarBtn,
            mobileOverlay,
            sidebar
        });

        if (mobileMenuBtn) {
            // クリックハンドラーを保存
            this.mobileMenuClickHandler = (e) => {
                console.log('Mobile menu button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileSidebar();
            };
            
            mobileMenuBtn.addEventListener('click', this.mobileMenuClickHandler);
            console.log('Mobile menu button event listener added');
        } else {
            console.warn('Mobile menu button not found');
        }

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', (e) => {
                console.log('Close sidebar button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.closeMobileSidebar();
            });
        } else {
            console.warn('Close sidebar button not found');
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', (e) => {
                console.log('Mobile overlay clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.closeMobileSidebar();
            });
        } else {
            console.warn('Mobile overlay not found');
        }

        // ナビゲーションアイテムクリック時にモバイルサイドバーを閉じる
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeMobileSidebar();
                }
            });
        });

        // ウィンドウリサイズ時の処理
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileSidebar();
            }
        });
    }

    toggleMobileSidebar() {
        console.log('Toggle mobile sidebar called. Current state:', this.isMobileSidebarOpen);
        console.log('Current window width:', window.innerWidth);
        console.log('Is mobile screen:', window.innerWidth <= 768);
        
        if (this.isMobileSidebarOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        console.log('Opening mobile sidebar...');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        console.log('Sidebar elements:', { sidebar, mobileOverlay });
        
        if (sidebar && mobileOverlay) {
            console.log('Before adding class - sidebar classes:', sidebar.className);
            console.log('Before adding class - overlay classes:', mobileOverlay.className);
            
            // 確実にクラスを追加
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
            this.isMobileSidebarOpen = true;
            
            console.log('After adding class - sidebar classes:', sidebar.className);
            console.log('After adding class - overlay classes:', mobileOverlay.className);
            
            // スタイルを強制的に適用
            setTimeout(() => {
                // サイドバーのスタイルを確認
                const sidebarStyles = window.getComputedStyle(sidebar);
                console.log('Sidebar computed styles:', {
                    position: sidebarStyles.position,
                    left: sidebarStyles.left,
                    top: sidebarStyles.top,
                    width: sidebarStyles.width,
                    height: sidebarStyles.height,
                    transform: sidebarStyles.transform,
                    zIndex: sidebarStyles.zIndex,
                    display: sidebarStyles.display,
                    visibility: sidebarStyles.visibility,
                    backgroundColor: sidebarStyles.backgroundColor
                });
                
                // 念のため、スタイルを直接適用
                sidebar.style.transform = 'translateX(0)';
                console.log('Forced sidebar transform to translateX(0)');
            }, 50);
            
            console.log('Mobile sidebar opened successfully');
            
            // スクロールを無効化
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Sidebar or mobile overlay not found');
        }
    }

    closeMobileSidebar() {
        console.log('Closing mobile sidebar...');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (sidebar && mobileOverlay) {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
            this.isMobileSidebarOpen = false;
            
            // スタイルを直接リセット
            sidebar.style.transform = '';
            
            console.log('Mobile sidebar closed successfully');
            
            // スクロールを有効化
            document.body.style.overflow = '';
        } else {
            console.error('Sidebar or mobile overlay not found');
        }
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
        
        // モバイルメニューのイベントリスナーは既にinitializeMobileMenuで設定済み
        console.log('App container shown');
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
    }

    showRegisterForm() {
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
    }

    setupUserInfo() {
        const user = this.authManager.getUser();
        document.getElementById('userName').textContent = user.displayName;
        document.getElementById('userEmail').textContent = user.email;
        
        // アバターの初期化
        const avatar = document.getElementById('userAvatar');
        if (user.avatar) {
            avatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
        } else {
            avatar.innerHTML = `<i class="fas fa-user"></i>`;
        }
    }

    showView(viewName) {
        console.log('Switching to view:', viewName);
        
        // ナビゲーションアイテムの更新
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`[data-view="${viewName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        } else {
            console.error('Navigation item not found for view:', viewName);
        }

        // ビューの切り替え
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        const viewElement = document.getElementById(`${viewName}View`);
        if (viewElement) {
            viewElement.classList.add('active');
            console.log('View element shown:', viewName);
        } else {
            console.error('View element not found:', `${viewName}View`);
        }

        this.currentView = viewName;
        
        // カレンダービューの初期化
        if (viewName === 'calendar') {
            console.log('Calendar view selected');
            // EventManagerのhandleCalendarLoadを呼び出す
            if (this.eventManager) {
                this.eventManager.handleCalendarLoad().catch(error => {
                    console.error('Error loading calendar:', error);
                });
            }
        }
        
        // ガントチャートビューの初期化
        if (viewName === 'gantt') {
            console.log('Gantt view selected');
            // EventManagerのhandleGanttLoadを呼び出す
            if (this.eventManager) {
                this.eventManager.handleGanttLoad().catch(error => {
                    console.error('Error loading gantt:', error);
                });
            }
        }
    }

    async renderTasks() {
        try {
            const tasks = this.taskManager.getTasks();
            const user = this.authManager.getUser();
            let allUsers = this.taskManager.getAllUsers();
            
            // ユーザーリストが空の場合は読み込み（現在ユーザーも含める）
            if (allUsers.length === 0) {
                console.log('AllUsers is empty, loading users with current user...');
                allUsers = await this.taskManager.ensureUsersIncludeCurrentUser();
            }
            
            const container = document.getElementById('tasksList');
            const emptyState = document.getElementById('tasksEmpty');
            
            console.log('=== UIManager.renderTasks DEBUG ===');
            console.log('Tasks count:', tasks.length);
            console.log('AllUsers count:', allUsers.length);
            if (allUsers.length === 0) {
                console.log('WARNING: AllUsers is empty!');
            }
            
            if (!container || !emptyState) {
                console.error('Task container elements not found');
                return;
            }
            
            if (!tasks || tasks.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            container.style.display = 'block';
            emptyState.style.display = 'none';
            
            // タスクHTMLを生成（allUsersを渡す）
            container.innerHTML = tasks.map(task => {
                try {
                    return TaskUtils.createTaskHTML(task, user, allUsers);
                } catch (error) {
                    console.error('Error creating task HTML:', error, task);
                    return `<div class="task-item error">タスクの表示でエラーが発生しました: ${task?.title || 'Unknown'}</div>`;
                }
            }).join('');
            
            console.log('Tasks rendered:', tasks.length, 'items');
            
        } catch (error) {
            console.error('Error in renderTasks:', error);
            const container = document.getElementById('tasksList');
            if (container) {
                container.innerHTML = '<div class="error">タスクの表示でエラーが発生しました</div>';
            }
        }
    }

    async renderRecentTasks(tasks) {
        const user = this.authManager.getUser();
        let allUsers = this.taskManager.getAllUsers();
        
        // ユーザーリストが空の場合は読み込み（現在ユーザーも含める）
        if (allUsers.length === 0) {
            console.log('AllUsers is empty in renderRecentTasks, loading users with current user...');
            allUsers = await this.taskManager.ensureUsersIncludeCurrentUser();
        }
        
        const container = document.getElementById('recentTasks');
        
        console.log('=== UIManager.renderRecentTasks DEBUG ===');
        console.log('Recent tasks count:', tasks.length);
        console.log('AllUsers count:', allUsers.length);
        if (allUsers.length === 0) {
            console.log('WARNING: AllUsers is empty in renderRecentTasks!');
        }
        
        if (!container) {
            console.error('Recent tasks container not found');
            return;
        }
        
        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">最近のタスクがありません</p>';
            return;
        }
        
        container.innerHTML = tasks.map(task => TaskUtils.createTaskHTML(task, user, allUsers)).join('');
        
        console.log('Recent tasks rendered:', tasks.length, 'items');
    }

    updateStatsDisplay(stats) {
        console.log('UIManager.updateStatsDisplay: Received stats:', stats);
        
        if (!stats) {
            console.warn('UIManager.updateStatsDisplay: Stats is null or undefined');
            return;
        }
        
        const totalElement = document.getElementById('totalTasks');
        const completedElement = document.getElementById('completedTasks');
        const pendingElement = document.getElementById('pendingTasks');
        const overdueElement = document.getElementById('overdueTasks');
        
        console.log('UIManager.updateStatsDisplay: DOM elements found:', {
            total: !!totalElement,
            completed: !!completedElement,
            pending: !!pendingElement,
            overdue: !!overdueElement
        });
        
        if (totalElement) totalElement.textContent = stats.total || 0;
        if (completedElement) completedElement.textContent = stats.completed || 0;
        if (pendingElement) pendingElement.textContent = stats.pending || 0;
        if (overdueElement) overdueElement.textContent = stats.overdue || 0;
        
        console.log('UIManager.updateStatsDisplay: Updated values:', {
            total: stats.total || 0,
            completed: stats.completed || 0,
            pending: stats.pending || 0,
            overdue: stats.overdue || 0
        });
    }

    async showTaskModal() {
        try {
            console.log('=== SHOWING TASK MODAL ===');
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.classList.add('show');
                
                // 新規作成の場合、タイトルを設定
                if (!this.taskManager.getCurrentEditingTask()) {
                    const modalTitle = document.getElementById('taskModalTitle');
                    if (modalTitle) {
                        modalTitle.textContent = '新しいタスク';
                    }
                }
                
                console.log('Modal shown, now loading users...');
                
                // ユーザーリストを読み込み
                const users = await this.taskManager.loadAllUsers();
                console.log('Users loaded in showTaskModal:', users);
                this.setupUserDropdown(users);
                
                // 依存関係のドロップダウンを設定
                const tasks = this.taskManager.getTasks();
                const currentTaskId = this.taskManager.getCurrentEditingTask()?.id || this.taskManager.getCurrentEditingTask()?._id;
                this.setupDependencyDropdown(tasks, currentTaskId);
                
                console.log('Task modal shown:', this.taskManager.getCurrentEditingTask() ? 'Edit mode' : 'Create mode');
            } else {
                console.error('Task modal element not found');
            }
        } catch (error) {
            console.error('Error showing task modal:', error);
        }
    }

    hideTaskModal() {
        try {
            console.log('=== HIDING TASK MODAL ===');
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.classList.remove('show');
                // 直接設定されたstyleもクリア
                modal.style.display = '';
                console.log('Modal hidden successfully');
            } else {
                console.error('Task modal element not found');
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
            
            // 依存関係プルダウンのリセット
            const dependenciesField = document.getElementById('taskDependencies');
            if (dependenciesField) {
                dependenciesField.selectedIndex = -1;
            }
            
            // 開始日・期限日のリセット
            const startDateField = document.getElementById('taskStartDate');
            const dueDateField = document.getElementById('taskDueDate');
            if (startDateField) {
                startDateField.value = '';
            }
            if (dueDateField) {
                dueDateField.value = '';
            }
            
            // ユーザー検索結果を非表示（互換性のため保持）
            const searchResults = document.getElementById('userSearchResults');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
            
            // 編集中のタスクをクリア
            this.taskManager.setCurrentEditingTask(null);
            
            console.log('Task modal hidden and form reset');
        } catch (error) {
            console.error('Error hiding task modal:', error);
        }
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

    setupDefaultUsers() {
        console.log('Setting up default users...');
        const user = this.authManager.getUser();
        console.log('Current user:', user);
        
        const defaultUsers = [];
        
        // 現在のユーザーを追加
        if (user) {
            defaultUsers.push({
                _id: user._id || user.id || 'current-user',
                displayName: user.displayName || user.username || 'あなた',
                email: user.email || ''
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

    async populateTaskEditForm(task) {
        try {
            console.log('Populating task edit form with:', task);
            
            const taskId = task?._id || task?.id;
            if (!task || !taskId) {
                console.error('Invalid task data for editing:', task);
                this.notificationManager.show('error', 'エラー', '無効なタスクデータです');
                return;
            }

            // 最新のタスクデータを取得
            let taskData = task;
            try {
                taskData = await this.taskManager.getTaskDetails(taskId);
                console.log('Latest task data retrieved:', taskData);
            } catch (error) {
                console.warn('Failed to get latest task details, using current data:', error);
                // 現在のタスクデータを使用して続行
            }

            this.taskManager.setCurrentEditingTask(taskData);
            
            // モーダルタイトルを設定
            const modalTitle = document.getElementById('taskModalTitle');
            if (modalTitle) {
                modalTitle.textContent = 'タスクを編集';
            }
            
            // フォームフィールドを設定
            const titleField = document.getElementById('taskTitle');
            const descriptionField = document.getElementById('taskDescription');
            const priorityField = document.getElementById('taskPriority');
            const startDateField = document.getElementById('taskStartDate');
            const dueDateField = document.getElementById('taskDueDate');
            const assignedToField = document.getElementById('taskAssignedTo');
            
            // フィールドの安全な設定
            if (titleField) titleField.value = taskData?.title || '';
            if (descriptionField) descriptionField.value = taskData?.description || '';
            if (priorityField) priorityField.value = taskData?.priority || 'medium';
            
            // 開始日の設定
            if (startDateField) {
                startDateField.value = ''; // まずクリア
                if (taskData?.startDate) {
                    try {
                        const date = new Date(taskData.startDate);
                        if (!isNaN(date.getTime())) {
                            // 日時フィールド用のフォーマット（YYYY-MM-DDTHH:mm）
                            startDateField.value = date.toISOString().slice(0, 16);
                        }
                    } catch (error) {
                        console.warn('Invalid start date format:', taskData.startDate, error);
                    }
                }
            }
            
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
                await this.taskManager.loadAllUsers();
                this.setupUserDropdown(this.taskManager.getAllUsers());
                
                if (taskData?.assignedTo?._id) {
                    assignedToField.value = taskData.assignedTo._id;
                } else if (taskData?.assignedTo?.id) {
                    assignedToField.value = taskData.assignedTo.id;
                } else {
                    const user = this.authManager.getUser();
                    assignedToField.value = user?._id || user?.id || '';
                }
                
                console.log('Assigned user set to:', assignedToField.value);
            }
            
            // 依存関係の設定
            const dependenciesField = document.getElementById('taskDependencies');
            if (dependenciesField) {
                // 依存関係ドロップダウンを更新
                const tasks = this.taskManager.getTasks();
                const taskId = taskData?.id || taskData?._id;
                this.setupDependencyDropdown(tasks, taskId);
                
                // 現在の依存関係を選択
                if (taskData?.dependencies && Array.isArray(taskData.dependencies)) {
                    Array.from(dependenciesField.options).forEach(option => {
                        option.selected = taskData.dependencies.includes(option.value);
                    });
                }
                
                console.log('Dependencies set to:', taskData?.dependencies);
            }
            
            console.log('Task edit form populated successfully');
            
        } catch (error) {
            console.error('Error in populateTaskEditForm:', error);
            this.notificationManager.show('error', 'エラー', `タスク編集フォームの表示中にエラーが発生しました: ${error.message}`);
        }
    }

    updateViews() {
        // 現在のビューに応じてデータを更新
        const tasks = this.taskManager.getTasks();
        
        if (this.calendarManager) {
            this.calendarManager.loadTasks(tasks);
        }
        
        if (this.ganttManager) {
            this.ganttManager.loadAllTasks();
        }
    }

    // リアルタイム更新を各ビューに通知
    onTaskUpdated(updatedTask) {
        console.log('UIManager: Real-time task update received:', updatedTask);
        
        if (this.calendarManager) {
            this.calendarManager.onTaskUpdated && this.calendarManager.onTaskUpdated(updatedTask);
        }
        
        if (this.ganttManager) {
            this.ganttManager.onTaskUpdated(updatedTask);
        }
    }

    onTaskDeleted(deletedTaskId) {
        console.log('UIManager: Real-time task deletion received:', deletedTaskId);
        
        if (this.calendarManager) {
            this.calendarManager.onTaskDeleted && this.calendarManager.onTaskDeleted(deletedTaskId);
        }
        
        if (this.ganttManager) {
            this.ganttManager.onTaskDeleted(deletedTaskId);
        }
    }

    onTaskAdded(newTask) {
        console.log('UIManager: Real-time task addition received:', newTask);
        
        if (this.calendarManager) {
            this.calendarManager.onTaskAdded && this.calendarManager.onTaskAdded(newTask);
        }
        
        if (this.ganttManager) {
            this.ganttManager.onTaskAdded(newTask);
        }
    }

    refreshCurrentView() {
        if (this.currentView === 'calendar' && this.calendarManager) {
            this.calendarManager.refreshCalendar();
        } else if (this.currentView === 'gantt' && this.ganttManager) {
            this.ganttManager.refreshGantt();
        }
    }

    openTaskModal(mode = 'create', task = null) {
        console.log('Opening task modal:', mode, task);
        
        // 編集モードの場合、現在のタスクを設定
        if (mode === 'edit' && task) {
            this.taskManager.setCurrentEditingTask(task);
        } else {
            this.taskManager.setCurrentEditingTask(null);
        }
        
        // モーダルを表示
        this.showTaskModal();
    }

    setupDependencyDropdown(tasks, currentTaskId = null) {
        try {
            console.log('=== SETUP DEPENDENCY DROPDOWN ===');
            const dropdown = document.getElementById('taskDependencies');
            if (!dropdown) {
                console.error('Dependency dropdown element not found');
                return;
            }

            console.log('Setting up dependency dropdown with tasks:', tasks);

            // 既存のオプションをクリア
            dropdown.innerHTML = '';

            // 現在のタスクを除外し、利用可能なタスクを追加
            const availableTasks = tasks.filter(task => {
                const taskId = task._id || task.id;
                return taskId !== currentTaskId && task.status !== 'completed';
            });

            availableTasks.forEach(task => {
                const option = document.createElement('option');
                option.value = task._id || task.id;
                option.textContent = `${task.title} (${task.status})`;
                dropdown.appendChild(option);
            });

            console.log('Dependency dropdown populated with', availableTasks.length, 'tasks');
            
        } catch (error) {
            console.error('Error setting up dependency dropdown:', error);
        }
    }
}
