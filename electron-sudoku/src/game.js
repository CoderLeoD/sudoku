const SIZE = 9
const BOX = 3

const range = (length) => Array.from({ length }, (_, index) => index)

function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export const DIFFICULTIES = {
  easy: { label: '轻松', remove: 38 },
  medium: { label: '进阶', remove: 46 },
  hard: { label: '挑战', remove: 52 },
}

const SOLUTION_CLASSIC = [
  '534678912', '672195348', '198342567',
  '859761423', '426853791', '713924856',
  '961537284', '287419635', '345286179',
]

const PUZZLES = {
  easy: {
    puzzle: [
      '534678000', '672195000', '198000060',
      '859060003', '426803001', '700020006',
      '060000280', '000419635', '000080179',
    ],
    solution: SOLUTION_CLASSIC,
  },
  medium: {
    puzzle: [
      '534070000', '600195300', '098300060',
      '800060403', '420803001', '700920006',
      '060000280', '000419005', '000080079',
    ],
    solution: SOLUTION_CLASSIC,
  },
  hard: {
    puzzle: [
      '000000907', '000420180', '000705026',
      '100904000', '050000040', '000507009',
      '920108000', '034059000', '507000000',
    ],
    solution: [
      '462831957', '795426183', '381795426',
      '173984265', '659312748', '248567319',
      '926178534', '834259671', '517643892',
    ],
  },
}

function parseBoard(lines) {
  return lines.map((line) => [...line].map(Number))
}

function createVariant(difficulty) {
  const sourcePuzzle = parseBoard(PUZZLES[difficulty].puzzle)
  const sourceSolution = parseBoard(PUZZLES[difficulty].solution)
  const rowGroups = shuffle(range(BOX))
  const colGroups = shuffle(range(BOX))
  const rows = rowGroups.flatMap((group) => shuffle(range(BOX)).map((row) => group * BOX + row))
  const cols = colGroups.flatMap((group) => shuffle(range(BOX)).map((col) => group * BOX + col))
  const numbers = shuffle(range(SIZE).map((value) => value + 1))
  const transpose = Math.random() > 0.5
  const transform = (board) => rows.map((row) => cols.map((col) => {
    const value = transpose ? board[col][row] : board[row][col]
    return value ? numbers[value - 1] : 0
  }))
  return { puzzle: transform(sourcePuzzle), solution: transform(sourceSolution) }
}

export function createGame(difficulty = 'medium') {
  const { puzzle, solution } = createVariant(difficulty)

  return {
    id: crypto.randomUUID(),
    difficulty,
    puzzle,
    solution,
    board: puzzle.map((row) => [...row]),
    notes: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => [])),
    elapsed: 0,
    mistakes: 0,
    hints: 3,
    startedAt: Date.now(),
  }
}

export function getConflicts(board) {
  const conflicts = new Set()
  const inspect = (positions) => {
    const seen = new Map()
    positions.forEach(([row, col]) => {
      const value = board[row][col]
      if (!value) return
      const key = String(value)
      if (seen.has(key)) {
        conflicts.add(`${row}-${col}`)
        seen.get(key).forEach(([r, c]) => conflicts.add(`${r}-${c}`))
        seen.get(key).push([row, col])
      } else seen.set(key, [[row, col]])
    })
  }

  for (let index = 0; index < SIZE; index += 1) {
    inspect(range(SIZE).map((col) => [index, col]))
    inspect(range(SIZE).map((row) => [row, index]))
  }
  for (let row = 0; row < SIZE; row += BOX) {
    for (let col = 0; col < SIZE; col += BOX) {
      inspect(range(SIZE).flatMap((offset) => {
        const r = row + Math.floor(offset / BOX)
        const c = col + (offset % BOX)
        return [[r, c]]
      }))
    }
  }
  return conflicts
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}
