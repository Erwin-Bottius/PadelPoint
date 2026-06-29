import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

// Composite PK (user_id, class_id) — no auto-increment id column.
// Use db.rawQuery with ON CONFLICT for upserts; ChatRead.updateOrCreate will fail.
export default class ChatRead extends BaseModel {
  static table = 'chat_reads'

  @column()
  declare userId: string

  @column()
  declare classId: string

  @column.dateTime()
  declare lastReadAt: DateTime
}
