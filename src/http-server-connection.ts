import { Connection } from "./connection";

export class HttpServerConnection extends Connection {
  constructor(server, req, res) {
    var self = this;

    super(server);

    this.req = req;
    this.res = res;
    this.isStreaming = false;

    this.res.on("finish", function responseEnd() {
      self.emit("end");
    });

    this.res.on("close", function responseEnd() {
      self.emit("end");
    });
  }

  /**
   * Can be called before the response callback to keep the connection open.
   */
  stream(onend) {
    super.stream(onend);

    this.isStreaming = true;
  }

  /**
   * Send the client additional data.
   *
   * An HTTP connection can be kept open and additional RPC calls sent through if
   * the client supports it.
   */
  write(data) {
    if (!this.isStreaming) {
      throw new Error("Cannot send extra messages via non - streaming HTTP");
    }

    if (!this.res.connection.writable) {
      // Client disconnected, we'll quietly fail
      return;
    }

    this.res.write(data);
  }
}
