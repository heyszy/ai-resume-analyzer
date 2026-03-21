import { buildApp } from "./app";

async function start() {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3001);

  await app.listen({
    host: "0.0.0.0",
    port,
  });
}

void start();
