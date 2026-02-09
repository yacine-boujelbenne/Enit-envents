require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function checkModels() {
    console.log(`Checking URL: ${URL}`);
    try {
        const response = await fetch(URL);
        const data = await response.json();
        
        console.log("Response Status:", response.status);
        if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.error("❌ Error Data:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Network Error:", error.message);
    }
}

checkModels();
