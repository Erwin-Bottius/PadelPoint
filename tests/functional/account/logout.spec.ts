import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const LOGOUT_URL = '/api/v1/account/logout'

test.group('POST /api/v1/account/logout', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate(); await cleanup()
  })

  test('returns 204 when authenticated', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post(LOGOUT_URL).loginAs(user)
    response.assertStatus(204)
  })

  test('returns 401 when no token is provided', async ({ client }) => {
    const response = await client.post(LOGOUT_URL)
    response.assertStatus(401)
  })
})