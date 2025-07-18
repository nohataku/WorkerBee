class CalendarManager {
    constructor(taskManager, notificationManager) {
        this.taskManager = taskManager;
        this.notificationManager = notificationManager;
        this.calendar = null;
        this.tasks = [];
    }

    init() {
        try {
            console.log('CalendarManager init started');
            this.initCalendar();
            this.setupEventListeners();
            console.log('CalendarManager init completed');
        } catch (error) {
            console.error('Error initializing CalendarManager:', error);
        }
    }

    initCalendar() {
        console.log('Initializing calendar...');
        const calendarEl = document.getElementById('calendar');
        
        if (!calendarEl) {
            console.error('Calendar element not found!');
            return;
        }
        
        console.log('Calendar element found:', calendarEl);
        
        if (typeof FullCalendar === 'undefined') {
            console.error('FullCalendar library not loaded!');
            return;
        }
        
        console.log('FullCalendar library is available');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ja',
            headerToolbar: false, // カスタムヘッダーを使用
            height: '100%',
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            eventDisplay: 'block',
            
            // イベント設定
            events: [],
            
            // イベントハンドラー
            select: (info) => {
                this.handleDateSelect(info);
            },
            
            eventClick: (info) => {
                this.handleEventClick(info);
            },
            
            eventDrop: (info) => {
                this.handleEventDrop(info);
            },
            
            eventResize: (info) => {
                this.handleEventResize(info);
            },
            
            // 日本語化
            buttonText: {
                today: '今日',
                month: '月',
                week: '週',
                day: '日',
                list: 'リスト'
            },
            
            // イベント描画
            eventDidMount: (info) => {
                this.customizeEvent(info);
            }
        });

        this.calendar.render();
        console.log('Calendar rendered successfully');
    }

    setupEventListeners() {
        // カレンダーコントロール
        document.getElementById('calendarToday').addEventListener('click', () => {
            this.calendar.today();
        });

        document.getElementById('calendarPrev').addEventListener('click', () => {
            this.calendar.prev();
        });

        document.getElementById('calendarNext').addEventListener('click', () => {
            this.calendar.next();
        });

        // ビュー切り替え
        document.getElementById('calendarMonth').addEventListener('click', () => {
            this.calendar.changeView('dayGridMonth');
            this.updateViewButtons('month');
        });

        document.getElementById('calendarWeek').addEventListener('click', () => {
            this.calendar.changeView('timeGridWeek');
            this.updateViewButtons('week');
        });

        document.getElementById('calendarDay').addEventListener('click', () => {
            this.calendar.changeView('timeGridDay');
            this.updateViewButtons('day');
        });

        // 新しいタスク追加
        document.getElementById('addTaskFromCalendar').addEventListener('click', () => {
            this.addNewTask();
        });
    }

    updateViewButtons(activeView) {
        document.querySelectorAll('.calendar-view-buttons .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        switch(activeView) {
            case 'month':
                document.getElementById('calendarMonth').classList.add('active');
                break;
            case 'week':
                document.getElementById('calendarWeek').classList.add('active');
                break;
            case 'day':
                document.getElementById('calendarDay').classList.add('active');
                break;
        }
    }

    loadTasks(tasks) {
        this.tasks = tasks;
        this.updateCalendarEvents();
    }

    updateCalendarEvents() {
        const events = this.tasks.map(task => {
            const event = {
                id: task._id || task.id,
                title: task.title,
                start: task.dueDate ? new Date(task.dueDate) : null,
                allDay: !task.dueDate || !task.dueDate.includes('T'),
                className: [
                    `priority-${task.priority}`,
                    task.status === 'completed' ? 'completed' : ''
                ].filter(Boolean),
                extendedProps: {
                    task: task,
                    priority: task.priority,
                    status: task.status,
                    assignedTo: task.assignedTo,
                    description: task.description
                }
            };

            // 期限が設定されていない場合は表示しない
            if (!event.start) {
                return null;
            }

            return event;
        }).filter(Boolean);

        this.calendar.removeAllEvents();
        this.calendar.addEventSource(events);
    }

    customizeEvent(info) {
        const task = info.event.extendedProps.task;
        
        // ツールチップの追加
        info.el.title = `${task.title}\n担当: ${task.assignedToName || '未割り当て'}\n優先度: ${this.getPriorityText(task.priority)}`;
        
        // 完了済みタスクの見た目を変更
        if (task.status === 'completed') {
            info.el.style.opacity = '0.6';
            info.el.style.textDecoration = 'line-through';
        }
    }

    getPriorityText(priority) {
        const priorityMap = {
            low: '低',
            medium: '中',
            high: '高',
            urgent: '緊急'
        };
        return priorityMap[priority] || '中';
    }

    handleDateSelect(info) {
        // 日付が選択された時にタスク作成モーダルを開く
        const taskModal = document.getElementById('taskModal');
        const dueDateInput = document.getElementById('taskDueDate');
        
        // 選択された日付を設定
        if (info.allDay) {
            dueDateInput.value = info.startStr;
        } else {
            dueDateInput.value = info.startStr.slice(0, 16); // ISO文字列を datetime-local 形式に変換
        }
        
        // モーダルを表示（統一された方法で）
        taskModal.classList.add('show');
        
        // 選択をクリア
        this.calendar.unselect();
    }

    handleEventClick(info) {
        const task = info.event.extendedProps.task;
        
        // タスクの詳細を表示または編集
        this.showTaskDetails(task);
    }

    handleEventDrop(info) {
        const task = info.event.extendedProps.task;
        const newDate = info.event.start;
        
        // タスクの期限を更新
        task.dueDate = newDate.toISOString();
        
        // サーバーに更新を送信
        this.taskManager.updateTask(task.id, { dueDate: task.dueDate })
            .then(() => {
                this.notificationManager.show('タスクの期限を更新しました', 'success');
            })
            .catch((error) => {
                this.notificationManager.show('タスクの更新に失敗しました', 'error');
                info.revert(); // 変更を元に戻す
            });
    }

    showTaskDetails(task) {
        // タスク編集モーダルを開く
        this.taskManager.editTask(task);
    }

    addNewTask() {
        // 新しいタスク作成モーダルを開く（統一された方法で）
        const taskModal = document.getElementById('taskModal');
        taskModal.classList.add('show');
    }

    refreshCalendar() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }

    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }
}
