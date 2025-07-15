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

testGas();
