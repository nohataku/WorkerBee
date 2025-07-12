const axios = require('axios');

class GasService {
    constructor() {
        this.gasUrl = 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec';
    }

    // ユーザー関連のメソッド
    async login(email, password) {
        try {
            const response = await axios.post(this.gasUrl, {
                action: 'login',
                payload: { email, password }
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'ログインに失敗しました');
            }
        } catch (error) {
            console.error('GAS Login Error:', error);
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

    // タスク関連のメソッド
    async getTasks() {
        try {
            const response = await axios.get(`${this.gasUrl}?action=getTasks`);
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'タスク取得に失敗しました');
            }
        } catch (error) {
            console.error('GAS Get Tasks Error:', error);
            throw new Error(error.response?.data?.message || 'タスク取得エラーが発生しました');
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
            });
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'タスク更新に失敗しました');
            }
        } catch (error) {
            console.error('GAS Update Task Error:', error);
            throw new Error(error.response?.data?.message || 'タスク更新エラーが発生しました');
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
}

module.exports = new GasService();
