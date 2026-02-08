
import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import { Student, Homework, HomeworkSubmission, DayOfWeek, ClassId, Grade } from '../types';
import { geminiService } from '../services/gemini';
import Modal from '../components/Modal';

interface Props {
  grade: Grade;
  classId: ClassId;
}

const HomeworkView: React.FC<Props> = ({ grade, classId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [formData, setFormData] = useState({ 
    title: '', 
    dayOfWeek: ['everyday'] as DayOfWeek[], 
    description: '' 
  });
  const [editingHwId, setEditingHwId] = useState<number | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const daysOptions: { value: DayOfWeek; label: string }[] = [
    { value: '1', label: '月' },
    { value: '2', label: '火' },
    { value: '3', label: '水' },
    { value: '4', label: '木' },
    { value: '5', label: '金' },
    { value: '6', label: '土' },
    { value: '0', label: '日' },
  ];

  // モーダル管理用ステート
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {}
  });

  useEffect(() => {
    setStudents(Storage.getStudents(grade, classId));
    setHomeworkList(Storage.getHomework(grade, classId));
    setSubmissions(Storage.getHomeworkSubmissions(grade, classId));
  }, [grade, classId]);

  const showAlert = (title: string, message: string) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const toggleDay = (day: DayOfWeek) => {
    setFormData(prev => {
        let newDays = [...prev.dayOfWeek];
        
        if (day === 'everyday') {
            return { ...prev, dayOfWeek: ['everyday'] };
        }
        
        // 「毎日」が選ばれていた時に特定の曜日を押したら「毎日」を解除
        if (newDays.includes('everyday')) {
            newDays = [day];
        } else {
            if (newDays.includes(day)) {
                newDays = newDays.filter(d => d !== day);
                if (newDays.length === 0) newDays = ['everyday'];
            } else {
                newDays.push(day);
            }
        }
        return { ...prev, dayOfWeek: newDays };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      showAlert("にゅうりょくエラー", "宿題の名前を入力してください。");
      return;
    }
    if (formData.dayOfWeek.length === 0) {
        showAlert("にゅうりょくエラー", "曜日を1つ以上選択してください。");
        return;
    }

    if (editingHwId) {
      setHomeworkList(prev => {
        const updated = prev.map(h => 
          h.id === editingHwId 
            ? { ...h, title: formData.title, dayOfWeek: formData.dayOfWeek, description: formData.description } 
            : h
        );
        Storage.saveHomework(updated, grade, classId);
        return updated;
      });
      setEditingHwId(null);
    } else {
      const newEntry: Homework = {
        id: Date.now(),
        title: formData.title,
        dayOfWeek: formData.dayOfWeek,
        description: formData.description,
        createdAt: new Date().toISOString()
      };
      setHomeworkList(prev => {
        const updated = [...prev, newEntry];
        Storage.saveHomework(updated, grade, classId);
        return updated;
      });
    }

    setFormData({ title: '', dayOfWeek: ['everyday'], description: '' });
  };

  const handleEditHomework = (hw: Homework) => {
    setEditingHwId(hw.id);
    setFormData({
      title: hw.title,
      dayOfWeek: Array.isArray(hw.dayOfWeek) ? hw.dayOfWeek : [hw.dayOfWeek as any],
      description: hw.description
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingHwId(null);
    setFormData({ title: '', dayOfWeek: ['everyday'], description: '' });
  };

  const handleDeleteHomework = (id: number) => {
    showConfirm(
      "宿題を削除しますか？",
      "この宿題と、これまでの提出データがすべて消えてしまいます。本当によろしいですか？",
      () => {
        setHomeworkList(prev => {
          const updated = prev.filter(h => h.id !== id);
          Storage.saveHomework(updated, grade, classId);
          return updated;
        });
        
        setSubmissions(prev => {
          const updatedSub = prev.filter(s => s.homeworkId !== id);
          Storage.saveHomeworkSubmissions(updatedSub, grade, classId);
          return updatedSub;
        });
        
        if (editingHwId === id) {
          cancelEdit();
        }
      }
    );
  };

  const handleToggleCheck = (homeworkId: number, studentId: number) => {
    setSubmissions(prev => {
      const existingIndex = prev.findIndex(s => s.homeworkId === homeworkId && s.studentId === studentId);
      const now = new Date();
      let updated = [...prev];

      if (existingIndex >= 0) {
        const current = updated[existingIndex];
        updated[existingIndex] = {
          ...current,
          checked: !current.checked,
          checkedAt: !current.checked ? now.toISOString() : null,
          submittedDate: !current.checked ? Storage.formatDate(now) : null,
          submittedTime: !current.checked ? Storage.formatTime(now) : null
        };
      } else {
        const student = students.find(s => s.id === studentId);
        if (!student) return prev;
        updated.push({
          id: `sub_${homeworkId}_${studentId}`,
          homeworkId,
          studentId,
          studentNumber: student.number,
          studentName: student.name,
          nfcId: student.nfcId,
          touchRecorded: false,
          touchRecordedAt: null,
          touchDate: null,
          touchTime: null,
          checked: true,
          checkedAt: now.toISOString(),
          submittedDate: Storage.formatDate(now),
          submittedTime: Storage.formatTime(now)
        });
      }
      Storage.saveHomeworkSubmissions(updated, grade, classId);
      return updated;
    });
  };

  const handleAiSuggest = async () => {
    if (!formData.title) {
        showAlert("にゅうりょくエラー", "先に宿題名を入力してください。");
        return;
    }
    setIsAiGenerating(true);
    const desc = await geminiService.generateHomeworkDescription(formData.title);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsAiGenerating(false);
  };

  const getDayNames = (days: DayOfWeek[]) => {
    if (days.includes('everyday')) return '毎日';
    const names = ['日', '月', '火', '水', '木', '金', '土'];
    return days.sort().map(d => names[parseInt(d)]).join('・');
  };

  return (
    <div className="space-y-8 pb-20">
      <Modal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <div className={`bg-white p-6 rounded-3xl shadow-sm border-4 transition-all ${editingHwId ? 'border-indigo-400 ring-8 ring-indigo-50' : 'border-slate-100'}`}>
        <h3 className="text-xl font-black mb-6 flex items-center text-slate-800">
          {editingHwId ? '📝 宿題の内容を変更する' : '🆕 宿題の新規登録'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">宿題の名前</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="例: 算数プリント、漢字練習"
                className="w-full border-4 border-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-all font-bold text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-500 mb-2 uppercase tracking-widest">出す曜日（複数えらべます）</label>
              <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => toggleDay('everyday')}
                    className={`px-4 py-2 rounded-xl font-black transition-all ${formData.dayOfWeek.includes('everyday') ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    毎日
                </button>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                {daysOptions.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleDay(opt.value)}
                        className={`w-10 h-10 rounded-xl font-black transition-all ${formData.dayOfWeek.includes(opt.value) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {opt.label}
                    </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-black text-slate-500 uppercase tracking-widest">宿題の説明</label>
                <button 
                    type="button" 
                    onClick={handleAiSuggest}
                    disabled={isAiGenerating}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 font-black flex items-center transition-all"
                >
                    {isAiGenerating ? '⏳ 生成中...' : '✨ AIでやる気アップ説明を生成'}
                </button>
            </div>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full border-4 border-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-all font-bold text-lg"
              rows={2}
              placeholder="児童に伝えるメッセージや詳細を入力"
            ></textarea>
          </div>
          <div className="flex space-x-4">
            <button 
              type="submit" 
              className={`flex-1 ${editingHwId ? 'bg-indigo-600' : 'bg-blue-600'} text-white px-8 py-5 rounded-2xl transition-all font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95`}
            >
              {editingHwId ? '変更を保存する' : '宿題を追加する'}
            </button>
            {editingHwId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="bg-slate-200 text-slate-600 px-8 py-5 rounded-2xl hover:bg-slate-300 font-black transition-all"
              >
                中止
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-black text-slate-800 flex items-center">
          <span className="w-2 h-8 bg-blue-500 rounded-full mr-3"></span>
          提出・確認リスト
        </h3>
        
        {homeworkList.map(hw => {
          const hwSubmissions = submissions.filter(s => s.homeworkId === hw.id);
          return (
            <div key={hw.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="font-black text-slate-800 text-xl">{hw.title}</h4>
                    <span className="bg-blue-100 text-blue-600 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-widest">
                      {getDayNames(hw.dayOfWeek)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 font-bold">{hw.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={() => handleEditHomework(hw)} 
                    className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-black flex items-center text-sm"
                  >
                    <span className="mr-1">✏️</span> 変更
                  </button>
                  <button 
                    onClick={() => handleDeleteHomework(hw.id)} 
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-black flex items-center text-sm"
                  >
                    <span className="mr-1">🗑️</span> 削除
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/30 text-slate-400 text-[11px] uppercase font-black tracking-widest border-b">
                    <tr>
                      <th className="px-8 py-4 w-20">No.</th>
                      <th className="px-8 py-4">名前</th>
                      <th className="px-8 py-4">児童の提出</th>
                      <th className="px-8 py-4">先生の確認</th>
                      <th className="px-8 py-4">最終更新</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.sort((a,b) => a.number - b.number).map(s => {
                      const sub = hwSubmissions.find(sub => sub.studentId === s.id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-4 text-xs text-slate-300 font-black">{s.number}</td>
                          <td className="px-8 py-4 text-base font-black text-slate-700">{s.name}</td>
                          <td className="px-8 py-4">
                            {sub?.touchRecorded ? (
                              <div className="inline-flex items-center bg-green-50 text-green-600 px-3 py-1 rounded-lg text-xs font-black ring-1 ring-green-100">
                                <span className="mr-1.5">📦</span> 提出: {sub.touchDate} {sub.touchTime}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 font-black italic">未提出</span>
                            )}
                          </td>
                          <td className="px-8 py-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!sub?.checked}
                                onChange={() => handleToggleCheck(hw.id, s.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          </td>
                          <td className="px-8 py-4 text-[11px] text-slate-400 font-bold font-mono">
                            {sub?.checked ? `${sub.submittedDate} ${sub.submittedTime}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {homeworkList.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
            <div className="text-6xl mb-6 opacity-20">📭</div>
            <p className="text-slate-300 font-black text-xl">まだ登録されている宿題はありません</p>
            <p className="text-slate-300 text-sm font-bold mt-2">上のフォームから宿題を登録して始めましょう</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkView;
