const jwt = require('jsonwebtoken');
const gasService = require('../services/gasService');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'アクセストークンが必要です'
            });
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'workerbee_secret_key');
            
            // GASからユーザー情報を取得
            const users = await gasService.getUsers();
            const user = users.find(u => u.id === decoded.userId);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '無効なトークンです'
                });
            }

            // パスワードを除外してreqに設定
            const { password, ...safeUser } = user;
            req.user = safeUser;
            next();

        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'トークンの有効期限が切れています'
                });
            }

            return res.status(401).json({
                success: false,
                message: '無効なトークンです'
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: '認証処理中にエラーが発生しました'
        });
    }
};

module.exports = { auth };
