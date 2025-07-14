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
            console.log('🔍 Debug - Response structure:', JSON.stringify(response, null, 2));

            // Node.js環境とGAS環境の両方に対応
            let user, token;
            
            if (response && response.success && response.data) {
                // Node.js環境からのレスポンス形式: { success: true, data: { user, token } }
                console.log('🔍 Debug - Detected Node.js response format');
                user = response.data.user;
                token = response.data.token;
            } else if (response && response.user) {
                // GAS環境からのレスポンス形式: { user, token }（ApiClientで処理済み）
                console.log('🔍 Debug - Detected GAS response format');
                user = response.user;
                token = response.token;
            }

            console.log('🔍 Debug - Extracted user:', user);
            console.log('🔍 Debug - Extracted token:', token ? 'Token present' : 'No token');

            if (user) {
                // ユーザー情報とトークンを設定
                this.user = user;
                if (token) {
                    this.apiClient.setToken(token);
                }
                
                console.log('Login successful, showing notification...');
                this.notificationManager.show('success', 'ログイン成功', 'ようこそ！');
                
                return { success: true, user: this.user };
            } else {
                console.log('Login failed: Invalid response format');
                
                // サーバーからの詳細なエラーメッセージがある場合はそれを使用
                let errorMessage = 'ログインに失敗しました';
                if (response && response.message) {
                    errorMessage = response.message;
                } else if (response && !response.success && response.message) {
                    errorMessage = response.message;
                }
                
                this.notificationManager.show('error', 'ログインエラー', errorMessage);
                return { success: false, message: errorMessage };
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // サーバーからのエラーメッセージを解析
            let errorMessage = 'ログイン中にエラーが発生しました';
            if (error.message) {
                if (error.message.includes('メールアドレスまたはパスワードが正しくありません')) {
                    errorMessage = 'メールアドレスまたはパスワードが正しくありません';
                } else if (error.message.includes('認証が必要です')) {
                    // 認証関連のエラーは除外（既に適切に処理されているため）
                    return { success: false, error: error.message };
                } else {
                    errorMessage = error.message;
                }
            }
            
            console.log('Showing login error notification...');
            this.notificationManager.show('error', 'ログインエラー', errorMessage);
            return { success: false, error: errorMessage };
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

            console.log('Register API response:', response);

            // GAS環境では、ApiClientがresult.dataを直接返すため、responseにはユーザー情報が含まれる
            if (response && response.user) {
                // GAS環境では通常トークンは使用しないため、tokenがある場合のみ設定
                if (response.token) {
                    this.apiClient.setToken(response.token);
                }
                this.user = response.user;
                
                console.log('Registration successful, user:', this.user);
                this.notificationManager.show('success', '登録成功', 'アカウントが作成されました！');
                return { success: true, user: this.user };
            } else {
                console.log('Registration failed: Invalid response format');
                this.notificationManager.show('error', '登録エラー', response?.message || '登録に失敗しました');
                return { success: false, message: response?.message || '登録に失敗しました' };
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
