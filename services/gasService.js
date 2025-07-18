const axios = require('axios');

class GasService {
    constructor() {
        // 環境変数またはデフォルト値を使用
        this.gasUrl = process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec';
        console.log('GAS URL:', this.gasUrl);
    }

    // ユーザー関連のメソッド
    async login(email, password) {
        try {
            console.log('🔐 GAS Login attempt:', { email, passwordLength: password?.length });
            
            const requestData = {
                action: 'login',
                payload: { email, password }
            };
            
            const response = await axios.post(this.gasUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'ログインに失敗しました');
            }
        } catch (error) {
            console.error('🚨 GAS Login Error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                config: error.config
            });
            throw new Error(error.response?.data?.message || 'ログインエラーが発生しました');
        }
    }

    async register(userData) {
        try {
            const response = await axios.post(this.gasUrl, {
                action: 'register',
                payload: userData
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || '登録に失敗しました');
            }
        } catch (error) {
            console.error('GAS Register Error:', error);
            throw new Error(error.response?.data?.message || '登録エラーが発生しました');
        }
    }

    async getUsers() {
        try {
            const response = await axios.get(`${this.gasUrl}?action=getUsers`);
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'ユーザー取得に失敗しました');
            }
        } catch (error) {
            console.error('GAS Get Users Error:', error);
            throw new Error(error.response?.data?.message || 'ユーザー取得エラーが発生しました');
        }
    }

    async getUsersWithPasswords() {
        try {
            const response = await axios.get(`${this.gasUrl}?action=getUsersWithPasswords`);
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'ユーザー取得に失敗しました');
            }
        } catch (error) {
            console.error('GAS Get Users With Passwords Error:', error);
            throw new Error(error.response?.data?.message || 'ユーザー取得エラーが発生しました');
        }
    }

    // タスク関連のメソッド
    async getTasks() {
        try {
            const response = await axios.get(`${this.gasUrl}?action=getTasks`, {
                timeout: 10000, // 10秒のタイムアウト
                headers: {
                    'User-Agent': 'WorkerBee/1.0'
                }
            });
            
            if (response.data && response.data.success) {
                const responseData = response.data.data || {};
                const tasks = responseData.tasks || responseData || [];
                const validTasks = Array.isArray(tasks) ? tasks : [];
                console.log('✅ Successfully retrieved tasks from GAS:', validTasks.length);
                return validTasks;
            } else {
                console.error('GAS returned unsuccessful response:', response.data);
                throw new Error(response.data?.message || 'タスク取得に失敗しました');
            }
        } catch (error) {
            console.error('GAS Get Tasks Error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('GAS サービスへの接続がタイムアウトしました');
            } else if (error.response) {
                console.error('GAS Error Response:', error.response.status, error.response.data);
                throw new Error(`GAS サービスエラー: ${error.response.status} - ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                console.error('GAS No Response:', error.request);
                throw new Error('GAS サービスからの応答がありません。ネットワーク接続を確認してください。');
            } else {
                throw new Error(`GAS 通信エラー: ${error.message}`);
            }
        }
    }

    async createTask(taskData) {
        try {
            const response = await axios.post(this.gasUrl, {
                action: 'createTask',
                payload: taskData
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'タスク作成に失敗しました');
            }
        } catch (error) {
            console.error('GAS Create Task Error:', error);
            throw new Error(error.response?.data?.message || 'タスク作成エラーが発生しました');
        }
    }

    async updateTask(taskId, updates) {
        try {
            const response = await axios.post(this.gasUrl, {
                action: 'updateTask',
                payload: { id: taskId, ...updates }
            }, {
                timeout: 10000, // 10秒のタイムアウト
                headers: {
                    'User-Agent': 'WorkerBee/1.0'
                }
            });
            
            if (response.data && response.data.success) {
                console.log('Task updated successfully in GAS');
                return { task: response.data.data };
            } else {
                console.error('GAS returned unsuccessful response for updateTask:', response.data);
                throw new Error(response.data?.message || 'タスク更新に失敗しました');
            }
        } catch (error) {
            console.error('GAS Update Task Error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('GAS サービスへの接続がタイムアウトしました');
            } else if (error.response) {
                console.error('GAS Error Response:', error.response.status, error.response.data);
                throw new Error(`GAS サービスエラー: ${error.response.status} - ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                console.error('GAS No Response:', error.request);
                throw new Error('GAS サービスからの応答がありません。ネットワーク接続を確認してください。');
            } else {
                throw new Error(`GAS 通信エラー: ${error.message}`);
            }
        }
    }

    async deleteTask(taskId) {
        try {
            const response = await axios.post(this.gasUrl, {
                action: 'deleteTask',
                payload: { id: taskId }
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'タスク削除に失敗しました');
            }
        } catch (error) {
            console.error('GAS Delete Task Error:', error);
            throw new Error(error.response?.data?.message || 'タスク削除エラーが発生しました');
        }
    }

    // ユーザー統計を取得
    async getUserStats() {
        try { 
            const response = await axios.post(this.gasUrl, {
                action: 'getUserStats',
                payload: {}
            }, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'WorkerBee/1.0'
                }
            });
            
            if (response.data && response.data.success) {
                console.log('User stats loaded successfully from GAS');
                return response.data.data;
            } else {
                console.error('GAS returned unsuccessful response for getUserStats:', response.data);
                throw new Error(response.data?.message || 'ユーザー統計の取得に失敗しました');
            }
        } catch (error) {
            console.error('GAS Get User Stats Error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('GAS サービスへの接続がタイムアウトしました');
            } else if (error.response) {
                console.error('GAS Error Response:', error.response.status, error.response.data);
                throw new Error(`GAS サービスエラー: ${error.response.status} - ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                console.error('GAS No Response:', error.request);
                throw new Error('GAS サービスからの応答がありません。ネットワーク接続を確認してください。');
            } else {
                throw new Error(`GAS 通信エラー: ${error.message}`);
            }
        }
    }
}

module.exports = new GasService();
