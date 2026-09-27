import { localDatabase } from '../data/localDatabase.js'

const LEGACY_ACCOUNTS_KEY = 'sudoku-auth-accounts-v1'
export const AUTH_SESSION_KEY = 'sudoku-auth-session-v1'

const encoder = new TextEncoder()
let migrationPromise

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

async function ensureDatabaseReady() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      await localDatabase.ready()
      const legacyAccounts = readJson(LEGACY_ACCOUNTS_KEY, [])
      if (Array.isArray(legacyAccounts) && legacyAccounts.length > 0) {
        await localDatabase.users.migrate(legacyAccounts)
        localStorage.removeItem(LEGACY_ACCOUNTS_KEY)
      }
    })()
  }
  return migrationPromise
}

function normalizeEmail(email) {
  return email.trim().toLocaleLowerCase()
}

function bytesToBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function createSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const saltBytes = Uint8Array.from(atob(salt), (character) => character.charCodeAt(0))
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 210_000 },
    key,
    256,
  )
  return bytesToBase64(new Uint8Array(hash))
}

function publicUser(account) {
  if (!account) return null
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    createdAt: account.createdAt,
  }
}

function saveSession(userId) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ userId, signedInAt: new Date().toISOString() }))
}

function validateRegistration({ name, email, password }) {
  if (name.trim().length < 2 || name.trim().length > 24) throw new Error('昵称需要包含 2–24 个字符')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('请输入有效的邮箱地址')
  if (password.length < 8) throw new Error('密码至少需要 8 个字符')
}

export const localAuthService = {
  sessionStorageKey: AUTH_SESSION_KEY,

  async getCurrentUser() {
    await ensureDatabaseReady()
    const session = readJson(AUTH_SESSION_KEY, null)
    if (!session?.userId) return null
    const account = await localDatabase.users.getById(session.userId)
    if (!account) localStorage.removeItem(AUTH_SESSION_KEY)
    return publicUser(account)
  },

  async register(credentials) {
    await ensureDatabaseReady()
    const name = credentials.name.trim()
    const email = normalizeEmail(credentials.email)
    const password = credentials.password
    validateRegistration({ name, email, password })

    const existingAccount = await localDatabase.users.getByEmail(email)
    if (existingAccount) throw new Error('这个邮箱已经注册过了')

    const salt = createSalt()
    const account = {
      id: crypto.randomUUID(),
      name,
      email,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    }

    try {
      await localDatabase.users.add(account)
    } catch (error) {
      if (error?.name === 'ConstraintError') throw new Error('这个邮箱已经注册过了')
      throw error
    }
    saveSession(account.id)
    return publicUser(account)
  },

  async login({ email: rawEmail, password }) {
    await ensureDatabaseReady()
    const email = normalizeEmail(rawEmail)
    const account = await localDatabase.users.getByEmail(email)
    if (!account) throw new Error('邮箱或密码不正确')
    const passwordHash = await hashPassword(password, account.salt)
    if (passwordHash !== account.passwordHash) throw new Error('邮箱或密码不正确')
    saveSession(account.id)
    return publicUser(account)
  },

  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY)
  },
}
