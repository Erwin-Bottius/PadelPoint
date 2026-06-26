import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('classes', (table) => {
      table.string('name', 100).nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('classes', (table) => {
      table.string('name', 100).notNullable().alter()
    })
  }
}
