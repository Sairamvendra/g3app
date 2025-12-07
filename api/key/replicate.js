export default function handler(req, res) {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'API key not configured on server' });
    }
    res.status(200).json({ success: true, key: apiKey });
}
