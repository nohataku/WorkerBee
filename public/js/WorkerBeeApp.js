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
        
        // TaskManagerにUIManagerとAuthManagerの参照を設定
        this.taskManager.setUIManager(this.uiManager);
        this.taskManager.setAuthManager(this.authManager);
        
        // イベントマネージャーの初期化
        this.eventManager = new EventManager(
            this.authManager,
            this.taskManager,
            this.uiManager,
            this.notificationManager
        );
        
        // UIManagerにEventManagerの参照を設定
        this.uiManager.setEventManager(this.eventManager);
        
        // SocketManagerの初期化（ユーザー情報が必要になってから設定）
        this.socketManager = null;
    }

    async init() {
        try {
            console.log('Initializing WorkerBee...');
            
            // ライブラリの読み込み完了を待機
            await LibraryLoader.waitForLibraries();
            
            this.eventManager.bindEvents();
            await this.checkAuthentication();
        } catch (error) {
            console.error('Failed to initialize WorkerBee:', error);
            this.notificationManager.show('error', '初期化エラー', 'アプリケーションの初期化に失敗しました');
        }
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
        window.app = new WorkerBeeApp();
        console.log('WorkerBee App instance created successfully');
        
        // デバッグ用のテスト関数をグローバルに追加
        window.testNotification = () => {
            if (window.app && window.app.notificationManager) {
                window.app.notificationManager.test();
            } else {
                console.error('App or notificationManager not available');
            }
        };
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
