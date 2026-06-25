import { test } from '@japa/runner'
import JwtService from '#services/jwt_service'

test.group('JwtService', () => {
  test('sign() returns a three-part JWT string', async ({ assert }) => {
    const token = await JwtService.sign('some-uuid')
    assert.isString(token)
    assert.equal(token.split('.').length, 3)
  })

  test('verify() returns the userId embedded in the token', async ({ assert }) => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'
    const token = await JwtService.sign(userId)
    const result = await JwtService.verify(token)
    assert.equal(result, userId)
  })

  test('verify() throws on a completely invalid token', async ({ assert }) => {
    await assert.rejects(() => JwtService.verify('not.a.token'))
  })

  test('verify() throws on a tampered token', async ({ assert }) => {
    const token = await JwtService.sign('user-id')
    const tampered = token.slice(0, -6) + 'xxxxxx'
    await assert.rejects(() => JwtService.verify(tampered))
  })
})
