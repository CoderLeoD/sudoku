import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  return { salt, hash: Buffer.from(derivedKey).toString('base64url') }
}

export async function verifyPassword(password, salt, expectedHash) {
  const derivedKey = Buffer.from(await scrypt(password, salt, KEY_LENGTH))
  const expected = Buffer.from(expectedHash, 'base64url')
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected)
}
