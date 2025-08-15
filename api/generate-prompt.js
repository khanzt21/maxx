// /api/generate-prompt.js
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
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
        if (!description) return res.status(400).json({ error: 'Опис пам\'ятника обов\'язковий' });
        if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY не налаштований' });

        const systemPrompt = `Ти експерт з дизайну пам'ятників... (ваш довгий systemPrompt залишається тут)`; // Скорочено для читабельності, ваш промпт тут коректний

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://your-domain.com',
                'X-Title': 'Monument Generator'
            },
            body: JSON.stringify({
                model: "openai/gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Опис пам'ятника: ${description}` }],
                temperature: 0.5, 
                max_tokens: 600,
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter помилка: ${response.status}. ${errorText}`);
        }
        const data = await response.json();
        const jsonPrompt = JSON.parse(data.choices[0].message.content.trim());
        res.json({ success: true, prompt: jsonPrompt });
    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: error.message, details: 'Помилка генерації промпта' });
    }
};
