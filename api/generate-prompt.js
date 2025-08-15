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

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY не налаштований' });
        }

        const systemPrompt = `Ти експерт з дизайну пам'ятників. Створи детальний промпт англійською для генерації зображення пам'ятника з українського опису.

ОБОВ'ЯЗКОВИЙ ФОРМАТ: "A professional Ukrainian memorial monument, [детальний опис з розмірами та матеріалами], perfectly centered on granite base, white background, photorealistic, professional monument design, natural daylight, architectural photography, high detail, sharp focus"

Максимум 400 символів. Використай всі деталі з опису.`;

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
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Опис пам'ятника: ${description}` }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter error:', errorText);
            throw new Error(`OpenRouter помилка: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Пуста відповідь від ChatGPT');
        }
        
        const prompt = data.choices[0].message.content.trim();
        
        res.json({ success: true, prompt, length: prompt.length });

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Помилка генерації промпта'
        });
    }
};
