const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'ユーザー名は必須です'],
        unique: true,
        trim: true,
        minlength: [3, 'ユーザー名は3文字以上で入力してください'],
        maxlength: [30, 'ユーザー名は30文字以内で入力してください'],
        match: [/^[a-zA-Z0-9_-]+$/, 'ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です']
    },
    email: {
        type: String,
        required: [true, 'メールアドレスは必須です'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            '有効なメールアドレスを入力してください'
        ]
    },
    password: {
        type: String,
        required: [true, 'パスワードは必須です'],
        minlength: [6, 'パスワードは6文字以上で入力してください']
    },
    displayName: {
        type: String,
        required: [true, '表示名は必須です'],
        trim: true,
        maxlength: [50, '表示名は50文字以内で入力してください']
    },
    avatar: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        },
        language: {
            type: String,
            enum: ['ja', 'en'],
            default: 'ja'
        },
        notifications: {
            taskAssigned: { type: Boolean, default: true },
            taskCompleted: { type: Boolean, default: true },
            taskDueDate: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// インデックス作成（uniqueは既にスキーマで定義済み）
userSchema.index({ isActive: 1 });

// パスワードハッシュ化
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// パスワード検証
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// アカウントロック確認
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ログイン試行回数増加
userSchema.methods.incLoginAttempts = function() {
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2時間

    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }

    return this.updateOne(updates);
};

// ログイン成功時のリセット
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

module.exports = mongoose.model('User', userSchema);
