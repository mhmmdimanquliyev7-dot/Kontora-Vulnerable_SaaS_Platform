import { createServer } from "node:http";

import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { attachAssistantSocket } from "@/realtime/assistantSocket.js";

const app = createApp();

// An explicit http.Server (rather than app.listen) so the WebSocket handler can
// hook the same server's "upgrade" event — one port serves both the REST/GraphQL
// surface and the assistant socket.
const server = createServer(app);
attachAssistantSocket(server);

server.listen(env.PORT, () => {
  console.log(`Kontora API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});
