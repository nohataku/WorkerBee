class ApiClient {
    constructor() {
        this.token = localStorage.getItem('workerbee_token');
        this.config = window.WorkerBeeConfig || {};
        this.baseUrl = this.config.apiBaseUrl || '';
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

    async call(url, method = 'GET', data = null) {
        try {
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
                headers: headers
            };

            if (requestData) {
                options.body = JSON.stringify(requestData);
            }

            console.log(`API Call [${this.config.current}]: ${requestMethod} ${fullUrl}`, requestData ? { data: requestData } : '');
            
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
            console.log(`API Response [${this.config.current}]: ${method} ${url}`, result);
            console.log('🔍 Debug - Raw response object:', JSON.stringify(result, null, 2));
            
            // 環境に応じたレスポンス処理
            if (this.config.current === 'development') {
                // Node.jsサーバーからの直接レスポンス
                console.log('🔍 Debug - Returning Node.js response:', result);
                return result;
            } else {
                // GASからのレスポンス（success/data形式）
                if (result.success) {
                    console.log('GAS Response data:', result.data);
                    return result.data;
                } else {
                    console.error('GAS Error response:', result);
                    throw new Error(result.message || 'GASエラーが発生しました');
                }
            }
        } catch (error) {
            console.error(`API Call Error: ${method} ${url}`, error);
            throw error;
        }
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
