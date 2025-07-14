/**
 * パフォーマンス測定ユーティリティ
 * すべての操作が1秒以内に完了することを監視
 */
class PerformanceMonitor {
    constructor() {
        this.measurements = new Map();
        this.slowOperations = [];
        this.targetTime = 1000; // 1秒以内
    }

    startMeasurement(operationName) {
        const startTime = performance.now();
        this.measurements.set(operationName, startTime);
        console.log(`⏱️ Started: ${operationName}`);
        return startTime;
    }

    endMeasurement(operationName) {
        const startTime = this.measurements.get(operationName);
        if (!startTime) {
            console.warn(`No start time found for operation: ${operationName}`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.measurements.delete(operationName);

        // 結果をログ出力
        if (duration > this.targetTime) {
            console.warn(`🐌 SLOW: ${operationName} took ${duration.toFixed(2)}ms (target: ${this.targetTime}ms)`);
            this.slowOperations.push({
                operation: operationName,
                duration: duration,
                timestamp: new Date(),
                targetExceeded: duration - this.targetTime
            });
        } else {
            console.log(`🚀 FAST: ${operationName} took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    getSlowOperations() {
        return this.slowOperations;
    }

    clearSlowOperations() {
        this.slowOperations = [];
    }

    getAverageTime(operationName) {
        const operations = this.slowOperations.filter(op => op.operation === operationName);
        if (operations.length === 0) return null;
        
        const total = operations.reduce((sum, op) => sum + op.duration, 0);
        return total / operations.length;
    }

    generateReport() {
        if (this.slowOperations.length === 0) {
            console.log('🎉 All operations completed within target time!');
            return;
        }

        console.log('📊 Performance Report:');
        console.log(`Total slow operations: ${this.slowOperations.length}`);
        
        const groupedOperations = this.slowOperations.reduce((acc, op) => {
            if (!acc[op.operation]) {
                acc[op.operation] = [];
            }
            acc[op.operation].push(op);
            return acc;
        }, {});

        Object.entries(groupedOperations).forEach(([operation, operations]) => {
            const avgDuration = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length;
            const maxDuration = Math.max(...operations.map(op => op.duration));
            console.log(`  ${operation}:`);
            console.log(`    Count: ${operations.length}`);
            console.log(`    Average: ${avgDuration.toFixed(2)}ms`);
            console.log(`    Maximum: ${maxDuration.toFixed(2)}ms`);
        });
    }
}

// グローバルインスタンスを作成
window.performanceMonitor = new PerformanceMonitor();

// API呼び出しを自動監視するパッチ
if (window.ApiClient) {
    const originalCall = ApiClient.prototype.call;
    ApiClient.prototype.call = async function(url, method = 'GET', data = null, options = {}) {
        const operationName = `API: ${method} ${url}`;
        window.performanceMonitor.startMeasurement(operationName);
        
        try {
            const result = await originalCall.call(this, url, method, data, options);
            window.performanceMonitor.endMeasurement(operationName);
            return result;
        } catch (error) {
            window.performanceMonitor.endMeasurement(operationName);
            throw error;
        }
    };
}

// 定期レポート（開発環境のみ）
if (window.WorkerBeeConfig?.debug) {
    setInterval(() => {
        window.performanceMonitor.generateReport();
        window.performanceMonitor.clearSlowOperations();
    }, 30000); // 30秒ごと
}
