import factory from '@adonisjs/lucid/factories'
import Class from '#models/class'
import { UserFactory } from '#database/factories/user_factory'

export const ClassFactory = factory
  .define(Class, async ({ faker }) => {
    const teacher = await UserFactory.merge({ role: 'teacher' }).create()
    return {
      teacherId: teacher.id,
      name: faker.lorem.words(3),
      duration: faker.helpers.arrayElement([60, 90, 120]),
      location: faker.location.streetAddress(),
      levelMin: null,
      levelMax: null,
      maxPlayers: 4,
      isPublished: false,
    } as any // scheduledAt defaults to now() in DB; override with .merge() when needed
  })
  .build()