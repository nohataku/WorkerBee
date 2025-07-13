class GanttManager {
    constructor(taskManager, notificationManager) {
        this.taskManager = taskManager;
        this.notificationManager = notificationManager;
        this.gantt = null;
        this.tasks = [];
        this.isInitialized = false;
    }

    init() {
        console.log('GanttManager.init() called');
        try {
            this.initGantt();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('GanttManager initialized successfully');
        } catch (error) {
            console.error('Error initializing GanttManager:', error);
        }
    }

    initGantt() {
        console.log('Initializing DHTMLX Gantt...');
        
        const ganttEl = document.getElementById('gantt_here');
        if (!ganttEl) {
            console.error('Gantt element not found!');
            return;
        }
        
        if (typeof gantt === 'undefined') {
            console.error('DHTMLX Gantt library not loaded!');
            return;
        }
        
        console.log('Configuring Gantt chart...');
        // ガントチャートの設定
        gantt.config.date_format = "%Y-%m-%d %H:%i:%s";
        gantt.config.scale_unit = "week";
        gantt.config.date_scale = "%M %d";
        gantt.config.subscales = [
            { unit: "day", step: 1, date: "%d" }
        ];
        gantt.config.autosize = "y";
        gantt.config.fit_tasks = true;
        gantt.config.grid_width = 350;
        
        // 列の設定
        gantt.config.columns = [
            { name: "text", label: "タスク名", width: 200, tree: true },
            { name: "assignee", label: "担当者", width: 80 },
            { name: "priority", label: "優先度", width: 70 }
        ];

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

        gantt.attachEvent("onTaskDblClick", (id, e) => {
            this.handleTaskDoubleClick(id);
            return false; // デフォルトの編集を無効化
        });

        // ガントチャートを初期化
        console.log('Initializing Gantt chart...');
        gantt.init("gantt_here");
        console.log('Gantt chart initialized successfully');
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
    }

    loadTasks(tasks) {
        this.tasks = tasks;
        this.updateGanttData();
    }

    updateGanttData() {
        const ganttData = {
            data: this.tasks.map(task => {
                const startDate = task.createdAt ? new Date(task.createdAt) : new Date();
                const endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                
                return {
                    id: task.id,
                    text: task.title,
                    start_date: this.formatDate(startDate),
                    end_date: this.formatDate(endDate),
                    duration: this.calculateDuration(startDate, endDate),
                    progress: task.status === 'completed' ? 1 : 0,
                    priority: task.priority,
                    status: task.status,
                    assignee: task.assignedToName || '未割り当て',
                    description: task.description || '',
                    originalTask: task
                };
            }),
            links: [] // タスク間の依存関係（今後実装）
        };

        gantt.clearAll();
        gantt.parse(ganttData);
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
        const currentScale = gantt.config.scale_unit;
        
        if (currentScale === "month") {
            this.changeScale("week");
        } else if (currentScale === "week") {
            this.changeScale("day");
        }
    }

    zoomOut() {
        const currentScale = gantt.config.scale_unit;
        
        if (currentScale === "day") {
            this.changeScale("week");
        } else if (currentScale === "week") {
            this.changeScale("month");
        }
    }

    changeScale(scale) {
        switch (scale) {
            case "day":
                gantt.config.scale_unit = "day";
                gantt.config.date_scale = "%M %d";
                gantt.config.subscales = [
                    { unit: "hour", step: 6, date: "%H:%i" }
                ];
                break;
            case "week":
                gantt.config.scale_unit = "week";
                gantt.config.date_scale = "%M %d";
                gantt.config.subscales = [
                    { unit: "day", step: 1, date: "%d" }
                ];
                break;
            case "month":
                gantt.config.scale_unit = "month";
                gantt.config.date_scale = "%Y年%M";
                gantt.config.subscales = [
                    { unit: "week", step: 1, date: "%d" }
                ];
                break;
        }
        
        // スケール選択を更新
        document.getElementById('ganttScale').value = scale;
        
        gantt.render();
    }

    handleTaskAdd(id, task) {
        // 新しいタスクがガントチャートで作成された場合
        console.log('Task added:', id, task);
    }

    handleTaskUpdate(id, task) {
        const originalTask = task.originalTask;
        if (originalTask) {
            // 期限の更新
            const newDueDate = new Date(task.end_date);
            originalTask.dueDate = newDueDate.toISOString();
            
            // サーバーに更新を送信
            this.taskManager.updateTask(originalTask.id, { 
                dueDate: originalTask.dueDate 
            }).then(() => {
                this.notificationManager.show('タスクを更新しました', 'success');
            }).catch((error) => {
                this.notificationManager.show('タスクの更新に失敗しました', 'error');
                this.updateGanttData(); // 元のデータに戻す
            });
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
            gantt.render();
        }
    }

    destroy() {
        if (this.isInitialized) {
            gantt.clearAll();
            this.isInitialized = false;
        }
    }
}
