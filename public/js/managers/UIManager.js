class UIManager {
    constructor(authManager, taskManager, notificationManager) {
        this.authManager = authManager;
        this.taskManager = taskManager;
        this.notificationManager = notificationManager;
        this.currentView = 'dashboard';
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
    }

    renderTasks() {
        try {
            const tasks = this.taskManager.getTasks();
            const user = this.authManager.getUser();
            const allUsers = this.taskManager.getAllUsers();
            const container = document.getElementById('tasksList');
            const emptyState = document.getElementById('tasksEmpty');
            
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

    renderRecentTasks(tasks) {
        const user = this.authManager.getUser();
        const allUsers = this.taskManager.getAllUsers();
        const container = document.getElementById('recentTasks');
        
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
        if (!stats) return;
        
        document.getElementById('totalTasks').textContent = stats.total || 0;
        document.getElementById('completedTasks').textContent = stats.completed || 0;
        document.getElementById('pendingTasks').textContent = stats.pending || 0;
        document.getElementById('overdueTasks').textContent = stats.overdue || 0;
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
            
            if (!task || !task._id) {
                console.error('Invalid task data for editing:', task);
                this.notificationManager.show('error', 'エラー', '無効なタスクデータです');
                return;
            }

            // 最新のタスクデータを取得
            let taskData = task;
            try {
                taskData = await this.taskManager.getTaskDetails(task._id);
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
            
            console.log('Task edit form populated successfully');
            
        } catch (error) {
            console.error('Error in populateTaskEditForm:', error);
            this.notificationManager.show('error', 'エラー', `タスク編集フォームの表示中にエラーが発生しました: ${error.message}`);
        }
    }
}
