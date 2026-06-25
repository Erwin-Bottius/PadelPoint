import env from '#start/env'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(env.get('JWT_SECRET'))
const EXPIRY = '7d'

export default class JwtService {
  static async sign(userId: string): Promise<string> {
    return new SignJWT()
      .setSubject(userId)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(EXPIRY)
      .sign(secret)
  }

  static async verify(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, secret)
    if (!payload.sub) throw new Error('Missing sub in JWT payload')
    return payload.sub
  }
}
