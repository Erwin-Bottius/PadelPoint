import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = '/api/v1/classes'

const TOMORROW = DateTime.now().plus({ days: 1 })
const NEXT_WEEK = DateTime.now().plus({ days: 7 })

test.group('GET /api/v1/classes (filters)', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('filter by start_date and end_date returns only classes in range', async ({
    client,
    assert,
  }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: TOMORROW.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    const response = await client
      .get(URL)
      .qs({
        start_date: TOMORROW.toFormat('yyyy-MM-dd'),
        end_date: TOMORROW.toFormat('yyyy-MM-dd'),
      })
      .loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 1)
  })

  test('filter by start_date only returns classes from that day onwards', async ({
    client,
    assert,
  }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: TOMORROW.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    const response = await client
      .get(URL)
      .qs({ start_date: NEXT_WEEK.toFormat('yyyy-MM-dd') })
      .loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 1)
  })

  test('filter by level returns classes in range and classes without range', async ({
    client,
    assert,
  }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: 5,
      levelMax: 7,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: 1,
      levelMax: 4,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      levelMin: null,
      levelMax: null,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    const response = await client.get(URL).qs({ level: 6 }).loginAs(player)

    response.assertStatus(200)
    const data = (response.body() as any).data
    assert.lengthOf(data, 2)
  })

  test('filter by location is case-insensitive partial match', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      location: 'Court Boulogne',
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      location: 'Court Vincennes',
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    const response = await client.get(URL).qs({ location: 'boulogne' }).loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 1)
  })

  test('filter available=true excludes full classes', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player1 = await UserFactory.merge({ role: 'player' }).create()
    const player2 = await UserFactory.merge({ role: 'player' }).create()

    const fullClass = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      maxPlayers: 1,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      maxPlayers: 4,
      scheduledAt: NEXT_WEEK.toISO(),
    } as any).create()

    await client.post(`/api/v1/classes/${fullClass.id}/join`).loginAs(player1)

    const response = await client.get(URL).qs({ available: true }).loginAs(player2)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 1)
  })

  test('filters can be combined', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      location: 'Court Paris',
      levelMin: 5,
      levelMax: 8,
      scheduledAt: TOMORROW.toISO(),
    } as any).create()

    await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      location: 'Court Lyon',
      levelMin: 5,
      levelMax: 8,
      scheduledAt: TOMORROW.toISO(),
    } as any).create()

    const response = await client
      .get(URL)
      .qs({
        location: 'paris',
        level: 6,
        start_date: TOMORROW.toFormat('yyyy-MM-dd'),
        end_date: TOMORROW.toFormat('yyyy-MM-dd'),
      })
      .loginAs(player)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 1)
  })

  test('returns 422 for invalid start_date format', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.get(URL).qs({ start_date: 'not-a-date' }).loginAs(player)
    response.assertStatus(422)
  })

  test('returns 422 for invalid end_date format', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.get(URL).qs({ end_date: 'not-a-date' }).loginAs(player)
    response.assertStatus(422)
  })

  test('returns 422 for level out of range', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client.get(URL).qs({ level: 11 }).loginAs(player)
    response.assertStatus(422)
  })
})
