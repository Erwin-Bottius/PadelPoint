import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'

test.group('PUT /api/v1/classes/:id', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate(); await cleanup()
  })

  test('teacher can update their own class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, name: 'Old name' }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ name: 'New name' })
      .loginAs(teacher)

    response.assertStatus(200)
    assert.equal((response.body() as any).data.name, 'New name')
  })

  test('teacher can publish their class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, isPublished: false }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ isPublished: true })
      .loginAs(teacher)

    response.assertStatus(200)
    assert.isTrue((response.body() as any).data.isPublished)
  })

  test('teacher can update the scheduled date', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()
    const newDate = '2026-12-25T14:00:00.000Z'

    const response = await client
      .put(URL(classInstance.id))
      .json({ scheduledAt: newDate })
      .loginAs(teacher)

    response.assertStatus(200)
    assert.exists((response.body() as any).data.scheduledAt)
  })

  test('teacher cannot update another teacher class', async ({ client }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher1.id, isPublished: true }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ name: 'Hijacked' })
      .loginAs(teacher2)

    response.assertStatus(403)
  })

  test('player cannot update any class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id, isPublished: true }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ name: 'Hijacked' })
      .loginAs(player)

    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .put(URL(FAKE_ID))
      .json({ name: 'Test' })
      .loginAs(teacher)

    response.assertStatus(404)
  })

  test('returns 422 for invalid scheduledAt', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ scheduledAt: 'not-a-date' })
      .loginAs(teacher)

    response.assertStatus(422)
  })

  test('returns 422 for invalid duration', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    const response = await client
      .put(URL(classInstance.id))
      .json({ duration: 5 })
      .loginAs(teacher)

    response.assertStatus(422)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({ teacherId: teacher.id }).create()

    const response = await client.put(URL(classInstance.id)).json({ name: 'Test' })
    response.assertStatus(401)
  })
})