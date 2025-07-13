const express = require('express');
const axios = require('axios');
const router = express.Router();

// GAS プロキシエンドポイント
router.post('/gas-proxy', async (req, res) => {
    try {
        console.log('🔄 GAS Proxy Request:', req.body);
        
        const gasUrl = process.env.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbyTwjTI134z5KkC3110WRS74u-5evlhjV4jeLAt7p-OxupVF2bOg8ajncbCkpr6WpW4/exec';
        
        const response = await axios.post(gasUrl, req.body, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('📥 GAS Proxy Response:', response.data);
        
        res.json(response.data);
    } catch (error) {
        console.error('🚨 GAS Proxy Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        res.status(500).json({
            success: false,
            message: 'GASプロキシエラー: ' + error.message,
            error: error.response?.data
        });
    }
});

module.exports = router;
