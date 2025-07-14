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

        // フロントエンドから既にハッシュ化されたパスワードを受信
        // バックエンドでのbcryptハッシュ化は不要
        const result = await gasService.register({
            username,
            email,
            password,  // フロントエンドで既にハッシュ化済み
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
        console.log('🔍 Debug - Login request:', { email, passwordLength: password?.length });

        // フロントエンドから既にハッシュ化されたパスワードを受信して認証
        const authResult = await gasService.login(email, password);
        console.log('🔍 Debug - GAS auth result:', authResult);
        const user = authResult.user;
        console.log('🔍 Debug - User from auth result:', user);

        // JWTトークン生成
        const token = generateToken(user.id);
        console.log('🔍 Debug - Generated token:', token ? 'Token generated' : 'No token');

        const responseData = {
            success: true,
            message: 'ログインしました',
            data: {
                user,
                token
            }
        };
        console.log('🔍 Debug - Sending response:', JSON.stringify(responseData, null, 2));

        res.json(responseData);

    } catch (error) {
        console.error('Login Error:', error);
        
        // Google Apps Scriptからの認証エラーを判定
        if (error.message.includes('メールアドレスまたはパスワードが正しくありません')) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'ログイン処理中にエラーが発生しました'
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
