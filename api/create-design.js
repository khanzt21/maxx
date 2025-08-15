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

        // --- КРОК 1: Створення технічної специфікації за допомогою GPT-4o ---

        const systemPrompt = `You are an expert technical writer creating a specification for a 3D rendering program. Your goal is to convert a user's Ukrainian description of a monument into a single, detailed, and extremely literal paragraph in English for DALL-E 3.

        **CRITICAL RULES:**
        1.  **ABSOLUTELY DO NOT add any details, objects, textures, or artistic flourishes** that are not explicitly mentioned in the user's description. Your goal is a literal, 1-to-1 translation of the provided facts into a descriptive paragraph.
        2.  **DO NOT interpret the user's request creatively.** Be a machine.
        3.  The final output MUST be a single, descriptive paragraph.
        4.  Begin the paragraph with this exact phrase: **"Ultra-realistic 3D render of a memorial monument:"**
        5.  After translating the user's description, conclude the paragraph by appending this exact phrase: **", commercial studio photography, perfectly centered on a pure white background, sharp focus, 8k resolution, photorealistic."**`;

        console.log('Creating a technical specification with GPT-4o...');

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
                    { role: "user", content: `Create a literal 3D render specification for the following description: "${description}"` }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!promptCreationResponse.ok) {
            const errorText = await promptCreationResponse.text();
            throw new Error(`Помилка створення промпта (GPT-4o): ${errorText}`);
        }

        const promptData = await promptCreationResponse.json();
        const finalPrompt = promptData.choices[0].message.content;

        console.log('Generated specification for DALL-E 3:', finalPrompt);


        // --- КРОК 2: Генеруємо зображення за допомогою gpt-image-1 ---

        console.log('Generating image with gpt-image-1 (low quality)...');

        const imageCreationResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-image-1",
                prompt: finalPrompt,
                size: "1024x1024",
                quality: "low", // <--- ЗМІНЕНО НА НАЙНИЖЧУ ЯКІСТЬ
                n: 1
            })
        });

        if (!imageCreationResponse.ok) {
            const errorText = await imageCreationResponse.text();
            throw new Error(`Помилка генерації зображення (gpt-image-1): ${errorText}`);
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
