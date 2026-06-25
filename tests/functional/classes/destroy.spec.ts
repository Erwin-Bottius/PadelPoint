import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import Class from '#models/class'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'

test.group('DELETE /api/v1/classes/:id', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate(); await cleanup()
  })

  test('teacher can delete their own class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)

    response.assertStatus(204)
    const found = await Class.find(classInstance.id)
    assert.isNull(found)
  })

  test('teacher cannot delete another teacher class', async ({ client }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher1.id, isPublished: true }).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher2)

    response.assertStatus(403)
  })

  test('player cannot delete any class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, isPublished: true }).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(player)

    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client.delete(URL(FAKE_ID)).loginAs(teacher)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    const response = await client.delete(URL(classInstance.id))
    response.assertStatus(401)
  })
})