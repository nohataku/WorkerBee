// MongoDB初期化スクリプト
db = db.getSiblingDB('tasker-multi');

// 管理者ユーザーを作成
db.createUser({
  user: 'taskerUser',
  pwd: 'taskerPass123',
  roles: [
    {
      role: 'readWrite',
      db: 'tasker-multi'
    }
  ]
});

// サンプルコレクションを作成（オプション）
db.createCollection('users');
db.createCollection('tasks');
db.createCollection('projects');

print('✅ Database initialization completed!');
