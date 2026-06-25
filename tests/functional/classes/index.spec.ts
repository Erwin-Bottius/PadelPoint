import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = '/api/v1/classes'

test.group('GET /api/v1/classes', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher sees only their own classes', async ({ client, assert }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    await ClassFactory.merge({ teacherId: teacher1.id }).createMany(2)
    await ClassFactory.merge({ teacherId: teacher2.id }).createMany(3)

    const response = await client.get(URL).loginAs(teacher1)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 2)
    assert.isTrue((response.body() as any).data.every((c: any) => c.teacherId === teacher1.id))
  })

  test('teacher sees their unpublished classes too', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).createMany(2)
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: true }).createMany(1)

    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 3)
  })

  test('player sees only published classes', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: true }).createMany(3)
    await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).createMany(2)

    const response = await client.get(URL).loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 3)
    assert.isTrue((response.body() as any).data.every((c: any) => c.isPublished === true))
  })

  test('player sees published classes from all teachers', async ({ client, assert }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    await ClassFactory.merge({ teacherId: teacher1.id, isPublished: true }).createMany(2)
    await ClassFactory.merge({ teacherId: teacher2.id, isPublished: true }).createMany(2)

    const response = await client.get(URL).loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 4)
  })

  test('returns empty array when no classes exist', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 0)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.get(URL)
    response.assertStatus(401)
  })
})
