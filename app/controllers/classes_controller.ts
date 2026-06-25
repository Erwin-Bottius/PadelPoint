import type { HttpContext } from '@adonisjs/core/http'
import { ClassService } from '#services/class_service'
import {
  createClassesValidator,
  listClassesValidator,
  updateClassValidator,
} from '#validators/class'

const classService = new ClassService()

export default class ClassesController {
  async index({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const filters = await request.validateUsing(listClassesValidator)
    const classes = await classService.findAll(user, filters)
    return { data: classes.map((c) => c.serialize()) }
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
    return serialize(classInstance.serialize())
  }

  async update({ auth, params, request, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    const data = await request.validateUsing(updateClassValidator)
    const updated = await classService.update(classInstance, data)
    return serialize(updated.serialize())
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    if (classInstance.teacherId !== user.id)
      return response.forbidden({ message: 'Not your class' })
    await classService.delete(classInstance)
    return response.noContent()
  }

  async players({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findOne(params.id, user)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    const players = await classService.getPlayers(classInstance, user)
    return { data: players }
  }

  async leave({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findById(params.id)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    try {
      await classService.leaveClass(classInstance, user)
      return response.noContent()
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') return response.forbidden({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }

  async join({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const classInstance = await classService.findById(params.id)
    if (!classInstance) return response.notFound({ message: 'Class not found' })
    try {
      await classService.joinClass(classInstance, user)
      return response.noContent()
    } catch (err: any) {
      if (err.code === 'FORBIDDEN') return response.forbidden({ message: err.message })
      if (err.code === 'CONFLICT') return response.conflict({ message: err.message })
      return response.unprocessableEntity({ message: err.message })
    }
  }
}
