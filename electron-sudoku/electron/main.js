import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const developmentUrl = process.env.VITE_DEV_SERVER_URL
const isSmokeTest = process.env.ELECTRON_SMOKE_TEST === '1'

function isTrustedNavigation(url) {
  if (!developmentUrl) return url.startsWith('file://')
  return url.startsWith(developmentUrl)
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 680,
    show: false,
    backgroundColor: '#f5f1e9',
    title: '方寸数独',
    webPreferences: {
      preload: path.join(currentDirectory, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.once('ready-to-show', () => {
    if (!isSmokeTest) window.show()
  })

  if (isSmokeTest) {
    window.webContents.once('did-finish-load', async () => {
      try {
        const databaseReady = await window.webContents.executeJavaScript(`
          new Promise((resolve, reject) => {
            const deadline = Date.now() + 5000
            const checkAccountReady = () => {
              const accountButton = document.querySelector('.account-trigger')
              if (accountButton && !accountButton.disabled) {
                const request = indexedDB.open('sudoku-local-database', 1)
                request.onsuccess = () => {
                  const database = request.result
                  const stores = Array.from(database.objectStoreNames)
                  database.close()
                  resolve(stores.includes('users') && stores.includes('gameRecords'))
                }
                request.onerror = () => reject(request.error)
                return
              }
              if (Date.now() >= deadline) {
                reject(new Error('local database initialization timed out'))
                return
              }
              setTimeout(checkAccountReady, 50)
            }
            checkAccountReady()
          })
        `)
        if (!databaseReady) throw new Error('required local database stores are missing')
        console.log('Electron smoke test passed: renderer and local database loaded.')
      } catch (error) {
        console.error(`Electron smoke test failed: ${error.message}`)
        process.exitCode = 1
      } finally {
        app.quit()
      }
    })

    window.webContents.once('did-fail-load', (_event, code, description) => {
      console.error(`Electron smoke test failed (${code}): ${description}`)
      process.exitCode = 1
      app.quit()
    })
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedNavigation(url)) event.preventDefault()
  })

  if (developmentUrl) {
    void window.loadURL(developmentUrl)
  } else {
    void window.loadFile(path.join(currentDirectory, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
