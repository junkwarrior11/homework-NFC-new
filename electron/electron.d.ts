export interface ElectronAPI {
  getNFCStatus: () => Promise<{
    available: boolean;
    initialized: boolean;
  }>;
  
  requestNFCScan: () => Promise<{
    success: boolean;
    message: string;
  }>;
  
  onNFCReaderDetected: (callback: (data: { name: string }) => void) => void;
  
  onNFCCardDetected: (callback: (data: {
    uid: string;
    type: string;
    atr: string;
  }) => void) => void;
  
  onNFCCardRemoved: (callback: (data: { uid: string }) => void) => void;
  
  onNFCError: (callback: (data: { message: string }) => void) => void;
  
  removeNFCListeners: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
