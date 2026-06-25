import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

const SIGNUP_URL = '/api/v1/auth/signup'

const validPayload = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'password123',
  passwordConfirmation: 'password123',
  role: 'player' as const,
}

test.group('POST /api/v1/auth/signup', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('creates a user and returns a JWT token', async ({ client, assert }) => {
    const response = await client.post(SIGNUP_URL).json(validPayload)

    response.assertStatus(200)
    assert.isString(response.body().data.token)
    assert.equal(response.body().data.user.email, validPayload.email)
    assert.equal(response.body().data.user.role, 'player')
    assert.notProperty(response.body().data.user, 'password')
  })

  test('returns 422 when email is already taken', async ({ client }) => {
    await client.post(SIGNUP_URL).json(validPayload)
    const response = await client.post(SIGNUP_URL).json(validPayload)
    response.assertStatus(422)
  })

  test('returns 422 when required fields are missing', async ({ client }) => {
    const response = await client.post(SIGNUP_URL).json({ email: 'test@example.com' } as any)
    response.assertStatus(422)
  })

  test('returns 422 when role is invalid', async ({ client }) => {
    const response = await client.post(SIGNUP_URL).json({ ...validPayload, role: 'admin' } as any)
    response.assertStatus(422)
  })

  test('returns 422 when level is out of range', async ({ client }) => {
    const response = await client.post(SIGNUP_URL).json({ ...validPayload, level: 11 })
    response.assertStatus(422)
  })

  test('returns 422 when password confirmation does not match', async ({ client }) => {
    const response = await client
      .post(SIGNUP_URL)
      .json({ ...validPayload, passwordConfirmation: 'different' })
    response.assertStatus(422)
  })

  test('returns 422 when password is too short', async ({ client }) => {
    const response = await client
      .post(SIGNUP_URL)
      .json({ ...validPayload, password: '123', passwordConfirmation: '123' })
    response.assertStatus(422)
  })
})
