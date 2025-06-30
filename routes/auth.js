const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// JWT生成関数
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// ユーザー登録
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('ユーザー名は3文字以上30文字以内で入力してください')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です'),
    body('email')
        .isEmail()
        .withMessage('有効なメールアドレスを入力してください')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('パスワードは6文字以上で入力してください'),
    body('displayName')
        .isLength({ min: 1, max: 50 })
        .withMessage('表示名は1文字以上50文字以内で入力してください')
        .trim()
], async (req, res) => {
    try {
        // バリデーションエラーチェック
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { username, email, password, displayName } = req.body;

        // 既存ユーザーチェック
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email 
                    ? 'このメールアドレスは既に使用されています' 
                    : 'このユーザー名は既に使用されています'
            });
        }

        // ユーザー作成
        const user = new User({
            username,
            email,
            password,
            displayName
        });

        await user.save();

        // JWT生成
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'ユーザー登録が完了しました',
            data: {
                user: user.toJSON(),
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'ユーザー登録中にエラーが発生しました',
            error: error.message
        });
    }
});

// ログイン
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('有効なメールアドレスを入力してください')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('パスワードを入力してください')
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

        const { email, password } = req.body;

        // ユーザー検索
        const user = await User.findOne({ email, isActive: true });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // アカウントロックチェック
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'アカウントがロックされています。しばらく時間をおいてから再試行してください'
            });
        }

        // パスワード検証
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            await user.incLoginAttempts();
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // ログイン成功
        await user.resetLoginAttempts();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'ログインしました',
            data: {
                user: user.toJSON(),
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'ログイン中にエラーが発生しました',
            error: error.message
        });
    }
});

// トークン検証
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'トークンが提供されていません'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: '無効なトークンです'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: '無効なトークンです'
        });
    }
});

// パスワードリセット要求（簡易版）
router.post('/forgot-password', [
    body('email')
        .isEmail()
        .withMessage('有効なメールアドレスを入力してください')
        .normalizeEmail()
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

        const { email } = req.body;
        const user = await User.findOne({ email, isActive: true });

        // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
        res.json({
            success: true,
            message: 'パスワードリセットメールを送信しました（実装では実際にメールを送信してください）'
        });

        // 実際の実装では、ここでパスワードリセットトークンを生成し、
        // メール送信サービスを使用してリセットリンクを送信する

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'パスワードリセット要求中にエラーが発生しました'
        });
    }
});

module.exports = router;
