import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}/join`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!
const PAST = DateTime.now().minus({ days: 1 }).toISO()!

test.group('DELETE /api/v1/classes/:id/join', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('player can leave a class they joined', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(URL(classInstance.id)).loginAs(player)
    const response = await client.delete(URL(classInstance.id)).loginAs(player)
    response.assertStatus(204)
  })

  test('player cannot leave a class they did not join', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(player)
    response.assertStatus(422)
  })

  test('player cannot leave a class that has already started', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: PAST,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(player)
    response.assertStatus(422)
  })

  test('teacher cannot leave a class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.delete(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.delete(URL(FAKE_ID)).loginAs(player)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.delete(URL(FAKE_ID))
    response.assertStatus(401)
  })
})
