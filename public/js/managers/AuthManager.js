class AuthManager {
    constructor(apiClient, passwordUtils, notificationManager) {
        this.apiClient = apiClient;
        this.passwordUtils = passwordUtils;
        this.notificationManager = notificationManager;
        this.user = null;
    }

    getUser() {
        return this.user;
    }

    async checkAuthentication() {
        const token = this.apiClient.getToken();
        if (!token) {
            return { authenticated: false };
        }

        try {
            const response = await this.apiClient.call('/api/auth/verify', 'GET');
            if (response.success) {
                this.user = response.data.user;
                return { authenticated: true, user: this.user };
            } else {
                this.clearAuth();
                return { authenticated: false };
            }
        } catch (error) {
            // 認証チェック失敗時は、通知を表示せずに静かに認証画面に戻す
            console.error('Authentication check failed:', error);
            this.clearAuth();
            return { authenticated: false };
        }
    }

    async login(email, password) {
        console.log('Starting login process...');

        try {
            // パスワードをハッシュ化してから送信
            const hashedPassword = await this.passwordUtils.hashPassword(password);
            console.log('Password hashed for transmission');

            const response = await this.apiClient.call('/api/auth/login', 'POST', {
                email,
                password: hashedPassword
            });

            console.log('Login API response:', response);

            // GAS環境では、ApiClientがresult.dataを直接返すため、responseにはユーザー情報が含まれる
            if (response && response.user) {
                // トークンは現在のシステムでは使用していないため、ユーザー情報のみ設定
                this.user = response.user;
                
                console.log('Login successful, showing notification...');
                this.notificationManager.show('success', 'ログイン成功', 'ようこそ！');
                
                return { success: true, user: this.user };
            } else {
                console.log('Login failed: Invalid response format');
                this.notificationManager.show('error', 'ログインエラー', 'ログインに失敗しました');
                return { success: false, message: 'ログインに失敗しました' };
            }
        } catch (error) {
            console.error('Login error:', error);
            // 認証関連のエラーは除外（既に適切に処理されているため）
            if (!error.message.includes('認証が必要です')) {
                console.log('Showing login error notification...');
                this.notificationManager.show('error', 'ログインエラー', 'ログイン中にエラーが発生しました');
            }
            return { success: false, error: error.message };
        }
    }

    async register(username, email, displayName, password, confirmPassword) {
        if (password !== confirmPassword) {
            this.notificationManager.show('error', 'パスワードエラー', 'パスワードが一致しません');
            return { success: false, message: 'パスワードが一致しません' };
        }

        try {
            // パスワードをハッシュ化してから送信
            const hashedPassword = await this.passwordUtils.hashPassword(password);
            console.log('Password hashed for registration');

            const response = await this.apiClient.call('/api/auth/register', 'POST', {
                username,
                email,
                displayName,
                password: hashedPassword
            });

            if (response.success) {
                this.apiClient.setToken(response.data.token);
                this.user = response.data.user;
                
                this.notificationManager.show('success', '登録成功', 'アカウントが作成されました！');
                return { success: true, user: this.user };
            } else {
                this.notificationManager.show('error', '登録エラー', response.message);
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.notificationManager.show('error', '登録エラー', '登録中にエラーが発生しました');
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.clearAuth();
        this.notificationManager.show('info', 'ログアウト', 'ログアウトしました');
    }

    clearAuth() {
        this.apiClient.setToken(null);
        this.user = null;
    }
}
