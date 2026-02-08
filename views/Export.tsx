
import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import Modal from '../components/Modal';

const ExportView: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  const downloadCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        Object.values(row).map(val => 
          `"${String(val).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportStudents = () => {
    const students = Storage.getStudents();
    downloadCSV(
      students.map(s => ({ number: s.number, name: s.name, nfcId: s.nfcId })),
      ['出席番号', '名前', 'NFC ID'],
      `児童一覧_${Storage.formatDate(new Date())}.csv`
    );
  };

  const handleExportHomeworkSubmissions = () => {
    const submissions = Storage.getHomeworkSubmissions();
    const homework = Storage.getHomework();
    
    const data = submissions.map(s => {
        const hw = homework.find(h => h.id === s.homeworkId);
        return {
            hwTitle: hw?.title || '不明',
            num: s.studentNumber,
            name: s.studentName,
            touchDate: s.touchDate || '-',
            touchTime: s.touchTime || '-',
            checked: s.checked ? '確認済' : '未確認',
            checkedAt: s.submittedDate || '-'
        };
    });

    downloadCSV(
      data,
      ['宿題名', '出席番号', '名前', '提出日', '提出時刻', '状態', '確認日'],
      `提出状況データ_${Storage.formatDate(new Date())}.csv`
    );
  };

  const handleBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      students: Storage.getStudents(),
      homework: Storage.getHomework(),
      homeworkSubmissions: Storage.getHomeworkSubmissions(),
      settings: Storage.getSettings()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${Storage.formatDate(new Date())}.json`;
    link.click();
  };

  const handleReset = () => {
    Storage.clear();
    Storage.initializeDefaults();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <Modal 
        isOpen={modalOpen}
        title="全データを削除しますか？"
        message="全てのデータを削除して初期化します。この操作は取り消せません。本当によろしいですか？"
        type="confirm"
        confirmText="削除する"
        onConfirm={handleReset}
        onCancel={() => setModalOpen(false)}
      />

      <Modal 
        isOpen={installModalOpen}
        title="ショートカットの作り方"
        message={`【iPhone/iPadの場合】\n1. 下の「共有ボタン(□に↑)」を押す\n2. 「ホーム画面に追加」を選ぶ\n\n【Android/PCの場合】\nブラウザ右上の「︙」から「アプリをインストール」または「ホーム画面に追加」を選んでください。`}
        type="alert"
        confirmText="わかりました"
        onConfirm={() => setInstallModalOpen(false)}
        onCancel={() => setInstallModalOpen(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📥</span> データ書き出し (CSV)
          </h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">エクセルなどで成績管理をするためにデータを保存します。</p>
          <div className="space-y-4">
            <button onClick={handleExportStudents} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-5 rounded-xl flex items-center justify-between transition-colors">
              <span>児童名簿のエクスポート</span>
              <span className="text-2xl">📄</span>
            </button>
            <button onClick={handleExportHomeworkSubmissions} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-5 rounded-xl flex items-center justify-between transition-colors">
              <span>提出状況データのエクスポート</span>
              <span className="text-2xl">📋</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📱</span> 端末の設定
          </h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">このアプリをホーム画面に追加して、いつでもすぐに使えるようにします。</p>
          <button 
            onClick={handleInstallClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-5 rounded-xl flex items-center justify-between transition-all shadow-lg active:scale-95"
          >
            <div className="text-left">
              <span className="block text-lg">ホーム画面にアイコンを追加</span>
              <span className="text-xs font-bold opacity-80 italic">ショートカットを作成してアプリ化</span>
            </div>
            <span className="text-3xl">📲</span>
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
          <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">⚙️</span> システム管理
          </h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">データのバックアップや初期化を行います。</p>
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={handleBackup} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-4 px-5 rounded-xl flex items-center justify-between transition-colors">
              <span>全データバックアップ (JSON)</span>
              <span className="text-2xl">💾</span>
            </button>
            <button onClick={() => setModalOpen(true)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-4 px-5 rounded-xl flex items-center justify-between transition-colors">
              <span>全てのデータを削除する</span>
              <span className="text-2xl">⚠️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportView;
