// /api/create-design.js

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { description } = req.body;
        if (!description) {
            return res.status(400).json({ error: 'Опис пам\'ятника обов\'язковий' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'API ключ OPENAI_API_KEY не налаштований' });
        }

        // --- КРОК 1: Створюємо ідеальний промпт за допомогою GPT-4o ---

        // ОНОВЛЕНА, БІЛЬШ СУВОРА СИСТЕМНА ІНСТРУКЦІЯ
        const systemPrompt = `You are an expert technical translator for an architectural visualization program. Your ONLY task is to convert a user's technical description of a monument from Ukrainian into a precise, literal, comma-separated list of keywords and phrases in English for a DALL-E 3 image generation model.

        **CRITICAL RULES:**
        1.  **DO NOT BE CREATIVE OR ARTISTIC.** Your goal is technical accuracy, not beauty.
        2.  Translate the user's text literally. Include all specified materials, dimensions, and elements exactly as described.
        3.  The final output MUST be a single line of comma-separated keywords and phrases. DO NOT write a paragraph.
        4.  **ALWAYS** include the following mandatory keywords in the final prompt: "professional product photography of a monument, studio lighting, clean white background, photorealistic, 8k, sharp focus, technical architectural visualization, 3D render".`;

        console.log('Creating a technical prompt with GPT-4o...');

        const promptCreationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Convert the following Ukrainian monument description into a technical DALL-E 3 prompt: "${description}"` }
                ],
                // ОНОВЛЕНА "ТЕМПЕРАТУРА" ДЛЯ ЗМЕНШЕННЯ ТВОРЧОСТІ
                temperature: 0.2,
                max_tokens: 400
            })
        });

        if (!promptCreationResponse.ok) {
            const errorText = await promptCreationResponse.text();
            throw new Error(`Помилка створення промпта (GPT-4o): ${errorText}`);
        }

        const promptData = await promptCreationResponse.json();
        const finalPrompt = promptData.choices[0].message.content;

        console.log('Generated technical prompt for DALL-E 3:', finalPrompt);


        // --- КРОК 2: Генеруємо зображення за допомогою DALL-E 3 ---

        console.log('Generating image with DALL-E 3...');

        const imageCreationResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: finalPrompt,
                size: "1024x1024",
                quality: "standard",
                n: 1
            })
        });

        if (!imageCreationResponse.ok) {
            const errorText = await imageCreationResponse.text();
            throw new Error(`Помилка генерації зображення (DALL-E 3): ${errorText}`);
        }

        const imageData = await imageCreationResponse.json();
        const imageUrl = imageData.data[0].url;

        return res.json({ 
            success: true, 
            imageUrl: imageUrl
        });

    } catch (error) {
        console.error('Full process error:', error);
        res.status(500).json({ 
            error: error.message || 'Загальна помилка процесу'
        });
    }
};
