const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// NFC reader support (optional - will be installed on Windows PC)
let NFC = null;
try {
  NFC = require('nfc-pcsc').NFC;
} catch (error) {
  console.warn('⚠️ NFC reader library not available. Install on Windows PC for card reader support.');
}

let mainWindow = null;
let nfc = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ClassSync Pro',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Load the app
  if (app.isPackaged) {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize NFC reader (if available)
function initializeNFCReader() {
  if (!NFC) {
    console.warn('⚠️ NFC library not available - skipping NFC reader initialization');
    return;
  }

  try {
    nfc = new NFC();

    nfc.on('reader', reader => {
      console.log(`📡 NFC Reader detected: ${reader.reader.name}`);

      // Send reader info to renderer
      if (mainWindow) {
        mainWindow.webContents.send('nfc-reader-detected', {
          name: reader.reader.name
        });
      }

      reader.on('card', card => {
        console.log('💳 Card detected!');
        console.log('  UID:', card.uid);
        console.log('  Type:', card.type);
        console.log('  ATR:', card.atr);
        
        // For FeliCa cards (RC-S300), also check data
        if (card.data) {
          const idm = card.data.toString('hex').toUpperCase();
          console.log('  FeliCa IDm:', idm);
        }
        
        console.log('  Full card:', JSON.stringify(card, null, 2));

        // Send card UID to renderer
        if (mainWindow) {
          mainWindow.webContents.send('nfc-card-detected', {
            uid: card.uid,
            type: card.type,
            atr: card.atr
          });
        }
      });

      reader.on('card.off', card => {
        console.log('🚫 Card removed:', card.uid);

        if (mainWindow) {
          mainWindow.webContents.send('nfc-card-removed', {
            uid: card.uid
          });
        }
      });

      reader.on('error', err => {
        console.error('❌ NFC Reader error:', err);

        if (mainWindow) {
          mainWindow.webContents.send('nfc-error', {
            message: err.message
          });
        }
      });
    });

    nfc.on('error', err => {
      console.error('❌ NFC initialization error:', err);
    });

    console.log('✅ NFC reader initialized');
  } catch (error) {
    console.error('❌ Failed to initialize NFC reader:', error.message);
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  initializeNFCReader();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (nfc) {
    try {
      nfc.close();
    } catch (error) {
      console.error('Error closing NFC reader:', error);
    }
  }
});

// IPC handlers
ipcMain.handle('get-nfc-status', () => {
  return {
    available: NFC !== null,
    initialized: nfc !== null
  };
});

ipcMain.handle('request-nfc-scan', () => {
  return {
    success: NFC !== null,
    message: NFC ? 'Place IC card on the reader' : 'NFC reader not available'
  };
});

console.log('🚀 ClassSync Pro Electron app starting...');
console.log('📍 App path:', app.getAppPath());
console.log('📍 User data:', app.getPath('userData'));
