const { contextBridge, ipcRenderer } = require('electron'); 
 
// Expose NFC APIs to renderer process 
contextBridge.exposeInMainWorld('electron', { 
  getNFCStatus: () => ipcRenderer.invoke('get-nfc-status'), 
  requestNFCScan: () => ipcRenderer.invoke('request-nfc-scan'), 
  startNFCListener: () => { console.log('?? Starting NFC listener...'); }, 
  stopNFCListener: () => { console.log('?? Stopping NFC listener...'); }, 
  onNFCReaderDetected: (callback) => { ipcRenderer.on('nfc-reader-detected', (event, data) => callback(data)); }, 
  onNFCCard: (callback) => { ipcRenderer.on('nfc-card-detected', (event, data) => callback(event, data)); }, 
  onNFCCardDetected: (callback) => { ipcRenderer.on('nfc-card-detected', (event, data) => callback(data)); }, 
  onNFCCardRemoved: (callback) => { ipcRenderer.on('nfc-card-removed', (event, data) => callback(data)); }, 
  onNFCError: (callback) => { ipcRenderer.on('nfc-error', (event, data) => callback(data)); }, 
  removeNFCListener: (callback) => { ipcRenderer.removeListener('nfc-card-detected', callback); }, 
  removeNFCListeners: () => { ipcRenderer.removeAllListeners('nfc-reader-detected'); ipcRenderer.removeAllListeners('nfc-card-detected'); ipcRenderer.removeAllListeners('nfc-card-removed'); ipcRenderer.removeAllListeners('nfc-error'); } 
}); 
 
console.log('?? Electron preload script loaded');
