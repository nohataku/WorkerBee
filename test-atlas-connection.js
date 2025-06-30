const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Atlas用の最適化された接続設定
const connectToMongoDB = async () => {
    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log(`MongoDB接続試行 ${retryCount + 1}/${maxRetries}...`);
            
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 30000, // 30秒でタイムアウト
                socketTimeoutMS: 45000, // 45秒でソケットタイムアウト
                maxPoolSize: 10,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                connectTimeoutMS: 30000,
            });

            console.log('✅ MongoDB接続成功！');
            console.log('データベース:', mongoose.connection.db.databaseName);
            
            return;
        } catch (error) {
            retryCount++;
            console.error(`❌ 接続試行 ${retryCount} 失敗:`, error.message);
            
            if (retryCount >= maxRetries) {
                console.error('💀 最大再試行回数に達しました');
                throw error;
            }
            
            console.log(`⏳ ${5 - retryCount}秒後に再試行...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// 接続テスト実行
connectToMongoDB()
    .then(() => {
        console.log('接続テスト完了');
        mongoose.disconnect();
    })
    .catch((error) => {
        console.error('接続テスト失敗:', error);
        process.exit(1);
    });
