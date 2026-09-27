function toUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createUserRepository(database) {
  const findByIdStatement = database.prepare('SELECT * FROM users WHERE id = ?')
  const findByEmailStatement = database.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
  const createStatement = database.prepare(`
    INSERT INTO users (id, name, email, password_hash, password_salt, created_at, updated_at)
    VALUES (@id, @name, @email, @passwordHash, @passwordSalt, @createdAt, @updatedAt)
  `)

  return {
    findById(id) {
      return toUser(findByIdStatement.get(id))
    },

    findByEmail(email) {
      return toUser(findByEmailStatement.get(email))
    },

    create(user) {
      createStatement.run(user)
      return user
    },
  }
}
