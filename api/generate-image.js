// /api/generate-image.js

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { promptJson } = req.body;

        if (!promptJson || typeof promptJson !== 'object') {
            return res.status(400).json({ error: 'Тіло запиту має містити JSON-об\'єкт "promptJson"' });
        }

        // Перевіряємо наявність необхідних ключів у JSON
        const requiredKeys = ['base_prompt', 'details', 'centering_conditions', 'style_modifiers'];
        for (const key of requiredKeys) {
            if (!promptJson[key]) {
                return res.status(400).json({ error: `Відсутній обов'язковий ключ у promptJson: ${key}` });
            }
        }

        // Збираємо фінальний промпт з частин JSON
        const finalPrompt = [
            promptJson.base_prompt,
            promptJson.details,
            promptJson.centering_conditions,
            promptJson.style_modifiers
        ].join(', ');
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'API ключ OPENAI_API_KEY не налаштований' });
        }

        console.log('Generating image with DALL-E 3. Final prompt:', finalPrompt);

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: finalPrompt,
                size: "1024x1024",
                quality: "hd",
                n: 1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI error:', response.status, errorText);
            throw new Error(`OpenAI помилка: ${response.status}. ${errorText}`);
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;

        return res.json({ 
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
