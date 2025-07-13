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

            // デバッグ用ログ
            console.log('=== TaskUtils.createTaskHTML DEBUG ===');
            console.log('Task:', task);
            console.log('Task.assignedTo:', task.assignedTo);
            console.log('AllUsers count:', allUsers.length);
            console.log('AllUsers:', allUsers);

            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && !task.completed;
            const dueDateStr = dueDate ? TaskUtils.formatDate(dueDate) : '';
            
            // assignedToの安全な処理
            let assigneeInitials = '';
            let assigneeName = '未割り当て';
            
            // まず、task.assignedToから直接取得を試行
            if (task.assignedTo && task.assignedTo.displayName) {
                console.log('Case 1: task.assignedTo has displayName');
                assigneeName = task.assignedTo.displayName;
                assigneeInitials = assigneeName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase();
            } 
            // task.assignedToがIDの場合、allUsersから該当ユーザーを検索
            else if (task.assignedTo && typeof task.assignedTo === 'string' && allUsers.length > 0) {
                console.log('Case 2: task.assignedTo is string ID, searching in allUsers');
                const assignedUser = allUsers.find(user => user._id === task.assignedTo || user.email === task.assignedTo);
                console.log('Found user:', assignedUser);
                if (assignedUser) {
                    assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                    assigneeInitials = assigneeName
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase();
                }
            }
            // task.assignedTo._idの場合、allUsersから該当ユーザーを検索
            else if (task.assignedTo && task.assignedTo._id && allUsers.length > 0) {
                console.log('Case 3: task.assignedTo has _id, searching in allUsers');
                const assignedUser = allUsers.find(user => user._id === task.assignedTo._id || user.email === task.assignedTo.email);
                console.log('Found user:', assignedUser);
                if (assignedUser) {
                    assigneeName = assignedUser.displayName || assignedUser.username || assignedUser.email || '不明';
                    assigneeInitials = assigneeName
                        .split(' ')
                        .map(name => name[0])
                        .join('')
                        .toUpperCase();
                }
            }
            // assignedToNameが直接設定されている場合（後方互換性）
            else if (task.assignedToName) {
                console.log('Case 4: using task.assignedToName');
                assigneeName = task.assignedToName;
                assigneeInitials = assigneeName
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase();
            }
            else {
                console.log('Case 5: No assignee found, using default');
            }

            console.log('Final assignee name:', assigneeName);
            console.log('Final assignee initials:', assigneeInitials);

            // createdByの安全な処理と権限チェック
            const canEdit = true; // すべてのユーザーがタスクを編集可能にする
            const canDelete = task.createdBy && currentUser && task.createdBy._id === currentUser._id;
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${taskId}">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                    <div class="task-content">
                        <div class="task-title">${TaskUtils.escapeHtml(task.title || 'タイトルなし')}</div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority || 'medium'}">${TaskUtils.getPriorityLabel(task.priority || 'medium')}</span>
                            ${dueDateStr ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                                <i class="fas fa-calendar"></i> ${dueDateStr}
                            </span>` : ''}
                            <span class="task-assignee">
                                <div class="task-assignee-avatar">${assigneeInitials || '?'}</div>
                                ${assigneeName}
                            </span>
                        </div>
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
