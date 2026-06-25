/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Classes, 'index'])
        router.get('/:id', [controllers.Classes, 'show'])
        router.get('/:id/players', [controllers.Classes, 'players'])
        router.post('/:id/join', [controllers.Classes, 'join'])
        router.delete('/:id/join', [controllers.Classes, 'leave'])
        router
          .group(() => {
            router.post('/', [controllers.Classes, 'store'])
            router.put('/:id', [controllers.Classes, 'update'])
            router.delete('/:id', [controllers.Classes, 'destroy'])
          })
          .use(middleware.requireTeacher())
      })
      .prefix('classes')
      .as('classes')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
