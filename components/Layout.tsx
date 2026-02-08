
import React from 'react';
import { UserMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userMode: UserMode;
  onLogout: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  userMode, 
  onLogout, 
  currentTab, 
  onTabChange
}) => {
  const teacherTabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
    { id: 'homework', label: '宿題管理', icon: '📝' },
    { id: 'students', label: '児童管理', icon: '🧒' },
    { id: 'export', label: 'データ出力', icon: '💾' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className={`text-white shadow-lg sticky top-0 z-50 ${userMode === 'teacher' ? 'bg-slate-800' : 'bg-blue-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{userMode === 'teacher' ? '📚' : '🏫'}</span>
            <h1 className="text-xl font-bold tracking-tight">
              ClassSync Pro 
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-white/20 uppercase tracking-widest font-bold">
                {userMode === 'teacher' ? '先生モード' : '児童モード'}
              </span>
            </h1>
          </div>
          
          <button 
            onClick={onLogout} 
            className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-sm transition-all flex items-center font-bold"
          >
            <span className="mr-2">{userMode === 'teacher' ? '🚪 ログアウト' : '⬅️ もどる'}</span>
          </button>
        </div>

        {/* Navigation - Only for Teacher */}
        {userMode === 'teacher' && (
          <nav className="bg-white border-b overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 flex">
              {teacherTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center py-3 px-6 border-b-2 transition-all min-w-[100px] ${
                    currentTab === tab.id 
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                      : 'border-transparent text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl mb-1">{tab.icon}</span>
                  <span className="text-xs font-bold">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t py-6 text-center text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-bold mb-1">ClassSync Pro - 小学校向け宿題提出システム</p>
          <p>&copy; 2026 すべての日本の小学校の先生と児童のために</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
