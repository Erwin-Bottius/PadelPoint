import vine from '@vinejs/vine'

const classItem = vine.object({
  name: vine.string().trim().minLength(1).maxLength(100),
  scheduledAt: vine.date({ formats: ['iso8601'] }),
  duration: vine.number().min(15).max(480),
  location: vine.string().trim().minLength(1).maxLength(255),
  level: vine.number().min(1).max(10).optional(),
  club: vine.string().trim().maxLength(100).optional(),
  maxPlayers: vine.number().min(1).max(20).optional(),
})

export const createClassesValidator = vine.compile(
  vine.object({
    classes: vine.array(classItem).minLength(1).maxLength(50),
  })
)

export const updateClassValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100).optional(),
    scheduledAt: vine.date({ formats: ['iso8601'] }).optional(),
    duration: vine.number().min(15).max(480).optional(),
    location: vine.string().trim().maxLength(255).optional(),
    level: vine.number().min(1).max(10).optional(),
    club: vine.string().trim().maxLength(100).optional(),
    maxPlayers: vine.number().min(1).max(20).optional(),
    isPublished: vine.boolean().optional(),
  })
)
