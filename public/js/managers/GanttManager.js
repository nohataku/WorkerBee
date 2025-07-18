class GanttManager {
    constructor(taskManager, notificationManager) {
        this.taskManager = taskManager;
        this.notificationManager = notificationManager;
        this.gantt = null;
        this.tasks = [];
        this.isInitialized = false;
        this.isUpdating = false; // 更新中フラグ
        this.pendingUpdates = new Map(); // 保留中の更新を追跡
    }

    init() {
        try {
            this.initGantt();
            this.setupEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing GanttManager:', error);
        }
    }

    initGantt() {
        
        const ganttEl = document.getElementById('gantt_here');
        if (!ganttEl) {
            console.error('Gantt element not found!');
            return;
        }
        
        if (typeof gantt === 'undefined') {
            console.error('DHTMLX Gantt library not loaded!');
            return;
        }
        
        // モバイル対応の設定
        const isMobile = window.innerWidth <= 768;
        
        // ガントチャートの設定
        gantt.config.date_format = "%Y-%m-%d %H:%i:%s";
        gantt.config.autosize = "y";
        gantt.config.fit_tasks = true;
        
        // モバイル対応のグリッド幅設定
        gantt.config.grid_width = isMobile ? 200 : 350;
        gantt.config.min_column_width = isMobile ? 50 : 70;
        
        // スケール設定をモバイルに最適化
        if (isMobile) {
            gantt.config.scales = [
                {unit: "day", step: 1, format: "%m/%d"}
            ];
        } else {
            gantt.config.scales = [
                {unit: "week", step: 1, format: "%M %d"},
                {unit: "day", step: 1, format: "%d"}
            ];
        }
        
        // ドラッグ&ドロップとリサイズを有効化
        gantt.config.drag_move = true;
        gantt.config.drag_resize = true;
        gantt.config.drag_progress = false; // プログレスのドラッグは無効化
        gantt.config.drag_links = false; // リンクのドラッグは無効化（今後実装）
        
        // 確認ダイアログを無効化（カスタムで処理）
        gantt.config.auto_scheduling = false;
        gantt.config.auto_scheduling_strict = false;
        
        // モバイル対応のスクロール設定
        gantt.config.scroll_on_load = true;
        gantt.config.preserve_scroll = true;
        
        // 列の設定をモバイルに最適化
        if (isMobile) {
            gantt.config.columns = [
                { name: "text", label: "タスク", width: 120, tree: true },
                { name: "assignee", label: "担当", width: 60 },
                { name: "priority", label: "優先", width: 50 }
            ];
        } else {
            gantt.config.columns = [
                { name: "text", label: "タスク名", width: 200, tree: true },
                { name: "assignee", label: "担当者", width: 80 },
                { name: "priority", label: "優先度", width: 70 }
            ];
        }

        // 日本語化
        gantt.locale = {
            date: {
                month_full: ["1月", "2月", "3月", "4月", "5月", "6月", 
                           "7月", "8月", "9月", "10月", "11月", "12月"],
                month_short: ["1月", "2月", "3月", "4月", "5月", "6月", 
                            "7月", "8月", "9月", "10月", "11月", "12月"],
                day_full: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
                day_short: ["日", "月", "火", "水", "木", "金", "土"]
            },
            labels: {
                new_task: "新しいタスク",
                icon_save: "保存",
                icon_cancel: "キャンセル",
                icon_details: "詳細",
                icon_edit: "編集",
                icon_delete: "削除",
                confirm_closing: "変更は保存されません。続行しますか？",
                confirm_deleting: "タスクを削除しますか？",
                section_description: "説明",
                section_time: "期間",
                section_type: "タイプ"
            }
        };

        // テンプレート設定
        gantt.templates.task_class = (start, end, task) => {
            let classes = [];
            
            if (task.priority) {
                classes.push(`priority-${task.priority}`);
            }
            
            if (task.status === 'completed') {
                classes.push('completed');
            }
            
            return classes.join(' ');
        };

        gantt.templates.task_text = (start, end, task) => {
            return `<span>${task.text}</span>`;
        };

        gantt.templates.grid_row_class = (start, end, task) => {
            if (task.status === 'completed') {
                return 'completed';
            }
            return '';
        };

        // イベントハンドラー
        gantt.attachEvent("onAfterTaskAdd", (id, task) => {
            this.handleTaskAdd(id, task);
        });

        gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
            this.handleTaskUpdate(id, task);
        });

        gantt.attachEvent("onAfterTaskDelete", (id, task) => {
            this.handleTaskDelete(id, task);
        });

        // タスクの移動・リサイズ時のイベント
        gantt.attachEvent("onAfterTaskMove", (id, mode, task) => {
            this.handleTaskMove(id, mode, task);
        });

        gantt.attachEvent("onAfterTaskDrag", (id, mode, task) => {
            this.handleTaskDrag(id, mode, task);
        });

        gantt.attachEvent("onTaskDblClick", (id, e) => {
            this.handleTaskDoubleClick(id);
            return false; // デフォルトの編集を無効化
        });

        // ガントチャートを初期化
        gantt.init("gantt_here");
        
        // モバイル対応のために初期化後にサイズを調整
        setTimeout(() => {
            gantt.setSizes();
            if (isMobile) {
                // モバイルでは今日にスクロール
                const today = new Date();
                gantt.showDate(today);
            }
        }, 100);
        
    }

    setupEventListeners() {
        // ズームコントロール
        document.getElementById('ganttZoomIn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('ganttZoomOut').addEventListener('click', () => {
            this.zoomOut();
        });

        // スケール変更
        document.getElementById('ganttScale').addEventListener('change', (e) => {
            this.changeScale(e.target.value);
        });

        // 新しいタスク追加
        document.getElementById('addTaskFromGantt').addEventListener('click', () => {
            this.addNewTask();
        });

        // 画面リサイズ時のガントチャート調整
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // モバイル用のタッチイベントを設定
        this.setupMobileGanttEvents();
    }

    // モバイル向けのタッチイベントを設定
    setupMobileGanttEvents() {
        if (!this.isInitialized) return;

        const ganttContainer = document.querySelector('.gantt-container');
        if (!ganttContainer) return;

        let isScrolling = false;
        let startX = 0;
        let scrollLeft = 0;

        // タッチスクロールの改善
        ganttContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isScrolling = true;
                startX = e.touches[0].pageX - ganttContainer.offsetLeft;
                scrollLeft = ganttContainer.scrollLeft;
            }
        }, { passive: true });

        ganttContainer.addEventListener('touchmove', (e) => {
            if (!isScrolling || e.touches.length !== 1) return;
            
            const x = e.touches[0].pageX - ganttContainer.offsetLeft;
            const walk = (x - startX) * 2; // スクロール速度を調整
            ganttContainer.scrollLeft = scrollLeft - walk;
        }, { passive: true });

        ganttContainer.addEventListener('touchend', () => {
            isScrolling = false;
        }, { passive: true });

        // ピンチズームの無効化（ガントチャートのズーム機能と競合を避けるため）
        ganttContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
    }

    handleResize() {
        if (!this.isInitialized || !gantt) return;

        const isMobile = window.innerWidth <= 768;
        
        // モバイル対応のグリッド幅再設定
        gantt.config.grid_width = isMobile ? 200 : 350;
        gantt.config.min_column_width = isMobile ? 50 : 70;
        
        // 列の設定を更新
        if (isMobile) {
            gantt.config.columns = [
                { name: "text", label: "タスク", width: 120, tree: true },
                { name: "assignee", label: "担当", width: 60 },
                { name: "priority", label: "優先", width: 50 }
            ];
        } else {
            gantt.config.columns = [
                { name: "text", label: "タスク名", width: 200, tree: true },
                { name: "assignee", label: "担当者", width: 80 },
                { name: "priority", label: "優先度", width: 70 }
            ];
        }

        // スケール設定を更新
        if (isMobile) {
            gantt.config.scales = [
                {unit: "day", step: 1, format: "%m/%d"}
            ];
        } else {
            gantt.config.scales = [
                {unit: "week", step: 1, format: "%M %d"},
                {unit: "day", step: 1, format: "%d"}
            ];
        }

        // ガントチャートを再描画
        setTimeout(() => {
            gantt.setSizes();
            gantt.render();
        }, 100);
    }

    loadTasks(tasks) {
        this.tasks = tasks;
        // ユーザーリストの読み込みを確実に行ってからガントチャートを更新
        this.taskManager.loadAllUsers().then(() => {
            this.updateGanttData();
        }).catch(error => {
            console.warn('Failed to load users for gantt chart:', error);
            // ユーザーリストの読み込みに失敗してもガントチャートは更新
            this.updateGanttData();
        });
    }

    async loadAllTasks() {
        try {
            // フィルタを無視してすべてのタスクを取得
            const response = await this.taskManager.apiClient.call('/api/tasks?status=all&limit=100');
            
            let allTasks = [];
            if (response && response.tasks) {
                allTasks = response.tasks;
            } else if (Array.isArray(response)) {
                allTasks = response;
            } else if (response && response.success && response.data) {
                allTasks = response.data.tasks || [];
            }

            this.tasks = allTasks;
            
            // ユーザーリストの読み込みを確実に行ってからガントチャートを更新
            this.taskManager.loadAllUsers().then(() => {
                this.updateGanttData();
            }).catch(error => {
                console.warn('Failed to load users for gantt chart:', error);
                // ユーザーリストの読み込みに失敗してもガントチャートは更新
                this.updateGanttData();
            });
        } catch (error) {
            console.error('Error loading all tasks for gantt chart:', error);
            // フォールバック：TaskManagerの現在のタスクを使用
            this.tasks = this.taskManager.getTasks();
            this.updateGanttData();
        }
    }

    updateGanttData() {
        // TaskManagerから最新のタスクデータを取得
        const latestTasks = this.taskManager.getTasks();
        this.tasks = latestTasks;
        
        const ganttData = {
            data: this.tasks.map(task => {
                const startDate = task.createdAt ? new Date(task.createdAt) : new Date();
                const endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                
                // 担当者名の解決
                let assigneeName = '未割り当て';
                if (task.assignedTo) {
                    // TaskManagerから全ユーザーリストを取得
                    const allUsers = this.taskManager.getAllUsers();
                    
                    if (task.assignedTo.displayName) {
                        // オブジェクトの場合
                        assigneeName = task.assignedTo.displayName;
                    } else if (typeof task.assignedTo === 'string' && allUsers.length > 0) {
                        // IDの場合、ユーザーリストから検索
                        const assignedUser = allUsers.find(user => 
                            user._id === task.assignedTo || 
                            user.id === task.assignedTo ||
                            user.email === task.assignedTo
                        );
                        if (assignedUser) {
                            assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                        }
                    } else if (task.assignedTo._id && allUsers.length > 0) {
                        // オブジェクトでIDが含まれる場合
                        const assignedUser = allUsers.find(user => 
                            user._id === task.assignedTo._id || 
                            user.id === task.assignedTo._id
                        );
                        if (assignedUser) {
                            assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                        }
                    }
                }
                
                // 後方互換性のため、assignedToNameも確認
                if (assigneeName === '未割り当て' && task.assignedToName) {
                    assigneeName = task.assignedToName;
                }
                
                const ganttTask = {
                    id: task._id || task.id,
                    text: task.title,
                    start_date: this.formatDate(startDate),
                    end_date: this.formatDate(endDate),
                    duration: this.calculateDuration(startDate, endDate),
                    progress: task.status === 'completed' ? 1 : 0,
                    priority: task.priority,
                    status: task.status,
                    assignee: assigneeName,
                    description: task.description || '',
                    originalTask: task
                };
                
                return ganttTask;
            }),
            links: [] // タスク間の依存関係（今後実装）
        };
        
        gantt.clearAll();
        gantt.parse(ganttData);
        gantt.render(); // ガントチャートを再描画
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    calculateDuration(startDate, endDate) {
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(diffDays, 1);
    }

    zoomIn() {
        const currentScale = gantt.config.scales[0].unit;
        
        if (currentScale === "month") {
            this.changeScale("week");
        } else if (currentScale === "week") {
            this.changeScale("day");
        }
    }

    zoomOut() {
        const currentScale = gantt.config.scales[0].unit;
        
        if (currentScale === "day") {
            this.changeScale("week");
        } else if (currentScale === "week") {
            this.changeScale("month");
        }
    }

    changeScale(scale) {
        switch (scale) {
            case "day":
                gantt.config.scales = [
                    {unit: "day", step: 1, format: "%M %d"},
                    {unit: "hour", step: 6, format: "%H:%i"}
                ];
                break;
            case "week":
                gantt.config.scales = [
                    {unit: "week", step: 1, format: "%M %d"},
                    {unit: "day", step: 1, format: "%d"}
                ];
                break;
            case "month":
                gantt.config.scales = [
                    {unit: "month", step: 1, format: "%Y年%M"},
                    {unit: "week", step: 1, format: "%d"}
                ];
                break;
        }
        
        // スケール選択を更新
        document.getElementById('ganttScale').value = scale;
        
        gantt.render();
    }

    handleTaskAdd(id, task) {
        // 新しいタスクがガントチャートで作成された場合
    }

    async handleTaskUpdate(id, task) {
        const originalTask = task.originalTask;
        if (originalTask) {
            // 既に更新中の場合は待機
            if (this.isUpdating) {
                return;
            }

            this.isUpdating = true;

            try {
                // タスクIDを確実に取得
                const taskId = originalTask._id || originalTask.id;
                
                if (!taskId) {
                    console.error('Task ID not found:', originalTask);
                    return;
                }
                
                // 期限の更新
                const newDueDate = new Date(task.end_date);
                const updateData = { dueDate: newDueDate.toISOString() };
                
                // 安全な更新データのみを送信
                const safeUpdateData = { dueDate: updateData.dueDate };
                
                // サーバーに更新を送信
                const response = await this.taskManager.updateTask(taskId, safeUpdateData);
                
                if (response.success) {
                    this.notificationManager.show('タスクを更新しました', 'success');
                    
                    // TaskManagerのタスクデータを更新
                    const taskIndex = this.taskManager.tasks.findIndex(t => (t._id === taskId || t.id === taskId));
                    if (taskIndex !== -1) {
                        this.taskManager.tasks[taskIndex].dueDate = updateData.dueDate;
                    }
                    
                    // ガントチャートのデータを更新して再描画
                    this.updateGanttData();
                    
                    // 明示的に再描画
                    setTimeout(() => {
                        if (gantt && gantt.render) {
                            gantt.render();
                        }
                    }, 100);
                } else {
                    this.notificationManager.show('タスクの更新に失敗しました', 'error');
                    this.updateGanttData(); // 元のデータに戻す
                }
            } catch (error) {
                console.error('Task update failed:', error);
                this.notificationManager.show('タスクの更新に失敗しました', 'error');
                this.updateGanttData(); // 元のデータに戻す
            } finally {
                this.isUpdating = false;
            }
        } else {
            console.error('Original task not found for gantt task:', task);
        }
    }

    handleTaskMove(id, mode, task) {
        this.handleTaskDateChange(id, task, 'move');
    }

    handleTaskDrag(id, mode, task) {
        this.handleTaskDateChange(id, task, 'drag');
    }

    async handleTaskDateChange(id, task, changeType) {
        const originalTask = task.originalTask;
        if (!originalTask) {
            console.warn('Original task not found for task:', id);
            return;
        }

        // タスクIDを確実に取得
        const taskId = originalTask._id || originalTask.id;
        
        if (!taskId) {
            console.error('Task ID not found:', originalTask);
            return;
        }

        // 既に更新中の場合は待機
        if (this.isUpdating) {
            this.pendingUpdates.set(taskId, { task, changeType });
            return;
        }

        this.isUpdating = true;

        try {
            // 新しい開始日時と終了日時を取得
            const newStartDate = new Date(task.start_date);
            const newEndDate = new Date(task.end_date);
            
            // 元のタスクデータを更新
            const updateData = {};
            
            // 作成日時の更新（開始日時として扱う）
            if (originalTask.createdAt) {
                const originalStart = new Date(originalTask.createdAt);
                if (originalStart.getTime() !== newStartDate.getTime()) {
                    updateData.createdAt = newStartDate.toISOString();
                }
            }
            
            // 期限の更新
            if (originalTask.dueDate) {
                const originalDue = new Date(originalTask.dueDate);
                if (originalDue.getTime() !== newEndDate.getTime()) {
                    updateData.dueDate = newEndDate.toISOString();
                }
            } else {
                // 期限が設定されていない場合は新しく設定
                updateData.dueDate = newEndDate.toISOString();
            }

            // 更新するデータがある場合のみサーバーに送信
            if (Object.keys(updateData).length > 0) {
                // 安全な更新データのみを送信（不要なフィールドを除外）
                const safeUpdateData = {};
                if (updateData.createdAt) safeUpdateData.createdAt = updateData.createdAt;
                if (updateData.dueDate) safeUpdateData.dueDate = updateData.dueDate;
                
                const response = await this.taskManager.updateTask(taskId, safeUpdateData);
                
                if (response.success) {
                    this.notificationManager.show('タスクの日時を更新しました', 'success');
                    
                    // TaskManagerのタスクデータを更新
                    const taskIndex = this.taskManager.tasks.findIndex(t => (t._id === taskId || t.id === taskId));
                    if (taskIndex !== -1) {
                        if (updateData.createdAt) {
                            this.taskManager.tasks[taskIndex].createdAt = updateData.createdAt;
                        }
                        if (updateData.dueDate) {
                            this.taskManager.tasks[taskIndex].dueDate = updateData.dueDate;
                        }
                    }
                    
                    // ガントチャートのデータを更新
                    this.updateGanttData();
                    
                    // UIの他の部分も更新
                    if (this.taskManager.uiManager) {
                        this.taskManager.uiManager.updateViews();
                    }
                    
                    // 明示的に再描画を遅延実行
                    setTimeout(() => {
                        if (gantt && gantt.render) {
                            gantt.render();
                        }
                    }, 100);
                } else {
                    this.notificationManager.show('タスクの更新に失敗しました', 'error');
                    this.updateGanttData(); // 元のデータに戻す
                }
            }
        } catch (error) {
            console.error('Task update failed:', error);
            this.notificationManager.show('タスクの更新に失敗しました', 'error');
            // 元のデータに戻す
            this.updateGanttData();
        } finally {
            this.isUpdating = false;
            
            // 保留中の更新があれば処理
            if (this.pendingUpdates.size > 0) {
                const [pendingTaskId, pendingUpdate] = this.pendingUpdates.entries().next().value;
                this.pendingUpdates.delete(pendingTaskId);
                
                // 少し遅延させて次の更新を実行
                setTimeout(() => {
                    this.handleTaskDateChange(pendingTaskId, pendingUpdate.task, pendingUpdate.changeType);
                }, 100);
            }
        }
    }

    handleTaskDelete(id, task) {
        const originalTask = task.originalTask;
        if (originalTask) {
            // タスクの削除確認
            if (confirm('このタスクを削除しますか？')) {
                this.taskManager.deleteTask(originalTask.id)
                    .then(() => {
                        this.notificationManager.show('タスクを削除しました', 'success');
                    })
                    .catch((error) => {
                        this.notificationManager.show('タスクの削除に失敗しました', 'error');
                        this.updateGanttData(); // 元のデータに戻す
                    });
            } else {
                this.updateGanttData(); // キャンセルされた場合は元に戻す
            }
        }
    }

    handleTaskDoubleClick(id) {
        const task = gantt.getTask(id);
        if (task && task.originalTask) {
            // タスク編集モーダルを開く
            this.taskManager.editTask(task.originalTask);
        }
    }

    addNewTask() {
        // 新しいタスク作成モーダルを開く（統一された方法で）
        const taskModal = document.getElementById('taskModal');
        taskModal.classList.add('show');
    }

    refreshGantt() {
        if (this.isInitialized) {
            // データを更新してから再描画
            this.updateGanttData();
            
            // モバイル対応のためにサイズを再調整
            setTimeout(() => {
                gantt.setSizes();
                gantt.render();
            }, 100);
        }
    }

    destroy() {
        if (this.isInitialized) {
            gantt.clearAll();
            this.isInitialized = false;
        }
    }

    // リアルタイム更新を受信した際の処理
    onTaskUpdated(updatedTask) {
        // 現在更新中でない場合のみ処理
        if (!this.isUpdating) {
            // TaskManagerのタスクデータを更新
            const taskIndex = this.taskManager.tasks.findIndex(t => 
                (t._id === updatedTask._id || t.id === updatedTask.id) ||
                (t._id === updatedTask.id || t.id === updatedTask._id)
            );
            
            if (taskIndex !== -1) {
                this.taskManager.tasks[taskIndex] = { ...this.taskManager.tasks[taskIndex], ...updatedTask };
            }
            
            // ガントチャートを更新
            this.updateGanttData();
            
            // 明示的に再描画
            setTimeout(() => {
                if (gantt && gantt.render) {
                    gantt.render();
                }
            }, 100);
        }
    }

    // タスクが削除された際の処理
    onTaskDeleted(deletedTaskId) {
        if (!this.isUpdating) {
            // TaskManagerのタスクデータから削除
            const taskIndex = this.taskManager.tasks.findIndex(t => 
                t._id === deletedTaskId || t.id === deletedTaskId
            );
            
            if (taskIndex !== -1) {
                this.taskManager.tasks.splice(taskIndex, 1);
            }
            
            // ガントチャートを更新
            this.updateGanttData();
            
            // 明示的に再描画
            setTimeout(() => {
                if (gantt && gantt.render) {
                    gantt.render();
                }
            }, 100);
        }
    }

    // 新しいタスクが追加された際の処理
    onTaskAdded(newTask) {
        if (!this.isUpdating) {
            // TaskManagerのタスクデータに追加
            const existingIndex = this.taskManager.tasks.findIndex(t => 
                (t._id === newTask._id || t.id === newTask.id) ||
                (t._id === newTask.id || t.id === newTask._id)
            );
            
            if (existingIndex === -1) {
                this.taskManager.tasks.push(newTask);
            }
            
            // ガントチャートを更新
            this.updateGanttData();
            
            // 明示的に再描画
            setTimeout(() => {
                if (gantt && gantt.render) {
                    gantt.render();
                }
            }, 100);
        }
    }
}
