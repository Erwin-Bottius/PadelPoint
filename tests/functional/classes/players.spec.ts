import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = (id: string) => `/api/v1/classes/${id}/players`
const FAKE_ID = '00000000-0000-0000-0000-000000000000'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!

test.group('GET /api/v1/classes/:id/players', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher sees enrolled players with emails', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player1 = await UserFactory.merge({ role: 'player' }).create()
    const player2 = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(`/api/v1/classes/${classInstance.id}/join`).loginAs(player1)
    await client.post(`/api/v1/classes/${classInstance.id}/join`).loginAs(player2)

    const response = await client.get(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    const players = (response.body() as any).data
    assert.lengthOf(players, 2)
    assert.property(players[0], 'email')
    assert.property(players[0], 'joinedAt')
    assert.property(players[0], 'firstName')
    assert.property(players[0], 'level')
  })

  test('player sees co-players without emails', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player1 = await UserFactory.merge({ role: 'player' }).create()
    const player2 = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await client.post(`/api/v1/classes/${classInstance.id}/join`).loginAs(player1)
    await client.post(`/api/v1/classes/${classInstance.id}/join`).loginAs(player2)

    const response = await client.get(URL(classInstance.id)).loginAs(player1)
    response.assertStatus(200)
    const players = (response.body() as any).data
    assert.lengthOf(players, 2)
    assert.notProperty(players[0], 'email')
    assert.property(players[0], 'joinedAt')
  })

  test('returns empty array when no players enrolled', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
    } as any).create()

    const response = await client.get(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.deepEqual((response.body() as any).data, [])
  })

  test('player cannot see players of an unpublished class', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    } as any).create()

    const response = await client.get(URL(classInstance.id)).loginAs(player)
    response.assertStatus(404)
  })

  test('teacher can see players of their unpublished class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: false,
    } as any).create()

    const response = await client.get(URL(classInstance.id)).loginAs(teacher)
    response.assertStatus(200)
    assert.deepEqual((response.body() as any).data, [])
  })

  test('returns 404 for a non-existent class', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.get(URL(FAKE_ID)).loginAs(player)
    response.assertStatus(404)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.get(URL(FAKE_ID))
    response.assertStatus(401)
  })
})
