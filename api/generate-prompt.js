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
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Опис пам\'ятника обов\'язковий' });
        }

        const systemPrompt = `Ти експерт з дизайну пам'ятників. Створи детальний промпт англійською для генерації зображення пам'ятника з українського опису.

ФОРМАТ: "A professional Ukrainian memorial monument, [опис з розмірами та матеріалами], perfectly centered on granite base, white background, photorealistic, professional monument design, natural daylight, architectural photography, high detail, sharp focus"

Макс 400 символів.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://monument-generator.vercel.app',
                'X-Title': 'Monument Generator'
            },
            body: JSON.stringify({
                model: "openai/gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Опис: ${description}` }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter помилка: ${response.status}`);
        }

        const data = await response.json();
        const prompt = data.choices[0].message.content.trim();
        
        res.json({ success: true, prompt });

    } catch (error) {
        console.error('Prompt error:', error);
        res.status(500).json({ error: error.message });
    }
};
