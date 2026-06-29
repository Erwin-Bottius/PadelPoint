import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.save_push_token': { paramsTuple?: []; params?: {} }
    'profile.messages.chats': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'classes.classes.index': { paramsTuple?: []; params?: {} }
    'classes.classes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.store': { paramsTuple?: []; params?: {} }
    'classes.classes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.uncancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.messages.chats': { paramsTuple?: []; params?: {} }
    'classes.classes.index': { paramsTuple?: []; params?: {} }
    'classes.classes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.messages.chats': { paramsTuple?: []; params?: {} }
    'classes.classes.index': { paramsTuple?: []; params?: {} }
    'classes.classes.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.save_push_token': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'classes.classes.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.store': { paramsTuple?: []; params?: {} }
    'classes.classes.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'classes.classes.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'classes.classes.uncancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'classes.classes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}