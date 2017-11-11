import Connection from "./connection";
import Endpoint from './endpoint'
import { Socket } from 'net'
import Client from './client'

/**
     * Socket connection.
     *
     * Socket connections are mostly symmetric, so we are using a single class for
     * representing both the server and client perspective.
     */
export default class SocketConnection extends Connection {
  autoReconnect: boolean = true
  ended: boolean = true

  constructor(endpoint: Endpoint, protected conn: Socket) {
    super(endpoint)

    this.conn.on("connect", () => {
      this.emit("connect");
    });

    this.conn.on("end", () => {
      this.emit("end");
    });

    this.conn.on("error", (event) => {
      this.emit("error", event instanceof Error ? event : new Error(event));
    });

    this.conn.on("close", (hadError) => {
      this.emit("close", hadError);

      if (
        this.endpoint instanceof Client &&
        this.autoReconnect === true &&
        this.ended === false
      ) {
        if (hadError) {
          // If there was an error, we'll wait a moment before retrying
          setTimeout(() => {
            this.reconnect();
          }, 200);
        } else {
          this.reconnect();
        }
      }
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
    this.ended = true;
    this.conn.end();
  }

  reconnect() {
    this.ended = false;

    if (this.endpoint instanceof Client) {
      this.conn.connect(this.endpoint.port, this.endpoint.host);
    } else {
      throw new Error("Cannot reconnect a connection from the server-side.");
    }
  }
}
