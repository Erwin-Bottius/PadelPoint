/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  classes: {
    classes: {
      index: typeof routes['classes.classes.index']
      show: typeof routes['classes.classes.show']
      players: typeof routes['classes.classes.players']
      join: typeof routes['classes.classes.join']
      leave: typeof routes['classes.classes.leave']
      store: typeof routes['classes.classes.store']
      update: typeof routes['classes.classes.update']
      destroy: typeof routes['classes.classes.destroy']
    }
  }
}
