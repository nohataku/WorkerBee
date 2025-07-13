class SocketManager {
    constructor(user, notificationManager) {
        this.user = user;
        this.notificationManager = notificationManager;
        this.socket = null;
        this.config = window.WorkerBeeConfig || {};
    }

    initialize() {
        // 設定でリアルタイム機能が無効、またはSocket.ioが利用不可の場合はスキップ
        if (!this.config.features?.realTimeUpdates || typeof io === 'undefined' || !this.config.socketUrl) {
            console.log('リアルタイム機能は無効です（GitHub Pages環境）');
            return;
        }
        
        this.socket = io(this.config.socketUrl);
        
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.socket.emit('join-room', this.user._id);
        });

        this.socket.on('task-created', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.notificationManager.show('info', '新しいタスク', `「${data.task.title}」が割り当てられました`);
                // タスクリストの再読み込みはAppで処理
                this.onTaskUpdate && this.onTaskUpdate();
            }
        });

        this.socket.on('task-updated', (data) => {
            if (data.task.assignedTo._id === this.user._id) {
                this.notificationManager.show('info', 'タスク更新', `「${data.task.title}」が更新されました`);
                this.onTaskUpdate && this.onTaskUpdate();
            }
        });

        this.socket.on('task-deleted', (data) => {
            this.onTaskUpdate && this.onTaskUpdate();
        });
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
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
