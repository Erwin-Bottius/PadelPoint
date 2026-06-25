import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = '/api/v1/classes'

const validClass = {
  name: 'Cours débutant',
  scheduledAt: '2026-12-01T10:00:00.000Z',
  duration: 60,
  location: 'Court 1, Padel Club Paris',
}

test.group('POST /api/v1/classes', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher can create a single class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [validClass] })
      .loginAs(teacher)
    console.log('Response body:', response)
    response.assertStatus(200)
    const data = (response.body() as any).data
    assert.lengthOf(data, 1)
    assert.equal(data[0].name, 'Cours débutant')
    assert.equal(data[0].duration, 60)
    assert.exists(data[0].scheduledAt)
  })

  test('teacher can bulk create multiple classes in one request', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({
        classes: [
          {
            name: 'Lundi matin',
            scheduledAt: '2026-12-01T09:00:00.000Z',
            duration: 60,
            location: 'Court 1',
          },
          {
            name: 'Lundi soir',
            scheduledAt: '2026-12-01T18:00:00.000Z',
            duration: 90,
            location: 'Court 2',
          },
          {
            name: 'Mercredi midi',
            scheduledAt: '2026-12-03T12:00:00.000Z',
            duration: 60,
            location: 'Court 3',
          },
        ],
      })
      .loginAs(teacher)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 3)
  })

  test('created classes are ordered by scheduledAt', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({
        classes: [
          {
            name: 'Cours C',
            scheduledAt: '2026-12-03T10:00:00.000Z',
            duration: 60,
            location: 'Court 1',
          },
          {
            name: 'Cours A',
            scheduledAt: '2026-12-01T10:00:00.000Z',
            duration: 60,
            location: 'Court 1',
          },
          {
            name: 'Cours B',
            scheduledAt: '2026-12-02T10:00:00.000Z',
            duration: 60,
            location: 'Court 1',
          },
        ],
      })
      .loginAs(teacher)

    response.assertStatus(200)
    const names = (response.body() as any).data.map((c: any) => c.name)
    assert.deepEqual(names, ['Cours A', 'Cours B', 'Cours C'])
  })

  test('teacher can create up to 50 classes at once', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classes = Array.from({ length: 50 }, (_, i) => ({
      ...validClass,
      name: `Cours ${i + 1}`,
    }))

    const response = await client.post(URL).json({ classes }).loginAs(teacher)

    response.assertStatus(200)
    assert.lengthOf((response.body() as any).data, 50)
  })

  test('player cannot create a class', async ({ client }) => {
    const player = await UserFactory.merge({ role: 'player' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [validClass] })
      .loginAs(player)
    response.assertStatus(403)
  })

  test('unauthenticated request returns 401', async ({ client }) => {
    const response = await client.post(URL).json({ classes: [validClass] })
    response.assertStatus(401)
  })

  test('returns 422 when classes array is empty', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client.post(URL).json({ classes: [] }).loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when more than 50 classes are sent', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classes = Array.from({ length: 51 }, (_, i) => ({ ...validClass, name: `Cours ${i}` }))
    const response = await client.post(URL).json({ classes }).loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when name is missing', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const { name: _n, ...withoutName } = validClass
    const response = await client
      .post(URL)
      .json({ classes: [withoutName] } as any)
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when scheduledAt is missing', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const { scheduledAt: _s, ...withoutDate } = validClass
    const response = await client
      .post(URL)
      .json({ classes: [withoutDate] } as any)
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when scheduledAt is not a valid date', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [{ ...validClass, scheduledAt: 'not-a-date' }] })
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when duration is missing', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const { duration: _d, ...withoutDuration } = validClass
    const response = await client
      .post(URL)
      .json({ classes: [withoutDuration] } as any)
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when duration is below minimum (15 min)', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [{ ...validClass, duration: 10 }] })
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when duration exceeds maximum (480 min)', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [{ ...validClass, duration: 500 }] })
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when location is missing', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const { location: _l, ...withoutLocation } = validClass
    const response = await client
      .post(URL)
      .json({ classes: [withoutLocation] } as any)
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when level is out of range (> 10)', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [{ ...validClass, level: 11 }] })
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('returns 422 when level is below minimum (< 1)', async ({ client }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({ classes: [{ ...validClass, level: 0 }] })
      .loginAs(teacher)
    response.assertStatus(422)
  })

  test('optional fields are accepted correctly', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const response = await client
      .post(URL)
      .json({
        classes: [
          {
            ...validClass,
            level: 7,
            club: 'Padel Club Paris',
            maxPlayers: 6,
          },
        ],
      })
      .loginAs(teacher)

    response.assertStatus(200)
    const created = (response.body() as any).data[0]
    assert.equal(created.level, 7)
    assert.equal(created.club, 'Padel Club Paris')
    assert.equal(created.maxPlayers, 6)
  })
})
