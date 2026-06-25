import { ClassSchema } from '#database/schema'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

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
}
