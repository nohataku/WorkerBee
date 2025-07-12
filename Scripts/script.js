class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.updateClearButton();
    }

    bindEvents() {
        // タスク追加
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // フィルター
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        // 完了済み削除
        document.getElementById('clearCompletedBtn').addEventListener('click', () => this.showClearModal());
        document.getElementById('confirmBtn').addEventListener('click', () => this.clearCompleted());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideClearModal());

        // モーダル背景クリック
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideClearModal();
        });

        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideClearModal();
        });
    }

    addTask() {
        const input = document.getElementById('taskInput');
        const text = input.value.trim();

        if (!text) {
            this.showInputError('タスクを入力してください');
            return;
        }

        if (text.length > 100) {
            this.showInputError('タスクは100文字以内で入力してください');
            return;
        }

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateClearButton();

        input.value = '';
        this.showSuccessMessage('タスクを追加しました！');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateClearButton();

            if (task.completed) {
                this.showSuccessMessage('タスクを完了しました！');
            }
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateClearButton();
        this.showSuccessMessage('タスクを削除しました');
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // フィルターボタンの状態更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.renderTasks();
    }

    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            default:
                return this.tasks;
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            taskList.style.display = 'none';
            emptyState.style.display = 'block';
            
            // 空状態のメッセージを動的に変更
            const messages = {
                'all': 'タスクがありません<br>上のフォームから新しいタスクを追加してみましょう',
                'pending': '未完了のタスクがありません<br>すべてのタスクが完了しています！',
                'completed': '完了済みのタスクがありません<br>タスクを完了させてみましょう'
            };
            emptyState.querySelector('p').innerHTML = messages[this.currentFilter];
        } else {
            taskList.style.display = 'block';
            emptyState.style.display = 'none';
        }

        taskList.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');

        // イベントリスナーを追加
        filteredTasks.forEach(task => {
            const taskElement = document.getElementById(`task-${task.id}`);
            const checkbox = taskElement.querySelector('.task-checkbox');
            const deleteBtn = taskElement.querySelector('.delete-btn');

            checkbox.addEventListener('click', () => this.toggleTask(task.id));
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTaskWithAnimation(task.id, taskElement);
            });
        });
    }

    createTaskHTML(task) {
        const date = new Date(task.createdAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <span class="task-date">${dateStr}</span>
                <button class="delete-btn" title="削除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    deleteTaskWithAnimation(id, element) {
        element.classList.add('fade-out');
        setTimeout(() => {
            this.deleteTask(id);
        }, 300);
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;

        // 完了率に応じてアニメーション
        this.animateNumber('totalTasks', totalTasks);
        this.animateNumber('completedTasks', completedTasks);
        this.animateNumber('pendingTasks', pendingTasks);
    }

    animateNumber(elementId, targetNumber) {
        const element = document.getElementById(elementId);
        const currentNumber = parseInt(element.textContent) || 0;
        
        if (currentNumber !== targetNumber) {
            element.style.transform = 'scale(1.2)';
            element.style.color = '#667eea';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 300);
        }
    }

    updateClearButton() {
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const clearBtn = document.getElementById('clearCompletedBtn');
        
        if (completedTasks > 0) {
            clearBtn.style.display = 'flex';
            clearBtn.querySelector('i').nextSibling.textContent = ` 完了済みを削除 (${completedTasks})`;
        } else {
            clearBtn.style.display = 'none';
        }
    }

    showClearModal() {
        const modal = document.getElementById('confirmModal');
        modal.classList.add('show');
    }

    hideClearModal() {
        const modal = document.getElementById('confirmModal');
        modal.classList.remove('show');
    }

    clearCompleted() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.updateClearButton();
        this.hideClearModal();
        this.showSuccessMessage(`${completedCount}個の完了済みタスクを削除しました`);
    }

    showInputError(message) {
        const input = document.getElementById('taskInput');
        input.style.borderColor = '#dc3545';
        input.style.backgroundColor = '#fff5f5';
        
        // エラーメッセージを表示
        this.showMessage(message, 'error');
        
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        }, 3000);
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // 既存のメッセージを削除
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;

        // メッセージのスタイル
        Object.assign(messageDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            animation: 'slideInRight 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '250px',
            backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
        });

        document.body.appendChild(messageDiv);

        // 3秒後に自動削除
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    loadTasks() {
        try {
            const saved = localStorage.getItem('tasks');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('タスクの読み込みに失敗しました:', error);
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('タスクの保存に失敗しました:', error);
            this.showMessage('タスクの保存に失敗しました', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// CSS アニメーションを追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});

// サービスワーカー登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully');
            })
            .catch(error => {
                console.log('Service Worker registration failed');
            });
    });
}
