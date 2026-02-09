const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("Checking available models...");
  try {
      // The SDK doesn't always expose a direct listModels easily in all versions, 
      // but let's try a simple generation with 'gemini-pro' first to see if that works.
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent("Hello");
      console.log("gemini-pro works:", result.response.text());
  } catch (error) {
      console.log("gemini-pro failed:", error.message);
  }

  try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello");
      console.log("gemini-1.5-flash works:", result.response.text());
  } catch (error) {
      console.log("gemini-1.5-flash failed:", error.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.5-flash-latest works:", result.response.text());
} catch (error) {
    console.log("gemini-1.5-flash-latest failed:", error.message);
}
}

listModels();
