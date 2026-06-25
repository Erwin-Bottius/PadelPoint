import { test } from '@japa/runner'
import { ClassService } from '#services/class_service'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const classService = new ClassService()

test.group('ClassService', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate(); await cleanup()
  })

  test('findAll returns only the teacher own classes', async ({ assert }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    await ClassFactory.merge({ teacherId: teacher1.id }).createMany(2)
    await ClassFactory.merge({ teacherId: teacher2.id }).createMany(3)

    const result = await classService.findAll(teacher1)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((c) => c.teacherId === teacher1.id))
  })

  test('findAll returns only published classes for a player', async ({ assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: true }).createMany(3)
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).createMany(2)

    const result = await classService.findAll(player)
    assert.lengthOf(result, 3)
    assert.isTrue(result.every((c) => c.isPublished === true))
  })

  test('findOne returns null for a non-existent id', async ({ assert }) => {
    const user = await UserFactory.merge({ role: 'player' }).create()
    const result = await classService.findOne('00000000-0000-0000-0000-000000000000', user)
    assert.isNull(result)
  })

  test('findOne returns null for an unpublished class accessed by a player', async ({ assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).create()

    const result = await classService.findOne(classInstance.id, player)
    assert.isNull(result)
  })

  test('findOne allows teacher to access their own unpublished class', async ({ assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).create()

    const result = await classService.findOne(classInstance.id, teacher)
    assert.isNotNull(result)
    assert.equal(result!.id, classInstance.id)
  })

  test('update persists changed fields', async ({ assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, name: 'Old name' }).create()

    const updated = await classService.update(classInstance, {
      name: 'New name',
      isPublished: true,
    })

    assert.equal(updated.name, 'New name')
    assert.isTrue(updated.isPublished)
  })

  test('delete removes the class from DB', async ({ assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    await classService.delete(classInstance)

    const found = await classService.findOne(classInstance.id, teacher)
    assert.isNull(found)
  })
})