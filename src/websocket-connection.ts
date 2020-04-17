import { Connection } from "./connection"
import { Endpoint } from "./endpoint"
import { Socket } from "net"

/**
 * Websocket connection.
 *
 * Socket connections are mostly symmetric, so we are using a single class for
 * representing both the server and client perspective.
 */
export class WebsocketConnection extends Connection {
  ended: boolean = false

  constructor(endpoint: Endpoint, protected socket: Socket) {
    super(endpoint)

    this.socket.on("close", (hadError) => {
      this.emit("close", hadError)
    })
  }

  write(data: any) {
    if (!this.socket.writable) {
      // Other side disconnected, we'll quietly fail
      return
    }

    this.socket.write(data)

    return this
  }

  end() {
    this.socket.end()
    this.ended = true

    return this
  }
}
