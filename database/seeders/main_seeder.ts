import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Class from '#models/class'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

const LOCATIONS = [
  'Court Boulogne',
  'Court Vincennes',
  'Court Paris 15',
  'Court Levallois',
  'Court Neuilly',
  'Court Saint-Cloud',
  'Court Issy',
  'Court Montrouge',
]

const CLUBS = [
  'Padel Club Paris',
  'Pro Padel Academy',
  'Urban Padel',
  'Padel Force',
  'Padel Studio',
]

const CLASS_NAMES = [
  'Cours débutants',
  'Cours intermédiaires',
  'Cours avancés',
  'Entraînement tactique',
  'Cours tous niveaux',
  'Perfectionnement service',
  'Stage intensif',
  'Cours smash & volée',
  'Initiation padel',
  'Cours compétition',
]

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomHour(): number {
  return randomElement([8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20])
}

export default class MainSeeder extends BaseSeeder {
  async run() {
    await db.rawQuery(
      'TRUNCATE TABLE class_participants, class_messages, classes, users RESTART IDENTITY CASCADE'
    )

    // --- Fixed accounts for easy testing ---
    const teacher1 = await User.create({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'teacher@test.com',
      password: 'password',
      role: 'teacher',
      level: 8,
      club: 'Padel Club Paris',
      location: 'Paris',
    })

    const teacher2 = await User.create({
      firstName: 'Marc',
      lastName: 'Leroy',
      email: 'teacher2@test.com',
      password: 'password',
      role: 'teacher',
      level: 9,
      club: 'Pro Padel Academy',
      location: 'Boulogne',
    })

    const player1 = await User.create({
      firstName: 'Bob',
      lastName: 'Dupont',
      email: 'player@test.com',
      password: 'password',
      role: 'player',
      level: 4,
      club: 'Padel Club Paris',
      location: 'Paris',
    })

    // --- Random teachers (4 more) ---
    const teacherData = [
      { firstName: 'Julie', lastName: 'Bernard', level: 7, club: CLUBS[2] },
      { firstName: 'Thomas', lastName: 'Moreau', level: 8, club: CLUBS[3] },
      { firstName: 'Sophie', lastName: 'Petit', level: 9, club: CLUBS[4] },
      { firstName: 'Lucas', lastName: 'Simon', level: 8, club: CLUBS[0] },
    ]

    const teachers: User[] = [teacher1, teacher2]
    for (const t of teacherData) {
      const user = await User.create({
        ...t,
        email: `${t.firstName.toLowerCase()}.${t.lastName.toLowerCase()}@padel.com`,
        password: 'password',
        role: 'teacher',
        location: randomElement(LOCATIONS),
      })
      teachers.push(user)
    }

    // --- Random players (25) ---
    const playerNames = [
      { firstName: 'Emma', lastName: 'Rousseau' },
      { firstName: 'Hugo', lastName: 'Girard' },
      { firstName: 'Léa', lastName: 'Fournier' },
      { firstName: 'Nathan', lastName: 'Dubois' },
      { firstName: 'Chloé', lastName: 'Lambert' },
      { firstName: 'Maxime', lastName: 'Bonnet' },
      { firstName: 'Inès', lastName: 'François' },
      { firstName: 'Antoine', lastName: 'Martinez' },
      { firstName: 'Camille', lastName: 'Lefebvre' },
      { firstName: 'Théo', lastName: 'Garcia' },
      { firstName: 'Manon', lastName: 'Roux' },
      { firstName: 'Raphaël', lastName: 'Mercier' },
      { firstName: 'Lucie', lastName: 'Vincent' },
      { firstName: 'Alexis', lastName: 'Bertrand' },
      { firstName: 'Sarah', lastName: 'Morin' },
      { firstName: 'Nicolas', lastName: 'Thomas' },
      { firstName: 'Pauline', lastName: 'Laurent' },
      { firstName: 'Clément', lastName: 'Leblanc' },
      { firstName: 'Juliette', lastName: 'Guerin' },
      { firstName: 'Romain', lastName: 'Muller' },
      { firstName: 'Anaïs', lastName: 'Fontaine' },
      { firstName: 'Baptiste', lastName: 'Henry' },
      { firstName: 'Laura', lastName: 'Perrin' },
      { firstName: 'Florian', lastName: 'Clement' },
      { firstName: 'Marion', lastName: 'Dupuis' },
    ]

    const players: User[] = [player1]
    for (const p of playerNames) {
      const user = await User.create({
        ...p,
        email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@padel.com`,
        password: 'password',
        role: 'player',
        level: randomBetween(1, 10),
        club: Math.random() > 0.4 ? randomElement(CLUBS) : null,
        location: randomElement(['Paris', 'Boulogne', 'Levallois', 'Neuilly', 'Issy']),
      })
      players.push(user)
    }

    // --- Classes June/July 2026 ---
    const classes: Class[] = []

    // Generate ~60 classes spread across June and July
    const classSlots: { date: DateTime; teacherIndex: number }[] = []

    // June 2026: days 1–30
    for (let day = 1; day <= 30; day++) {
      const date = DateTime.utc(2026, 6, day)
      // 1–3 classes per day
      const count = randomBetween(1, 3)
      for (let i = 0; i < count; i++) {
        classSlots.push({ date, teacherIndex: randomBetween(0, teachers.length - 1) })
      }
    }

    // July 2026: days 1–31
    for (let day = 1; day <= 31; day++) {
      const date = DateTime.utc(2026, 7, day)
      const count = randomBetween(1, 3)
      for (let i = 0; i < count; i++) {
        classSlots.push({ date, teacherIndex: randomBetween(0, teachers.length - 1) })
      }
    }

    // Level range bases: 1, 1.5, 2, 2.5, ... up to 9 (max = base + 1, so max reaches 10)
    const levelBases = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

    for (const slot of classSlots) {
      const hour = randomHour()
      const scheduledAt = slot.date.set({ hour, minute: 0, second: 0, millisecond: 0 })

      // 75% of classes have a level range, 25% are open to all
      const hasLevelRange = Math.random() > 0.25
      const levelMin = hasLevelRange ? randomElement(levelBases) : null
      const levelMax = levelMin !== null ? levelMin + 1 : null

      const maxPlayers = randomElement([2, 3, 4])
      const isPublished = Math.random() > 0.2
      const isCancelled = isPublished && Math.random() < 0.08

      // 80% of classes have no custom name → auto-generate like the service does
      const hasCustomName = Math.random() < 0.2
      const autoName =
        levelMin !== null && levelMax !== null
          ? `Cours niv. ${levelMin} - ${levelMax}`
          : 'Cours tous niveaux'
      const name = hasCustomName ? randomElement(CLASS_NAMES) : autoName

      const classInstance = await Class.create({
        teacherId: teachers[slot.teacherIndex].id,
        name,
        scheduledAt: scheduledAt.toISO() as any,
        duration: randomElement([60, 90, 120]),
        location: randomElement(LOCATIONS),
        levelMin,
        levelMax,
        club: randomElement(CLUBS),
        maxPlayers,
        isPublished,
        isCancelled,
      })

      classes.push(classInstance)

      // Add participants to published, non-cancelled classes
      if (isPublished && !isCancelled) {
        const spotsToFill = randomBetween(0, maxPlayers)
        if (spotsToFill > 0) {
          const shuffled = [...players].sort(() => Math.random() - 0.5)
          const eligible = shuffled.filter((p) => {
            if (levelMin === null || levelMax === null) return true
            return p.level !== null && p.level >= levelMin && p.level <= levelMax
          })
          const toEnroll = eligible.slice(0, spotsToFill)
          for (const player of toEnroll) {
            await classInstance.related('players').attach({
              [player.id]: { joined_at: DateTime.utc().toISO() },
            })
          }
        }
      }
    }

    console.log(`✓ ${teachers.length} teachers`)
    console.log(`✓ ${players.length} players`)
    console.log(`✓ ${classes.length} classes created`)
    console.log(`  - published: ${classes.filter((c) => c.isPublished).length}`)
    console.log(`  - cancelled: ${classes.filter((c) => c.isCancelled).length}`)
    console.log(`  - unpublished: ${classes.filter((c) => !c.isPublished).length}`)
    console.log('\nComptes de test:')
    console.log('  teacher@test.com / password')
    console.log('  teacher2@test.com / password')
    console.log('  player@test.com / password')
  }
}
