const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 全てのルートに認証を適用
router.use(auth);

// タスク一覧取得
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('ページ番号は1以上の整数を指定してください'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('取得件数は1-100の範囲で指定してください'),
    query('status').optional().isIn(['all', 'pending', 'completed']).withMessage('無効なステータスです'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('無効な優先度です'),
    query('sortBy').optional().isIn(['createdAt', 'dueDate', 'priority', 'title']).withMessage('無効なソート項目です'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('無効なソート順です')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const {
            status = 'all',
            priority,
            assignedTo,
            project,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // フィルター条件構築
        const filter = { 
            assignedTo: req.user._id,
            isArchived: false 
        };

        if (status === 'completed') {
            filter.completed = true;
        } else if (status === 'pending') {
            filter.completed = false;
        }

        if (priority) {
            filter.priority = priority;
        }

        if (project) {
            filter.project = project;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // ソート条件
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // タスク取得
        const tasks = await Task.find(filter)
            .populate('assignedTo', 'displayName username avatar')
            .populate('createdBy', 'displayName username avatar')
            .populate('completedBy', 'displayName username avatar')
            .populate('project', 'name color')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // 総件数取得
        const total = await Task.countDocuments(filter);

        res.json({
            success: true,
            data: {
                tasks,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'タスク取得中にエラーが発生しました',
            error: error.message
        });
    }
});

// タスク詳細取得
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'displayName username avatar')
            .populate('createdBy', 'displayName username avatar')
            .populate('completedBy', 'displayName username avatar')
            .populate('project', 'name color')
            .populate('comments.author', 'displayName username avatar');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        // アクセス権限チェック（自分のタスクまたは作成したタスク）
        if (task.assignedTo._id.toString() !== req.user._id.toString() && 
            task.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'このタスクにアクセスする権限がありません'
            });
        }

        res.json({
            success: true,
            data: { task }
        });

    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'タスク取得中にエラーが発生しました',
            error: error.message
        });
    }
});

// タスク作成
router.post('/', [
    body('title')
        .notEmpty()
        .withMessage('タイトルは必須です')
        .isLength({ max: 200 })
        .withMessage('タイトルは200文字以内で入力してください'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('説明は1000文字以内で入力してください'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('無効な優先度です'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('有効な日付を入力してください'),
    body('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('無効なユーザーIDです'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('タグは配列で指定してください')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const {
            title,
            description,
            priority = 'medium',
            dueDate,
            assignedTo,
            project,
            tags = []
        } = req.body;

        // 担当者チェック（指定がない場合は自分を設定）
        const taskAssignedTo = assignedTo || req.user._id;

        if (assignedTo) {
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser) {
                return res.status(404).json({
                    success: false,
                    message: '指定された担当者が見つかりません'
                });
            }
        }

        // タスク作成
        const task = new Task({
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedTo: taskAssignedTo,
            createdBy: req.user._id,
            project,
            tags
        });

        task.addHistory('created', null, null, null, req.user._id);
        await task.save();

        await task.populate([
            { path: 'assignedTo', select: 'displayName username avatar' },
            { path: 'createdBy', select: 'displayName username avatar' },
            { path: 'project', select: 'name color' }
        ]);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        io.emit('task-created', {
            task: task,
            createdBy: req.user
        });

        res.status(201).json({
            success: true,
            message: 'タスクを作成しました',
            data: { task }
        });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'タスク作成中にエラーが発生しました',
            error: error.message
        });
    }
});

// タスク更新
router.put('/:id', [
    body('title')
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage('タイトルは1文字以上200文字以内で入力してください'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('説明は1000文字以内で入力してください'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('無効な優先度です'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('有効な日付を入力してください'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('完了状態はboolean値で指定してください')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array()
            });
        }

        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        // 権限チェック（担当者または作成者のみ更新可能）
        if (task.assignedTo.toString() !== req.user._id.toString() && 
            task.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'このタスクを更新する権限がありません'
            });
        }

        const updates = req.body;
        const oldValues = {};

        // 変更履歴記録用に古い値を保存
        Object.keys(updates).forEach(key => {
            if (task[key] !== updates[key]) {
                oldValues[key] = task[key];
            }
        });

        // 完了状態の変更チェック
        if (updates.completed !== undefined && updates.completed !== task.completed) {
            if (updates.completed) {
                task.completedBy = req.user._id;
                task.addHistory('completed', 'completed', false, true, req.user._id);
            } else {
                task.completedBy = null;
                task.addHistory('reopened', 'completed', true, false, req.user._id);
            }
        }

        // その他の変更履歴記録
        Object.keys(oldValues).forEach(key => {
            if (key !== 'completed') {
                task.addHistory('updated', key, oldValues[key], updates[key], req.user._id);
            }
        });

        // タスク更新
        Object.assign(task, updates);
        await task.save();

        await task.populate([
            { path: 'assignedTo', select: 'displayName username avatar' },
            { path: 'createdBy', select: 'displayName username avatar' },
            { path: 'completedBy', select: 'displayName username avatar' },
            { path: 'project', select: 'name color' }
        ]);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        io.emit('task-updated', {
            task: task,
            updatedBy: req.user,
            changes: Object.keys(oldValues)
        });

        res.json({
            success: true,
            message: 'タスクを更新しました',
            data: { task }
        });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'タスク更新中にエラーが発生しました',
            error: error.message
        });
    }
});

// タスク削除
router.delete('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        // 権限チェック（作成者のみ削除可能）
        if (task.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'このタスクを削除する権限がありません'
            });
        }

        await Task.findByIdAndDelete(req.params.id);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        io.emit('task-deleted', {
            taskId: req.params.id,
            deletedBy: req.user
        });

        res.json({
            success: true,
            message: 'タスクを削除しました'
        });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'タスク削除中にエラーが発生しました',
            error: error.message
        });
    }
});

// ユーザー統計取得
router.get('/stats/user', async (req, res) => {
    try {
        const stats = await Task.getUserStats(req.user._id);
        
        res.json({
            success: true,
            data: {
                stats: stats.length > 0 ? stats[0] : {
                    total: 0,
                    completed: 0,
                    pending: 0,
                    overdue: 0,
                    highPriority: 0
                }
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: '統計データ取得中にエラーが発生しました',
            error: error.message
        });
    }
});

module.exports = router;
