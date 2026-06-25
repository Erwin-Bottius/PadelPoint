import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('classes', (table) => {
      table.index(['is_published', 'scheduled_at'], 'classes_is_published_scheduled_at_idx')
      table.index(['teacher_id'], 'classes_teacher_id_idx')
      table.index(['scheduled_at'], 'classes_scheduled_at_idx')
    })

    this.schema.table('class_participants', (table) => {
      table.index(['class_id'], 'class_participants_class_id_idx')
    })
  }

  async down() {
    this.schema.table('classes', (table) => {
      table.dropIndex([], 'classes_is_published_scheduled_at_idx')
      table.dropIndex([], 'classes_teacher_id_idx')
      table.dropIndex([], 'classes_scheduled_at_idx')
    })

    this.schema.table('class_participants', (table) => {
      table.dropIndex([], 'class_participants_class_id_idx')
    })
  }
}
