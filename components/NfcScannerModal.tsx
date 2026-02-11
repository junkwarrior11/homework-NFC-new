
import React, { useState, useEffect } from 'react';

interface NfcScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (serialNumber: string) => void;
}

const NfcScannerModal: React.FC<NfcScannerModalProps> = ({ isOpen, onClose, onDetected }) => {
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [readerType, setReaderType] = useState<'electron' | 'web' | 'none'>('none');

  useEffect(() => {
    if (!isOpen) return;

    let ndef: any = null;
    const abortController = new AbortController();

    const startScanning = async () => {
      // 1. Check if running in Electron with NFC support
      if (window.electronAPI) {
        const nfcStatus = await window.electronAPI.getNFCStatus();
        
        if (nfcStatus.available) {
          setReaderType('electron');
          setIsReading(true);

          // Set up Electron NFC listeners
          window.electronAPI.onNFCCardDetected((data) => {
            console.log('📱 Electron NFC card detected:', data.uid);
            onDetected(data.uid);
            onClose();
          });

          window.electronAPI.onNFCError((data) => {
            setError(`ICカードリーダーエラー: ${data.message}`);
            setIsReading(false);
          });

          // Request scan
          const result = await window.electronAPI.requestNFCScan();
          if (!result.success) {
            setError(result.message);
            setIsReading(false);
          }

          return;
        }
      }

      // 2. Fall back to Web NFC API (for Android Chrome)
      if (!('NDEFReader' in window)) {
        setReaderType('none');
        setError('お使いのブラウザはNFCスキャンに対応していません。手動で入力してください。');
        return;
      }

      try {
        setReaderType('web');
        setIsReading(true);
        // @ts-ignore
        ndef = new NDEFReader();
        await ndef.scan({ signal: abortController.signal });
        
        ndef.onreading = (event: any) => {
          const serialNumber = event.serialNumber;
          if (serialNumber) {
            onDetected(serialNumber);
            onClose();
          }
        };

        ndef.onreadingerror = () => {
          setError('タグの読み取りに失敗しました。もう一度試してください。');
        };

      } catch (err) {
        console.error(err);
        setError('NFCへのアクセスが拒否されたか、デバイスのNFCが無効です。');
        setIsReading(false);
      }
    };

    startScanning();

    return () => {
      abortController.abort();
      
      // Clean up Electron listeners
      if (window.electronAPI) {
        window.electronAPI.removeNFCListeners();
      }
    };
  }, [isOpen, onDetected, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-[3rem] shadow-2xl max-w-sm w-full p-10 overflow-hidden text-center animate-in zoom-in duration-300">
        <div className="mb-8">
          <div className="relative inline-block">
            {/* Pulsing Animation */}
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-blue-50 w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-inner">
              📱
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">
          NFCタグをスキャン
        </h3>
        
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-sm mb-6">
            {error}
          </div>
        ) : (
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            {readerType === 'electron' ? (
              <>ICカードリーダーに<br/>カードをかざしてください...</>
            ) : (
              <>デバイスの背面付近に<br/>NFCカードをかざしてください...</>
            )}
          </p>
        )}

        <div className="space-y-4">
          {/* Simulation button for development */}
          <button
            onClick={() => {
              const dummyId = 'SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
              onDetected(dummyId);
              onClose();
            }}
            className="w-full bg-slate-100 text-slate-400 font-black py-3 rounded-2xl hover:bg-slate-200 transition-all text-xs"
          >
            （テスト用：IDをシミュレーション）
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all text-lg shadow-xl"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default NfcScannerModal;
