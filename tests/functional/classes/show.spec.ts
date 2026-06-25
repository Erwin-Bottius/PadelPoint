import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'

test.group('GET /api/v1/classes/:id', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher can access their own unpublished class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    }).create()

    const response = await client.get(URL(classInstance.id)).loginAs(teacher)

    response.assertStatus(200)
    assert.equal((response.body() as any).data.id, classInstance.id)
  })

  test('teacher can access their own published class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    }).create()

    const response = await client.get(URL(classInstance.id)).loginAs(teacher)

    response.assertStatus(200)
    assert.equal((response.body() as any).data.id, classInstance.id)
  })

  test('player can access a published class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    }).create()

    const response = await client.get(URL(classInstance.id)).loginAs(player)

    response.assertStatus(200)
    assert.equal((response.body() as any).data.id, classInstance.id)
  })

  test('player cannot access an unpublished class (returns 404)', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    }).create()

    const response = await client.get(URL(classInstance.id)).loginAs(player)

    response.assertStatus(404)
  })

  test('teacher cannot access another teacher unpublished class', async ({ client }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher1.id,
      isPublished: false,
    }).create()

    const response = await client.get(URL(classInstance.id)).loginAs(teacher2)

    response.assertStatus(404)
  })

  test('returns 404 for a non-existent id', async ({ client }) => {
    const user = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.get(URL(FAKE_ID)).loginAs(user)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    }).create()

    const response = await client.get(URL(classInstance.id))
    response.assertStatus(401)
  })
})
