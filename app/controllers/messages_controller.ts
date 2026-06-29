import type { HttpContext } from '@adonisjs/core/http'
import { ClassService } from '#services/class_service'
import ClassMessage from '#models/class_message'
import ChatRead from '#models/chat_read'
import Class from '#models/class'
import { listMessagesValidator } from '#validators/message'
import db from '@adonisjs/lucid/services/db'

const classService = new ClassService()

export default class MessagesController {
  async chats({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    const query =
      user.role === 'teacher'
        ? Class.query().where('teacher_id', user.id)
        : Class.query().whereHas('players', (q) => q.where('user_id', user.id))

    const classes = await query
      .whereHas('messages', (q) => q)
      .preload('teacher')
      .preload('players', (q) =>
        q.pivotColumns(['joined_at']).orderBy('class_participants.joined_at', 'asc')
      )
      .orderBy('scheduled_at', 'asc')

    if (classes.length === 0) return { data: [] }

    // Fetch last_read_at for all classes at once
    const classIds = classes.map((c) => c.id)
    const reads = await ChatRead.query()
      .where('user_id', user.id)
      .whereIn('class_id', classIds)

    const readMap = new Map(reads.map((r) => [r.classId, r.lastReadAt]))

    // Count unread messages per class
    const unreadRows = await db
      .from('class_messages')
      .whereIn('class_id', classIds)
      .where((q) => {
        for (const classId of classIds) {
          const lastRead = readMap.get(classId)
          if (lastRead) {
            q.orWhere((sub) =>
              sub.where('class_id', classId).where('created_at', '>', lastRead.toISO()!)
            )
          } else {
            q.orWhere('class_id', classId)
          }
        }
      })
      .groupBy('class_id')
      .count('* as count')
      .select('class_id')

    const unreadMap = new Map(unreadRows.map((r: any) => [r.class_id, Number(r.count)]))

    return {
      data: classes.map((c) => ({
        ...c.serialize(),
        unreadCount: unreadMap.get(c.id) ?? 0,
      })),
    }
  }

  async index({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })

    const { page = 1, limit = 50 } = await request.validateUsing(listMessagesValidator)

    const { DateTime } = await import('luxon')
    await db.rawQuery(
      `INSERT INTO chat_reads (user_id, class_id, last_read_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, class_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
      [user.id, classInstance.id, DateTime.now().toISO()]
    )

    const messages = await ClassMessage.query()
      .where('class_id', classInstance.id)
      .preload('author')
      .orderBy('created_at', 'asc')
      .paginate(page, limit)

    return {
      data: messages.all().map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
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
