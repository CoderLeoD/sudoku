export const DATABASE_NAME = 'sudoku-local-database'
export const DATABASE_VERSION = 1

const USERS_STORE = 'users'
const GAME_RECORDS_STORE = 'gameRecords'

let databasePromise

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('当前环境不支持本地数据库'))
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(USERS_STORE)) {
        const users = database.createObjectStore(USERS_STORE, { keyPath: 'id' })
        users.createIndex('email', 'email', { unique: true })
        users.createIndex('createdAt', 'createdAt')
      }

      if (!database.objectStoreNames.contains(GAME_RECORDS_STORE)) {
        const records = database.createObjectStore(GAME_RECORDS_STORE, { keyPath: 'id' })
        records.createIndex('userId', 'userId')
        records.createIndex('createdAt', 'createdAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      databasePromise = undefined
      reject(request.error)
    }
    request.onblocked = () => {
      databasePromise = undefined
      reject(new Error('本地数据库正在被其他窗口占用，请关闭其他窗口后重试'))
    }
  })

  return databasePromise
}

async function getFromStore(storeName, key) {
  const database = await openDatabase()
  const transaction = database.transaction(storeName, 'readonly')
  return requestResult(transaction.objectStore(storeName).get(key))
}

async function getUserByEmail(email) {
  const database = await openDatabase()
  const transaction = database.transaction(USERS_STORE, 'readonly')
  return requestResult(transaction.objectStore(USERS_STORE).index('email').get(email))
}

async function addUser(user) {
  const database = await openDatabase()
  const transaction = database.transaction(USERS_STORE, 'readwrite')
  transaction.objectStore(USERS_STORE).add(user)
  await transactionComplete(transaction)
  return user
}

async function migrateUsers(users) {
  if (!Array.isArray(users) || users.length === 0) return

  const database = await openDatabase()
  const readTransaction = database.transaction(USERS_STORE, 'readonly')
  const existingUsers = await requestResult(readTransaction.objectStore(USERS_STORE).getAll())
  const ids = new Set(existingUsers.map((user) => user.id))
  const emails = new Set(existingUsers.map((user) => user.email))
  const usersToMigrate = users.filter((user) => (
    user?.id && user?.email && user?.passwordHash && user?.salt
    && !ids.has(user.id) && !emails.has(user.email)
  ))

  if (usersToMigrate.length === 0) return
  const writeTransaction = database.transaction(USERS_STORE, 'readwrite')
  const store = writeTransaction.objectStore(USERS_STORE)
  usersToMigrate.forEach((user) => store.add(user))
  await transactionComplete(writeTransaction)
}

async function addGameRecord(record) {
  const database = await openDatabase()
  const transaction = database.transaction(GAME_RECORDS_STORE, 'readwrite')
  transaction.objectStore(GAME_RECORDS_STORE).add(record)
  await transactionComplete(transaction)
  return record
}

async function putGameRecord(record) {
  const database = await openDatabase()
  const transaction = database.transaction(GAME_RECORDS_STORE, 'readwrite')
  transaction.objectStore(GAME_RECORDS_STORE).put(record)
  await transactionComplete(transaction)
  return record
}

async function getGameRecordsByUser(userId) {
  const database = await openDatabase()
  const transaction = database.transaction(GAME_RECORDS_STORE, 'readonly')
  return requestResult(transaction.objectStore(GAME_RECORDS_STORE).index('userId').getAll(userId))
}

export const localDatabase = {
  ready: openDatabase,
  users: {
    getById: (id) => getFromStore(USERS_STORE, id),
    getByEmail: getUserByEmail,
    add: addUser,
    migrate: migrateUsers,
  },
  gameRecords: {
    add: addGameRecord,
    put: putGameRecord,
    getById: (id) => getFromStore(GAME_RECORDS_STORE, id),
    getByUser: getGameRecordsByUser,
  },
}
