import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'class_participants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('joined_at').defaultTo(this.now()).notNullable()
      table.primary(['class_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
