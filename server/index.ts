import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { startPoller } from "./poller";

const PORT = parseInt(process.env.PORT ?? process.env.SOCKET_PORT ?? "3001");

const httpServer = createServer();

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://sentinel-sable-ten.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  socket.on("disconnect", () => console.log("✖ Client disconnected:", socket.id));
});

httpServer.listen(PORT, () => {
  console.log(`🛰️ Sentinel Socket.io server running on :${PORT}`);
  startPoller(io);
});