// ライブラリローダーユーティリティ
class LibraryLoader {
    static async waitForLibraries() {
        console.log('Waiting for libraries to load...');
        
        // FullCalendarの読み込み待機
        await this.waitForLibrary(() => typeof FullCalendar !== 'undefined', 'FullCalendar');
        
        // DHTMLX Ganttの読み込み待機
        await this.waitForLibrary(() => typeof gantt !== 'undefined', 'DHTMLX Gantt');
        
        console.log('All libraries loaded successfully');
    }
    
    static waitForLibrary(condition, name) {
        return new Promise((resolve, reject) => {
            const maxAttempts = 50; // 5秒間待機
            let attempts = 0;
            
            const checkLibrary = () => {
                attempts++;
                
                if (condition()) {
                    console.log(`${name} library loaded`);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error(`Failed to load ${name} library after ${maxAttempts} attempts`);
                    reject(new Error(`${name} library failed to load`));
                } else {
                    setTimeout(checkLibrary, 100);
                }
            };
            
            checkLibrary();
        });
    }
}
