// /api/generate-prompt.js

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

        const systemPrompt = `Ти експерт з дизайну пам'ятників. Твоя задача - перетворити опис пам'ятника з української мови на структурований JSON об'єкт англійською. Цей JSON буде використано для генерації зображення.

ОБОВ'ЯЗКОВА СТРУКТУРА JSON:
{
  "base_prompt": "A professional Ukrainian memorial monument",
  "details": "[тут має бути детальний опис з розмірами та матеріалами, перекладений з українського опису користувача]",
  "centering_conditions": "perfectly and strictly centered on its base, perfect vertical and horizontal alignment, zero offset or shift, symmetrical composition",
  "style_modifiers": "on a plain white background, photorealistic, professional monument design, natural daylight, architectural photography, high detail, sharp focus, no shadows"
}

Правила:
1. Завжди повертай тільки валідний JSON.
2. Не додавай жодних пояснень або тексту поза JSON об'єктом.
3. В поле "details" включи всі деталі з опису користувача.
4. Значення для "base_prompt", "centering_conditions" та "style_modifiers" мають бути завжди незмінними і точно відповідати шаблону.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://your-domain.com', // ВАЖЛИВО: Замініть на ваш домен
                'X-Title': 'Monument Generator' // Замініть на назву вашого проекту
            },
            body: JSON.stringify({
                model: "openai/gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Опис пам'ятника: ${description}` }
                ],
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
        const rawPrompt = data.choices[0].message.content.trim();
        
        const jsonPrompt = JSON.parse(rawPrompt);
        res.json({ success: true, prompt: jsonPrompt });

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: error.message, details: 'Помилка генерації промпта' });
    }
};
