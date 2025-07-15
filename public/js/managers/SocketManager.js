class SocketManager {
    constructor(user, notificationManager) {
        this.user = user;
        this.notificationManager = notificationManager;
        this.socket = null;
        this.config = window.WorkerBeeConfig || {};
        this.eventHandlers = new Map(); // イベントハンドラーを保存
    }

    initialize() {
        // 開発環境でかつSocket.ioが利用可能な場合のみ有効
        if (this.config.current === 'development' && 
            this.config.socketUrl && 
            typeof io !== 'undefined') {
            console.log('リアルタイム機能を初期化します（開発環境）');
            this.socket = io(this.config.socketUrl);
            
            this.socket.on('connect', () => {
                console.log('Socket connected');
                this.socket.emit('join-room', this.user._id);
            });

            this.socket.on('task-created', (data) => {
                if (data.task.assignedTo._id === this.user._id) {
                    this.notificationManager.show('info', '新しいタスク', `「${data.task.title}」が割り当てられました`);
                    this.onTaskUpdate && this.onTaskUpdate();
                }
                // リアルタイム追加イベントを発火
                this.trigger('task-added', data.task);
            });
        } else {
            console.log(`リアルタイム機能は無効です（${this.config.current}環境）`);
            return;
        }

        this.socket.on('task-updated', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.notificationManager.show('info', 'タスク更新', `「${data.task.title}」が更新されました`);
                this.onTaskUpdate && this.onTaskUpdate();
            }
            // リアルタイム更新イベントを発火
            this.trigger('task-updated', data.task);
        });

        this.socket.on('task-deleted', (data) => {
            this.onTaskUpdate && this.onTaskUpdate();
            // リアルタイム削除イベントを発火
            this.trigger('task-deleted', data.taskId);
        });

        this.socket.on('task-created', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.notificationManager.show('info', '新しいタスク', `「${data.task.title}」が割り当てられました`);
                this.onTaskUpdate && this.onTaskUpdate();
            }
            // リアルタイム追加イベントを発火
            this.trigger('task-added', data.task);
        });
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    // イベントリスナーを追加
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    // イベントリスナーを削除
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // イベントを発火
    trigger(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in event handler:', error);
                }
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    setTaskUpdateCallback(callback) {
        this.onTaskUpdate = callback;
    }
}
