import * as Debug from 'debug'
import { EventEmitter as EE3 } from 'eventemitter3'
import { JsonError, RpcError } from './errors'

const debug = Debug('jsonrpc')

export type RpcId = number | string | null
export type RpcCallback<T> = (err: JSONError, result?: T) => void

export type RpcParams = any[] | { [index: string ]: any }

export interface RPCNotification {
  jsonrpc: '2.0'
  method: string
  params?: RPCParams
  id?: RPCId
}

export interface RPCRequest extends RPCNotification {
  id: RPCId
}

export interface RPCResponse<T> {
  jsonrpc: '2.0'
  result: T
  error?: JSONError | RPCError
  id: RPCId
}

export default class EventEmitter extends EE3 {
  /**
   * Output a piece of debug information.
   */
  static trace(direction: string, message: string) {
    var msg = `   ${direction}    ${message}`
    debug(msg)
    return msg
  }

  /**
   * Check if current request has an id adn it is of type integer (non fractional) or string.
   */
  static hasId(request: RPCRequest) {
    return (
      request &&
      typeof request['id'] !== 'undefined' &&
      ((typeof request['id'] === 'number' && /^\-?\d+$/.test(`${request['id']}`)) ||
        typeof request['id'] === 'string' ||
        request['id'] === null)
    )
  }
}
