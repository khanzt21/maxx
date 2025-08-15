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
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обов\'язковий' });
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY не налаштований' });
        }

        console.log('Generating image with DALL-E 3 via OpenRouter...');

        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://monument-gen.vercel.app',
                'X-Title': 'Monument Generator'
            },
            body: JSON.stringify({
                model: "openai/dall-e-3",
                prompt: prompt,
                size: "1024x1024",
                quality: "hd",
                n: 1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter image error:', response.status, errorText);
            throw new Error(`Помилка генерації: ${response.status}`);
        }

        const data = await response.json();
        console.log('OpenRouter response received');

        // Извлекаем URL изображения
        let imageUrl;
        if (data.data && data.data[0] && data.data[0].url) {
            imageUrl = data.data[0].url;
        } else if (data.url) {
            imageUrl = data.url;
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Невідомий формат відповіді');
        }

        res.json({ 
            success: true, 
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: error.message || 'Помилка генерації зображення'
        });
    }
};
