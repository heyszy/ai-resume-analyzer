import { buildApp } from "./app";

async function start() {
  const app = buildApp();

  await app.ready();

  await app.listen({
    host: "0.0.0.0",
    port: app.config.PORT,
  });
}

void start();
