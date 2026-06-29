import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import ClassMessage from '#models/class_message'
import testUtils from '@adonisjs/core/services/test_utils'

const URL = '/api/v1/account/chats'
const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!

test.group('GET /api/v1/account/chats', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('teacher sees their classes that have messages', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classWithMsg = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()
    const classWithoutMsg = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.create({ classId: classWithMsg.id, userId: teacher.id, content: 'Hello' })

    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    const ids = response.body().data.map((c: any) => c.id)
    assert.include(ids, classWithMsg.id)
    assert.notInclude(ids, classWithoutMsg.id)
  })

  test('teacher does not see other teachers classes', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const otherTeacher = await UserFactory.merge({ role: 'teacher' }).create()
    const otherClass = await ClassFactory.merge({
      teacherId: otherTeacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.create({
      classId: otherClass.id,
      userId: otherTeacher.id,
      content: 'Hello',
    })

    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    const ids = response.body().data.map((c: any) => c.id)
    assert.notInclude(ids, otherClass.id)
  })

  test('player sees enrolled classes that have messages', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const player = await UserFactory.merge({ role: 'player' }).create()

    const enrolledWithMsg = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()
    const enrolledWithoutMsg = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()
    const notEnrolledWithMsg = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await enrolledWithMsg.related('players').attach([player.id])
    await enrolledWithoutMsg.related('players').attach([player.id])

    await ClassMessage.create({
      classId: enrolledWithMsg.id,
      userId: teacher.id,
      content: 'Hello',
    })
    await ClassMessage.create({
      classId: notEnrolledWithMsg.id,
      userId: teacher.id,
      content: 'Hello',
    })

    const response = await client.get(URL).loginAs(player)

    response.assertStatus(200)
    const ids = response.body().data.map((c: any) => c.id)
    assert.include(ids, enrolledWithMsg.id)
    assert.notInclude(ids, enrolledWithoutMsg.id)
    assert.notInclude(ids, notEnrolledWithMsg.id)
  })

  test('returns empty array when no chats with messages', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()

    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    assert.deepEqual(response.body().data, [])
  })

  test('response includes teacher and players in each class', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.create({ classId: classInstance.id, userId: teacher.id, content: 'Hi' })

    const response = await client.get(URL).loginAs(teacher)

    response.assertStatus(200)
    const c = response.body().data[0]
    assert.property(c, 'teacher')
    assert.property(c, 'players')
  })

  test('returns 401 when unauthenticated', async ({ client }) => {
    const response = await client.get(URL)
    response.assertStatus(401)
  })
})
