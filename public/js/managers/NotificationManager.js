class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
    }

    show(type, title, message) {
        if (!this.container) {
            console.error('Notification container not found');
            return;
        }

        const id = Date.now().toString();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${this.getIcon(type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.container.appendChild(notification);
        
        // 閉じるボタン
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // 自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getIcon(type) {
        switch (type) {
            case 'success': return 'fa-check';
            case 'error': return 'fa-exclamation-triangle';
            case 'warning': return 'fa-exclamation';
            case 'info': return 'fa-info';
            default: return 'fa-info';
        }
    }
}
