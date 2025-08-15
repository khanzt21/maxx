const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Генерация промпта через OpenRouter ChatGPT
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Опис пам\'ятника обов\'язковий' });
        }

        const systemPrompt = `Ти експерт з дизайну пам'ятників та меморіалів. Твоя задача - перетворити технічний опис користувача українською мовою в детальний професійний промпт англійською для генерації зображення пам'ятника.

ОБОВ'ЯЗКОВІ ВИМОГИ для промпта:
- Пам'ятник має бути строго відцентрований на основі
- Білий фон (white background)
- Фотореалістична якість (photorealistic)
- Професійна якість (professional monument design)
- Природне освітлення (natural lighting)
- Детальна обробка (high detail, sharp focus)

ФОРМАТ ПРОМПТА:
"A professional Ukrainian memorial monument, [детальний опис з розмірами та матеріалами], perfectly centered on granite base, white background, photorealistic, professional monument design, natural daylight, architectural photography, high detail, sharp focus"

Створи промпт максимум 400 символів, використовуючи всі деталі з опису користувача.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
                'X-Title': 'Monument Design Generator'
            },
            body: JSON.stringify({
                model: "openai/gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Створи професійний промпт для генерації зображення пам'ятника з цього опису: ${description}` }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Пуста відповідь від ChatGPT');
        }

        const prompt = data.choices[0].message.content.trim();
        
        res.json({ 
            success: true, 
            prompt: prompt,
            length: prompt.length 
        });

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ 
            error: error.message || 'Помилка генерації промпта' 
        });
    }
});

// Генерация изображения через Replicate
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, model = 'black-forest-labs/flux-1.1-pro', aspectRatio = '16:9' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обов\'язковий' });
        }

        // Различные параметры для разных моделей
        let requestBody;
        
        if (model.includes('flux')) {
            requestBody = {
                input: {
                    prompt: prompt,
                    aspect_ratio: aspectRatio,
                    output_format: "jpg",
                    output_quality: 90
                }
            };
        } else if (model.includes('stable-diffusion')) {
            const dimensions = {
                "16:9": { width: 1024, height: 576 },
                "1:1": { width: 1024, height: 1024 },
                "4:3": { width: 1024, height: 768 },
                "3:4": { width: 768, height: 1024 }
            };
            
            requestBody = {
                input: {
                    prompt: prompt,
                    width: dimensions[aspectRatio]?.width || 1024,
                    height: dimensions[aspectRatio]?.height || 1024,
                    num_inference_steps: 28,
                    guidance_scale: 3.5,
                    num_outputs: 1
                }
            };
        } else {
            requestBody = {
                input: {
                    prompt: prompt,
                    aspect_ratio: aspectRatio
                }
            };
        }

        const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
        }

        const prediction = await response.json();
        
        // Если сразу готово
        if (prediction.status === 'succeeded') {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            return res.json({ 
                success: true, 
                imageUrl: imageUrl,
                status: 'completed'
            });
        }
        
        // Если нужно ждать
        if (prediction.status === 'failed') {
            throw new Error(`Генерація не вдалася: ${prediction.error || 'Невідома помилка'}`);
        }
        
        // Возвращаем ID для polling
        res.json({ 
            success: true, 
            predictionId: prediction.id,
            status: prediction.status
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: error.message || 'Помилка генерації зображення' 
        });
    }
});

// Проверка статуса генерации
app.get('/api/check-status/:predictionId', async (req, res) => {
    try {
        const { predictionId } = req.params;
        
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
        });
        
        if (!response.ok) {
            throw new Error(`Status check error: ${response.status}`);
        }
        
        const prediction = await response.json();
        
        if (prediction.status === 'succeeded') {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            res.json({ 
                success: true, 
                imageUrl: imageUrl,
                status: 'completed'
            });
        } else if (prediction.status === 'failed') {
            res.json({ 
                success: false, 
                error: prediction.error || 'Генерація не вдалася',
                status: 'failed'
            });
        } else {
            res.json({ 
                success: true, 
                status: prediction.status 
            });
        }

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ 
            error: error.message || 'Помилка перевірки статусу' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущений на порту ${PORT}`);
    console.log(`📱 Фронтенд: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/health`);
});
