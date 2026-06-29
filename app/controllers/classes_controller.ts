import type { HttpContext } from '@adonisjs/core/http'
import { ClassService } from '#services/class_service'
import {
  createClassesValidator,
  listClassesValidator,
  updateClassValidator,
} from '#validators/class'
import type Class from '#models/class'
import type User from '#models/user'
import ClassMessage from '#models/class_message'
import { io, notifyAbsentMembers } from '#providers/socket_provider'

const classService = new ClassService()

function serializePlayers(c: Class, requestingUser: User) {
  return (c.players ?? []).map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    level: p.level,
    joinedAt: p.$extras.pivot_joined_at,
    ...(c.teacherId === requestingUser.id ? { email: p.email } : {}),
  }))
}

function serializeClass(c: Class, requestingUser: User) {
  return { ...c.serialize(), players: serializePlayers(c, requestingUser) }
}

export default class ClassesController {
  async index({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const filters = await request.validateUsing(listClassesValidator)
    const classes = await classService.findAll(user, filters)
    return { data: classes.map((c) => serializeClass(c, user)) }
  }

  async store({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { classes } = await request.validateUsing(createClassesValidator)
    const created = await classService.bulkCreate(user, classes)
    return { data: created.map((c) => c.serialize()) }
  }

  async show({ auth, params, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    return serialize(serializeClass(classInstance, user))
  }

  async update({ auth, params, request, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    const data = await request.validateUsing(updateClassValidator)
    const updated = await classService.update(classInstance, data)
    return serialize(serializeClass(updated, user))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    try {
      await classService.delete(classInstance)
      return response.noContent()
    } catch (err: any) {
      return response.conflict({ message: err.message })
    }
  }

  async uncancel({ auth, params, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    try {
      const updated = await classService.uncancel(classInstance)
      return serialize(serializeClass(updated, user))
    } catch (err: any) {
      if (err.code === 'CONFLICT') return response.conflict({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }

  async cancel({ auth, params, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    try {
      const updated = await classService.cancel(classInstance)
      return serialize(serializeClass(updated, user))
    } catch (err: any) {
      if (err.code === 'CONFLICT') return response.conflict({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }

  async leave({ auth, params, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findById(params.id)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    try {
      const updated = await classService.leaveClass(classInstance, user)

      const message = await ClassMessage.create({
        classId: params.id,
        userId: user.id,
        content: '',
        type: 'user_left',
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

      io?.to(`class:${params.id}`).emit('new_message', payload)

      if (io) {
        await notifyAbsentMembers(params.id, user.id, payload, io)
      }

      return serialize(serializeClass(updated, user))
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') return response.forbidden({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }

  async join({ auth, params, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findById(params.id)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    try {
      const updated = await classService.joinClass(classInstance, user)
      return serialize(serializeClass(updated, user))
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') return response.forbidden({ message: err.message })
      if (err.code === 'CONFLICT') return response.conflict({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }
}
