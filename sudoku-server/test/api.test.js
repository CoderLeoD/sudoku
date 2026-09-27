import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createSqliteStorage } from '../src/database/createSqliteStorage.js'

let app
let storage

before(() => {
  storage = createSqliteStorage(':memory:')
  app = createApp({
    storage,
    corsOrigins: ['http://localhost:5173'],
    sessionTtlDays: 30,
  })
})

after(async () => {
  await storage.close()
})

test('health check responds without authentication', async () => {
  const response = await request(app).get('/api/health').expect(200)
  assert.equal(response.body.data.status, 'ok')
  assert.equal(response.body.data.service, 'sudoku-server')
  assert.equal(response.body.data.database, 'sqlite')
})

test('reserved MySQL adapter can be loaded without opening a connection', async () => {
  const module = await import('../src/database/mysql/createMysqlStorage.js')
  assert.equal(typeof module.createMysqlStorage, 'function')
})

test('register, authenticate, record a game, read stats and logout', async () => {
  const registration = await request(app)
    .post('/api/auth/register')
    .send({ name: '测试玩家', email: 'player@example.com', password: 'Sudoku-Test-2026!' })
    .expect(201)

  const token = registration.body.data.token
  assert.ok(token)
  assert.equal(registration.body.data.user.email, 'player@example.com')
  assert.equal(registration.body.data.user.passwordHash, undefined)

  await request(app)
    .post('/api/auth/register')
    .send({ name: '另一个玩家', email: 'PLAYER@example.com', password: 'Another-Test-2026!' })
    .expect(409)

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  assert.equal(me.body.data.user.name, '测试玩家')

  await request(app)
    .post('/api/auth/login')
    .send({ email: 'player@example.com', password: 'wrong-password' })
    .expect(401)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'PLAYER@example.com', password: 'Sudoku-Test-2026!' })
    .expect(200)
  assert.ok(login.body.data.token)

  await request(app)
    .post('/api/games')
    .send({ difficulty: 'medium' })
    .expect(401)

  const created = await request(app)
    .post('/api/games')
    .set('Authorization', `Bearer ${token}`)
    .send({
      puzzleId: 'medium-001',
      difficulty: 'medium',
      status: 'in_progress',
      elapsedSeconds: 90,
      mistakes: 1,
      hintsUsed: 0,
      state: { board: [[1, 2, 3]], notes: [] },
    })
    .expect(201)

  const gameId = created.body.data.record.id
  assert.equal(created.body.data.record.state.board[0][1], 2)

  const completed = await request(app)
    .put(`/api/games/${gameId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'completed', elapsedSeconds: 245, mistakes: 2, hintsUsed: 1 })
    .expect(200)
  assert.equal(completed.body.data.record.status, 'completed')
  assert.ok(completed.body.data.record.completedAt)

  const games = await request(app)
    .get('/api/games?limit=10&offset=0')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  assert.equal(games.body.data.total, 1)
  assert.equal(games.body.data.items[0].id, gameId)

  const stats = await request(app)
    .get('/api/games/stats')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  assert.equal(stats.body.data.totalGames, 1)
  assert.equal(stats.body.data.completedGames, 1)
  assert.equal(stats.body.data.bestTimeSeconds, 245)
  assert.equal(stats.body.data.byDifficulty[0].difficulty, 'medium')

  await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`)
    .expect(204)

  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(401)
})

test('rejects untrusted browser origins and invalid game data', async () => {
  await request(app)
    .get('/api/health')
    .set('Origin', 'https://untrusted.example')
    .expect(403)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'player@example.com', password: 'Sudoku-Test-2026!' })
    .expect(200)

  await request(app)
    .post('/api/games')
    .set('Authorization', `Bearer ${login.body.data.token}`)
    .send({ difficulty: 'impossible', elapsedSeconds: -1 })
    .expect(400)
})
