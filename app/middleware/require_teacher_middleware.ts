import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RequireTeacherMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    if (user.role !== 'teacher') {
      ctx.response.forbidden({ message: 'Teacher role required' })
      return
    }
    return next()
  }
}
