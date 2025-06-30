const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (!user || !user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: '無効なトークンです'
                });
            }

            req.user = user;
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
