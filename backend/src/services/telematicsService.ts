import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'crisisalpha-telematics-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'telematics-broadcast-group' });

let telematicsCallback: ((frame: any[]) => void) | null = null;

export function onTelematicsFrame(callback: (frame: any[]) => void) {
  telematicsCallback = callback;
}

export async function startTelematicsIngestion() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'telematics.live', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const frame = JSON.parse(message.value.toString());
        if (telematicsCallback) {
          telematicsCallback(frame);
        }
      } catch (err) {
        console.error('[Telematics] Failed to parse telematics frame', err);
      }
    },
  });
  console.log('[Telematics] 🛰️ Listening for live vehicle tracking...');
}
