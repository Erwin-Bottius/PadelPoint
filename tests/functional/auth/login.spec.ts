import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const LOGIN_URL = '/api/v1/auth/login'

test.group('POST /api/v1/auth/login', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('returns a JWT token on valid credentials', async ({ client, assert }) => {
    await UserFactory.merge({ email: 'test@example.com', password: 'password123' }).create()

    const response = await client.post(LOGIN_URL).json({
      email: 'test@example.com',
      password: 'password123',
    })

    response.assertStatus(200)
    assert.isString(response.body().data.token)
    assert.equal(response.body().data.user.email, 'test@example.com')
    assert.notProperty(response.body().data.user, 'password')
  })

  test('returns 400 on wrong password', async ({ client }) => {
    const response = await client.post(LOGIN_URL).json({
      email: 'test@example.com',
      password: 'wrongpassword',
    })

    response.assertStatus(400)
  })

  test('returns 400 when user does not exist', async ({ client }) => {
    const response = await client.post(LOGIN_URL).json({
      email: 'nobody@example.com',
      password: 'password123',
    })

    response.assertStatus(400)
  })

  test('returns 422 when email is missing', async ({ client }) => {
    const response = await client.post(LOGIN_URL).json({ password: 'password123' } as any)
    response.assertStatus(422)
  })

  test('returns 422 when password is missing', async ({ client }) => {
    const response = await client.post(LOGIN_URL).json({ email: 'test@example.com' } as any)
    response.assertStatus(422)
  })
})
