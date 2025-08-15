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

        const systemPrompt = `You are a professional monument designer. Your task is to convert a user's technical description in Ukrainian into a detailed, professional, and photorealistic prompt in English for the DALL-E 3 image generation model.

        **Mandatory requirements for the final prompt:**
        - The monument must be strictly and perfectly centered on its base.
        - The background must be a plain, solid white background.
        - The final image must be photorealistic, with professional monument design aesthetics.
        - Use natural daylight.
        - Ensure high detail and a sharp focus.
        - Combine all details into a single, cohesive paragraph. Do not use lists.
        - The final prompt must be in English.`;

        console.log('Creating a detailed prompt with GPT-4o...');

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
                    { role: "user", content: `Here is the description of the monument in Ukrainian: "${description}"` }
                ],
                temperature: 0.6,
                max_tokens: 400
            })
        });

        if (!promptCreationResponse.ok) {
            const errorText = await promptCreationResponse.text();
            throw new Error(`Помилка створення промпта (GPT-4o): ${errorText}`);
        }

        const promptData = await promptCreationResponse.json();
        const finalPrompt = promptData.choices[0].message.content;

        console.log('Generated Prompt for DALL-E 3:', finalPrompt);


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

        // Повертаємо фінальний результат
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
