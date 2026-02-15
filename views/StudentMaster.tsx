
import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import { Student, ClassId, Grade } from '../types';
import NfcScannerModal from '../components/NfcScannerModal';
import Modal from '../components/Modal';

interface Props {
  grade: Grade;
  classId: ClassId;
}

const StudentMaster: React.FC<Props> = ({ grade, classId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({ number: '', name: '', nfcId: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  
  // 削除確認用モーダル
  const [modalConfig, setModalConfig] = useState({ isOpen: false, id: -1 });

  useEffect(() => {
    setStudents(Storage.getStudents(grade, classId));
  }, [grade, classId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number || !formData.name || !formData.nfcId) {
      alert("すべての項目を入力してください");
      return;
    }

    let updated: Student[];
    const num = parseInt(formData.number);

    if (editingId) {
      updated = students.map(s => s.id === editingId ? { ...s, ...formData, number: num } : s);
      setEditingId(null);
    } else {
      if (students.some(s => s.number === num)) {
        alert("出席番号が重複しています");
        return;
      }
      if (students.some(s => s.nfcId === formData.nfcId)) {
        alert("NFCカードIDが重複しています");
        return;
      }
      const newStudent: Student = {
        id: Date.now(),
        number: num,
        name: formData.name,
        nfcId: formData.nfcId,
        grade: grade,
        classId: classId,
        createdAt: new Date().toISOString()
      };
      updated = [...students, newStudent];
    }

    setStudents(updated);
    Storage.saveStudents(updated, grade, classId);
    setFormData({ number: '', name: '', nfcId: '' });
  };

  const handleEdit = (s: Student) => {
    setEditingId(s.id);
    setFormData({ number: s.number.toString(), name: s.name, nfcId: s.nfcId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (id: number) => {
    setModalConfig({ isOpen: true, id });
  };

  const handleDelete = () => {
    const id = modalConfig.id;
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    Storage.saveStudents(updated, grade, classId);
    setModalConfig({ isOpen: false, id: -1 });
  };

  const handleNfcDetected = (serialNumber: string) => {
    setFormData(prev => ({ ...prev, nfcId: serialNumber }));
  };
  // 🔥 直接NFCイベントリスナーを登録
  useEffect(() => {
    const handleCardDetected = (event: any, data: { uid: string }) => {
      console.log('📡 NFC Card detected in StudentMaster:', data.uid);
      setFormData(prev => ({ ...prev, nfcId: data.uid }));
      if (isNfcModalOpen) {
        setIsNfcModalOpen(false);
      }
    };

    window.electron?.onNFCCard?.(handleCardDetected);
    
    return () => {
      window.electron?.removeNFCListener?.(handleCardDetected);
    };
  }, [isNfcModalOpen]);

  return (
    <div className="space-y-8 pb-10">
      <NfcScannerModal 
        isOpen={isNfcModalOpen} 
        onClose={() => setIsNfcModalOpen(false)} 
        onDetected={handleNfcDetected} 
      />

      <Modal 
        isOpen={modalConfig.isOpen}
        title="児童を削除しますか？"
        message="名簿から削除されます。この操作は取り消せません。"
        type="confirm"
        onConfirm={handleDelete}
        onCancel={() => setModalConfig({ isOpen: false, id: -1 })}
      />

      <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border-4 transition-all ${editingId ? 'border-indigo-400 ring-8 ring-indigo-50' : 'border-slate-100'}`}>
        <h3 className="text-xl font-black mb-6 flex items-center text-slate-800">
          {editingId ? '👤 児童情報の編集' : '➕ 児童の新規登録'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">出席番号</label>
              <input 
                type="number" 
                value={formData.number}
                onChange={e => setFormData({...formData, number: e.target.value})}
                placeholder="例: 1"
                className="w-full border-4 border-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-bold text-lg"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">氏名</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例: 山田 太郎"
                className="w-full border-4 border-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-bold text-lg"
              />
            </div>
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">NFCカード ID</label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={formData.nfcId}
                  onChange={e => setFormData({...formData, nfcId: e.target.value})}
                  placeholder="IDを読み取るか入力"
                  className="flex-1 border-4 border-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-500 bg-slate-50 transition-all font-bold text-lg"
                />
                <button 
                  type="button"
                  onClick={() => setIsNfcModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 rounded-2xl font-black flex items-center shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <span className="text-xl mr-2">📡</span> スキャン
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            {editingId && (
              <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({number:'', name:'', nfcId:''}); }}
                className="bg-slate-200 text-slate-600 px-8 py-4 rounded-2xl hover:bg-slate-300 font-black transition-all"
              >
                キャンセル
              </button>
            )}
            <button type="submit" className="bg-slate-900 text-white px-12 py-4 rounded-2xl hover:bg-slate-800 transition-all font-black text-lg shadow-xl">
              {editingId ? '情報を更新する' : '児童を登録する'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 font-black text-slate-800 flex justify-between items-center">
          <span className="text-xl flex items-center">
            <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
            児童名簿
          </span>
          <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs uppercase tracking-widest">
            計 {students.length} 名
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/30 text-slate-400 text-[11px] uppercase font-black tracking-widest border-b">
              <tr>
                <th className="px-8 py-4 w-24">出席番号</th>
                <th className="px-8 py-4">名前</th>
                <th className="px-8 py-4">NFC ID</th>
                <th className="px-8 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.sort((a,b) => a.number - b.number).map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-black text-slate-400">{s.number}</td>
                  <td className="px-8 py-5 text-base font-black text-slate-800">{s.name}</td>
                  <td className="px-8 py-5">
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold font-mono group-hover:bg-white transition-colors">
                      {s.nfcId}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button 
                      onClick={() => handleEdit(s)} 
                      className="text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all font-black text-sm"
                    >
                      編集
                    </button>
                    <button 
                      onClick={() => confirmDelete(s.id)} 
                      className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all font-black text-sm"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-5xl mb-4 opacity-10">👥</div>
              <p className="text-slate-300 font-black text-lg italic">登録されている児童がいません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentMaster;

