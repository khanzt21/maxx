module.exports = async (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: {
            hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
            hasReplicate: !!process.env.REPLICATE_API_TOKEN
        }
    });
};
