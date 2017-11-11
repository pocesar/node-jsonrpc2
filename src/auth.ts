export type AuthMethods = 'http' | 'websocket' | 'socket';

export interface AuthClass {
  get(method: AuthMethods): Promise<string | any[]>;
  check(method: AuthMethods, checker: () => {}): Promise<boolean>;
}

export class Auth implements AuthClass {
  async get(method: AuthMethods): Promise<string | any[]> {
    throw new Error('missing "get" overload')
  }

  async check(method: AuthMethods): Promise<boolean> {
    throw new Error('missing "check" overload')
  }
}

export class UserPass extends Auth {
  constructor(private user: string, private password: string) {
    super()
  }

  async get(method: AuthMethods) {
    switch (method) {
      case 'websocket':
      case 'http':
        return new Buffer(this.user + ':' + this.password).toString('base64');
      case 'socket':

        break
    }

    return null
  }

  async check(method: AuthMethods) {
    switch (method) {
      case 'http':
      case 'websocket':
        break
      case 'socket':

        break
      default:
        return false
    }
  }
}

export class Cookie extends Auth {

}

export class JWT extends Auth {

}