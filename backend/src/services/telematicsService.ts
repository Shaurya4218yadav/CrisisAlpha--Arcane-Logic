// ============================================================
// CrisisAlpha — Telematics Service (Graceful Fallback)
// Kafka consumer for live vehicle tracking with graceful degradation
// ============================================================

let telematicsCallback: ((frame: any[]) => void) | null = null;

export function onTelematicsFrame(callback: (frame: any[]) => void) {
  telematicsCallback = callback;
}

export async function startTelematicsIngestion() {
  try {
    const { Kafka } = require('kafkajs');
    const kafka = new Kafka({
      clientId: 'crisisalpha-telematics-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      connectionTimeout: 5000,
      requestTimeout: 5000,
      retry: { retries: 2 },
    });

    const consumer = kafka.consumer({ groupId: 'telematics-broadcast-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'telematics.live', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }: any) => {
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
  } catch (err) {
    console.log('[Telematics] ⚠️ Kafka unavailable — vehicle tracking disabled (non-critical)');
  }
}
