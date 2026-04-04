import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function testModel(modelName: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'yes' and nothing else.");
    console.log(`[${modelName}] Success: ` + (await result.response.text()).trim());
  } catch(e: any) {
    console.error(`[${modelName}] ERROR:`, e.message);
  }
}

async function run() {
  await testModel('gemini-1.5-flash-8b');
  await testModel('gemini-1.5-flash-8b-latest');
}

run();
