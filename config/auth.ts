import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'
import type { GuardConfigProvider } from '@adonisjs/auth/types'
import type { JwtGuard } from '#guards/jwt_guard'
import type { HttpContext } from '@adonisjs/core/http'

function jwtGuard(): GuardConfigProvider<(ctx: HttpContext) => JwtGuard> {
  return {
    async resolver() {
      const { JwtGuard } = await import('#guards/jwt_guard')
      return (ctx) => new JwtGuard(ctx)
    },
  }
}

const authConfig = defineConfig({
  default: 'api',

  guards: {
    api: jwtGuard(),

    web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})

export default authConfig

declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
