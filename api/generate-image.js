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
        const { prompt, model = 'openai/dall-e-3', aspectRatio = '16:9' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обов\'язковий' });
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY не налаштований' });
        }

        // Настройки для разных моделей через OpenRouter
        let apiEndpoint, requestBody;

        if (model.includes('dall-e')) {
            // DALL-E через OpenRouter
            apiEndpoint = 'https://openrouter.ai/api/v1/images/generations';
            
            // Размеры для DALL-E
            const sizeMap = {
                '1:1': '1024x1024',
                '16:9': '1792x1024', 
                '9:16': '1024x1792',
                '4:3': '1024x768',
                '3:4': '768x1024'
            };

            requestBody = {
                model: model,
                prompt: prompt,
                size: sizeMap[aspectRatio] || '1024x1024',
                quality: 'hd',
                n: 1
            };
        } else if (model.includes('playground')) {
            // Playground через OpenRouter
            apiEndpoint = 'https://openrouter.ai/api/v1/images/generations';
            requestBody = {
                model: model,
                prompt: prompt,
                width: aspectRatio === '16:9' ? 1024 : 1024,
                height: aspectRatio === '16:9' ? 576 : 1024,
                guidance_scale: 3,
                num_inference_steps: 25
            };
        } else {
            // Другие модели через OpenRouter
            apiEndpoint = 'https://openrouter.ai/api/v1/images/generations';
            requestBody = {
                model: model,
                prompt: prompt,
                size: '1024x1024'
            };
        }

        console.log('Generating image with:', { model, prompt: prompt.substring(0, 100) });

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://monument-gen.vercel.app',
                'X-Title': 'Monument Generator'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter image error:', errorText);
            throw new Error(`OpenRouter помилка: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenRouter response:', data);

        // Извлекаем URL изображения
        let imageUrl;
        if (data.data && data.data[0] && data.data[0].url) {
            imageUrl = data.data[0].url;
        } else if (data.url) {
            imageUrl = data.url;
        } else if (data.image_url) {
            imageUrl = data.image_url;
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Невідомий формат відповіді від OpenRouter');
        }

        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            status: 'completed'
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Помилка генерації зображення через OpenRouter'
        });
    }
};
