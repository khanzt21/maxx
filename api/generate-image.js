const Replicate = require('replicate');

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
        const { prompt, model = 'black-forest-labs/flux-1.1-pro', aspectRatio = '16:9' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Промпт обов\'язковий' });
        }

        if (!process.env.REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: 'REPLICATE_API_TOKEN не налаштований' });
        }

        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        // Параметры для разных моделей
        let input;
        
        if (model.includes('flux')) {
            input = {
                prompt: prompt,
                aspect_ratio: aspectRatio,
                output_format: "jpg",
                output_quality: 90,
                safety_tolerance: 2
            };
        } else if (model.includes('stable-diffusion')) {
            const dimensions = {
                "16:9": { width: 1024, height: 576 },
                "1:1": { width: 1024, height: 1024 },
                "4:3": { width: 1024, height: 768 },
                "3:4": { width: 768, height: 1024 }
            };
            
            input = {
                prompt: prompt,
                width: dimensions[aspectRatio]?.width || 1024,
                height: dimensions[aspectRatio]?.height || 1024,
                num_inference_steps: 28,
                guidance_scale: 3.5,
                num_outputs: 1
            };
        } else if (model.includes('imagen')) {
            input = {
                prompt: prompt,
                aspect_ratio: aspectRatio,
                safety_filter_level: "block_medium_and_above"
            };
        } else {
            input = {
                prompt: prompt,
                aspect_ratio: aspectRatio
            };
        }

        // Запуск генерации
        const prediction = await replicate.predictions.create({
            model: model,
            input: input,
        });

        // Если генерация завершена сразу (маловероятно)
        if (prediction.status === 'succeeded') {
            let imageUrl;
            if (typeof prediction.output === 'string') {
                imageUrl = prediction.output;
            } else if (Array.isArray(prediction.output)) {
                imageUrl = prediction.output[0];
            } else if (prediction.output && prediction.output.url) {
                imageUrl = prediction.output.url();
            } else {
                imageUrl = prediction.output;
            }
            
            return res.json({ success: true, imageUrl, status: 'completed' });
        }
        
        if (prediction.status === 'failed') {
            throw new Error(`Генерація не вдалася: ${prediction.error || 'Невідома помилка'}`);
        }
        
        // Возвращаем ID для проверки статуса
        res.json({ 
            success: true, 
            predictionId: prediction.id, 
            status: prediction.status 
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Помилка генерації зображення'
        });
    }
};
