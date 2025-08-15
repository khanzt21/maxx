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

        // --- КРОК 1: Створення "супер-промпта" за вашим шаблоном ---

        // ОНОВЛЕНА, ДУЖЕ ДЕТАЛЬНА СИСТЕМНА ІНСТРУКЦІЯ З ВАШИМ ПРИКЛАДОМ
        const systemPrompt = `You are an expert prompt engineer specializing in creating hyper-detailed, photorealistic prompts for the gpt-image-1 model.
Your task is to take a user's simple description of a monument in Ukrainian and expand it into a comprehensive, highly detailed prompt in English, precisely following the structure and style of the template below.

---
**TEMPLATE FOR THE FINAL PROMPT:**

"A highly detailed, photorealistic rendering of a vertical black granite (gabbro) tombstone, realistic outdoor cemetery setting, placed on light-gray paving tiles. 

Stele dimensions: [Height] cm height, [Width] cm width, [Thickness] cm thickness. Mounted on a matching pedestal [Pedestal Width] cm wide, [Pedestal Height] cm high, [Pedestal Thickness] cm thick. 

In front of the pedestal — a flower bed with black granite borders: [Flower Bed Length] long side borders and a [Flower Bed Width] front border. Both side borders are perfectly flush with the pedestal edges (not protruding). The interior of the flower bed is filled with small dark gray gravel.

On the stele: [Description of portrait, e.g., an engraved oval black-and-white portrait of a man in a suit], below it — the text “[Name Text]” in capital letters, then the birth and death dates in the format “DD.MM.YYYY ~ DD.MM.YYYY”. Below the dates — [Description of additional artwork, e.g., finely engraved artwork of a candle and three roses].

Material: polished black gabbro granite with sharp, clean edges. Lighting: soft natural daylight, slight overcast, shallow depth of field. Style: ultra-realistic, high-resolution, crisp textures, accurate proportions, subtle reflections on the polished granite."
---

**YOUR RULES:**
1.  Analyze the user's Ukrainian input for details like dimensions, materials, names, dates, and artwork.
2.  Insert these extracted details into the corresponding [bracketed] placeholders in the template.
3.  If the user does not provide a specific detail (e.g., the setting or lighting), use the default values from the template.
4.  The final output must be a single, detailed paragraph in English, without any placeholders.
5.  Pay close attention to translating technical terms correctly.`;

        console.log('Creating a hyper-detailed prompt with GPT-4o...');

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
                    { role: "user", content: `Create a detailed English prompt based on this Ukrainian description: "${description}"` }
                ],
                temperature: 0.5,
                max_tokens: 600
            })
        });

        if (!promptCreationResponse.ok) {
            const errorText = await promptCreationResponse.text();
            throw new Error(`Помилка створення промпта (GPT-4o): ${errorText}`);
        }

        const promptData = await promptCreationResponse.json();
        const finalPrompt = promptData.choices[0].message.content;

        console.log('Generated hyper-detailed prompt for gpt-image-1:', finalPrompt);


        // --- КРОК 2: Генеруємо зображення з новими параметрами ---

        console.log('Generating image with gpt-image-1...');

        const imageCreationResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-image-1",      // ОНОВЛЕНА МОДЕЛЬ
                prompt: finalPrompt,
                size: "1024x1792",       // ОНОВЛЕНИЙ РОЗМІР (ВЕРТИКАЛЬНИЙ)
                quality: "hd",
                n: 1                     // ОНОВЛЕНА КІЛЬКІСТЬ
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
