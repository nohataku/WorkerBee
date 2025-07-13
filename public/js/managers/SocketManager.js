class SocketManager {
    constructor(user, notificationManager) {
        this.user = user;
        this.notificationManager = notificationManager;
        this.socket = null;
        this.config = window.WorkerBeeConfig || {};
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
