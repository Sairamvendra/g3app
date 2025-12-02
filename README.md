<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Visual Studio - Advanced Image & Video Generation

This is a comprehensive AI-powered visual studio application that combines Google's Gemini/Veo models with Replicate's cutting-edge video generation models to create high-fidelity images and videos.

## Features

### Image Generation
- **Google Gemini Imagen 3**: State-of-the-art text-to-image generation
- **Multiple Camera Angles**: Support for various cinematic shots and angles
- **Advanced Lighting Controls**: Professional studio lighting with customizable gels and positions
- **Character Management**: Save and reuse character references with persona prompts
- **Story Flow**: Analyze storyboards and generate sequential panels
- **Color Grading**: Multiple DI workflows including Technicolor, Bleach Bypass, and custom LUTs

### Video Generation

#### Veo 3.1 (Google)
- High-quality text-to-video and image-to-video generation
- Support for start/end frame interpolation
- AI-powered prompt improvement
- Multiple duration and frame rate options

#### Replicate Video Models
Choose from 6 professional video generation models:

1. **MiniMax Video-01**: High-quality text-to-video and image-to-video generation
2. **LTX Video**: Fast, high-quality video generation
3. **Hunyuan Video**: Tencent's advanced video generation model
4. **Mochi 1**: State-of-the-art video generation with realistic motion
5. **Kling Video**: Professional-grade video generation (up to 10 seconds)
6. **Hunyuan I2V**: Specialized image-to-video conversion

## Run Locally

**Prerequisites:**  Node.js (v18 or higher)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Keys:**

   You have two options for configuring API keys:

   **Option A: Environment Variables (Optional)**

   Edit [.env.local](.env.local) and set your API keys:
   ```
   GEMINI_API_KEY=your_google_gemini_api_key_here
   REPLICATE_API_KEY=your_replicate_api_key_here
   ```

   **Option B: In-App Configuration (Recommended)**

   You can also configure API keys directly in the app interface:
   - Click the key icon in the top right to set your Google Gemini API key
   - When using Replicate models, you'll be prompted to enter your Replicate API key
   - Keys are stored securely in your browser's localStorage

3. **Run the app:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## Getting API Keys

### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key or use an existing one
3. Copy the key (starts with `AIza...`)

### Replicate API Key
1. Visit [Replicate Account](https://replicate.com/account/api-tokens)
2. Create a new API token
3. Copy the key (starts with `r8_...`)

## Usage Guide

### Generating Images
1. Enter a prompt in the "Final Prompt" field (or use the Prompt Architect panel)
2. Select camera angles, lighting, and mood settings
3. Click "Generate" to create high-fidelity images
4. Use multiple camera angles to generate variations simultaneously

### Generating Videos with Veo 3.1
1. Generate or upload start/end frame images
2. Expand the "Video Generation" section
3. Enter a motion prompt or use the AI prompt improver
4. Select video model, duration, and frame rate
5. Click "Generate Video"

### Generating Videos with Replicate Models
1. Expand the "Replicate Video Models" section
2. Select your preferred model from the dropdown
3. Configure settings (aspect ratio, duration, inference steps, etc.)
4. Enter your prompt in the main prompt field
5. Click "Generate with Replicate"

### Advanced Features
- **Story Flow**: Upload a storyboard and let AI detect individual panels
- **Characters**: Create reusable character references with @mentions
- **Relight Studio**: Position virtual lights around your subject for cinematic lighting
- **Camera Controls**: Fine-tune rotation, zoom, and vertical angles

## Model Comparison

| Model | Provider | Type | Max Duration | Best For |
|-------|----------|------|--------------|----------|
| Veo 3.1 | Google | T2V/I2V | 10s | Cinematic quality, Google ecosystem |
| MiniMax Video-01 | Replicate | T2V/I2V | 6s | Balanced quality and speed |
| LTX Video | Replicate | T2V | 5s | Fast generation |
| Hunyuan Video | Replicate | T2V | 5s | Complex scenes |
| Mochi 1 | Replicate | T2V | 6s | Realistic motion |
| Kling Video | Replicate | T2V/I2V | 10s | Long-form content |
| Hunyuan I2V | Replicate | I2V | 5s | Image animation |

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### API Key Errors
- Ensure your API keys are correctly formatted
- Veo requires a Google Gemini API key (starts with `AIza`)
- Replicate requires a Replicate API key (starts with `r8_`)

### Video Generation Takes Too Long
- Video generation can take 1-3 minutes depending on the model
- Consider using faster models like LTX Video for quicker results

### Out of Credits
- Check your Replicate account balance at [replicate.com/account](https://replicate.com/account)
- Video generation consumes credits based on model and duration

## Technologies Used

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (utility classes)
- **AI/ML**: Google Gemini 3 Pro, Veo 3.1, Replicate
- **Icons**: Heroicons

## License

This project is for demonstration purposes. Please review the terms of service for Google Gemini API and Replicate before commercial use.

---

Built with Claude Code
