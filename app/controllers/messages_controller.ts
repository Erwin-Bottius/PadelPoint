import type { HttpContext } from '@adonisjs/core/http'
import { ClassService } from '#services/class_service'
import ClassMessage from '#models/class_message'
import { listMessagesValidator } from '#validators/message'

const classService = new ClassService()

export default class MessagesController {
  async index({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })

    const { page = 1, limit = 50 } = await request.validateUsing(listMessagesValidator)

    const messages = await ClassMessage.query()
      .where('class_id', classInstance.id)
      .preload('author')
      .orderBy('created_at', 'asc')
      .paginate(page, limit)

    return {
      data: messages.all().map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        author: {
          id: m.author.id,
          firstName: m.author.firstName,
          lastName: m.author.lastName,
          role: m.author.role,
        },
      })),
      meta: messages.getMeta(),
    }
  }
}
