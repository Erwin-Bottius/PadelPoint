import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('class_messages', (table) => {
      table.string('type', 20).notNullable().defaultTo('user')
    })
  }

  async down() {
    this.schema.alterTable('class_messages', (table) => {
      table.dropColumn('type')
    })
  }
}
