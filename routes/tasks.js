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

        const { status = 'all', priority, search, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        console.log('Getting tasks with filters:', { status, priority, search, limit, sortBy, sortOrder });

        // GASから全タスクとユーザーを並行取得
        const [tasks, users] = await Promise.all([
            gasService.getTasks(),
            gasService.getUsers()
        ]);
        
        console.log('Raw tasks from GAS:', tasks?.length || 0);
        console.log('Raw users from GAS:', users?.length || 0);

        // タスクとユーザーが配列でない場合の処理
        const tasksArray = Array.isArray(tasks) ? tasks : [];
        const usersArray = Array.isArray(users) ? users : [];

        // ユーザーマップを作成（高速検索用）
        const userMap = new Map();
        usersArray.forEach(user => {
            if (user._id || user.id) {
                userMap.set(user._id || user.id, user);
            }
        });

        console.log('User map created with', userMap.size, 'users');

        // データの正規化（フロントエンドが期待する形式に変換）
        const normalizedTasks = tasksArray.map(task => {
            try {
                // 担当者情報の取得
                let assignedToInfo = {
                    _id: 'unknown',
                    displayName: '未割り当て',
                    email: ''
                };

                if (task.assignedTo) {
                    if (typeof task.assignedTo === 'object' && task.assignedTo.displayName) {
                        // 既にオブジェクト形式の場合
                        assignedToInfo = {
                            _id: task.assignedTo._id || task.assignedTo.id || 'unknown',
                            displayName: task.assignedTo.displayName,
                            email: task.assignedTo.email || ''
                        };
                    } else if (typeof task.assignedTo === 'string') {
                        // IDの場合、ユーザーマップから検索
                        const assignedUser = userMap.get(task.assignedTo);
                        if (assignedUser) {
                            assignedToInfo = {
                                _id: assignedUser._id || assignedUser.id,
                                displayName: assignedUser.displayName || assignedUser.username || assignedUser.email,
                                email: assignedUser.email || ''
                            };
                        } else {
                            // ユーザーが見つからない場合、IDを保持
                            assignedToInfo._id = task.assignedTo;
                        }
                    }
                }
                // assignedToNameが設定されている場合は上書き
                if (task.assignedToName) {
                    assignedToInfo.displayName = task.assignedToName;
                }

                // 作成者情報の取得
                let createdByInfo = {
                    _id: req.user?._id || 'unknown',
                    displayName: req.user?.displayName || '不明',
                    email: req.user?.email || ''
                };

                if (task.createdBy) {
                    if (typeof task.createdBy === 'object' && task.createdBy.displayName) {
                        createdByInfo = {
                            _id: task.createdBy._id || task.createdBy.id || 'unknown',
                            displayName: task.createdBy.displayName,
                            email: task.createdBy.email || ''
                        };
                    } else if (typeof task.createdBy === 'string') {
                        const createdUser = userMap.get(task.createdBy);
                        if (createdUser) {
                            createdByInfo = {
                                _id: createdUser._id || createdUser.id,
                                displayName: createdUser.displayName || createdUser.username || createdUser.email,
                                email: createdUser.email || ''
                            };
                        } else {
                            createdByInfo._id = task.createdBy;
                        }
                    }
                }
                if (task.createdByName) {
                    createdByInfo.displayName = task.createdByName;
                }

                return {
                    _id: task._id || task.id || Date.now().toString(),
                    title: task.title || 'タイトルなし',
                    description: task.description || '',
                    priority: task.priority || 'medium',
                    completed: Boolean(task.completed || task.status === 'completed'),
                    status: task.status || (task.completed ? 'completed' : 'pending'),
                    dueDate: task.dueDate || null,
                    createdAt: task.createdAt || new Date().toISOString(),
                    updatedAt: task.updatedAt || new Date().toISOString(),
                    assignedTo: assignedToInfo,
                    createdBy: createdByInfo
                };
            } catch (error) {
                console.error('Error normalizing task:', error, task);
                return null;
            }
        }).filter(task => task !== null);

        console.log('Normalized tasks:', normalizedTasks.length);

        // フィルタリング
        let filteredTasks = normalizedTasks;
        
        if (status !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === status);
        }

        if (priority) {
            filteredTasks = filteredTasks.filter(task => task.priority === priority);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchLower) ||
                (task.description && task.description.toLowerCase().includes(searchLower))
            );
        }

        // ソート
        filteredTasks.sort((a, b) => {
            const aValue = new Date(a[sortBy] || a.createdAt);
            const bValue = new Date(b[sortBy] || b.createdAt);
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        // 制限
        const limitNum = parseInt(limit) || 50;
        if (limitNum > 0) {
            filteredTasks = filteredTasks.slice(0, limitNum);
        }

        console.log('Final filtered tasks:', filteredTasks.length);

        res.json({
            success: true,
            data: {
                tasks: filteredTasks,
                total: filteredTasks.length
            }
        });

    } catch (error) {
        console.error('Get Tasks Error:', error);
        console.error('Error stack:', error.stack);
        
        // GASサービスエラーの場合の特別な処理
        if (error.message && error.message.includes('GAS')) {
            return res.status(503).json({
                success: false,
                message: 'Google Apps Scriptサービスとの通信でエラーが発生しました。しばらく待ってから再度お試しください。',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'タスク取得中にエラーが発生しました',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// タスク統計取得
router.get('/stats/user', async (req, res) => {
    try {
        console.log('=== TASK STATS API ===');
        console.log('Getting task statistics...');

        // GASから統計データを取得
        const statsData = await gasService.getUserStats();
        
        console.log('Stats data from GAS:', statsData);
        console.log('Stats object:', statsData?.stats);

        const responseData = {
            success: true,
            data: {
                stats: statsData.stats
            }
        };

        console.log('Sending response:', responseData);

        res.json(responseData);

    } catch (error) {
        console.error('Get Task Statistics Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'タスク統計の取得中にエラーが発生しました'
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
        .withMessage('担当者IDが無効です'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('完了状態は真偽値である必要があります')
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
        ['title', 'description', 'priority', 'status', 'dueDate', 'assignedTo', 'completed'].forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // completedフィールドがある場合、statusも設定
        if (req.body.completed !== undefined) {
            updates.status = req.body.completed ? 'completed' : 'pending';
        }

        // statusフィールドがある場合、completedも設定
        if (req.body.status !== undefined) {
            updates.completed = req.body.status === 'completed';
        }

        console.log('Task update request:', { taskId, updates });

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

// タスク詳細取得
router.get('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        console.log('Getting task details for ID:', taskId);

        // GASから全タスクとユーザーを並行取得
        const [allTasks, users] = await Promise.all([
            gasService.getTasks(),
            gasService.getUsers()
        ]);
        
        if (!Array.isArray(allTasks)) {
            console.warn('Tasks from GAS is not an array:', allTasks);
            return res.status(500).json({
                success: false,
                message: 'タスクデータの取得に失敗しました'
            });
        }

        // ユーザーマップを作成
        const usersArray = Array.isArray(users) ? users : [];
        const userMap = new Map();
        usersArray.forEach(user => {
            if (user._id || user.id) {
                userMap.set(user._id || user.id, user);
            }
        });

        // 指定されたIDのタスクを検索
        const task = allTasks.find(t => t._id === taskId || t.id === taskId);
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'タスクが見つかりません'
            });
        }

        // 担当者情報の取得
        let assignedToInfo = {
            _id: 'unknown',
            displayName: '未割り当て',
            email: ''
        };

        if (task.assignedTo) {
            if (typeof task.assignedTo === 'object' && task.assignedTo.displayName) {
                assignedToInfo = {
                    _id: task.assignedTo._id || task.assignedTo.id || 'unknown',
                    displayName: task.assignedTo.displayName,
                    email: task.assignedTo.email || ''
                };
            } else if (typeof task.assignedTo === 'string') {
                const assignedUser = userMap.get(task.assignedTo);
                if (assignedUser) {
                    assignedToInfo = {
                        _id: assignedUser._id || assignedUser.id,
                        displayName: assignedUser.displayName || assignedUser.username || assignedUser.email,
                        email: assignedUser.email || ''
                    };
                } else {
                    assignedToInfo._id = task.assignedTo;
                }
            }
        }
        if (task.assignedToName) {
            assignedToInfo.displayName = task.assignedToName;
        }

        // 作成者情報の取得
        let createdByInfo = {
            _id: req.user?._id || 'unknown',
            displayName: req.user?.displayName || '不明',
            email: req.user?.email || ''
        };

        if (task.createdBy) {
            if (typeof task.createdBy === 'object' && task.createdBy.displayName) {
                createdByInfo = {
                    _id: task.createdBy._id || task.createdBy.id || 'unknown',
                    displayName: task.createdBy.displayName,
                    email: task.createdBy.email || ''
                };
            } else if (typeof task.createdBy === 'string') {
                const createdUser = userMap.get(task.createdBy);
                if (createdUser) {
                    createdByInfo = {
                        _id: createdUser._id || createdUser.id,
                        displayName: createdUser.displayName || createdUser.username || createdByInfo.email,
                        email: createdUser.email || ''
                    };
                } else {
                    createdByInfo._id = task.createdBy;
                }
            }
        }
        if (task.createdByName) {
            createdByInfo.displayName = task.createdByName;
        }

        // データの正規化
        const normalizedTask = {
            _id: task._id || task.id || taskId,
            title: task.title || 'タイトルなし',
            description: task.description || '',
            priority: task.priority || 'medium',
            completed: Boolean(task.completed || task.status === 'completed'),
            status: task.status || (task.completed ? 'completed' : 'pending'),
            dueDate: task.dueDate || null,
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString(),
            assignedTo: assignedToInfo,
            createdBy: createdByInfo
        };

        console.log('Task details retrieved:', normalizedTask);

        res.json({
            success: true,
            data: {
                task: normalizedTask
            }
        });

    } catch (error) {
        console.error('Get Task Details Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'タスク詳細の取得中にエラーが発生しました'
        });
    }
});

module.exports = router;
