import { Connection } from "./connection"
import { Endpoint } from './endpoint'
import { Socket } from 'net'
import { Client } from './client'
import * as Errors from './errors'

/**
 * Socket connection.
 *
 * Socket connections are mostly symmetric, so we are using a single class for
 * representing both the server and client perspective.
 */
export class SocketConnection extends Connection {
  autoReconnect: boolean = true
  ended: boolean = true

  constructor(endpoint: Endpoint, protected socket: Socket) {
    super(endpoint)

    this.socket.on("connect", () => {
      this.emit("connect")
    })

    this.socket.on("end", () => {
      this.emit("end")
    })

    this.socket.on("error", (event) => {
      this.emit("error", Errors.wrapError(event, Errors.InternalError))
    })

    this.socket.on("close", (hadError) => {
      this.emit("close", hadError)

      if (
        this.endpoint instanceof Client &&
        this.autoReconnect === true &&
        this.ended === false
      ) {
        if (hadError) {
          // If there was an error, we'll wait a moment before retrying
          setTimeout(() => {
            this.reconnect()
          }, 200)
        } else {
          this.reconnect()
        }
      }
    })
  }

  write(data: any) {
    if (!this.socket.writable) {
      // Other side disconnected, we'll quietly fail
      return
    }

    this.socket.write(data)
  }

  end() {
    this.ended = true
    this.socket.end()
  }

  reconnect() {
    this.ended = false

    if (this.endpoint instanceof Client) {
      this.socket.connect(this.endpoint.port, this.endpoint.host)
    } else {
      throw new Error("Cannot reconnect a connection from the server-side.")
    }
  }
}
