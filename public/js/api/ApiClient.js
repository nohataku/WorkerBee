class ApiClient {
    constructor() {
        this.token = localStorage.getItem('workerbee_token');
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
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (this.token) {
                options.headers.Authorization = `Bearer ${this.token}`;
            }

            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`API Call: ${method} ${url}`, data ? { data } : '');
            
            const response = await fetch(url, options);
            
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
            console.log(`API Response: ${method} ${url}`, result);
            
            return result;
        } catch (error) {
            console.error(`API Call Error: ${method} ${url}`, error);
            throw error;
        }
    }
}
