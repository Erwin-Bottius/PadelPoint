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

  async findAll(
    user: User,
    filters: { date?: string; level?: number; location?: string; available?: boolean } = {}
  ): Promise<Class[]> {
    const query =
      user.role === 'teacher'
        ? Class.query().where('teacher_id', user.id)
        : Class.query().where('is_published', true)

    if (filters.date) {
      const dt = DateTime.fromISO(filters.date, { zone: 'utc' })
      const start = dt.startOf('day').toISO()!
      const end = dt.endOf('day').toISO()!
      query.whereBetween('scheduled_at', [start, end])
    }

    if (filters.level !== undefined) {
      query.where((q) =>
        q
          .whereNull('level_min')
          .orWhere((inner) =>
            inner.where('level_min', '<=', filters.level!).where('level_max', '>=', filters.level!)
          )
      )
    }

    if (filters.location) {
      query.whereILike('location', `%${filters.location}%`)
    }

    if (filters.available === true) {
      query.whereRaw(
        '(SELECT COUNT(*) FROM class_participants WHERE class_id = classes.id) < classes.max_players'
      )
    }

    return query.orderBy('scheduled_at', 'asc')
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
    if (data.isPublished === false && classInstance.isPublished === true) {
      const count = await classInstance.related('players').query().count('* as total')
      const total = Number((count[0] as any).$extras.total)
      if (total > 0) {
        throw Object.assign(new Error('Cannot unpublish a class with enrolled players'), {
          code: 'CONFLICT',
        })
      }
    }
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
        playerLevel < +classInstance.levelMin ||
        playerLevel > +classInstance.levelMax
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

  async getPlayers(
    classInstance: Class,
    requestingUser: User
  ): Promise<
    {
      id: string
      firstName: string
      lastName: string
      level: number | null
      email?: string
      joinedAt: string
    }[]
  > {
    const players = await classInstance.related('players').query().pivotColumns(['joined_at'])
    const isOwner = classInstance.teacherId === requestingUser.id
    return players.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      level: p.level,
      ...(isOwner ? { email: p.email } : {}),
      joinedAt: p.$extras.pivot_joined_at as string,
    }))
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

  async cancel(classInstance: Class): Promise<Class> {
    if (!classInstance.isPublished) {
      throw Object.assign(new Error('Only published classes can be cancelled'), {
        code: 'UNPROCESSABLE',
      })
    }
    if (classInstance.isCancelled) {
      throw Object.assign(new Error('Class is already cancelled'), { code: 'CONFLICT' })
    }
    classInstance.merge({ isCancelled: true })
    await classInstance.save()
    return classInstance
  }

  async uncancel(classInstance: Class): Promise<Class> {
    if (!classInstance.isCancelled) {
      throw Object.assign(new Error('Class is not cancelled'), { code: 'CONFLICT' })
    }
    const endsAt = classInstance.scheduledAt.plus({ minutes: classInstance.duration })
    if (endsAt <= DateTime.now()) {
      throw Object.assign(new Error('Cannot uncancel a class that has already ended'), {
        code: 'UNPROCESSABLE',
      })
    }
    classInstance.merge({ isCancelled: false })
    await classInstance.save()
    return classInstance
  }

  async delete(classInstance: Class): Promise<void> {
    if (classInstance.isPublished) {
      throw Object.assign(new Error('Cannot delete a published class'), { code: 'CONFLICT' })
    }
    await classInstance.delete()
  }
}
