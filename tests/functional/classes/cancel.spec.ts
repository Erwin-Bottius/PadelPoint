import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}/cancel`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!

test.group('POST /api/v1/classes/:id/cancel', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher can cancel a published class with participants', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(`/api/v1/classes/${classInstance.id}/join`).loginAs(player)

    const response = await client.post(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.isTrue((response.body() as any).data.isCancelled)
  })

  test('teacher can cancel a published class without participants', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.isTrue((response.body() as any).data.isCancelled)
  })

  test('teacher cannot cancel an unpublished class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(422)
  })

  test('teacher cannot cancel an already cancelled class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    } as any).create()

    await client.post(URL(classInstance.id)).loginAs(teacher)
    const response = await client.post(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(409)
  })

  test('teacher cannot cancel another teacher class', async ({ client }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher1.id,
      isPublished: true,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(teacher2)
    response.assertStatus(403)
  })

  test('player cannot cancel a class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client.post(URL(FAKE_ID)).loginAs(teacher)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.post(URL(FAKE_ID))
    response.assertStatus(401)
  })
})
