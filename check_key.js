require('dotenv').config();
const fetch = globalThis.fetch;

const key = process.env.GEMINI_API_KEY;

console.log("--- API Key Diagnostics ---");
if (!key) {
    console.error("❌ ERROR: GEMINI_API_KEY is undefined or empty.");
    console.log("Please check your .env file.");
    process.exit(1);
}

console.log(`✅ Key found. Length: ${key.length}`);
console.log(`🔑 Key preview: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`);

if (key.includes(' ')) {
    console.warn("⚠️  WARNING: Key contains spaces! Check .env for accidental whitespace.");
}

async function testKey() {
    console.log("\nTesting API Key with raw HTTP request (gemini-1.5-flash)...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const body = {
        contents: [{ parts: [{ text: "Hello" }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ SUCCESS! The API key works.");
            console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text || "No text");
        } else {
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            console.error("Details:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("❌ Network Error:", e.message);
    }
}

testKey();
