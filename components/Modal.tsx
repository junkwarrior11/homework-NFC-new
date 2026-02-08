
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm';
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  type, 
  onConfirm, 
  onCancel,
  confirmText = 'OK',
  cancelText = 'キャンセル'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={type === 'alert' ? onConfirm : onCancel}
      ></div>
      
      {/* Modal Body */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 overflow-hidden border-4 border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className="text-4xl mb-4">
            {type === 'alert' ? '📢' : '❓'}
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{title}</h3>
          <p className="text-slate-500 font-bold mb-8 whitespace-pre-wrap">{message}</p>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={onConfirm}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all text-lg"
            >
              {confirmText}
            </button>
            {type === 'confirm' && (
              <button
                onClick={onCancel}
                className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-lg"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
