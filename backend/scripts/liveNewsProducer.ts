import Parser from 'rss-parser';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const parser = new Parser();

// Multiple Real World Sources as requested
const RSS_FEEDS = [
  { name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'ReliefWeb Disasters', url: 'https://reliefweb.int/updates/rss.xml' },
  { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' }
];

const kafka = new Kafka({
  clientId: 'crisisalpha-live-producer',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();

let genAI: any = null;
let model: any = null;

// Load Trade Hubs to map coordinates
const hubsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'trade_hubs.json'), 'utf-8'));
const hubNames = hubsData.hubs.map((h: any) => h.id);

async function initAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[News API] ⚠️ GEMINI_API_KEY not set. Using Deterministic Heuristic engine for RSS parsing.');
    return;
  }
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

async function fetchAndAnalyzeNews() {
  console.log('[News API] 📡 Polling global feeds (BBC, NYT, Al Jazeera, ReliefWeb)...');
  const recentHeadlines: string[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      // Grab top 2 recent news per site to avoid spamming
      if (parsed.items.length > 0) recentHeadlines.push(`[${feed.name}] ${parsed.items[0].title}: ${parsed.items[0].contentSnippet}`);
      if (parsed.items.length > 1) recentHeadlines.push(`[${feed.name}] ${parsed.items[1].title}: ${parsed.items[1].contentSnippet}`);
    } catch (e) {
      console.log(`[News API] ⚠️ Skipping ${feed.name} due to fetch error.`);
    }
  }

  if (recentHeadlines.length === 0) return;

  const prompt = `
  You are an AI Supply Chain Event engine. Review the following real-world breaking news items.
  Determine if any of these events severely restrict or disrupt global trade, ports, or canals. 
  Known Critical Hub IDs: ${hubNames.join(', ')}.
  
  If there is a severe event affecting a geographical region near a Hub ID, generate a JSON array of disruption events. 
  Return ONLY the JSON array (no markdown, no quotes). If no disruptions are found, return exactly: []
  
  Format:
  [{
    "targetId": "closest_matching_hub_id",
    "eventType": "NODE_DISRUPTION",
    "delta": { "capacityPct": 0.5, "status": "disrupted" },
    "reason": "String summary of the news"
  }]

  News Items:
  ${recentHeadlines.join('\n')}
  `;

  let disruptions: any[] = [];

  try {
    if (model) {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
      disruptions = JSON.parse(text);
    } else {
      // Heuristic string search
      const riskWords = ['strike', 'blocked', 'attack', 'storm', 'fire', 'explosion', 'delay'];
      for (const hl of recentHeadlines) {
        const lowerHl = hl.toLowerCase();
        for (const word of riskWords) {
          if (lowerHl.includes(word)) {
             // Find matching hub randomly or by naive match
             for (const hub of hubsData.hubs) {
                 if (lowerHl.includes(hub.countryId.toLowerCase()) || lowerHl.includes(hub.name.split(' ')[0].toLowerCase())) {
                     disruptions.push({
                        targetId: hub.id,
                        eventType: 'NODE_DISRUPTION',
                        delta: { capacityPct: 0.2, status: 'disrupted' },
                        reason: hl
                     });
                     break; // one hub per headline
                 }
             }
          }
        }
      }
    }

    if (disruptions.length > 0) {
      await producer.connect();
      for (const disruption of disruptions) {
        console.log(`[News API] 🚨 AI Detected Real-World Event: Mapping to [${disruption.targetId}] -> ${disruption.reason}`);
        
        const event = {
          eventId: "live_" + Date.now(),
          eventType: disruption.eventType,
          targetId: disruption.targetId,
          severity: "HIGH",
          delta: disruption.delta,
          timestamp: new Date().toISOString()
        };

        await producer.send({
          topic: 'base-reality.disruptions',
          messages: [{ value: JSON.stringify(event) }],
        });
      }
      await producer.disconnect();
    } else {
      console.log('[News API] ✅ Global feeds clear. No supply chain disruptions detected.');
    }
  } catch (err) {
    console.error('[News API] ❌ AI Parsing Error:', err);
  }
}

async function run() {
  await initAI();
  await fetchAndAnalyzeNews();
  // In a real prod environment, setInterval(fetchAndAnalyzeNews, 15 * 60 * 1000); 
  // We exit after 1 run for testing purposes.
}

run();
