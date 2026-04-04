import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'crisisalpha-mock-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function run() {
  await producer.connect();
  console.log('[MockProducer] 🔌 Connected to Kafka on localhost:9092');

  // 1. Target a Node
  const nodeEvent = {
    eventId: "evt_" + Date.now(),
    eventType: "NODE_DISRUPTION",
    targetId: "losangeles", 
    severity: "HIGH",
    delta: { capacityPct: 0.2, status: "severely_compromised" },
    timestamp: new Date().toISOString()
  };

  // 2. Target a Route (Chokepoint)
  const routeEvent = {
    eventId: "evt_" + (Date.now() + 1),
    eventType: "ROUTE_CONSTRICTION",
    targetId: "panama_canal", 
    severity: "CRITICAL",
    delta: { transitDelayDays: 14, fuelCostMultiplier: 1.5 },
    timestamp: new Date().toISOString()
  };

  await producer.send({
    topic: 'base-reality.disruptions',
    messages: [
      { key: 'port_la', value: JSON.stringify(nodeEvent) },
      { key: 'panama', value: JSON.stringify(routeEvent) },
    ],
  });

  console.log('[MockProducer] 🚀 Sent NODE_DISRUPTION event for: losangeles');
  console.log('[MockProducer] 🚀 Sent ROUTE_CONSTRICTION event for: panama_canal');

  await producer.disconnect();
  console.log('[MockProducer] 📴 Disconnected.');
}

run().catch(console.error);
