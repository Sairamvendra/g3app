


const API_URL = 'http://localhost:3002/api/generate/text';

const runTest = async () => {
    console.log('Testing Story Flow Analysis...');

    // 1x1 pixel transparent PNG base64
    const mockImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const payload = {
        prompt: `
You are an expert storyboard artist and cinematographer.
1. Analyze the attached storyboard page image.
2. Identify the number of individual panels (usually 6-8).
3. For EACH panel, write a highly detailed image generation prompt.
4. Incorporate the user's specific story guidance: "A hero stands on a mountain top looking at a dragon".
5. Adhere to these System Instructions: "".

OUTPUT FORMAT:
You must return strictly a JSON array of strings, where each string is the prompt for one panel.
Example: ["Panel 1 prompt...", "Panel 2 prompt...", "Panel 3 prompt..."]
    `,
        image: mockImage,
        max_tokens: 8192,
        temperature: 0.5,
        model: 'google/gemini-3-pro'
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Status ${response.status}: ${errText}`);
            return;
        }

        const data = await response.json();
        console.log('Success:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
};

runTest();
