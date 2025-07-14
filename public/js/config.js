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
            debug: true,
            useNodeServer: true  // Node.jsサーバーを使用
        },
        
        // 本番環境（Netlify）
        production: {
            apiBaseUrl: '', // Netlifyでは直接GASを使用
            socketUrl: null, // Netlifyではソケット通信なし
            debug: true,  // デバッグ用に一時的にtrueに変更
            useNodeServer: false  // GASを使用
        }
    },

    // 機能設定
    features: {
        realTimeUpdates: false, // Netlifyでは無効
        offlineMode: true,
        autoSave: true,
        notifications: true
    },

    // API設定
    api: {
        timeout: 800, // 800ms - 高速化のため大幅短縮
        retryAttempts: 2, // リトライ回数を削減
        retryDelay: 100 // リトライ間隔を短縮
    }
};

/**
 * 現在の環境を自動判定
 */
function getCurrentEnvironment() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const pathname = window.location.pathname;
    
    // ローカル開発環境の判定
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } 
    // Netlifyの判定
    else if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
        return 'production';
    }
    // GitHub Pagesの判定（後方互換性のため残す）
    else if (hostname.includes('github.io')) {
        return 'production';
    } 
    // その他（本番サーバーなど）
    else {
        return 'production';
    }
}

/**
 * 現在の環境設定を取得
 */
function getEnvironmentConfig() {
    const env = getCurrentEnvironment();
    const envConfig = {
        ...config,
        current: env,
        ...config.environment[env]
    };
    
    // デバッグ情報を出力
    console.log('🔧 WorkerBee Environment Config:', {
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        environment: env,
        apiBaseUrl: envConfig.apiBaseUrl,
        socketUrl: envConfig.socketUrl,
        gasUrl: envConfig.gas?.webAppUrl
    });
    
    return envConfig;
}

// グローバルで利用可能にする
window.WorkerBeeConfig = getEnvironmentConfig();

// モジュールとしても利用可能にする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { config, getCurrentEnvironment, getEnvironmentConfig };
}
