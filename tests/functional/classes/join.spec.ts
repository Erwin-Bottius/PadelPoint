import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}/join`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!
const PAST = DateTime.now().minus({ days: 1 }).toISO()!

test.group('POST /api/v1/classes/:id/join', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('player can join a published class with space', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      maxPlayers: 4,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(204)
  })

  test('player cannot join the same class twice', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(URL(classInstance.id)).loginAs(player)
    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(409)
  })

  test('player cannot join an unpublished class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(403)
  })

  test('player cannot join a class that already passed', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: PAST,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(422)
  })

  test('player cannot join a full class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player1 = await UserFactory.merge({ role: 'player' }).create()
    const player2 = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      maxPlayers: 1,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(URL(classInstance.id)).loginAs(player1)
    const response = await client.post(URL(classInstance.id)).loginAs(player2)
    response.assertStatus(422)
  })

  test('player with correct level can join a class with level range', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player', level: 6 }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: 5.5,
      levelMax: 7.0,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(204)
  })

  test('player with level outside range cannot join', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player', level: 3 }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: 5.5,
      levelMax: 7.0,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(422)
  })

  test('player without level cannot join a class with level range', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player', level: null }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: 5.0,
      levelMax: 8.0,
      scheduledAt: FUTURE,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(player)
    response.assertStatus(422)
  })

  test('teacher cannot join a class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    } as any).create()

    const response = await client.post(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(403)
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.post(URL(FAKE_ID)).loginAs(player)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.post(URL(FAKE_ID))
    response.assertStatus(401)
  })
})
