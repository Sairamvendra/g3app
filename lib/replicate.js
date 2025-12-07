import Replicate from 'replicate';
import dotenv from 'dotenv';

// Ensure env vars are loaded (mostly for local testing contexts if needed)
dotenv.config();

if (!process.env.REPLICATE_API_KEY) {
    console.error("❌ REPLICATE_API_KEY is missing from environment variables.");
}

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY,
});

export default replicate;
