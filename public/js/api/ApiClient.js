class ApiClient {
    constructor() {
        this.token = localStorage.getItem('workerbee_token');
        this.config = window.WorkerBeeConfig || {};
        this.baseUrl = this.config.apiBaseUrl || '';
        
        // 速度最適化のためのキャッシュとリクエスト管理
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.cacheTimeout = 30000; // 30秒
        this.requestTimeout = 800; // 800ms以内に応答
        this.retryCount = 2;
        
        // 接続プールの設定（ブラウザは自動で管理するが明示的に設定）
        this.fetchConfig = {
            keepalive: true,
            signal: null
        };
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('workerbee_token', token);
        } else {
            localStorage.removeItem('workerbee_token');
        }
    }

    getToken() {
        return this.token;
    }

    async call(url, method = 'GET', data = null, options = {}) {
        try {
            const cacheKey = `${method}:${url}:${JSON.stringify(data)}`;
            const useCache = options.cache !== false && method === 'GET';
            const forceRefresh = options.forceRefresh === true;
            
            // キャッシュから結果を返す（GET リクエストのみ）
            if (useCache && !forceRefresh && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                const now = Date.now();
                if (now - cached.timestamp < this.cacheTimeout) {
                    console.log(`🚀 Cache hit: ${method} ${url}`);
                    return cached.data;
                } else {
                    this.cache.delete(cacheKey);
                }
            }
            
            // 同じリクエストが進行中の場合は待機
            if (this.pendingRequests.has(cacheKey)) {
                console.log(`⏳ Waiting for pending request: ${method} ${url}`);
                return await this.pendingRequests.get(cacheKey);
            }
            
            // AbortController でタイムアウトを制御
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
            
            // リクエストプロミスを作成
            const requestPromise = this._performRequest(url, method, data, controller.signal);
            
            // 進行中のリクエストとして登録
            this.pendingRequests.set(cacheKey, requestPromise);
            
            try {
                const result = await requestPromise;
                
                // 成功した場合はキャッシュに保存（GET リクエストのみ）
                if (useCache && result) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            } finally {
                clearTimeout(timeoutId);
                this.pendingRequests.delete(cacheKey);
            }
            
        } catch (error) {
            // タイムアウトエラーの場合はリトライ
            if (error.name === 'AbortError' && this.retryCount > 0) {
                console.log(`🔄 Retrying request: ${method} ${url}`);
                this.retryCount--;
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
                return this.call(url, method, data, options);
            }
            
            console.error(`❌ API Call Error: ${method} ${url}`, error);
            throw error;
        }
    }
    
    async _performRequest(url, method, data, signal) {
            let fullUrl;
            let requestData;
            let headers = {};
            let requestMethod = method;
            
            // 環境に応じた処理の分岐
            if (this.config.current === 'development' && this.config.apiBaseUrl) {
                // 開発環境: Node.jsサーバーを使用
                fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                requestData = data;
                headers['Content-Type'] = 'application/json';
                
                // JWT認証ヘッダーを追加
                if (this.token) {
                    headers.Authorization = `Bearer ${this.token}`;
                }
            } else {
                // 本番環境: Google Apps Scriptを使用
                fullUrl = this.config.gas.webAppUrl;
                requestMethod = 'POST'; // GASは常にPOST
                
                // クエリパラメータを抽出してpayloadに含める
                const urlParts = url.split('?');
                const baseUrl = urlParts[0];
                const queryParams = {};
                
                if (urlParts[1]) {
                    const searchParams = new URLSearchParams(urlParts[1]);
                    for (const [key, value] of searchParams) {
                        queryParams[key] = value;
                    }
                }
                
                // GAS用のデータ形式に変換
                requestData = {
                    action: this.extractActionFromUrl(baseUrl, method),
                    payload: { ...queryParams, ...(data || {}) }
                };
                
                // GASでは認証情報をpayloadに含める
                if (this.token) {
                    requestData.payload.token = this.token;
                }
                
                // GASの場合、プリフライトリクエストを避けるため
                // Content-Typeをtext/plainに設定
                headers['Content-Type'] = 'text/plain';
            }
            
            const options = {
                method: requestMethod,
                headers: headers,
                signal: signal,
                ...this.fetchConfig
            };

            if (requestData) {
                options.body = JSON.stringify(requestData);
            }

            console.log(`🚀 API Call [${this.config.current}]: ${requestMethod} ${fullUrl}`);
            
            const response = await fetch(fullUrl, options);
            
            // レスポンスのステータスをチェック
            if (!response.ok) {
                console.error(`HTTP Error: ${response.status} ${response.statusText}`);
                
                // 401エラーの場合、認証をクリアしてログイン画面に戻す（ただし、ログインエンドポイント自体は除く）
                if (response.status === 401 && !url.includes('/login')) {
                    console.log('Unauthorized, redirecting to login...');
                    this.setToken(null);
                    throw new Error('認証が必要です');
                }
                
                // その他のHTTPエラー
                let errorMessage = `サーバーエラー: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // JSONパースエラーの場合はデフォルトメッセージを使用
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            // 環境に応じたレスポンス処理
            if (this.config.current === 'development') {
                // Node.jsサーバーからの直接レスポンス
                return result;
            } else {
                // GASからのレスポンス（success/data形式）
                if (result.success) {
                    return result.data;
                } else {
                    throw new Error(result.message || 'GASエラーが発生しました');
                }
            }
    }
    
    // キャッシュをクリアするメソッド
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }
    
    // 特定のキーのキャッシュを削除
    invalidateCache(pattern) {
        for (const [key] of this.cache) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
        console.log(`🧹 Cache invalidated for pattern: ${pattern}`);
    }
    
    /**
     * URLとメソッドからGAS用のアクション名を抽出
     */
    extractActionFromUrl(url, method) {
        const urlMap = {
            'POST/api/auth/login': 'login',
            'POST/api/auth/register': 'register',
            'GET/api/auth/me': 'getCurrentUser',
            'GET/api/auth/verify': 'verifyAuth',
            'POST/api/auth/logout': 'logout',
            'GET/api/tasks': 'getTasks',
            'POST/api/tasks': 'createTask',
            'PUT/api/tasks': 'updateTask',
            'DELETE/api/tasks': 'deleteTask',
            'GET/api/tasks/stats/user': 'getUserStats',
            'GET/api/users': 'getUsers'
        };
        
        // クエリパラメータを除去してベースURLを取得
        const baseUrl = url.split('?')[0];
        const key = `${method}${baseUrl}`;
        return urlMap[key] || 'unknown';
    }
}
