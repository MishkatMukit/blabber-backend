import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import config from "./config";
import { registerChatHandlers } from "./socket/chat";
import { setSocketServer } from "./socket";

const PORT = config.port;

const main = async () => {
  try {
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: config.app_url,
        credentials: true,
      },
    });

    registerChatHandlers(io);
    setSocketServer(io);

    httpServer.listen(PORT, () => {
      console.log(`server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.log("Error starting the server : ", error);
    process.exit(1);
  }
};

main();
