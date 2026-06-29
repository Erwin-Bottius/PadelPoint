import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('chat_reads', (table) => {
      table.string('user_id').notNullable()
      table.string('class_id').notNullable()
      table.timestamp('last_read_at', { useTz: true }).notNullable()
      table.primary(['user_id', 'class_id'])
    })
  }

  async down() {
    this.schema.dropTable('chat_reads')
  }
}
