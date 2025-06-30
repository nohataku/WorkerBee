const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'プロジェクト名は必須です'],
        trim: true,
        maxlength: [100, 'プロジェクト名は100文字以内で入力してください']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, '説明は500文字以内で入力してください']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member', 'viewer'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['planning', 'active', 'completed', 'paused', 'archived'],
        default: 'planning'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null
    },
    color: {
        type: String,
        default: '#667eea',
        match: [/^#[0-9A-F]{6}$/i, '有効な色コードを入力してください']
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    settings: {
        allowMemberInvite: { type: Boolean, default: true },
        requireApproval: { type: Boolean, default: false },
        defaultTaskPriority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// インデックス
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ isPublic: 1 });

// 仮想フィールド：メンバー数
projectSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

// 仮想フィールド：アクティブなタスク数
projectSchema.virtual('taskCount', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'project',
    count: true
});

// メンバーの権限チェック
projectSchema.methods.hasPermission = function(userId, requiredRole = 'member') {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    if (!member) return false;

    const roles = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roles.indexOf(member.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    return userRoleIndex >= requiredRoleIndex;
};

// メンバー追加
projectSchema.methods.addMember = function(userId, role = 'member') {
    const existingMember = this.members.find(m => m.user.toString() === userId.toString());
    if (existingMember) {
        throw new Error('ユーザーは既にプロジェクトのメンバーです');
    }

    this.members.push({
        user: userId,
        role: role,
        joinedAt: new Date()
    });

    return this.save();
};

// メンバー削除
projectSchema.methods.removeMember = function(userId) {
    this.members = this.members.filter(m => m.user.toString() !== userId.toString());
    return this.save();
};

module.exports = mongoose.model('Project', projectSchema);
