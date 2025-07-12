const express = require('express');
const { body, validationResult, query } = require('express-validator');
const gasService = require('../services/gasService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 全てのルートに認証を適用
router.use(auth);

// タスク一覧取得
router.get('/', [
    query('status').optional().isIn(['all', 'pending', 'completed']).withMessage('無効なステータスです'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('無効な優先度です')
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

        const { status = 'all', priority, search } = req.query;

        // GASから全タスクを取得
        let tasks = await gasService.getTasks();

        // フィルタリング
        if (status !== 'all') {
            tasks = tasks.filter(task => task.status === status);
        }

        if (priority) {
            tasks = tasks.filter(task => task.priority === priority);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            tasks = tasks.filter(task => 
                task.title.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower))
            );
        }

        // 作成日時順にソート（新しい順）
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: {
                tasks,
                total: tasks.length
            }
        });

    } catch (error) {
        console.error('Get Tasks Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'タスク取得中にエラーが発生しました'
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
        .withMessage('無効な日付形式です'),
    body('assignedTo')
        .optional()
        .isString()
        .withMessage('担当者IDが無効です')
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

        const taskData = {
            title: req.body.title,
            description: req.body.description || '',
            priority: req.body.priority || 'medium',
            dueDate: req.body.dueDate || '',
            assignedTo: req.body.assignedTo || ''
        };

        // GASサービスを使用してタスク作成
        const newTask = await gasService.createTask(taskData);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        if (io) {
            io.emit('task-created', newTask);
        }

        res.status(201).json({
            success: true,
            message: 'タスクが作成されました',
            data: newTask
        });

    } catch (error) {
        console.error('Create Task Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'タスク作成中にエラーが発生しました'
        });
    }
});

// タスク更新
router.put('/:id', [
    body('title')
        .optional()
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
    body('status')
        .optional()
        .isIn(['pending', 'completed'])
        .withMessage('無効なステータスです'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('無効な日付形式です'),
    body('assignedTo')
        .optional()
        .isString()
        .withMessage('担当者IDが無効です')
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

        const taskId = req.params.id;
        const updates = {};

        // 更新するフィールドのみを抽出
        ['title', 'description', 'priority', 'status', 'dueDate', 'assignedTo'].forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: '更新するデータが指定されていません'
            });
        }

        // GASサービスを使用してタスク更新
        const updatedTask = await gasService.updateTask(taskId, updates);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        if (io) {
            io.emit('task-updated', updatedTask);
        }

        res.json({
            success: true,
            message: 'タスクが更新されました',
            data: updatedTask
        });

    } catch (error) {
        console.error('Update Task Error:', error);
        
        if (error.message.includes('Task not found')) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'タスク更新中にエラーが発生しました'
        });
    }
});

// タスク削除
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;

        // GASサービスを使用してタスク削除
        await gasService.deleteTask(taskId);

        // Socket.IOで通知
        const io = req.app.get('socketio');
        if (io) {
            io.emit('task-deleted', { id: taskId });
        }

        res.json({
            success: true,
            message: 'タスクが削除されました'
        });

    } catch (error) {
        console.error('Delete Task Error:', error);
        
        if (error.message.includes('Task not found')) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'タスク削除中にエラーが発生しました'
        });
    }
});

// 特定のタスク取得
router.get('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;

        // 全タスクを取得して特定のタスクを検索
        const tasks = await gasService.getTasks();
        const task = tasks.find(t => t.id === taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        res.json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error('Get Task Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'タスク取得中にエラーが発生しました'
        });
    }
});

module.exports = router;
