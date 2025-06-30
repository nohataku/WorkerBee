const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 全てのルートに認証を適用
router.use(auth);

// ユーザープロフィール取得
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'プロフィール取得中にエラーが発生しました',
            error: error.message
        });
    }
});

// ユーザープロフィール更新
router.put('/profile', [
    body('displayName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('表示名は1文字以上50文字以内で入力してください'),
    body('preferences.theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('無効なテーマです'),
    body('preferences.language')
        .optional()
        .isIn(['ja', 'en'])
        .withMessage('無効な言語設定です')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const updates = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        // プロフィール更新
        if (updates.displayName) {
            user.displayName = updates.displayName;
        }

        if (updates.preferences) {
            user.preferences = { ...user.preferences, ...updates.preferences };
        }

        await user.save();

        res.json({
            success: true,
            message: 'プロフィールを更新しました',
            data: { user: user.toJSON() }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'プロフィール更新中にエラーが発生しました',
            error: error.message
        });
    }
});

// ユーザー検索
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: '検索キーワードは2文字以上で入力してください'
            });
        }

        const users = await User.find({
            $and: [
                { isActive: true },
                { _id: { $ne: req.user._id } }, // 自分以外
                {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { displayName: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
        .select('username displayName email avatar')
        .limit(parseInt(limit));

        res.json({
            success: true,
            data: { users }
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'ユーザー検索中にエラーが発生しました',
            error: error.message
        });
    }
});

// パスワード変更
router.put('/password', [
    body('currentPassword')
        .notEmpty()
        .withMessage('現在のパスワードを入力してください'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新しいパスワードは6文字以上で入力してください'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('確認用パスワードが一致しません');
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        // 現在のパスワード確認
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: '現在のパスワードが正しくありません'
            });
        }

        // 新しいパスワードが現在のパスワードと同じかチェック
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: '新しいパスワードは現在のパスワードと異なるものを設定してください'
            });
        }

        // パスワード更新
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'パスワードを変更しました'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'パスワード変更中にエラーが発生しました',
            error: error.message
        });
    }
});

module.exports = router;
