const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasker-multi';

// セキュリティミドルウェア
app.use(helmet());
app.use(cors());

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静的ファイル
app.use(express.static('public'));

// MongoDB接続
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDBに接続しました');
    })
    .catch((error) => {
        console.error('❌ MongoDB接続エラー:', error);
        process.exit(1);
    });

// Socket.IOの設定
io.on('connection', (socket) => {
    console.log(`👤 ユーザーが接続しました: ${socket.id}`);

    // ユーザーをルームに参加させる
    socket.on('join-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 ユーザー ${userId} がルームに参加しました`);
    });

    // タスク更新の通知
    socket.on('task-updated', (data) => {
        socket.broadcast.emit('task-changed', data);
    });

    socket.on('disconnect', () => {
        console.log(`👤 ユーザーが切断しました: ${socket.id}`);
    });
});

// Socket.IOインスタンスをグローバルに設定
app.set('socketio', io);

// ルート設定
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// ルートページ
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// エラーハンドリング
app.use((error, req, res, next) => {
    console.error('❌ サーバーエラー:', error);
    res.status(500).json({
        success: false,
        message: 'サーバー内部エラーが発生しました',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
});

// 404ハンドリング
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'ページが見つかりません'
    });
});

// サーバー起動
server.listen(PORT, () => {
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`📊 MongoDB URI: ${MONGODB_URI}`);
    console.log(`🌐 環境: ${process.env.NODE_ENV || 'development'}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERMを受信しました。サーバーを終了します...');
    server.close(() => {
        mongoose.connection.close();
        process.exit(0);
    });
});

module.exports = app;
