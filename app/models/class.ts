import { ClassSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import ClassMessage from '#models/class_message'

export default class Class extends ClassSchema {
  @belongsTo(() => User, { foreignKey: 'teacherId' })
  declare teacher: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'class_participants',
    pivotForeignKey: 'class_id',
    pivotRelatedForeignKey: 'user_id',
    pivotTimestamps: { createdAt: 'joined_at', updatedAt: false },
  })
  declare players: ManyToMany<typeof User>

  @hasMany(() => ClassMessage, { foreignKey: 'classId' })
  declare messages: HasMany<typeof ClassMessage>
}
