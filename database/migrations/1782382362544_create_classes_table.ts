import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'classes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('level').checkBetween([1, 10]).notNullable()
      table.string('location').nullable()
      table.string('club').nullable()
      table.integer('duration').notNullable()
      table.integer('max_players').defaultTo(4).notNullable()
      table.boolean('is_published').defaultTo(false).notNullable()
      table.timestamp('created_at').defaultTo(this.now()).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
