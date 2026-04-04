import { Kafka } from 'kafkajs';
import { updateNodeDisruption, updateEdgeConstriction } from './neo4jService';
import { patchBaseGraphNode, patchBaseGraphEdge } from './graphService';

const kafka = new Kafka({
  clientId: 'crisisalpha-consumer',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'base-reality-group' });
let isRunning = false;

let eventCallbacks: Array<(event: any) => void> = [];

export function onLiveEvent(callback: (event: any) => void): () => void {
  eventCallbacks.push(callback);
  return () => {
    eventCallbacks = eventCallbacks.filter(cb => cb !== callback);
  };
}

export async function startIngestion() {
  if (isRunning) return;
  isRunning = true;

  console.log('[Ingestion] 📡 Connecting to Kafka broker...');
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'base-reality.disruptions', fromBeginning: false });
    
    console.log('[Ingestion] 🚀 Listening for Base Reality disruptions on Kafka...');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        
        console.log(`\n[Ingestion] 📥 Received Kafka Event: [${event.eventType}] targeting [${event.targetId}]`);

        try {
          if (event.eventType === 'NODE_DISRUPTION') {
            await updateNodeDisruption(event.targetId, event.delta);
            patchBaseGraphNode(event.targetId, event.delta);
            console.log(`[Ingestion] ✅ Neo4j Property Updated: Node capacity dropped to ${event.delta.capacityPct}.`);
          } else if (event.eventType === 'ROUTE_CONSTRICTION') {
            await updateEdgeConstriction(event.targetId, event.delta);
            patchBaseGraphEdge(event.targetId, event.delta);
            console.log(`[Ingestion] ✅ Neo4j Property Updated: Route transit delay increased by ${event.delta.transitDelayDays} days.`);
          }

          // Emit to WebSockets so frontend sees the Neo4j update
          for (const cb of eventCallbacks) {
            cb(event);
          }
        } catch (err) {
          console.error('[Ingestion] ❌ Error updating Neo4j from Kafka:', err);
        }
      },
    });
  } catch (err) {
    console.error('[Ingestion] ❌ Failed to connect Kafka consumer:', err);
  }
}

export async function stopIngestion() {
  if (!isRunning) return;
  isRunning = false;
  await consumer.disconnect();
  console.log('[Ingestion] ⏹️ Kafka Consumer disconnected.');
}

export function isIngestionRunning(): boolean {
  return isRunning;
}
