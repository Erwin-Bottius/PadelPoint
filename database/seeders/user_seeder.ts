import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      {
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'teacher@test.com',
        password: 'password',
        role: 'teacher',
        level: 8,
        club: 'Padel Club Paris',
      },
      {
        firstName: 'Bob',
        lastName: 'Dupont',
        email: 'player@test.com',
        password: 'password',
        role: 'player',
        level: 4,
      },
    ])
  }
}
