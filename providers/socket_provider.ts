import { createServer } from 'node:http'
import type { ApplicationService } from '@adonisjs/core/types'
import { Server } from 'socket.io'
import { Expo } from 'expo-server-sdk'

export let io: Server | null = null

const expo = new Expo()

type MessagePayload = { content: string; [key: string]: unknown }
type RoomSockets = Awaited<ReturnType<Server['fetchSockets']>>

export async function notifyAbsentMembers(
  classId: string,
  senderId: string,
  payload: MessagePayload,
  ioServer: Server,
  inRoomSockets?: RoomSockets
) {
  try {
    const { default: User } = await import('#models/user')
    const { default: Class } = await import('#models/class')

    const classInstance = await Class.query().where('id', classId).preload('players').first()
    if (!classInstance) return

    const memberIds = new Set([classInstance.teacherId, ...classInstance.players.map((p) => p.id)])

    const resolvedInRoomSockets =
      inRoomSockets ?? (await ioServer.in(`class:${classId}`).fetchSockets())
    const inRoomUserIds = new Set(resolvedInRoomSockets.map((s) => (s.data.user as any)?.id))

    const absentMemberIds = [...memberIds].filter((id) => id !== senderId && !inRoomUserIds.has(id))

    if (absentMemberIds.length === 0) return

    for (const userId of absentMemberIds) {
      ioServer.to(`user:${userId}`).emit('new_message', payload)
    }

    const members = await User.query().whereIn('id', absentMemberIds).whereNotNull('push_token')

    const { content } = payload
    const pushMessages = members
      .filter((m) => m.pushToken && Expo.isExpoPushToken(m.pushToken))
      .map((m) => ({
        to: m.pushToken!,
        title: 'Nouveau message',
        body: content.length > 100 ? content.slice(0, 97) + '...' : content,
        data: { classId },
      }))

    if (pushMessages.length === 0) return

    const chunks = expo.chunkPushNotifications(pushMessages)
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk)
    }
  } catch (err) {
    console.error('Push notification error:', err)
  }
}

export default class SocketProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    const { default: JwtService } = await import('#services/jwt_service')
    const { default: User } = await import('#models/user')
    const { default: ClassMessage } = await import('#models/class_message')
    const { ClassService } = await import('#services/class_service')

    const socketHttpServer = createServer()
    io = new Server(socketHttpServer, {
      cors: { origin: '*', credentials: true },
    })
    socketHttpServer.listen(3334)

    io.use(async (socket, next) => {
      try {
        const token = (socket.handshake.auth.token as string | undefined)?.replace('Bearer ', '')
        if (!token) return next(new Error('Authentication required'))

        const userId = await JwtService.verify(token)
        socket.data.user = await User.find(userId)
        if (!socket.data.user) return next(new Error('User not found'))

        next()
      } catch {
        next(new Error('Authentication failed'))
      }
    })

    const { default: db } = await import('@adonisjs/lucid/services/db')
    const { DateTime } = await import('luxon')
    const classService = new ClassService()

    io.on('connection', (socket) => {
      const user = socket.data.user

      socket.join(`user:${user.id}`)

      socket.on('join_class', async (classId: string) => {
        try {
          const classInstance = await classService.findOne(classId, user)
          if (!classInstance) {
            socket.emit('error', { message: 'Class not found' })
            return
          }
          await socket.join(`class:${classId}`)
          socket.emit('joined', { classId })
        } catch {
          socket.emit('error', { message: 'Cannot join class room' })
        }
      })

      socket.on(
        'send_message',
        async ({ classId, content }: { classId: string; content: string }) => {
          try {
            if (!content?.trim()) {
              socket.emit('error', { message: 'Message cannot be empty' })
              return
            }
            if (content.length > 1000) {
              socket.emit('error', { message: 'Message too long (max 1000 characters)' })
              return
            }
            const rooms = [...socket.rooms]
            if (!rooms.includes(`class:${classId}`)) {
              socket.emit('error', { message: 'You must join the class room first' })
              return
            }

            const message = await ClassMessage.create({
              classId,
              userId: user.id,
              content: content.trim(),
            })

            const payload = {
              id: message.id,
              classId: message.classId,
              content: message.content,
              type: message.type,
              createdAt: message.createdAt,
              author: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
              },
            }

            io!.to(`class:${classId}`).emit('new_message', payload)

            // Mark as read for every member currently in the room
            const inRoomSockets = await io!.in(`class:${classId}`).fetchSockets()
            const now = DateTime.now().toISO()
            for (const s of inRoomSockets) {
              const memberId = (s.data.user as any)?.id
              if (memberId) {
                await db.rawQuery(
                  `INSERT INTO chat_reads (user_id, class_id, last_read_at) VALUES (?, ?, ?)
                   ON CONFLICT (user_id, class_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
                  [memberId, classId, now]
                )
              }
            }

            await notifyAbsentMembers(classId, user.id, payload, io!, inRoomSockets)
          } catch {
            socket.emit('error', { message: 'Failed to send message' })
          }
        }
      )

      socket.on('leave_class', (classId: string) => {
        socket.leave(`class:${classId}`)
      })
    })
  }
}
