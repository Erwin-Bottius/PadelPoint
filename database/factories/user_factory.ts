import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: 'password',
      role: faker.helpers.arrayElement(['teacher', 'player'] as const),
      level: faker.number.int({ min: 1, max: 10 }),
      location: faker.location.city(),
      club: faker.company.name(),
    }
  })
  .build()
