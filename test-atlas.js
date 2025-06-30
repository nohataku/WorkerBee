const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlasConnection() {
    try {
        console.log('MongoDB Atlas接続をテスト中...');
        console.log('URI:', process.env.MONGODB_URI.replace(/:[^:@]*@/, ':****@')); // パスワードを隠す
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('✅ MongoDB Atlas接続成功！');
        
        // データベース名を確認
        const db = mongoose.connection.db;
        console.log('データベース名:', db.databaseName);
        
        // 簡単な操作をテスト
        const collections = await db.listCollections().toArray();
        console.log('既存のコレクション:', collections.map(c => c.name));
        
        // テストコレクションを作成
        await db.collection('connection-test').insertOne({
            message: 'Atlas接続テスト成功',
            timestamp: new Date()
        });
        console.log('✅ テストデータの挿入成功');
        
        // テストデータを削除
        await db.collection('connection-test').deleteMany({});
        console.log('✅ テストデータの削除成功');
        
        await mongoose.disconnect();
        console.log('接続を終了しました');
        
    } catch (error) {
        console.error('❌ MongoDB Atlas接続エラー:', error.message);
        
        if (error.message.includes('ENOTFOUND')) {
            console.error('💡 DNS解決エラー - インターネット接続とURLを確認してください');
        } else if (error.message.includes('authentication failed')) {
            console.error('💡 認証エラー - ユーザー名とパスワードを確認してください');
        } else if (error.message.includes('connection refused')) {
            console.error('💡 接続拒否 - IPアドレスがホワイトリストに登録されているか確認してください');
        }
        
        console.error('詳細:', error);
    }
}

testAtlasConnection();
