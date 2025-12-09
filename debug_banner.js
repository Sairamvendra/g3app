
import fs from 'fs';
import path from 'path';

const imagePath = "/Users/sairamvendra/.gemini/antigravity/brain/d90bbb9f-0561-4b26-a9e8-f789a465ea74/uploaded_image_0_1764940783836.png";
const buffer = fs.readFileSync(imagePath);
const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

const BANNER_SYSTEM_PROMPT = `
{
  "TOON_VERSION": "1.0",
  "TASK_ID": "BANNER_REFRAME",
  "OBJECTIVE": { "primary": "Reframe banner to target dimensions" }
}`;

const payload = {
  model: 'google/nano-banana-pro',
  prompt: BANNER_SYSTEM_PROMPT,
  image_input: [base64Image],
  aspect_ratio: "1:1",
  image_size: '2K',
  output_format: 'png',
  safety_filter_level: 'block_only_high'
};

async function test() {
  try {
    console.log("Sending request with JSON prompt...");
    const response = await fetch('http://localhost:3002/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Server Error:", response.status, text);
      return;
    }

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

  } catch (e) {
    console.error("Script Error:", e);
  }
}

test();
