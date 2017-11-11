import Connection from "./connection";
import Endpoint from "./endpoint";
import { Socket } from "net";
/**
 * Websocket connection.
 *
 * Socket connections are mostly symmetric, so we are using a single class for
 * representing both the server and client perspective.
 */
export default class WebSocketConnection extends Connection {
  ended: boolean = false;

  constructor(endpoint: Endpoint, protected conn: Socket) {
    super(endpoint);

    this.conn.on("close", (hadError) => {
      this.emit("close", hadError);
    });
  }

  write(data: any) {
    if (!this.conn.writable) {
      // Other side disconnected, we'll quietly fail
      return;
    }

    this.conn.write(data);
  }

  end() {
    this.conn.end();
    this.ended = true;
  }
}
