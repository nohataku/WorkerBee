class WorkerBeeApp {
    constructor() {
        this.initializeManagers();
        this.init();
    }

    initializeManagers() {
        // 基本ユーティリティの初期化
        this.passwordUtils = new PasswordUtils();
        
        // 通知マネージャーの初期化
        this.notificationManager = new NotificationManager();
        
        // APIクライアントの初期化
        this.apiClient = new ApiClient();
        
        // 認証マネージャーの初期化
        this.authManager = new AuthManager(
            this.apiClient,
            this.passwordUtils,
            this.notificationManager
        );
        
        // タスクマネージャーの初期化（SocketManagerは後で設定）
        this.taskManager = new TaskManager(
            this.apiClient,
            this.notificationManager,
            null // SocketManagerは後で設定
        );
        
        // UIマネージャーの初期化
        this.uiManager = new UIManager(
            this.authManager,
            this.taskManager,
            this.notificationManager
        );
        
        // イベントマネージャーの初期化
        this.eventManager = new EventManager(
            this.authManager,
            this.taskManager,
            this.uiManager,
            this.notificationManager
        );
        
        // SocketManagerの初期化（ユーザー情報が必要になってから設定）
        this.socketManager = null;
    }

    async init() {
        this.eventManager.bindEvents();
        await this.checkAuthentication();
    }

    async checkAuthentication() {
        const authResult = await this.authManager.checkAuthentication();
        
        if (authResult.authenticated) {
            this.uiManager.showAppContainer();
            await this.initializeAppComponents();
        } else {
            this.uiManager.showAuthContainer();
        }
    }

    async initializeAppComponents() {
        try {
            console.log('Initializing app components...');
            
            // SocketManagerの初期化（認証後に行う）
            this.initializeSocketManager();
            
            // イベントマネージャーで初期化処理を実行
            await this.eventManager.initializeAppAfterAuth();
            
            console.log('App components initialization completed');
        } catch (error) {
            console.error('Error in initializeAppComponents:', error);
            this.notificationManager.show('error', '初期化エラー', 'アプリケーションの初期化中にエラーが発生しました');
        }
    }

    initializeSocketManager() {
        const user = this.authManager.getUser();
        if (user) {
            this.socketManager = new SocketManager(user, this.notificationManager);
            this.socketManager.initialize();
            
            // タスクマネージャーにSocketManagerを設定
            this.taskManager.socketManager = this.socketManager;
            
            // タスク更新時のコールバックを設定
            this.socketManager.setTaskUpdateCallback(async () => {
                await this.eventManager.handleTaskLoad();
                const stats = await this.taskManager.loadStats();
                this.uiManager.updateStatsDisplay(stats);
            });
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
