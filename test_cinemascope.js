
// test_cinemascope.js
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3003/api/cinemascope';

// The test script content provided by the user
const scriptText = `**Concept:** A cinematic mythological crossover celebrating Sankranti, featuring digital recreations of legendary actors.

**Visual Flow:**

1.  **The Setting (Dwaraka):**
    *   **Shot:** A bird’s-eye view of the Dwaraka Palace exterior at night, decorated beautifully for Sankranti.
    *   **Atmosphere:** Boats passing by, festive vibes, and text overlay reading "Dwaraka Sankranti Parvadinam."

2.  **The Characters (Interior):**
    *   **Satyabhama:** A digital recreation of actress **Sridevi** walking elegantly with handmaidens.
    *   **Lord Krishna:** A digital recreation of **Senior NTR** sitting on a golden swing (*Uyyala*), surrounded by dancing peacocks and a white snake.

3.  **The Action:**
    *   Satyabhama approaches Krishna and suggests visiting her father's home for the festival.
    *   Krishna smiles and closes his eyes, triggering a vision.

4.  **The Vision (Transition to Reality):**
    *   The scene cuts to a vibrant village in Andhra Pradesh.
    *   **Visuals:** Girls drawing Rangoli (*Muggulu*), children playing, traditional drum beats (*Dappu*), and a carnival atmosphere featuring cockfights.
    *   **Reveal:** A drone shot pulls back to show an entrance arch reading **"Mirzapur,"** flanked by two golden roosters.

5.  **The Conclusion:**
    *   Snap back to the palace. Krishna opens his eyes.
    *   Satyabhama realizes his intent and says, "I understand, Krishna. You want to go to Mirzapur. Let's celebrate Sankranti there."`;

async function runTest() {
    console.log('🎬 Starting CinemaScope End-to-End Test');
    console.log('----------------------------------------');

    try {
        // STEP 1: PARSE SCRIPT
        console.log('\n📝 1. Testing Script Parsing...');
        const parseForm = new FormData();
        parseForm.append('scriptContent', scriptText);

        // Note: In Node.js native fetch, FormData needs strict handling or a polyfill if not globally standard in older nodes.
        // simpler to send JSON if endpoint supports it, but endpoint expects multer 'scriptContent' field from body text if file not there?
        // Looking at server code: 
        // app.post('/api/cinemascope/parse-script', upload.single('scriptFile'), async (req, res) => {
        //   let scriptContent = req.body.scriptContent;
        // ...
        // So if we send JSON with scriptContent, multer might not parse body fields if 'upload.single' is used?
        // Actually multer adds body parsers. But usually expects multi-part.
        // Let's try sending as plain JSON and assume BodyParser middleware handles it?
        // Wait, `app.use(express.json())` is global. 
        // `upload.single()` handles multipart. If Content-Type is application/json, `upload.single` might ignore it and `req.body` will be populated by `express.json()`.
        // Let's try JSON first.

        const parseRes = await fetch(`${API_BASE}/parse-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptContent: scriptText })
        });

        if (!parseRes.ok) throw new Error(`Parse failed: ${parseRes.status} ${parseRes.statusText}`);
        const parsedData = await parseRes.json();
        console.log(`✅ Script Parsed! Title: "${parsedData.title}"`);
        console.log(`   Scenes identified: ${parsedData.scenes?.length}`);
        console.log(`   Total Shots: ${parsedData.scenes?.[0]?.shots?.length}`);

        // STEP 2: GENERATE LO-FI PAGE
        console.log('\n🎨 2. Testing Lo-Fi Generation...');
        if (!parsedData.scenes || parsedData.scenes.length === 0) throw new Error("No scenes found");

        const firstScene = parsedData.scenes[0];
        const prompt = `Storyboard sketch for scene: ${firstScene.location}. ${firstScene.sceneDescription}`;

        const lofiRes = await fetch(`${API_BASE}/generate-lofi-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!lofiRes.ok) throw new Error(`Lo-Fi Gen failed: ${lofiRes.statusText}`);
        const lofiData = await lofiRes.json();
        console.log('DEBUG: lofiData:', JSON.stringify(lofiData, null, 2));

        if (!lofiData.imageUrl || typeof lofiData.imageUrl !== 'string') {
            throw new Error(`Invalid lofiData.imageUrl: ${lofiData.imageUrl}`);
        }
        console.log(`✅ Lo-Fi Page Generated! URL: ${lofiData.imageUrl.substring(0, 50)}...`);


        // STEP 3: CROP FRAMES
        console.log('\n✂️  3. Testing Frame Cropping...');
        // We need a real image to crop. If the Lo-Fi URL is a replicate URL, it should work.
        const cropRes = await fetch(`${API_BASE}/crop-frames`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: lofiData.imageUrl, gridCols: 2, gridRows: 3 })
        });

        if (!cropRes.ok) throw new Error(`Cropping failed: ${cropRes.statusText}`);
        const cropData = await cropRes.json();
        console.log(`✅ Frames Cropped! Count: ${cropData.frames.length}`);

        // STEP 4: HI-FI GENERATION
        console.log('\n✨ 4. Testing Hi-Fi Generation...');
        if (cropData.frames.length === 0) throw new Error("No frames to upscale");

        const firstFrame = cropData.frames[0];
        const hifiRes = await fetch(`${API_BASE}/generate-hifi-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: "Cinematic photorealistic render of palace at night, 8k",
                image: firstFrame.base64
            })
        });

        if (!hifiRes.ok) throw new Error(`Hi-Fi Gen failed: ${hifiRes.statusText}`);
        const hifiData = await hifiRes.json();
        console.log(`✅ Hi-Fi Frame Generated! URL: ${hifiData.imageUrl.substring(0, 50)}...`);

        console.log('\n🎉 ALL SYSTEMS GO! CinemaScope module is fully operational.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
        process.exit(1);
    }
}

runTest();
