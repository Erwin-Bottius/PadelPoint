import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import JwtService from '#services/jwt_service'

export default class AccessTokensController {
  async store({ request, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    const token = await JwtService.sign(user.id)

    return serialize({
      user: UserTransformer.transform(user),
      token,
    })
  }

  async destroy({ response }: HttpContext) {
    return response.noContent()
  }
}
