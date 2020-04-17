import * as Debug from 'debug'
import { EventEmitter as EE3 } from 'eventemitter3'
import { JsonError, RpcError } from './errors'
import { ClientRequest, IncomingMessage } from 'http'

const debug = Debug('jsonrpc')

export type RpcId = number | string | null
export type RpcConnectResult = { id: string, request: ClientRequest, response: IncomingMessage }
export type RpcCallback<T> = (err: JsonError, result?: T) => void

export type RpcParams = any[] | { [index: string]: any }

export interface RpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: RpcParams
  id?: RpcId
}

export interface RpcRequest extends RpcNotification {
  id: RpcId
}

export interface RpcResponse<T> {
  jsonrpc: '2.0'
  result: T
  error?: JsonError | RpcError
  id: RpcId
}

const numberRegex = /^\-?\d+$/

/**
* Output a piece of debug information.
*/
export const trace = (direction: string, message: string)  => {
 var msg = `   ${direction}    ${message}`
 debug(msg)
 return msg
}

/**
 * Check if current request has an id and it is of type integer (non fractional) or string.
 */
export const hasId = (request: RpcRequest) => {
  return (
    request &&
    typeof request['id'] !== 'undefined' &&
    ((typeof request['id'] === 'number' && numberRegex.test(`${request['id']}`)) ||
      typeof request['id'] === 'string' ||
      request['id'] === null)
  )
}

export class EventEmitter extends EE3 { }
