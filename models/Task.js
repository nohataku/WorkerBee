const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'タスクのタイトルは必須です'],
        trim: true,
        maxlength: [200, 'タイトルは200文字以内で入力してください']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, '説明は1000文字以内で入力してください']
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        default: null
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [20, 'タグは20文字以内で入力してください']
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '担当者の指定は必須です']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedAt: {
        type: Date,
        default: null
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    comments: [{
        text: {
            type: String,
            required: true,
            maxlength: [500, 'コメントは500文字以内で入力してください']
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    history: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'completed', 'reopened', 'deleted', 'assigned'],
            required: true
        },
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// インデックス作成
taskSchema.index({ assignedTo: 1, completed: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ 'title': 'text', 'description': 'text' });

// 仮想フィールド
taskSchema.virtual('isOverdue').get(function() {
    return this.dueDate && this.dueDate < new Date() && !this.completed;
});

taskSchema.virtual('daysUntilDue').get(function() {
    if (!this.dueDate) return null;
    const now = new Date();
    const diffTime = this.dueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// タスク完了時の処理
taskSchema.pre('save', function(next) {
    if (this.isModified('completed')) {
        if (this.completed && !this.completedAt) {
            this.completedAt = new Date();
        } else if (!this.completed) {
            this.completedAt = null;
            this.completedBy = null;
        }
    }
    next();
});

// 履歴記録用のミドルウェア
taskSchema.methods.addHistory = function(action, field = null, oldValue = null, newValue = null, userId) {
    this.history.push({
        action,
        field,
        oldValue,
        newValue,
        user: userId
    });
};

// 静的メソッド：ユーザーのタスク統計取得
taskSchema.statics.getUserStats = function(userId) {
    return this.aggregate([
        { $match: { assignedTo: mongoose.Types.ObjectId(userId), isArchived: false } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                completed: { $sum: { $cond: ['$completed', 1, 0] } },
                pending: { $sum: { $cond: ['$completed', 0, 1] } },
                overdue: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $lt: ['$dueDate', new Date()] },
                                { $eq: ['$completed', false] }
                            ]},
                            1,
                            0
                        ]
                    }
                },
                highPriority: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $in: ['$priority', ['high', 'urgent']] },
                                { $eq: ['$completed', false] }
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Task', taskSchema);
