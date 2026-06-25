import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}/cancel`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!
const IN_PROGRESS = DateTime.now().minus({ minutes: 30 }).toISO()!
const ENDED = DateTime.now().minus({ hours: 3 }).toISO()!

test.group('DELETE /api/v1/classes/:id/cancel', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher can uncancel a future class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      isCancelled: true,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.isFalse((response.body() as any).data.isCancelled)
  })

  test('teacher can uncancel a class that is currently in progress', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      isCancelled: true,
      scheduledAt: IN_PROGRESS,
      duration: 90,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.isFalse((response.body() as any).data.isCancelled)
  })

  test('teacher cannot uncancel a class that has already ended', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      isCancelled: true,
      scheduledAt: ENDED,
      duration: 60,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(422)
  })

  test('teacher cannot uncancel a class that is not cancelled', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      isCancelled: false,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(409)
  })

  test('teacher cannot uncancel another teacher class', async ({ client }) => {
    const teacher1 = await UserFactory.merge({ role: 'teacher' }).create()
    const teacher2 = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher1.id,
      isPublished: true,
      isCancelled: true,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher2)
    response.assertStatus(403)
  })

  test('player cannot uncancel a class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      isCancelled: true,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(player)
    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client.delete(URL(FAKE_ID)).loginAs(teacher)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.delete(URL(FAKE_ID))
    response.assertStatus(401)
  })
})
