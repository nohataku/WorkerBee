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
        let users = [];
        try {
            users = await gasService.getUsers();
        } catch (gasError) {
            console.error('Error getting users from GAS:', gasError);
            // GASエラーの場合、デフォルトユーザーを返す
            users = [
                {
                    _id: '1',
                    id: '1',
                    username: 'admin',
                    email: 'admin@workerbee.com',
                    displayName: '管理者'
                },
                {
                    _id: '2', 
                    id: '2',
                    username: 'user1',
                    email: 'user1@workerbee.com',
                    displayName: 'ユーザー1'
                }
            ];
            console.log('Using fallback users:', users.length);
        }

        // 検索フィルタリング
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user => 
                (user.displayName && user.displayName.toLowerCase().includes(searchLower)) ||
                (user.username && user.username.toLowerCase().includes(searchLower)) ||
                (user.email && user.email.toLowerCase().includes(searchLower))
            );
        }

        // パスワードは除外して返す
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return {
                ...safeUser,
                _id: safeUser._id || safeUser.id // _idが無い場合はidを使用
            };
        });

        res.json({
            success: true,
            data: {
                users: safeUsers
            }
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

// ユーザー検索（既存のsearchUsersメソッド互換性のため）
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: {
                    users: []
                }
            });
        }

        // GASから全ユーザーを取得
        let users = await gasService.getUsers();

        // 検索フィルタリング
        const searchLower = q.toLowerCase();
        users = users.filter(user => 
            user.displayName.toLowerCase().includes(searchLower) ||
            user.username.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
        );

        // パスワードは除外して返す
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            data: {
                users: safeUsers
            }
        });

    } catch (error) {
        console.error('Search Users Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ユーザー検索中にエラーが発生しました'
        });
    }
});

module.exports = router;
