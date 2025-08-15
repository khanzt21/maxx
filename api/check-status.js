const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { predictionId } = req.query;
        
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
        });
        
        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            res.json({ success: true, imageUrl, status: 'completed' });
        } else if (prediction.status === 'failed') {
            res.json({ success: false, error: 'Генерація не вдалася', status: 'failed' });
        } else {
            res.json({ success: true, status: prediction.status });
        }

    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: error.message });
    }
};
