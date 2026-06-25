import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Class from '#models/class'
import type User from '#models/user'

type ClassInput = {
  name: string
  scheduledAt: DateTime
  duration: number
  location: string
  levelMin?: number | null
  levelMax?: number | null
  club?: string | null
  maxPlayers?: number
}

type UpdateInput = Partial<ClassInput> & { isPublished?: boolean }

export class ClassService {
  async bulkCreate(teacher: User, inputs: ClassInput[]): Promise<Class[]> {
    const rows = inputs.map((input) => ({
      teacher_id: teacher.id,
      name: input.name,
      scheduled_at: input.scheduledAt.toISO(),
      duration: input.duration,
      location: input.location,
      level_min: input.levelMin ?? null,
      level_max: input.levelMax ?? null,
      club: input.club ?? null,
      max_players: input.maxPlayers ?? 4,
      is_published: false,
    }))

    // Single INSERT with multiple rows — 1 round-trip regardless of batch size
    const inserted: { id: string }[] = await db.table('classes').insert(rows).returning('id')
    const ids = inserted.map((r) => r.id)
    return Class.query().whereIn('id', ids).orderBy('scheduled_at', 'asc')
  }

  async findAll(user: User): Promise<Class[]> {
    if (user.role === 'teacher') {
      return Class.query().where('teacher_id', user.id).orderBy('scheduled_at', 'asc')
    }
    return Class.query().where('is_published', true).orderBy('scheduled_at', 'asc')
  }

  async findById(id: string): Promise<Class | null> {
    return Class.find(id)
  }

  async findOne(id: string, user: User): Promise<Class | null> {
    const classInstance = await Class.find(id)
    if (!classInstance) return null
    const isTeacherOwner = classInstance.teacherId === user.id
    if (!classInstance.isPublished && !isTeacherOwner) return null
    return classInstance
  }

  async update(classInstance: Class, data: UpdateInput): Promise<Class> {
    if (data.name !== undefined) classInstance.merge({ name: data.name })
    if (data.duration !== undefined) classInstance.merge({ duration: data.duration })
    if (data.location !== undefined) classInstance.merge({ location: data.location })
    if (data.levelMin !== undefined) classInstance.merge({ levelMin: data.levelMin ?? null })
    if (data.levelMax !== undefined) classInstance.merge({ levelMax: data.levelMax ?? null })
    if (data.club !== undefined) classInstance.merge({ club: data.club })
    if (data.maxPlayers !== undefined) classInstance.merge({ maxPlayers: data.maxPlayers })
    if (data.isPublished !== undefined) classInstance.merge({ isPublished: data.isPublished })
    if (data.scheduledAt !== undefined) classInstance.merge({ scheduledAt: data.scheduledAt })
    await classInstance.save()
    return classInstance
  }

  async joinClass(classInstance: Class, player: User): Promise<void> {
    if (player.role !== 'player') {
      throw Object.assign(new Error('Only players can join classes'), { code: 'FORBIDDEN' })
    }
    if (!classInstance.isPublished) {
      throw Object.assign(new Error('Class is not published'), { code: 'FORBIDDEN' })
    }
    if (classInstance.scheduledAt < DateTime.now()) {
      throw Object.assign(new Error('Class has already passed'), { code: 'UNPROCESSABLE' })
    }

    const playerCount = await classInstance.related('players').query().count('* as total')
    const total = Number((playerCount[0] as any).$extras.total)
    if (total >= classInstance.maxPlayers) {
      throw Object.assign(new Error('Class is full'), { code: 'UNPROCESSABLE' })
    }

    if (classInstance.levelMin !== null && classInstance.levelMax !== null) {
      const playerLevel = (player as any).level as number | null
      if (
        playerLevel === null ||
        playerLevel < classInstance.levelMin ||
        playerLevel > classInstance.levelMax
      ) {
        throw Object.assign(new Error('Your level is not within the class range'), {
          code: 'UNPROCESSABLE',
        })
      }
    }

    const alreadyJoined = await classInstance
      .related('players')
      .query()
      .where('user_id', player.id)
      .first()
    if (alreadyJoined) {
      throw Object.assign(new Error('Already joined this class'), { code: 'CONFLICT' })
    }

    await classInstance.related('players').attach([player.id])
  }

  async leaveClass(classInstance: Class, player: User): Promise<void> {
    if (player.role !== 'player') {
      throw Object.assign(new Error('Only players can leave classes'), { code: 'FORBIDDEN' })
    }
    if (classInstance.scheduledAt <= DateTime.now()) {
      throw Object.assign(new Error('Class has already started'), { code: 'UNPROCESSABLE' })
    }
    const enrollment = await classInstance
      .related('players')
      .query()
      .where('user_id', player.id)
      .first()
    if (!enrollment) {
      throw Object.assign(new Error('You are not enrolled in this class'), {
        code: 'UNPROCESSABLE',
      })
    }
    await classInstance.related('players').detach([player.id])
  }

  async delete(classInstance: Class): Promise<void> {
    await classInstance.delete()
  }
}
