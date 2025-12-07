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
            model = 'google/veo-3.1',
            prompt,
            resolution,
            duration,
            negative_prompt,
            aspect_ratio,
            start_image,
            end_image,
            mode
        } = req.body;

        console.log(`[REQUEST] /api/generate/video`, {
            model,
            prompt: prompt ? `${prompt.substring(0, 100)}...` : null,
            resolution,
            duration
        });

        const input = {
            prompt: prompt || 'A cinematic video scene',
        };

        // Model-specific parameter mapping
        switch (model) {
            case 'google/veo-3.1':
            case 'google/veo-3.1-fast':
                // Veo models use: resolution, duration, negative_prompt, aspect_ratio, image, last_frame
                if (resolution) input.resolution = resolution;

                // Veo only supports durations: 4, 6, or 8 seconds
                const validVeoDurations = [4, 6, 8];
                let videoDuration = duration ? parseInt(duration) : 4;
                if (!validVeoDurations.includes(videoDuration)) {
                    // Find closest valid duration
                    videoDuration = validVeoDurations.reduce((prev, curr) =>
                        Math.abs(curr - videoDuration) < Math.abs(prev - videoDuration) ? curr : prev
                    );
                    console.warn(`[Veo] Adjusting duration from ${duration} to nearest valid value: ${videoDuration} seconds`);
                }
                input.duration = videoDuration;

                if (negative_prompt) input.negative_prompt = negative_prompt;
                // Veo only supports 16:9 or 9:16, default to 16:9 if invalid
                if (aspect_ratio && (aspect_ratio === '16:9' || aspect_ratio === '9:16')) {
                    input.aspect_ratio = aspect_ratio;
                } else {
                    input.aspect_ratio = '16:9'; // Default fallback
                }
                if (start_image) input.image = start_image;
                if (end_image) input.last_frame = end_image;
                break;

            case 'wan-video/wan-2.2-i2v-fast':
                // Wan 2.2 I2V - Image-to-Video (REQUIRES image)
                if (!start_image) {
                    throw new Error('Wan 2.2 I2V requires a start image');
                }
                input.image = start_image;

                if (end_image) input.last_image = end_image;
                input.resolution = (resolution === '720p' || resolution === '1080p') ? '720p' : '480p';

                if (duration) {
                    const fps = 16;
                    input.num_frames = Math.max(81, Math.min(parseInt(duration) * fps, 121));
                } else {
                    input.num_frames = 81;
                }
                input.frames_per_second = 16;
                input.go_fast = true;
                input.sample_shift = 12;
                break;

            case 'bytedance/seedance-1-pro':
            case 'bytedance/seedance-1-lite':
                if (start_image) input.image = start_image;
                if (end_image && start_image) input.last_frame_image = end_image;

                const seedanceDuration = duration ? parseInt(duration) : 5;
                input.duration = Math.max(2, Math.min(seedanceDuration, 12));

                if (model === 'bytedance/seedance-1-lite') {
                    input.resolution = (resolution === '720p' || resolution === '1080p') ? '720p' : '480p';
                } else {
                    if (resolution === '1080p') input.resolution = '1080p';
                    else if (resolution === '720p') input.resolution = '720p';
                    else input.resolution = '480p';
                }

                if (!start_image && aspect_ratio) {
                    const validRatios = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'];
                    input.aspect_ratio = validRatios.includes(aspect_ratio) ? aspect_ratio : '16:9';
                }

                input.fps = 24;
                input.camera_fixed = false;
                break;

            default:
                console.warn(`Unknown model: ${model}, using generic parameters`);
                if (start_image) input.image = start_image;
                if (end_image) input.last_frame = end_image;
                if (resolution) input.resolution = resolution;
                if (duration) input.duration = parseInt(duration);
                break;
        }

        console.log(`Generating video with ${model}...`);
        const output = await replicate.run(model, { input });
        console.log('Raw Replicate output:', JSON.stringify(output, null, 2));

        let videoUrl;

        // Handle FileOutput object from Replicate
        if (output && typeof output === 'object' && output.url) {
            videoUrl = typeof output.url === 'function' ? output.url() : output.url;
        } else if (typeof output === 'string') {
            videoUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
            const firstItem = output[0];
            if (firstItem && typeof firstItem === 'object' && firstItem.url) {
                videoUrl = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
            } else {
                videoUrl = firstItem;
            }
        } else if (output && typeof output === 'object') {
            // Try different possible property names
            videoUrl = output.video || output.output || output.result;
            if (videoUrl && typeof videoUrl === 'object' && videoUrl.url) {
                videoUrl = typeof videoUrl.url === 'function' ? videoUrl.url() : videoUrl.url;
            }
        }

        // Convert URL object to string if needed
        if (videoUrl && typeof videoUrl === 'object' && videoUrl.href) {
            videoUrl = videoUrl.href;
        } else if (videoUrl && typeof videoUrl === 'object' && videoUrl.toString) {
            videoUrl = videoUrl.toString();
        }

        if (!videoUrl || typeof videoUrl !== 'string') {
            console.error('Final videoUrl type:', typeof videoUrl);
            throw new Error(`Invalid video URL received from Replicate`);
        }

        console.log('Video generated successfully', videoUrl);
        res.status(200).json({ success: true, result: videoUrl });

    } catch (error) {
        console.error('/api/generate/video error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate video'
        });
    }
}
