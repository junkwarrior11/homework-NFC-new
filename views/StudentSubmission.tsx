import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import { Student, Homework, HomeworkSubmission, ClassId, Grade } from '../types';
import NfcScannerModal from '../components/NfcScannerModal';

const StudentSubmission: React.FC = () => {
  // ステップ管理: 1:カード認識(ログイン), 2:宿題選択, 4:提出完了 (旧3は削除)
  const [step, setStep] = useState<1 | 2 | 4>(1);
  const [nfcInput, setNfcInput] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [todayHw, setTodayHw] = useState<Homework[]>([]);
  const [selectedHwIds, setSelectedHwIds] = useState<number[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);

  // 🔥 自動NFCスキャン: step 1 で自動的にNFCリスニング開始
  useEffect(() => {
    if (step === 1) {
      window.electron?.startNFCListener?.();
    }
    return () => {
      window.electron?.stopNFCListener?.();
    };
  }, [step]);

  // 🔥 NFCカード検出時の自動ログイン
  useEffect(() => {
    const handleCardDetected = (_event: any, data: { uid: string }) => {
      if (step === 1) {
        handleReadCard(data.uid);
      }
    };

    window.electron?.onNFCCard?.(handleCardDetected);
    
    return () => {
      window.electron?.removeNFCListener?.(handleCardDetected);
    };
  }, [step]);

  // 🔥 提出完了後3秒で自動リセット
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        resetFlow();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // 初回読み込みとデータの同期
  useEffect(() => {
    if (!student) return;
    
    const now = new Date();
    const day = String(now.getDay());
    const hwList = Storage.getHomework(student.grade, student.classId).filter(h => 
        (Array.isArray(h.dayOfWeek) && (h.dayOfWeek.includes(day as any) || h.dayOfWeek.includes('everyday'))) ||
        (h.dayOfWeek as any === day || h.dayOfWeek as any === 'everyday')
    );
    setTodayHw(hwList);
    setSubmissions(Storage.getHomeworkSubmissions(student.grade, student.classId));
  }, [student]);

  // カード認識（ログイン処理）
  const handleReadCard = (id?: string) => {
    const targetId = id || nfcInput.trim();
    if (!targetId) return;
    
    // Search students from all grades and classes
    const allGrades: Grade[] = ['1年', '2年', '3年', '4年', '5年', '6年'];
    const allClasses: ClassId[] = ['い組', 'ろ組'];
    let foundStudent: Student | undefined;
    
    for (const grade of allGrades) {
      for (const classId of allClasses) {
        const students = Storage.getStudents(grade, classId);
        foundStudent = students.find(st => st.nfcId === targetId);
        if (foundStudent) break;
      }
      if (foundStudent) break;
    }
    
    if (!foundStudent) {
      alert("カードIDが見つかりませんでした。正しいIDを入力してください。");
      setNfcInput('');
      return;
    }
    
    setStudent(foundStudent);
    setStep(2);
    setNfcInput(''); 
  };

  // 宿題の選択切り替え
  const handleToggleSelect = (id: number) => {
    const isAlreadySubmitted = submissions.some(sub => sub.homeworkId === id && sub.studentId === student?.id && sub.touchRecorded);
    if (isAlreadySubmitted) return;

    if (selectedHwIds.includes(id)) {
      setSelectedHwIds(selectedHwIds.filter(hId => hId !== id));
    } else {
      setSelectedHwIds([...selectedHwIds, id]);
    }
  };

  // 🔥 提出取り消し機能
  const handleCancelSubmission = (homeworkId: number) => {
    if (!student) return;
    
    const confirmed = confirm("この宿題の提出を取り消しますか？");
    if (!confirmed) return;
    
    let updatedSubmissions = [...Storage.getHomeworkSubmissions(student.grade, student.classId)];
    const idx = updatedSubmissions.findIndex(sub => sub.homeworkId === homeworkId && sub.studentId === student.id);
    
    if (idx >= 0) {
      updatedSubmissions[idx] = {
        ...updatedSubmissions[idx],
        touchRecorded: false,
        touchRecordedAt: null,
        touchDate: null,
        touchTime: null
      };
      Storage.saveHomeworkSubmissions(updatedSubmissions, student.grade, student.classId);
      setSubmissions(updatedSubmissions);
      alert("提出を取り消しました。");
    }
  };

  // 一括提出処理
  const performBulkSubmission = (ids: number[]) => {
    if (!student || ids.length === 0) return;
    
    const now = new Date();
    let updatedSubmissions = [...Storage.getHomeworkSubmissions(student.grade, student.classId)];

    ids.forEach(hwId => {
      const idx = updatedSubmissions.findIndex(sub => sub.homeworkId === hwId && sub.studentId === student.id);
      const submissionData: Partial<HomeworkSubmission> = {
        touchRecorded: true,
        touchRecordedAt: now.toISOString(),
        touchDate: Storage.formatDate(now),
        touchTime: Storage.formatTime(now)
      };

      if (idx >= 0) {
        updatedSubmissions[idx] = { ...updatedSubmissions[idx], ...submissionData };
      } else {
        updatedSubmissions.push({
          id: `sub_${hwId}_${student.id}`,
          homeworkId: hwId,
          studentId: student.id,
          studentNumber: student.number,
          studentName: student.name,
          nfcId: student.nfcId,
          touchRecorded: true,
          touchRecordedAt: now.toISOString(),
          touchDate: Storage.formatDate(now),
          touchTime: Storage.formatTime(now),
          checked: false,
          checkedAt: null,
          submittedDate: null,
          submittedTime: null
        });
      }
    });

    Storage.saveHomeworkSubmissions(updatedSubmissions, student.grade, student.classId);
    setSubmissions(updatedSubmissions);
    setStep(4);
  };

  const handleSelectedConfirm = () => {
    if (selectedHwIds.length === 0) {
      alert("出す宿題を選んでください。");
      return;
    }
    performBulkSubmission(selectedHwIds);
  };

  const handleAllSelectAndStart = () => {
    const unsubmittedIds = todayHw
      .filter(h => !submissions.some(sub => sub.homeworkId === h.id && sub.studentId === student?.id && sub.touchRecorded))
      .map(h => h.id);
    
    if (unsubmittedIds.length === 0) {
      alert("今日の宿題はすべて提出されています！");
      return;
    }
    performBulkSubmission(unsubmittedIds);
  };

  const resetFlow = () => {
    setStep(1);
    setNfcInput('');
    const currentGrade = student?.grade;
    const currentClassId = student?.classId;
    setStudent(null);
    setSelectedHwIds([]);
    if (currentGrade && currentClassId) {
      setSubmissions(Storage.getHomeworkSubmissions(currentGrade, currentClassId));
    }
  };

  // --- UI レンダリング ---

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-4 px-4 min-h-screen flex items-center">
        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-blue-500 text-center relative overflow-hidden w-full">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 scale-150"></div>
            <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-full shadow-inner border-4 border-white">
              <span className="text-7xl block transform hover:scale-110 transition-transform duration-300">🎫</span>
            </div>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight leading-none">
            カードを<br/>
            <span className="text-blue-600">タッチ！</span>
          </h2>
          <p className="text-slate-500 mb-8 font-bold text-xl leading-relaxed">
            宿題をだすために、<br/>
            <span className="text-slate-800">じぶんのカード</span>をかざしてね。
          </p>
          
          {/* 🔥 カード待機中の表示（自動スキャン中） */}
          <div className="bg-blue-50 border-4 border-blue-200 rounded-3xl p-6 mb-6">
            <div className="animate-pulse">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">📡</span>
              </div>
              <p className="text-blue-700 font-black text-xl">
                カードをかざしてください
              </p>
              <p className="text-blue-600 text-sm font-bold mt-1">
                自動的にログインします
              </p>
            </div>
          </div>

          <div className="space-y-5 max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-bold">または</span>
              </div>
            </div>
            
            <div className="relative group">
              <input 
                type="text" 
                value={nfcInput}
                onChange={e => setNfcInput(e.target.value)}
                placeholder="カードIDを手入力"
                className="w-full text-2xl font-bold text-center border-3 border-slate-100 bg-slate-50 p-5 rounded-[2rem] focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300 shadow-inner group-hover:border-slate-200"
                onKeyDown={(e) => e.key === 'Enter' && handleReadCard()}
              />
            </div>
            <button 
              onClick={() => handleReadCard()}
              className="w-full bg-slate-900 text-white text-xl font-black py-5 rounded-[1.5rem] hover:bg-slate-800 shadow-xl active:scale-95 transition-all"
            >
              手入力でログイン
            </button>
          </div>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2 && student) {
    return (
      <div className="max-w-2xl mx-auto py-4 px-4 min-h-screen flex items-center">
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-t-6 border-green-400 w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="text-left">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black mb-1 inline-block">ログイン中</span>
              <h2 className="text-3xl font-black text-slate-800">{student.name} さん</h2>
            </div>
            <span className="text-5xl animate-bounce">👋</span>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-400 mb-3 flex items-center uppercase tracking-widest">
              📝 今日だす宿題をえらんでね
            </h3>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
              {todayHw.map(hw => {
                const isSubmitted = submissions.some(sub => sub.homeworkId === hw.id && sub.studentId === student.id && sub.touchRecorded);
                const isSelected = selectedHwIds.includes(hw.id);
                return (
                  <button
                    key={hw.id}
                    onClick={() => handleToggleSelect(hw.id)}
                    disabled={isSubmitted}
                    className={`w-full p-4 rounded-2xl border-3 text-left transition-all relative overflow-hidden flex items-center justify-between group ${
                      isSubmitted 
                      ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' 
                      : isSelected 
                        ? 'bg-blue-600 border-blue-800 text-white shadow-lg scale-[1.02]' 
                        : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div>
                      <h4 className="text-xl font-black mb-0.5 leading-tight">{hw.title}</h4>
                      <p className={`text-xs font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{hw.description}</p>
                    </div>
                    {isSubmitted ? (
                      // 🔥 提出済み → 取り消しボタン
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelSubmission(hw.id);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-sm font-black flex items-center shadow-sm transition-colors"
                      >
                        <span className="mr-1">🔄</span> 取り消し
                      </button>
                    ) : isSelected ? (
                      <div className="bg-white text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-black shadow-inner animate-pulse">
                        <span className="text-xl font-black">✓</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 border-3 border-slate-100 rounded-full group-hover:border-blue-200 transition-colors"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleSelectedConfirm}
              disabled={selectedHwIds.length === 0}
              className={`group flex flex-col items-center justify-center p-5 rounded-[2rem] shadow-xl transition-all ${
                selectedHwIds.length > 0 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1' 
                : 'bg-slate-100 text-slate-300'
              }`}
            >
              <span className="text-4xl mb-2">🎒</span>
              <span className="text-2xl font-black">これだけ出す</span>
              <span className="text-xs font-bold opacity-70 mt-0.5">{selectedHwIds.length}個 選択中</span>
            </button>
            <button 
              onClick={handleAllSelectAndStart}
              className="group bg-blue-600 text-white flex flex-col items-center justify-center p-5 rounded-[2rem] shadow-xl hover:bg-blue-700 hover:-translate-y-1 transition-all"
            >
              <span className="text-4xl mb-2">📦</span>
              <span className="text-2xl font-black">ぜんぶ一気にだす！</span>
              <span className="text-xs font-bold opacity-70 mt-0.5">のこり全部</span>
            </button>
            <button 
              onClick={resetFlow}
              className="sm:col-span-2 text-slate-400 text-base font-black py-3 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ← まちがえた（もどる）
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="max-w-xl mx-auto py-4 px-4 min-h-screen flex items-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-blue-500 text-center relative overflow-hidden w-full">
          <div className="absolute top-8 left-8 text-4xl animate-bounce">🎊</div>
          <div className="absolute top-16 right-10 text-4xl animate-bounce" style={{animationDelay: '0.2s'}}>⭐</div>
          <div className="absolute bottom-12 left-16 text-4xl animate-bounce" style={{animationDelay: '0.5s'}}>✨</div>
          <div className="absolute bottom-24 right-12 text-3xl animate-pulse">🎉</div>
          <div className="text-[8rem] mb-6 leading-none drop-shadow-2xl">🎖️</div>
          <h2 className="text-5xl font-black text-slate-800 mb-6 tracking-tighter">提出かんりょう！</h2>
          <p className="text-xl text-slate-500 font-bold mb-6 leading-relaxed">
            宿題をだしたよ。よくがんばりました！<br/>
            <span className="text-slate-800 font-black">タブレットを、つぎの人にかしてあげてね。</span>
          </p>
          
          {/* 🔥 3秒後の自動リセット表示 */}
          <div className="bg-blue-50 border-3 border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-blue-700 font-black text-lg">
              3秒後に自動的に戻ります...
            </p>
          </div>

          <button 
            onClick={resetFlow}
            className="w-full bg-slate-900 text-white text-3xl font-black py-8 rounded-[2rem] hover:bg-slate-800 shadow-2xl active:scale-95 transition-all border-b-[6px] border-slate-700"
          >
            すぐに交代する
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentSubmission;