const { contextBridge, ipcRenderer } = require('electron');

// Expose NFC APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // NFC status
  getNFCStatus: () => ipcRenderer.invoke('get-nfc-status'),
  
  // Request NFC scan
  requestNFCScan: () => ipcRenderer.invoke('request-nfc-scan'),
  
  // NFC event listeners
  onNFCReaderDetected: (callback) => {
    ipcRenderer.on('nfc-reader-detected', (event, data) => callback(data));
  },
  
  onNFCCardDetected: (callback) => {
    ipcRenderer.on('nfc-card-detected', (event, data) => callback(data));
  },
  
  onNFCCardRemoved: (callback) => {
    ipcRenderer.on('nfc-card-removed', (event, data) => callback(data));
  },
  
  onNFCError: (callback) => {
    ipcRenderer.on('nfc-error', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeNFCListeners: () => {
    ipcRenderer.removeAllListeners('nfc-reader-detected');
    ipcRenderer.removeAllListeners('nfc-card-detected');
    ipcRenderer.removeAllListeners('nfc-card-removed');
    ipcRenderer.removeAllListeners('nfc-error');
  }
});

console.log('✅ Electron preload script loaded');
