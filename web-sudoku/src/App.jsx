import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createGame, DIFFICULTIES, formatTime, getConflicts } from './game.js'
import { Icon } from './icons.jsx'
import { AuthModal } from './auth/AuthModal.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { gameRecordService } from './data/dataServices.js'

const STORAGE_KEY = 'sudoku-studio-game-v1'

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.board?.length === 9 && saved?.solution?.length === 9) {
      return { ...saved, id: saved.id || crypto.randomUUID() }
    }
  } catch {
    // A corrupted save should never keep the player out of the game.
  }
  return createGame('medium')
}

function cloneNotes(notes) {
  return notes.map((row) => row.map((cell) => [...cell]))
}

function ActionButton({ icon, label, badge, active, disabled, onClick }) {
  return (
    <button className={`action-button ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled} type="button">
      <span className="action-icon"><Icon name={icon} />{badge !== undefined && <i>{badge}</i>}</span>
      <span>{label}</span>
    </button>
  )
}

function App() {
  const { user, ready: authReady } = useAuth()
  const [game, setGame] = useState(loadGame)
  const [selected, setSelected] = useState(null)
  const [noteMode, setNoteMode] = useState(false)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [paused, setPaused] = useState(false)
  const [showNewGame, setShowNewGame] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [won, setWon] = useState(false)
  const recordedGames = useRef(new Set())

  const conflicts = useMemo(() => getConflicts(game.board), [game.board])
  const selectedValue = selected ? game.board[selected.row][selected.col] : 0
  const completedNumbers = useMemo(() => {
    const counts = Array(10).fill(0)
    game.board.flat().forEach((value) => { if (value) counts[value] += 1 })
    return new Set(counts.map((count, number) => count === 9 ? number : null).filter(Boolean))
  }, [game.board])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  }, [game])

  useEffect(() => {
    if (!won || !user || recordedGames.current.has(game.id)) return
    recordedGames.current.add(game.id)

    // 数据源由 VITE_DATA_SOURCE 决定：默认写入 IndexedDB，未来可无缝改发 sudoku-server 请求。
    void gameRecordService.create(user.id, {
      puzzleId: game.id,
      difficulty: game.difficulty,
      status: 'completed',
      elapsedSeconds: game.elapsed,
      mistakes: game.mistakes,
      hintsUsed: Math.max(0, 3 - game.hints),
      state: { puzzle: game.puzzle, board: game.board, notes: game.notes },
      startedAt: new Date(game.startedAt).toISOString(),
      completedAt: new Date().toISOString(),
    }).catch((error) => {
      console.error('保存游戏记录失败', error)
    })
  }, [won, user, game])

  useEffect(() => {
    if (paused || won || showNewGame || showAuth) return undefined
    const timer = window.setInterval(() => {
      setGame((current) => ({ ...current, elapsed: current.elapsed + 1 }))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [paused, won, showNewGame, showAuth])

  const saveSnapshot = useCallback(() => {
    setHistory((items) => [...items.slice(-49), { board: game.board.map((row) => [...row]), notes: cloneNotes(game.notes), mistakes: game.mistakes, hints: game.hints }])
    setFuture([])
  }, [game])

  const checkWin = useCallback((board) => {
    const complete = board.every((row, r) => row.every((value, c) => value === game.solution[r][c]))
    if (complete) setWon(true)
  }, [game.solution])

  const enterNumber = useCallback((value) => {
    if (!selected || paused || won || game.puzzle[selected.row][selected.col]) return
    const { row, col } = selected
    saveSnapshot()

    if (noteMode && value !== 0) {
      setGame((current) => {
        const notes = cloneNotes(current.notes)
        const cell = notes[row][col]
        notes[row][col] = cell.includes(value) ? cell.filter((item) => item !== value) : [...cell, value].sort()
        return { ...current, notes }
      })
      return
    }

    setGame((current) => {
      const board = current.board.map((line) => [...line])
      const notes = cloneNotes(current.notes)
      const isMistake = value !== 0 && value !== current.solution[row][col]
      board[row][col] = value
      notes[row][col] = []
      if (value) {
        for (let index = 0; index < 9; index += 1) {
          notes[row][index] = notes[row][index].filter((item) => item !== value)
          notes[index][col] = notes[index][col].filter((item) => item !== value)
        }
        const rowStart = Math.floor(row / 3) * 3
        const colStart = Math.floor(col / 3) * 3
        for (let r = rowStart; r < rowStart + 3; r += 1) {
          for (let c = colStart; c < colStart + 3; c += 1) notes[r][c] = notes[r][c].filter((item) => item !== value)
        }
      }
      window.setTimeout(() => checkWin(board), 0)
      return { ...current, board, notes, mistakes: current.mistakes + (isMistake ? 1 : 0) }
    })
  }, [selected, paused, won, game.puzzle, noteMode, saveSnapshot, checkWin])

  const undo = useCallback(() => {
    if (!history.length || paused || won) return
    const previous = history[history.length - 1]
    setFuture((items) => [{ board: game.board, notes: game.notes, mistakes: game.mistakes, hints: game.hints }, ...items])
    setHistory((items) => items.slice(0, -1))
    setGame((current) => ({ ...current, ...previous }))
  }, [history, paused, won, game])

  const redo = useCallback(() => {
    if (!future.length || paused || won) return
    const next = future[0]
    setHistory((items) => [...items, { board: game.board, notes: game.notes, mistakes: game.mistakes, hints: game.hints }])
    setFuture((items) => items.slice(1))
    setGame((current) => ({ ...current, ...next }))
  }, [future, paused, won, game])

  const hint = useCallback(() => {
    if (!selected || paused || won || game.hints <= 0 || game.puzzle[selected.row][selected.col]) return
    saveSnapshot()
    const { row, col } = selected
    setGame((current) => {
      const board = current.board.map((line) => [...line])
      const notes = cloneNotes(current.notes)
      board[row][col] = current.solution[row][col]
      notes[row][col] = []
      window.setTimeout(() => checkWin(board), 0)
      return { ...current, board, notes, hints: current.hints - 1 }
    })
  }, [selected, paused, won, game, saveSnapshot, checkWin])

  const startGame = useCallback((difficulty) => {
    setGame(createGame(difficulty))
    setSelected(null)
    setHistory([])
    setFuture([])
    setPaused(false)
    setWon(false)
    setShowNewGame(false)
  }, [])

  const closeAuth = useCallback(() => setShowAuth(false), [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showNewGame || showAuth) return
      if (/^[1-9]$/.test(event.key)) enterNumber(Number(event.key))
      else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') enterNumber(0)
      else if (event.key.toLowerCase() === 'n') setNoteMode((value) => !value)
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') event.shiftKey ? redo() : undo()
      else if (selected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key]
        setSelected({ row: (selected.row + move[0] + 9) % 9, col: (selected.col + move[1] + 9) % 9 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, showNewGame, showAuth, enterNumber, undo, redo])

  const isRelated = (row, col) => selected && (
    row === selected.row || col === selected.col ||
    (Math.floor(row / 3) === Math.floor(selected.row / 3) && Math.floor(col / 3) === Math.floor(selected.col / 3))
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="方寸数独首页">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>方寸<small>数独</small></span>
        </a>
        <div className="topbar-actions">
          <button className="new-game-top" type="button" onClick={() => setShowNewGame(true)}>
            新游戏 <Icon name="chevron" size={17} />
          </button>
          <button className={`account-trigger ${user ? 'signed-in' : ''}`} type="button" onClick={() => setShowAuth(true)} disabled={!authReady} aria-label={!authReady ? '正在读取账户' : user ? `账户：${user.name}` : '登录或注册'}>
            <span className="account-avatar">{!authReady ? '·' : user?.name?.trim().charAt(0).toLocaleUpperCase() || '人'}</span>
            <span className="account-trigger-label">{!authReady ? '读取中…' : user ? user.name : '登录 / 注册'}</span>
          </button>
        </div>
      </header>

      <main className="game-layout">
        <section className="game-heading">
          <div>
            <span className="eyebrow">每日静心一刻</span>
            <h1>让数字各归其位。</h1>
          </div>
          <p>不必着急，答案就在逻辑里。</p>
        </section>

        <div className="game-content">
          <section className="board-section" aria-label="数独棋盘">
            <div className="status-bar">
              <div><span>难度</span><strong>{DIFFICULTIES[game.difficulty].label}</strong></div>
              <div><span>错误</span><strong>{game.mistakes}</strong></div>
              <div className="time-status"><span>用时</span><strong>{formatTime(game.elapsed)}</strong><button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? '继续' : '暂停'}><Icon name={paused ? 'play' : 'pause'} size={15} /></button></div>
            </div>

            <div className="board-wrap">
              <div className={`sudoku-board ${paused ? 'is-paused' : ''}`} role="grid">
                {game.board.map((row, rowIndex) => row.map((value, colIndex) => {
                  const fixed = Boolean(game.puzzle[rowIndex][colIndex])
                  const isSelected = selected?.row === rowIndex && selected?.col === colIndex
                  const sameValue = Boolean(selectedValue && value === selectedValue)
                  const conflict = conflicts.has(`${rowIndex}-${colIndex}`) || (!fixed && value && value !== game.solution[rowIndex][colIndex])
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      role="gridcell"
                      aria-label={`第 ${rowIndex + 1} 行第 ${colIndex + 1} 列${value ? `，数字 ${value}` : '，空白'}`}
                      className={`cell ${fixed ? 'fixed' : ''} ${isRelated(rowIndex, colIndex) ? 'related' : ''} ${sameValue ? 'same-value' : ''} ${isSelected ? 'selected' : ''} ${conflict ? 'conflict' : ''}`}
                      onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                    >
                      {value ? <span className="cell-value">{value}</span> : (
                        <span className="notes-grid">
                          {Array.from({ length: 9 }, (_, number) => <i key={number}>{game.notes[rowIndex][colIndex].includes(number + 1) ? number + 1 : ''}</i>)}
                        </span>
                      )}
                    </button>
                  )
                }))}
                {paused && <div className="pause-cover"><button type="button" onClick={() => setPaused(false)}><span><Icon name="play" size={24} /></span>继续游戏</button></div>}
              </div>
            </div>
            <p className="keyboard-tip">小提示：使用键盘数字键填写，方向键移动</p>
          </section>

          <aside className="control-panel">
            <div className="number-pad" aria-label="数字键盘">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" onClick={() => enterNumber(number)} disabled={completedNumbers.has(number)}>{number}</button>
              ))}
            </div>
            <div className="actions">
              <ActionButton icon="undo" label="撤销" onClick={undo} disabled={!history.length} />
              <ActionButton icon="redo" label="重做" onClick={redo} disabled={!future.length} />
              <ActionButton icon="erase" label="擦除" onClick={() => enterNumber(0)} disabled={!selected || Boolean(selected && game.puzzle[selected.row][selected.col])} />
              <ActionButton icon="pencil" label="候选数" active={noteMode} badge={noteMode ? '开' : undefined} onClick={() => setNoteMode((value) => !value)} />
              <ActionButton icon="bulb" label="提示" badge={game.hints} onClick={hint} disabled={!selected || game.hints <= 0} />
            </div>
            <button className="primary-new-game" type="button" onClick={() => setShowNewGame(true)}><Icon name="refresh" /> 开始新游戏</button>
            <div className="quiet-note"><span>⌁</span><p>每一局，都是一次<br />与自己安静相处的练习。</p></div>
          </aside>
        </div>
      </main>

      <footer><span>方寸之间，自有天地</span><span>Sudoku Studio · {new Date().getFullYear()}</span></footer>

      <AuthModal open={showAuth} onClose={closeAuth} />

      {showNewGame && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewGame(false) }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-game-title">
            <button className="modal-close" type="button" onClick={() => setShowNewGame(false)} aria-label="关闭"><Icon name="close" /></button>
            <span className="modal-symbol">九</span>
            <span className="eyebrow">新的一局</span>
            <h2 id="new-game-title">今天想挑战哪种难度？</h2>
            <div className="difficulty-list">
              {Object.entries(DIFFICULTIES).map(([key, item]) => (
                <button type="button" key={key} onClick={() => startGame(key)} className={game.difficulty === key ? 'current' : ''}>
                  <span>{item.label}</span>
                  <small>{key === 'easy' ? '适合放松与热身' : key === 'medium' ? '需要一些推理' : '留给专注的你'}</small>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
            <p>开始新游戏将覆盖当前进度</p>
          </section>
        </div>
      )}

      {won && (
        <div className="modal-backdrop victory-backdrop">
          <section className="modal victory" role="dialog" aria-modal="true">
            <div className="trophy"><Icon name="trophy" size={32} /></div>
            <span className="eyebrow">漂亮的推理</span>
            <h2>恭喜你，完成了！</h2>
            <p>用时 {formatTime(game.elapsed)} · 错误 {game.mistakes} 次</p>
            <button className="primary-new-game" type="button" onClick={() => { setWon(false); setShowNewGame(true) }}>再来一局</button>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
