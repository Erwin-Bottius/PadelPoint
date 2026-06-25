import type { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Class from '#models/class'
import type User from '#models/user'

type ClassInput = {
  name: string
  scheduledAt: DateTime
  duration: number
  location: string
  level?: number | null
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
      level: input.level ?? null,
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
    if (data.level !== undefined) (classInstance as any).level = data.level ?? null
    if (data.club !== undefined) classInstance.merge({ club: data.club })
    if (data.maxPlayers !== undefined) classInstance.merge({ maxPlayers: data.maxPlayers })
    if (data.isPublished !== undefined) classInstance.merge({ isPublished: data.isPublished })
    if (data.scheduledAt !== undefined) {
      ;(classInstance as any).scheduledAt = data.scheduledAt
    }
    await classInstance.save()
    return classInstance
  }

  async delete(classInstance: Class): Promise<void> {
    await classInstance.delete()
  }
}
