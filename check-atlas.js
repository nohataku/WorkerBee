// MongoDB Atlas接続確認スクリプト
// Atlas IP設定後にこのスクリプトで接続をテスト

const mongoose = require('mongoose');

// Atlas URI（パスワードは隠して表示）
const atlasURI = "mongodb+srv://nohataku:CY8200yOhXDCvrUI@tasker.vgo1a5x.mongodb.net/tasker-multi?retryWrites=true&w=majority&appName=Tasker";
const maskedURI = atlasURI.replace(/:[^:@]*@/, ':****@');

console.log('🔍 MongoDB Atlas接続テスト');
console.log('📍 現在のIP:', '133.80.123.146');
console.log('🔗 Atlas URI:', maskedURI);
console.log('');

async function testAtlasConnection() {
    try {
        console.log('⏳ Atlas接続を試行中...');
        
        await mongoose.connect(atlasURI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
        });

        console.log('✅ MongoDB Atlas接続成功！');
        console.log('📊 データベース:', mongoose.connection.db.databaseName);
        
        // 簡単な操作テスト
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 コレクション:', collections.map(c => c.name).join(', ') || 'なし');
        
        await mongoose.disconnect();
        console.log('🔚 接続を終了');
        
    } catch (error) {
        console.error('❌ Atlas接続失敗:', error.message);
        
        if (error.message.includes('IP')) {
            console.log('');
            console.log('💡 解決方法:');
            console.log('1. https://cloud.mongodb.com にログイン');
            console.log('2. Network Access → ADD IP ADDRESS');
            console.log('3. IP: 133.80.123.146 を追加');
            console.log('4. または 0.0.0.0/0 で全IP許可（開発用）');
        }
    }
}

testAtlasConnection();
