import { randomUUID } from 'node:crypto'
import { ApiError } from '../lib/ApiError.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { createSessionToken, hashSessionToken } from '../lib/sessionToken.js'
import { normalizeEmail, validateEmail, validateName, validatePassword } from '../validation/authValidation.js'

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }
}

export function createAuthService({ accounts, users, sessions, sessionTtlDays }) {
  function buildSession(userId) {
    const token = createSessionToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + sessionTtlDays * 86_400_000).toISOString()
    const session = {
      id: randomUUID(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      createdAt: now.toISOString(),
    }
    return { token, expiresAt, session }
  }

  return {
    async register(input) {
      const name = validateName(input?.name)
      const email = normalizeEmail(input?.email)
      const password = validatePassword(input?.password)
      validateEmail(email)

      if (await users.findByEmail(email)) throw new ApiError(409, 'EMAIL_EXISTS', '这个邮箱已经注册过了')

      const passwordData = await hashPassword(password)
      const now = new Date().toISOString()
      const user = {
        id: randomUUID(),
        name,
        email,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        createdAt: now,
        updatedAt: now,
      }

      try {
        const { token, expiresAt, session } = buildSession(user.id)
        await accounts.createUserWithSession(user, session)
        return { user: publicUser(user), token, expiresAt }
      } catch (error) {
        if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'ER_DUP_ENTRY') {
          throw new ApiError(409, 'EMAIL_EXISTS', '这个邮箱已经注册过了')
        }
        throw error
      }
    },

    async login(input) {
      const email = normalizeEmail(input?.email)
      const password = validatePassword(input?.password)
      validateEmail(email)

      const user = await users.findByEmail(email)
      const validPassword = user
        ? await verifyPassword(password, user.passwordSalt, user.passwordHash)
        : false
      if (!user || !validPassword) throw new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码不正确')

      const { token, expiresAt, session } = buildSession(user.id)
      await sessions.create(session)
      return { user: publicUser(user), token, expiresAt }
    },

    async logout(token) {
      await sessions.deleteByTokenHash(hashSessionToken(token))
    },
  }
}
