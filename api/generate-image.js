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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, model = 'black-forest-labs/flux-1.1-pro', aspectRatio = '16:9' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обов\'язковий' });
        }

        let requestBody;
        
        if (model.includes('flux')) {
            requestBody = {
                input: {
                    prompt: prompt,
                    aspect_ratio: aspectRatio,
                    output_format: "jpg",
                    output_quality: 90
                }
            };
        } else {
            requestBody = {
                input: {
                    prompt: prompt,
                    width: 1024,
                    height: 1024
                }
            };
        }

        const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Replicate помилка: ${response.status}`);
        }

        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            return res.json({ success: true, imageUrl, status: 'completed' });
        }
        
        if (prediction.status === 'failed') {
            throw new Error('Генерація не вдалася');
        }
        
        res.json({ success: true, predictionId: prediction.id, status: prediction.status });

    } catch (error) {
        console.error('Image error:', error);
        res.status(500).json({ error: error.message });
    }
};
