class TaskUtils {
    static getPriorityLabel(priority) {
        switch (priority) {
            case 'low': return '低';
            case 'medium': return '中';
            case 'high': return '高';
            case 'urgent': return '緊急';
            default: return '中';
        }
    }

    static formatDate(date) {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return '今日';
        } else if (days === 1) {
            return '明日';
        } else if (days === -1) {
            return '昨日';
        } else if (days > 1) {
            return `${days}日後`;
        } else {
            return `${Math.abs(days)}日前`;
        }
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static createTaskHTML(task, currentUser, allUsers = []) {
        try {
            // タスクデータの検証（id または _id どちらでも対応）
            const taskId = task?.id || task?._id;
            if (!task || !taskId) {
                throw new Error('Invalid task data');
            }

            // 日付処理（開始日と期限日）
            const startDate = task.startDate ? new Date(task.startDate) : null;
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
            const startDateStr = startDate ? TaskUtils.formatDate(startDate) : '';
            const dueDateStr = dueDate ? TaskUtils.formatDate(dueDate) : '';
            
            // assignedToの安全な処理
            let assigneeName = '未割り当て';

            // デバッグ用ログ（本番環境でも一時的に有効）
            if (allUsers.length === 0 || (task.assignedTo && assigneeName === '未割り当て')) {
                console.log('=== TaskUtils.createTaskHTML DEBUG ===');
                console.log('Task ID:', taskId);
                console.log('Task.assignedTo:', task.assignedTo);
                console.log('Task.assignedToName:', task.assignedToName);
                console.log('AllUsers count:', allUsers.length);
                console.log('AllUsers sample:', allUsers.slice(0, 2));
            }
            
            // まず、task.assignedToから直接取得を試行
            if (task.assignedTo && task.assignedTo.displayName) {
                console.log('Case 1: task.assignedTo has displayName');
                assigneeName = task.assignedTo.displayName;
            } 
            // task.assignedToがIDの場合、allUsersから該当ユーザーを検索
            else if (task.assignedTo && typeof task.assignedTo === 'string' && allUsers.length > 0) {
                console.log('Case 2: task.assignedTo is string ID, searching in allUsers');
                const assignedUser = allUsers.find(user => 
                    user._id === task.assignedTo || 
                    user.id === task.assignedTo ||
                    user.email === task.assignedTo
                );
                console.log('Found user:', assignedUser);
                if (assignedUser) {
                    assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                }
            }
            // task.assignedTo._idの場合、allUsersから該当ユーザーを検索
            else if (task.assignedTo && task.assignedTo._id && allUsers.length > 0) {
                console.log('Case 3: task.assignedTo has _id, searching in allUsers');
                const assignedUser = allUsers.find(user => 
                    user._id === task.assignedTo._id || 
                    user.id === task.assignedTo._id ||
                    user.email === task.assignedTo.email
                );
                console.log('Found user:', assignedUser);
                if (assignedUser) {
                    assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                }
            }
            // assignedToNameが直接設定されている場合（後方互換性）
            else if (task.assignedToName && task.assignedToName !== '未割り当て') {
                console.log('Case 4: using task.assignedToName');
                assigneeName = task.assignedToName;
            }
            // currentUserが担当者の場合
            else if (currentUser && task.assignedTo && 
                     (task.assignedTo === currentUser._id || task.assignedTo === currentUser.id)) {
                console.log('Case 5: currentUser is assigned');
                assigneeName = currentUser.displayName || currentUser.username || currentUser.email || '自分';
            }
            // デフォルトケース
            else if (task.assignedTo && typeof task.assignedTo === 'string' && task.assignedTo !== 'unknown') {
                console.log('Case 6: using assignedTo as display name (fallback)');
                // IDらしき文字列でない場合は、そのまま表示名として使用
                if (!task.assignedTo.match(/^[a-f\d]{24}$/i) && task.assignedTo.includes('@')) {
                    assigneeName = task.assignedTo; // メールアドレスの場合
                } else if (!task.assignedTo.match(/^[a-f\d]{24}$/i)) {
                    assigneeName = task.assignedTo; // その他の文字列
                }
            }
            else {
                console.log('Case 7: No assignee found, using default');
            }

            console.log('Final assignee name:', assigneeName);

            // createdByの安全な処理と権限チェック
            const canEdit = true; // すべてのユーザーがタスクを編集可能にする
            const canDelete = task.createdBy && currentUser && task.createdBy._id === currentUser._id;
            
            const isCompleted = task.status === 'completed';
            
            // 依存関係の情報を生成
            let dependencyInfo = '';
            if (task.dependencyTasks && task.dependencyTasks.length > 0) {
                const dependencyTitles = task.dependencyTasks.map(dep => dep.title).join(', ');
                dependencyInfo = `<div class="task-dependencies">
                    <i class="fas fa-link"></i> 依存: ${TaskUtils.escapeHtml(dependencyTitles)}
                </div>`;
            }
            
            return `
                <div class="task-item ${isCompleted ? 'completed' : ''}" id="task-${taskId}">
                    <div class="task-checkbox ${isCompleted ? 'checked' : ''}"></div>
                    <div class="task-content">
                        <div class="task-title">${TaskUtils.escapeHtml(task.title || 'タイトルなし')}</div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority || 'medium'}">${TaskUtils.getPriorityLabel(task.priority || 'medium')}</span>
                            ${startDateStr ? `<span class="task-start-date">
                                <i class="fas fa-play"></i> 開始: ${startDateStr}
                            </span>` : ''}
                            ${dueDateStr ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                                <i class="fas fa-calendar"></i> 期限: ${dueDateStr}
                            </span>` : ''}
                            <span class="task-assignee">
                                ${assigneeName}
                            </span>
                        </div>
                        ${dependencyInfo}
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit" title="編集" data-task-id="${taskId}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${canDelete ? `<button class="task-action-btn delete" title="削除" data-task-id="${taskId}">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error in createTaskHTML:', error, task);
            return `
                <div class="task-item error">
                    <div class="task-content">
                        <div class="task-title">エラー: タスクの表示に失敗しました</div>
                        <div class="task-meta">
                            <span class="error-details">${error.message}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}
