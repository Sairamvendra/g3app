import replicate from '../../lib/replicate.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { prompt, image, max_tokens = 2048, temperature = 0.7, model = 'google/gemini-3-pro' } = req.body;

        const input = {
            prompt,
            max_tokens,
            temperature,
        };

        if (image) {
            input.image = image;
        }

        const output = await replicate.run(model, { input });

        let result;
        if (typeof output === 'string') {
            result = output;
        } else if (Array.isArray(output)) {
            result = output.join('');
        } else {
            result = String(output);
        }

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Text generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate text'
        });
    }
}
