import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = '/api/v1/account/push-token'

test.group('POST /api/v1/account/push-token', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('saves push token for authenticated user', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'

    const response = await client.post(URL).loginAs(user).json({ token })

    response.assertStatus(204)

    await user.refresh()
    assert.equal(user.pushToken, token)
  })

  test('overwrites existing push token', async ({ client, assert }) => {
    const user = await UserFactory.merge({ pushToken: 'ExponentPushToken[old]' } as any).create()

    const response = await client
      .post(URL)
      .loginAs(user)
      .json({ token: 'ExponentPushToken[new]' })

    response.assertStatus(204)

    await user.refresh()
    assert.equal(user.pushToken, 'ExponentPushToken[new]')
  })

  test('returns 422 when token is missing', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post(URL).loginAs(user).json({})
    response.assertStatus(422)
  })

  test('returns 422 when token is empty string', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post(URL).loginAs(user).json({ token: '' })
    response.assertStatus(422)
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.post(URL).json({ token: 'ExponentPushToken[xxx]' })
    response.assertStatus(401)
  })
})
