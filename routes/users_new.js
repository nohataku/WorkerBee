const express = require('express');
const gasService = require('../services/gasService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 全てのルートに認証を適用
router.use(auth);

// ユーザー一覧取得（担当者検索用）
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        // GASから全ユーザーを取得
        let users = await gasService.getUsers();

        // 検索フィルタリング
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user => 
                user.displayName.toLowerCase().includes(searchLower) ||
                user.username.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        // パスワードは除外して返す
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            data: safeUsers
        });

    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ユーザー取得中にエラーが発生しました'
        });
    }
});

// 現在のユーザー情報取得
router.get('/me', async (req, res) => {
    try {
        const users = await gasService.getUsers();
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        // パスワードを除外してレスポンス
        const { password, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser
        });

    } catch (error) {
        console.error('Get Current User Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ユーザー情報取得中にエラーが発生しました'
        });
    }
});

// 特定のユーザー情報取得
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const users = await gasService.getUsers();
        const user = users.find(u => u.id === userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        // パスワードを除外してレスポンス
        const { password, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser
        });

    } catch (error) {
        console.error('Get User Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ユーザー取得中にエラーが発生しました'
        });
    }
});

module.exports = router;
