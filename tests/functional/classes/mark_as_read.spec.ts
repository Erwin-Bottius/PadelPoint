import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { UserFactory } from '#database/factories/user_factory'
import { ClassFactory } from '#database/factories/class_factory'
import ClassMessage from '#models/class_message'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

const FUTURE = DateTime.now().plus({ days: 7 }).toISO()!

test.group('GET /api/v1/account/chats — unreadCount', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    await cleanup()
  })

  test('unreadCount is total messages when never read', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.createMany([
      { classId: classInstance.id, userId: teacher.id, content: 'msg 1' },
      { classId: classInstance.id, userId: teacher.id, content: 'msg 2' },
      { classId: classInstance.id, userId: teacher.id, content: 'msg 3' },
    ])

    const response = await client.get('/api/v1/account/chats').loginAs(teacher)

    response.assertStatus(200)
    assert.equal(response.body().data[0].unreadCount, 3)
  })

  test('unreadCount is 0 after chat_reads row is set to now', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.create({ classId: classInstance.id, userId: teacher.id, content: 'msg' })

    await db.rawQuery(
      `INSERT INTO chat_reads (user_id, class_id, last_read_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id, class_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
      [teacher.id, classInstance.id, DateTime.now().toISO()]
    )

    const response = await client.get('/api/v1/account/chats').loginAs(teacher)

    response.assertStatus(200)
    assert.equal(response.body().data[0].unreadCount, 0)
  })

  test('unreadCount counts only messages after last read', async ({ client, assert }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    const classInstance = await ClassFactory.merge({
      teacherId: teacher.id,
      isPublished: true,
      scheduledAt: FUTURE,
    } as any).create()

    await ClassMessage.create({ classId: classInstance.id, userId: teacher.id, content: 'old' })

    await db.rawQuery(
      `INSERT INTO chat_reads (user_id, class_id, last_read_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id, class_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
      [teacher.id, classInstance.id, DateTime.now().toISO()]
    )

    await ClassMessage.createMany([
      { classId: classInstance.id, userId: teacher.id, content: 'new 1' },
      { classId: classInstance.id, userId: teacher.id, content: 'new 2' },
    ])

    const response = await client.get('/api/v1/account/chats').loginAs(teacher)

    response.assertStatus(200)
    assert.equal(response.body().data[0].unreadCount, 2)
  })
})
