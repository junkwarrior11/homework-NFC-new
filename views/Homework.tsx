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
  const [expandedHwIds, setExpandedHwIds] = useState<Set<number>>(new Set());
  const [showNewForm, setShowNewForm] = useState(false);

  const daysOptions: { value: DayOfWeek; label: string }[] = [
    { value: '1', label: '月' },
    { value: '2', label: '火' },
    { value: '3', label: '水' },
    { value: '4', label: '木' },
    { value: '5', label: '金' },
    { value: '6', label: '土' },
    { value: '0', label: '日' },
  ];

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
    setShowNewForm(false);
  };

  const handleEditHomework = (hw: Homework) => {
    setEditingHwId(hw.id);
    setFormData({
      title: hw.title,
      dayOfWeek: Array.isArray(hw.dayOfWeek) ? hw.dayOfWeek : [hw.dayOfWeek as any],
      description: hw.description
    });
    setShowNewForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingHwId(null);
    setFormData({ title: '', dayOfWeek: ['everyday'], description: '' });
    setShowNewForm(false);
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
    const today = Storage.formatDate(new Date());
    
    setSubmissions(prev => {
      // 🔥 今日の日付を含めて提出記録を検索
      const existingIndex = prev.findIndex(s => 
        s.homeworkId === homeworkId && 
        s.studentId === studentId && 
        s.touchDate === today
      );
      
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
          id: `sub_${homeworkId}_${studentId}_${today}`,
          homeworkId,
          studentId,
          studentNumber: student.number,
          studentName: student.name,
          nfcId: student.nfcId,
          touchRecorded: false,
          touchRecordedAt: null,
          touchDate: today,
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

  const toggleExpand = (hwId: number) => {
    setExpandedHwIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hwId)) {
        newSet.delete(hwId);
      } else {
        newSet.add(hwId);
      }
      return newSet;
    });
  };

  const today = Storage.formatDate(new Date());

  return (
    <div className="space-y-6 pb-20">
      <Modal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 新規登録ボタン */}
      {!showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="text-2xl">➕</span>
          新しい宿題を登録する
        </button>
      )}

      {/* 新規登録・編集フォーム */}
      {showNewForm && (
        <div className={`bg-white p-6 rounded-3xl shadow-lg border-4 transition-all ${editingHwId ? 'border-indigo-400' : 'border-blue-400'}`}>
          <h3 className="text-xl font-black mb-6 flex items-center text-slate-800">
            {editingHwId ? '📝 宿題の内容を変更する' : '🆕 宿題の新規登録'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-slate-500 mb-2">宿題の名前</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="例: 算数プリント、漢字練習"
                  className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-500 mb-2">出す曜日</label>
                <div className="flex flex-wrap gap-2">
                  <button
                      type="button"
                      onClick={() => toggleDay('everyday')}
                      className={`px-4 py-2 rounded-lg font-black transition-all ${formData.dayOfWeek.includes('everyday') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                      毎日
                  </button>
                  {daysOptions.map(opt => (
                      <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleDay(opt.value)}
                          className={`w-10 h-10 rounded-lg font-black transition-all ${formData.dayOfWeek.includes(opt.value) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                      >
                          {opt.label}
                      </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-black text-slate-500">宿題の説明</label>
                  <button 
                      type="button" 
                      onClick={handleAiSuggest}
                      disabled={isAiGenerating}
                      className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 font-black"
                  >
                      {isAiGenerating ? '⏳ 生成中...' : '✨ AI生成'}
                  </button>
              </div>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold"
                rows={2}
                placeholder="児童に伝えるメッセージ"
              ></textarea>
            </div>
            <div className="flex space-x-3">
              <button 
                type="submit" 
                className={`flex-1 ${editingHwId ? 'bg-indigo-600' : 'bg-blue-600'} text-white px-6 py-3 rounded-xl font-black hover:opacity-90 transition-all`}
              >
                {editingHwId ? '変更を保存' : '登録する'}
              </button>
              <button 
                type="button" 
                onClick={cancelEdit}
                className="bg-slate-200 text-slate-600 px-6 py-3 rounded-xl hover:bg-slate-300 font-black transition-all"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 宿題リスト */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          📋 登録済みの宿題
        </h3>
        
        {homeworkList.map(hw => {
          const isExpanded = expandedHwIds.has(hw.id);
          // 🔥 今日の提出記録のみを取得
          const todaySubmissions = submissions.filter(s => 
            s.homeworkId === hw.id && s.touchDate === today
          );
          const submittedCount = todaySubmissions.filter(s => s.touchRecorded).length;
          const checkedCount = todaySubmissions.filter(s => s.checked).length;
          
          return (
            <div key={hw.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* ヘッダー部分（常に表示） */}
              <div 
                className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(hw.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-slate-800 text-lg">{hw.title}</h4>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                        {getDayNames(hw.dayOfWeek)}
                      </span>
                      <span className="text-sm text-slate-500 font-bold">
                        提出: {submittedCount}/{students.length} · 確認: {checkedCount}/{students.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEditHomework(hw); }} 
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all text-sm font-bold"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteHomework(hw.id); }} 
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all text-sm font-bold"
                    >
                      🗑️
                    </button>
                    <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* 展開部分（クリックで表示） */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {hw.description && (
                    <div className="px-6 py-3 bg-slate-50 text-sm text-slate-600 font-medium">
                      {hw.description}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {students.sort((a,b) => a.number - b.number).map(s => {
                        const sub = todaySubmissions.find(sub => sub.studentId === s.id);
                        return (
                          <div 
                            key={s.id} 
                            className={`p-3 rounded-lg border-2 transition-all ${
                              sub?.checked 
                                ? 'bg-green-50 border-green-200' 
                                : sub?.touchRecorded 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-400 font-black">{s.number}</span>
                              <label className="cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={!!sub?.checked}
                                  onChange={() => handleToggleCheck(hw.id, s.id)}
                                  className="w-4 h-4 accent-green-500"
                                />
                              </label>
                            </div>
                            <div className="font-bold text-sm text-slate-700">{s.name}</div>
                            {sub?.touchRecorded && (
                              <div className="text-xs text-green-600 font-bold mt-1">
                                📦 {sub.touchTime}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {homeworkList.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="text-6xl mb-4 opacity-20">📭</div>
            <p className="text-slate-400 font-bold">まだ宿題が登録されていません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkView;
