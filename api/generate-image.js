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

        // Проверяем наличие ключей
        if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'API ключ не налаштований' });
        }

        console.log('Generating image with DALL-E 3...');

        // Пробуем OpenAI напрямую, если есть ключ
        if (process.env.OPENAI_API_KEY) {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: prompt,
                    size: "1024x1024",
                    quality: "hd",
                    n: 1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenAI error:', response.status, errorText);
                throw new Error(`OpenAI помилка: ${response.status}`);
            }

            const data = await response.json();
            const imageUrl = data.data[0].url;

            return res.json({ 
                success: true, 
                imageUrl: imageUrl
            });
        }

        // Fallback: Используем OpenRouter для текстовой генерации описания изображения
        if (process.env.OPENROUTER_API_KEY) {
            // Генерируем описание для альтернативного сервиса
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://monument-gen.vercel.app',
                    'X-Title': 'Monument Generator'
                },
                body: JSON.stringify({
                    model: "openai/gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "user",
                            content: `Вибачте, але генерація зображень тимчасово недоступна. Ось детальний текстовий опис зображення пам'ятника на основі промпта: "${prompt}"`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter помилка: ${response.status}`);
            }

            const data = await response.json();
            const description = data.choices[0].message.content;

            return res.json({ 
                success: false, 
                error: 'Генерація зображень тимчасово недоступна',
                description: description
            });
        }

        throw new Error('Немає доступних API ключів');

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: error.message || 'Помилка генерації зображення'
        });
    }
};
