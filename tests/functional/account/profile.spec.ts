import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const PROFILE_URL = '/api/v1/account/profile'

test.group('GET /api/v1/account/profile', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate(); await cleanup()
  })

  test('returns the authenticated user profile', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await client.get(PROFILE_URL).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.email, user.email)
    assert.notProperty(response.body().data, 'password')
  })

  test('returns 401 when no Authorization header is provided', async ({ client }) => {
    const response = await client.get(PROFILE_URL)
    response.assertStatus(401)
  })

  test('returns 401 when token is invalid', async ({ client }) => {
    const response = await client
      .get(PROFILE_URL)
      .header('Authorization', 'Bearer invalid.token.here')
    response.assertStatus(401)
  })

  test('returns 401 when Authorization header has wrong format', async ({ client }) => {
    const response = await client.get(PROFILE_URL).header('Authorization', 'Token abc123')
    response.assertStatus(401)
  })
})