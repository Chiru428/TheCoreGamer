import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "thecoregamer-backend",
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }, // too noisy
    }),
    new PrismaInstrumentation(),
  ],
});

// Only start in production or when OTEL is explicitly enabled
if (process.env.OTEL_ENABLED === "true") {
  sdk.start();
  process.on("SIGTERM", () => sdk.shutdown());
}

export default sdk;
