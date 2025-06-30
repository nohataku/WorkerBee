const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('MongoDB接続をテスト中...');
        console.log('URI:', process.env.MONGODB_URI);
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('✅ MongoDB接続成功！');
        
        // データベース名を確認
        const db = mongoose.connection.db;
        console.log('データベース名:', db.databaseName);
        
        // コレクション一覧を取得
        const collections = await db.listCollections().toArray();
        console.log('コレクション:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log('接続を終了しました');
        
    } catch (error) {
        console.error('❌ MongoDB接続エラー:', error.message);
        console.error('詳細:', error);
    }
}

testConnection();
