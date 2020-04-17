import { RpcRequest } from './event-emitter'
import * as Errors from './errors'

export interface AuthProvider {
  headers: Object;
  user: string;
  pass: string;
}

export interface AuthCheck {

}

export interface AuthClass {
  client(): Promise<AuthProvider>
  server(incoming: AuthCheck): Promise<boolean>
}

export class Auth implements AuthClass {
  async client(): Promise<AuthProvider> {
    throw new Errors.RpcError('missing "get" overload')
  }

  async server(incoming: AuthCheck): Promise<boolean> {
    throw new Errors.RpcError('missing "check" overload')
  }
}

export class UserPass extends Auth implements Auth {
  constructor(private user: string, private password: string) {
    super()
  }

  async client() {
    return {
      headers: {
        'Authorization': `Basic ${new Buffer(this.user + ':' + this.password).toString('base64')}`
      },
      user: this.user,
      pass: this.password
    }
  }

  async server(incoming: AuthCheck) {
    return false
  }
}

export class Cookie extends Auth {
  constructor(private token: string) {
    super()
  }

  async client() {
    return {
      headers: {
        'Authorization': `Bearer  ${new Buffer(this.token).toString('base64')}`
      },
    }
  }
}

export class JWT extends Auth {
  constructor(private token: string) {
    super()
  }

  async client() {
    return {
      headers: {
        'Authorization': `Bearer  ${new Buffer(this.token).toString('base64')}`
      },
    }
  }
}