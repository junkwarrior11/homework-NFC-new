import React, { useState, useEffect, useRef } from 'react';
import { Storage } from './store';
import { UserMode, AppSettings, ClassId, Grade } from './types';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import HomeworkView from './views/Homework';
import StudentMaster from './views/StudentMaster';
import ExportView from './views/Export';
import StudentSubmission from './views/StudentSubmission';
import Modal from './components/Modal';

const App: React.FC = () => {
  const [userMode, setUserMode] = useState<UserMode | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassId | null>(null);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>({ password: '' });
  const [loginPass, setLoginPass] = useState('');
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // 🔥 パスワード入力欄への参照
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Storage.initializeDefaults();
    const savedSettings = Storage.getSettings();
    setSettings(savedSettings);
    
    // Check session
    const savedMode = sessionStorage.getItem('userMode') as UserMode;
    const isAuth = sessionStorage.getItem('isTeacherAuth') === 'true';
    
    if (savedMode === 'student') {
      setUserMode('student');
    } else if (savedMode === 'teacher' && isAuth) {
      setUserMode('teacher');
      setIsTeacherAuthenticated(true);
    }

    // Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // 🔥 パスワード入力欄が表示されたら常にフォーカス
  useEffect(() => {
    if (userMode === 'teacher' && !isTeacherAuthenticated && selectedGrade && selectedClass) {
      // 複数回フォーカスを試みる（より確実に）
      const timers = [
        setTimeout(() => passwordInputRef.current?.focus(), 0),
        setTimeout(() => passwordInputRef.current?.focus(), 50),
        setTimeout(() => passwordInputRef.current?.focus(), 100),
        setTimeout(() => passwordInputRef.current?.focus(), 200)
      ];
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [userMode, isTeacherAuthenticated, selectedGrade, selectedClass, loginPass]);

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

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPass === settings.password) {
      setIsTeacherAuthenticated(true);
      setUserMode('teacher');
      sessionStorage.setItem('isTeacherAuth', 'true');
      sessionStorage.setItem('userMode', 'teacher');
      setLoginPass('');
    } else {
      alert("パスワードが違います");
      setLoginPass('');
      // 🔥 エラー後も確実にフォーカス
      requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
      });
    }
  };

  const handleSelectMode = (mode: UserMode) => {
    if (mode === 'student') {
      setUserMode('student');
      sessionStorage.setItem('userMode', 'student');
    } else {
      setUserMode('teacher');
    }
  };

  const handleSelectGrade = (grade: Grade) => {
    setSelectedGrade(grade);
  };

  const handleSelectClass = (classId: ClassId) => {
    setSelectedClass(classId);
  };

  const handleExit = () => {
    setUserMode(null);
    setSelectedGrade(null);
    setSelectedClass(null);
    setIsTeacherAuthenticated(false);
    sessionStorage.removeItem('userMode');
    sessionStorage.removeItem('isTeacherAuth');
  };

  // Portal / Mode Selection Screen
  if (!userMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <Modal 
          isOpen={installModalOpen}
          title="ショートカットの作り方"
          message={`【iPhone/iPadの場合】\n1. 下の「共有ボタン(□に↑)」を押す\n2. 「ホーム画面に追加」を選ぶ\n\n【Android/PCの場合】\nブラウザ右上の「︙」から「アプリをインストール」または「ホーム画面に追加」を選んでください。`}
          type="alert"
          confirmText="とじる"
          onConfirm={() => setInstallModalOpen(false)}
          onCancel={() => setInstallModalOpen(false)}
        />

        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white tracking-tight mb-2">ClassSync Pro</h1>
            <p className="text-slate-400 text-xl font-bold">宿題の提出をもっとスムーズに、スマートに</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Student Portal Card */}
            <button 
              onClick={() => handleSelectMode('student')}
              className="bg-white rounded-[3rem] p-10 shadow-2xl hover:scale-105 transition-all group border-[12px] border-transparent hover:border-blue-400 text-center"
            >
              <div className="text-9xl mb-6 group-hover:animate-bounce">🧒</div>
              <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tight">児童の<br/>みなさん</h2>
              <p className="text-slate-500 font-bold text-xl leading-relaxed">宿題を出すときはこちらのボタンを押してね！</p>
            </button>

            {/* Teacher Portal Card */}
            <button 
              onClick={() => handleSelectMode('teacher')}
              className="bg-white rounded-[3rem] p-10 shadow-2xl hover:scale-105 transition-all group border-[12px] border-transparent hover:border-slate-700 text-center"
            >
              <div className="text-9xl mb-6 group-hover:rotate-12 transition-transform">👨‍🏫</div>
              <h2 className="text-6xl font-black text-slate-800 mb-6 tracking-tight">担任の<br/>先生</h2>
              <p className="text-slate-500 font-bold text-xl leading-relaxed">宿題の確認、児童名簿の管理はこちら。</p>
            </button>
          </div>
          
          <div className="mt-16 text-center">
             <button 
              onClick={handleInstallClick}
              className="inline-flex items-center space-x-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white px-8 py-4 rounded-full border border-slate-700 transition-all font-bold"
             >
                <span className="text-xl">📱</span>
                <span className="text-lg">ホーム画面にショートカットを作成する</span>
             </button>
             <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-6">Homework Management System</p>
          </div>
        </div>
      </div>
    );
  }

  // Grade Selection Screen (for teacher mode)
  if (userMode === 'teacher' && !selectedGrade) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border-t-8 border-indigo-600">
          <button onClick={handleExit} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center font-bold text-sm">
            ← モード選択に戻る
          </button>
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🎓</span>
            <h2 className="text-2xl font-black text-slate-800">学年を選択</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">担当する学年を選んでください</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(['1年', '2年', '3年', '4年', '5年', '6年'] as Grade[]).map((grade, index) => (
              <button
                key={grade}
                onClick={() => handleSelectGrade(grade)}
                className={`bg-gradient-to-br ${
                  ['from-red-400 to-red-500', 'from-orange-400 to-orange-500', 'from-yellow-400 to-yellow-500', 
                   'from-green-400 to-green-500', 'from-blue-400 to-blue-500', 'from-purple-400 to-purple-500'][index]
                } text-white font-black py-8 rounded-xl hover:scale-105 shadow-lg active:scale-95 transition-all text-2xl`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Class Selection Screen (for teacher mode)
  if (userMode === 'teacher' && selectedGrade && !selectedClass) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border-t-8 border-purple-600">
          <button onClick={() => setSelectedGrade(null)} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center font-bold text-sm">
            ← 学年選択に戻る
          </button>
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🏫</span>
            <h2 className="text-2xl font-black text-slate-800">{selectedGrade} クラスを選択</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">担当するクラスを選んでください</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => handleSelectClass('い組')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black py-6 rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-lg active:scale-[0.98] transition-all text-2xl"
            >
              🌸 い組
            </button>
            <button
              onClick={() => handleSelectClass('ろ組')}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black py-6 rounded-xl hover:from-green-600 hover:to-green-700 shadow-lg active:scale-[0.98] transition-all text-2xl"
            >
              🌼 ろ組
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Authentication Screen
  if (userMode === 'teacher' && !isTeacherAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border-t-8 border-blue-600">
          <button onClick={handleExit} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center font-bold text-sm">
            ← モード選択に戻る
          </button>
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🔑</span>
            <h2 className="text-2xl font-black text-slate-800">先生用ログイン</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">管理画面に入るためのパスワードが必要です</p>
          </div>
          <form onSubmit={handleTeacherLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
              <input 
                ref={passwordInputRef}
                type="password" 
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                onBlur={() => {
                  // 🔥 フォーカスが外れたら即座に戻す
                  setTimeout(() => passwordInputRef.current?.focus(), 0);
                }}
                placeholder="パスワードを入力"
                className="w-full px-4 py-4 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all text-lg"
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 shadow-lg active:scale-[0.98] transition-all text-lg">
              管理画面へ進む
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (userMode === 'student') return <StudentSubmission />;
    
    switch (currentTab) {
      case 'dashboard': return <Dashboard grade={selectedGrade!} classId={selectedClass!} />;
      case 'homework': return <HomeworkView grade={selectedGrade!} classId={selectedClass!} />;
      case 'students': return <StudentMaster grade={selectedGrade!} classId={selectedClass!} />;
      case 'export': return <ExportView grade={selectedGrade!} classId={selectedClass!} />;
      default: return <Dashboard grade={selectedGrade!} classId={selectedClass!} />;
    }
  };

  return (
    <Layout 
      userMode={userMode} 
      onLogout={handleExit}
      currentTab={currentTab}
      onTabChange={setCurrentTab}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
