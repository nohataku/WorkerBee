const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const gasService = require('../services/gasService');

const router = express.Router();

// JWT生成関数
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'workerbee_secret_key', {
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

        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(password, 12);

        // GASサービスを使用してユーザー登録
        const result = await gasService.register({
            username,
            email,
            password: hashedPassword,
            displayName
        });

        // JWTトークン生成
        const token = generateToken(result.user.id);

        res.status(201).json({
            success: true,
            message: 'ユーザー登録が完了しました',
            data: {
                user: result.user,
                token
            }
        });

    } catch (error) {
        console.error('Register Error:', error);
        
        if (error.message.includes('Email already exists')) {
            return res.status(409).json({
                success: false,
                message: 'このメールアドレスは既に登録されています'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || '登録処理中にエラーが発生しました'
        });
    }
});

// ユーザーログイン
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
        // バリデーションエラーチェック
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // 全ユーザーを取得して認証を行う
        const users = await gasService.getUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // パスワード照合
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // JWTトークン生成
        const token = generateToken(user.id);

        // パスワードを除外してレスポンス
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'ログインしました',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'ログイン処理中にエラーが発生しました'
        });
    }
});

// トークン検証
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'アクセストークンが提供されていません'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'workerbee_secret_key');
        
        // ユーザー情報を取得
        const users = await gasService.getUsers();
        const user = users.find(u => u.id === decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ユーザーが見つかりません'
            });
        }

        // パスワードを除外してレスポンス
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: {
                user: userWithoutPassword
            }
        });

    } catch (error) {
        console.error('Token Verification Error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '無効なトークンです'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'トークンの有効期限が切れています'
            });
        }

        res.status(500).json({
            success: false,
            message: 'トークン検証中にエラーが発生しました'
        });
    }
});

module.exports = router;
