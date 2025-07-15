const axios = require('axios');
const gasUrl = 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec';

async function testGas() {
    try {
        console.log('Testing GAS connection...');
        console.log('GAS URL:', gasUrl);
        const response = await axios.get(gasUrl + '?action=getTasks', { timeout: 10000 });
        console.log('GAS Response Status:', response.status);
        console.log('GAS Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('GAS Error:', error.message);
        if (error.response) {
            console.error('Error Response:', error.response.status, error.response.data);
        }
    }
}

async function testUpdateTask() {
    try {
        console.log('\nTesting task update...');
        
        // まずタスクを取得
        const getResponse = await axios.get(gasUrl + '?action=getTasks', { timeout: 10000 });
        const tasks = getResponse.data.data.tasks; // .tasksを追加
        
        if (tasks.length === 0) {
            console.log('No tasks found to update');
            return;
        }
        
        const testTask = tasks[0];
        console.log('Original task:', JSON.stringify(testTask, null, 2));
        
        const updateData = {
            action: 'updateTask',
            payload: {
                id: testTask.id,
                dueDate: '2024-12-25T10:00:00.000Z'
            }
        };
        
        console.log('Sending update request:', JSON.stringify(updateData, null, 2));
        
        const updateResponse = await axios.post(gasUrl, updateData, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Update Response Status:', updateResponse.status);
        console.log('Update Response Data:', JSON.stringify(updateResponse.data, null, 2));
        
        // 更新後のタスクを取得
        const getUpdatedResponse = await axios.get(gasUrl + '?action=getTasks', { timeout: 10000 });
        const updatedTasks = getUpdatedResponse.data.data.tasks; // .tasksを追加
        const updatedTask = updatedTasks.find(t => t.id === testTask.id);
        
        console.log('Updated task:', JSON.stringify(updatedTask, null, 2));
        
    } catch (error) {
        console.error('Update Test Error:', error.message);
        if (error.response) {
            console.error('Error Response:', error.response.status, error.response.data);
        }
    }
}

// 両方のテストを実行
testGas().then(() => testUpdateTask());
