import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'classes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('level')
      table.decimal('level_min', 4, 1).nullable()
      table.decimal('level_max', 4, 1).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('level_min')
      table.dropColumn('level_max')
      table.integer('level').nullable()
    })
  }
}