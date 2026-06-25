import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Class from '#models/class'
import User from '#models/user'

export default class ClassMessage extends BaseModel {
  static table = 'class_messages'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare classId: string

  @column()
  declare userId: string

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Class, { foreignKey: 'classId' })
  declare class: BelongsTo<typeof Class>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare author: BelongsTo<typeof User>
}
