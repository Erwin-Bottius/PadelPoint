import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

const pushTokenValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(1),
  })
)

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  async savePushToken({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { token } = await request.validateUsing(pushTokenValidator)
    await user.merge({ pushToken: token }).save()
    return response.noContent()
  }
}
