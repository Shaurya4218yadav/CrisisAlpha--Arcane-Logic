import { Kafka } from 'kafkajs';
import * as fs from 'fs';
import * as path from 'path';

const kafka = new Kafka({
  clientId: 'crisisalpha-telematics-producer',
  brokers: ['localhost:9092'],
});
const producer = kafka.producer();

// Preload graph to snap vehicles to edges
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const hubsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trade_hubs.json'), 'utf-8'));
const routesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trade_routes.json'), 'utf-8'));

const hubMap = new Map();
for (const hub of hubsData.hubs) {
  hubMap.set(hub.id, hub);
}

// Generate Fleet
const FLEET_SIZE = 400; // 400 vehicles traversing globally
const vehicles: any[] = [];

for (let i = 0; i < FLEET_SIZE; i++) {
  // Pick random route
  const route = routesData.routes[Math.floor(Math.random() * routesData.routes.length)];
  const transportType = route.transportType === 'air' ? 'air' : 'sea'; // unify land to sea just for testing, or keep all
  
  // IMO is 7 digits for ships, IATA is 2 letters + 3/4 digits for flights
  let id = '';
  if (transportType === 'sea') {
      id = `IMO${Math.floor(Math.random() * 9000000) + 1000000}`;
  } else if (transportType === 'air') {
      const airlines = ['DL', 'AA', 'UA', 'EK', 'CX', 'SQ'];
      id = `${airlines[Math.floor(Math.random() * airlines.length)]}${Math.floor(Math.random() * 9000) + 1000}`;
  } else {
      id = `TRK${Math.floor(Math.random() * 90000) + 10000}`;
  }

  vehicles.push({
    id,
    type: transportType, // 'sea', 'air', 'road', 'rail', 'pipeline'
    routeId: route.id,
    sourceId: route.sourceHubId,
    targetId: route.targetHubId,
    progress: Math.random(), // 0.0 to 1.0 along the route
    speed: (Math.random() * 0.005) + 0.001 // progression rate per tick
  });
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

async function runTelematics() {
  await producer.connect();
  console.log(`[Telematics] 🛰️ Connected to Kafka. Broadcasting ${FLEET_SIZE} live vehicles...`);

  setInterval(async () => {
    const payload = [];

    for (const v of vehicles) {
       v.progress += v.speed;
       if (v.progress > 1.0) {
           v.progress = 0.0; // looped for continuous simulation, or randomly assign a new route
       }

       const source = hubMap.get(v.sourceId);
       const target = hubMap.get(v.targetId);

       if (!source || !target) continue;

       // Calculate exact Lat Lng
       const lat = lerp(source.lat, target.lat, v.progress);
       const lng = lerp(source.lng, target.lng, v.progress);

       payload.push({
           id: v.id,
           type: v.type,
           lat,
           lng,
           routeId: v.routeId,
           progress: v.progress,
           heading: Math.atan2(target.lng - source.lng, target.lat - source.lat) * (180 / Math.PI)
       });
    }

    try {
        await producer.send({
            topic: 'telematics.live',
            messages: [{ value: JSON.stringify(payload) }]
        });
    } catch (err) {
        console.error('[Telematics] ❌ Broadcast error', err);
    }
  }, 1000); // 1Hz Broadcast
}

runTelematics().catch(console.error);
