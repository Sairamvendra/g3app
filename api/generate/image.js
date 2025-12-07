import replicate from '../../lib/replicate.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            prompt,
            aspect_ratio = '16:9',
            image_size = '2K',
            reference_image,
            model = 'google/nano-banana-pro',
            // Flux 2 Flex specific parameters
            steps,
            guidance,
            seed,
            prompt_upsampling,
            output_format,
            output_quality,
            safety_tolerance,
            custom_width,
            custom_height
        } = req.body;

        let input = { prompt };

        // Model-specific parameter mapping
        if (model === 'black-forest-labs/flux-2-flex') {
            // Flux 2 Flex parameters
            input.aspect_ratio = aspect_ratio || '1:1';
            input.resolution = image_size || '1 MP';

            if (req.body.image_input) {
                input.input_images = req.body.image_input;
            } else if (reference_image) {
                input.input_images = [reference_image];
            }

            // Handle 21:9 Aspect Ratio (Not natively supported by Flux)
            if (aspect_ratio === '21:9') {
                input.aspect_ratio = 'custom';
                // Auto-calculate dimensions if not provided
                if (!custom_width || !custom_height) {
                    // Default to 1536x640 (1MP) or clamp based on image_size logic
                    if (image_size === '0.5 MP') { input.width = 1088; input.height = 464; }
                    else if (image_size === '2 MP' || image_size === '4 MP') { input.width = 2048; input.height = 880; }
                    else { input.width = 1536; input.height = 640; } // 1 MP default
                }
            }

            // Custom dimensions
            if (aspect_ratio === 'custom' && custom_width && custom_height) {
                input.width = custom_width;
                input.height = custom_height;
            }

            // Advanced settings
            if (steps !== undefined) input.steps = steps;
            if (guidance !== undefined) input.guidance = guidance;
            if (seed !== undefined) input.seed = seed;
            if (prompt_upsampling !== undefined) input.prompt_upsampling = prompt_upsampling;
            if (output_format) input.output_format = output_format;
            if (output_quality !== undefined) input.output_quality = output_quality;
            if (safety_tolerance !== undefined) input.safety_tolerance = safety_tolerance;

        } else {
            // Nano Banana Pro parameters (default)
            input.resolution = image_size || '2K';
            input.aspect_ratio = aspect_ratio;
            input.output_format = output_format || 'png';
            input.safety_filter_level = 'block_only_high';

            if (req.body.image_input) {
                input.image_input = req.body.image_input;
            } else if (reference_image) {
                // Fallback for single image
                input.image = reference_image;
                input.image_prompt = reference_image;
            }
        }

        console.log('Generating image with model:', model);
        const output = await replicate.run(model, { input });

        console.log('Raw Replicate output:', JSON.stringify(output, null, 2));

        let imageUrl;

        // Handle FileOutput object from Replicate
        if (output && typeof output === 'object' && output.url) {
            imageUrl = typeof output.url === 'function' ? output.url() : output.url;
        } else if (typeof output === 'string') {
            imageUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
            const firstItem = output[0];
            if (firstItem && typeof firstItem === 'object' && firstItem.url) {
                imageUrl = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
            } else {
                imageUrl = firstItem;
            }
        } else {
            throw new Error('Unexpected output format from Replicate API');
        }

        // Convert URL object to string if needed
        if (imageUrl && typeof imageUrl === 'object' && imageUrl.href) {
            imageUrl = imageUrl.href;
        } else if (imageUrl && typeof imageUrl === 'object' && imageUrl.toString) {
            imageUrl = imageUrl.toString();
        }

        // Ensure imageUrl is a string
        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new Error('Invalid image URL received from Replicate');
        }

        // If URL, fetch and convert to base64
        if (imageUrl.startsWith('http')) {
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;
            res.status(200).json({ success: true, result: dataUrl });
        } else {
            res.status(200).json({ success: true, result: imageUrl });
        }

    } catch (error) {
        console.error('/api/generate/image error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate image'
        });
    }
}
