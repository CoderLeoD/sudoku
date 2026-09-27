const { contextBridge } = require('electron')

// Keep the renderer isolated from Node.js. Future authentication and data
// capabilities can be added here as narrow, explicit APIs when needed.
contextBridge.exposeInMainWorld('sudokuDesktop', {
  isElectron: true,
  platform: process.platform,
  versions: Object.freeze({
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }),
})
