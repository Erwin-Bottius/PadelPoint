import { symbols, errors } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import JwtService from '#services/jwt_service'

export class JwtGuard implements GuardContract<User> {
  readonly driverName = 'jwt' as const;

  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  isAuthenticated = false
  authenticationAttempted = false
  user?: User

  constructor(private ctx: HttpContext) {}

  async authenticateAsClient(user: User): Promise<AuthClientResponse> {
    const token = await JwtService.sign(user.id)
    return { headers: { Authorization: `Bearer ${token}` } }
  }

  getUserOrFail(): User {
    if (!this.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }
    return this.user
  }

  async authenticate(): Promise<User> {
    if (this.authenticationAttempted) {
      return this.getUserOrFail()
    }

    this.authenticationAttempted = true

    const authHeader = this.ctx.request.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    try {
      const userId = await JwtService.verify(authHeader.slice(7))
      this.user = await User.findOrFail(userId)
      this.isAuthenticated = true
      return this.user
    } catch {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }
}
