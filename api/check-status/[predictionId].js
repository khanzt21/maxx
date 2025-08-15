const Replicate = require('replicate');

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
        
        if (!predictionId) {
            return res.status(400).json({ error: 'predictionId обов\'язковий' });
        }

        if (!process.env.REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: 'REPLICATE_API_TOKEN не налаштований' });
        }
        
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
        
        const prediction = await replicate.predictions.get(predictionId);
        
        if (prediction.status === 'succeeded') {
            // Для новой версии Replicate API
            let imageUrl;
            if (typeof prediction.output === 'string') {
                imageUrl = prediction.output;
            } else if (Array.isArray(prediction.output)) {
                imageUrl = prediction.output[0];
            } else if (prediction.output && prediction.output.url) {
                imageUrl = prediction.output.url();
            } else {
                imageUrl = prediction.output;
            }
            
            res.json({ success: true, imageUrl, status: 'completed' });
        } else if (prediction.status === 'failed') {
            res.json({ 
                success: false, 
                error: prediction.error || 'Генерація не вдалася', 
                status: 'failed' 
            });
        } else {
            res.json({ success: true, status: prediction.status });
        }

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Помилка перевірки статусу генерації'
        });
    }
};
