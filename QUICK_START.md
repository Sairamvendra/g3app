# Quick Start Guide

## Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Get Your API Keys

#### Google Gemini API Key (For Images & Veo Videos)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

#### Replicate API Key (For Replicate Video Models)
1. Go to https://replicate.com/account/api-tokens
2. Click "Create token"
3. Copy the key (starts with `r8_...`)

### Step 3: Configure Keys (Choose One Method)

**Method A: In-App (Recommended)**
1. Start the app first: `npm run dev`
2. Open http://localhost:5173
3. Click the key icon (🔑) in the top-right corner
4. Paste your Gemini API key
5. When you use Replicate models, you'll be prompted for the Replicate key

**Method B: Environment File**
1. Edit `.env.local`
2. Replace placeholders:
   ```
   GEMINI_API_KEY=AIza...your_actual_key
   REPLICATE_API_KEY=r8_...your_actual_key
   ```

### Step 4: Run the App
```bash
npm run dev
```

Visit http://localhost:5173

## Your First Image

1. Type a prompt: `"A cinematic shot of a futuristic city at sunset"`
2. Select a camera angle: "Wide Shot (WS)"
3. Click "Generate"
4. Wait ~10 seconds
5. Download your image

## Your First Video (Veo)

1. Generate an image first (as above)
2. Scroll down to "Video Generation" section
3. Click to expand it
4. Enter motion prompt: `"Slow pan across the cityscape"`
5. Click "Generate Video"
6. Wait ~1-2 minutes
7. Download your video

## Your First Video (Replicate)

1. Scroll to "Replicate Video Models" section
2. Click to expand it
3. Select a model (try "LTX Video" for speed)
4. Set aspect ratio: "16:9"
5. Set duration: "5 seconds"
6. Enter prompt in main field: `"A drone shot flying over a beach at golden hour"`
7. Click "Generate with Replicate"
8. If prompted, enter your Replicate API key
9. Wait ~1-2 minutes
10. Download your video

## Comparing Video Models

### Quick Comparison
- **Veo 3.1**: Best for cinematic quality, Google ecosystem
- **MiniMax**: Balanced quality and speed
- **LTX Video**: Fastest generation
- **Mochi 1**: Best motion realism
- **Kling Video**: Longest videos (10s)

### When to Use Which Model

**Veo 3.1 (Google)**
✅ When you want the highest cinematic quality
✅ When you have Google Cloud credits
✅ When you need image-to-video with precise control

**LTX Video (Replicate)**
✅ When you need fast iterations
✅ When testing prompts
✅ When cost is a primary concern

**Mochi 1 (Replicate)**
✅ When motion quality is critical
✅ For action scenes
✅ When you need realistic physics

**Kling Video (Replicate)**
✅ When you need longer videos
✅ For narrative sequences
✅ When you need both T2V and I2V

## Common Issues

### "API Key Error"
- Check that you're using the correct key for each service
- Gemini keys start with `AIza`
- Replicate keys start with `r8_`
- Don't mix them up!

### "Video generation failed"
- Check your Replicate account balance
- Ensure you have credits available
- Try a simpler prompt first

### "Generation taking too long"
- Video generation typically takes 1-3 minutes
- This is normal - the models are running on cloud GPUs
- You can close the tab and come back (for some providers)

### "Out of credits"
- Check your balance at replicate.com/account
- Add credits or upgrade your plan
- Videos cost more than images

## Pro Tips

### For Better Images
1. Be specific with lighting: "soft golden hour light"
2. Specify camera details: "shot on 35mm film"
3. Use mood keywords: "cinematic", "ethereal", "gritty"
4. Try multiple camera angles at once

### For Better Videos
1. Describe the motion explicitly: "slow zoom in", "camera pans left"
2. Keep it simple - complex motions may not work well
3. Use the AI prompt improver for Veo videos
4. Start with shorter durations (5s) before trying longer ones

### To Save Money
1. Test prompts with images first (much cheaper)
2. Use LTX Video for iterations
3. Only use premium models for final outputs
4. Reduce inference steps during testing

## Next Steps

- Explore the Character system to create consistent characters
- Try the Story Flow feature for sequential generation
- Experiment with Relight Studio for advanced lighting
- Combine Veo and Replicate models to find your preferred workflow

## Need Help?

- Check FEATURES.md for detailed feature documentation
- Check README.md for comprehensive setup guide
- Review the model comparison table in README.md

---

Happy creating! 🎬✨
