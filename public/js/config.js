/**
 * WorkerBee 公開設定ファイル
 * GitHub Pages用の設定（全て公開情報）
 */

const config = {
    // アプリケーション基本情報
    app: {
        name: 'WorkerBee',
        version: '1.0.0',
        description: '複数人対応タスク管理アプリ',
        timezone: 'Asia/Tokyo'
    },

    // Google Apps Script設定（公開可能）
    gas: {
        webAppUrl: 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec',
        spreadsheetId: '1dG4vyqKarYzfGoJPwlwUquduPzQ9ODyGgFwlXlsrUb4'
    },

    // UI設定
    ui: {
        theme: 'default',
        maxFileSize: 10485760, // 10MB
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm'
    },

    // 環境別設定
    environment: {
        // 開発環境（ローカル）
        development: {
            apiBaseUrl: 'http://localhost:3000',
            socketUrl: 'http://localhost:3000',
            debug: true
        },
        
        // 本番環境（GitHub Pages）
        production: {
            apiBaseUrl: 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec',
            socketUrl: null, // GitHub Pagesではソケット通信なし
            debug: false
        }
    },

    // 機能設定
    features: {
        realTimeUpdates: false, // GitHub Pagesでは無効
        offlineMode: true,
        autoSave: true,
        notifications: true
    },

    // API設定
    api: {
        timeout: 30000, // 30秒
        retryAttempts: 3,
        retryDelay: 1000 // 1秒
    }
};

/**
 * 現在の環境を自動判定
 */
function getCurrentEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } else if (hostname.includes('github.io')) {
        return 'production';
    } else {
        return 'production'; // デフォルトは本番環境
    }
}

/**
 * 現在の環境設定を取得
 */
function getEnvironmentConfig() {
    const env = getCurrentEnvironment();
    return {
        ...config,
        current: env,
        ...config.environment[env]
    };
}

// グローバルで利用可能にする
window.WorkerBeeConfig = getEnvironmentConfig();

// モジュールとしても利用可能にする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { config, getCurrentEnvironment, getEnvironmentConfig };
}
