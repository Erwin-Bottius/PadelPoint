import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import JwtService from '#services/jwt_service'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const { firstName, lastName, email, password, role, level, location, club } =
      await request.validateUsing(signupValidator)

    const user = await User.create({ firstName, lastName, email, password, role, level, location, club })
    const token = await JwtService.sign(user.id)

    return serialize({
      user: UserTransformer.transform(user),
      token,
    })
  }
}
