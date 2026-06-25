import type { HttpContext } from '@adonisjs/core/http'
import { ClassService } from '#services/class_service'
import { createClassesValidator, updateClassValidator } from '#validators/class'

const classService = new ClassService()

export default class ClassesController {
  async index({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const classes = await classService.findAll(user)
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
}
