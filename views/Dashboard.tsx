import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import { ClassId, Grade, Homework, Student, HomeworkSubmission } from '../types';

interface Props { 
  grade: Grade; 
  classId: ClassId; 
}

interface TodayUnsubmittedReport { 
  homework: Homework; 
  unsubmittedStudents: Student[]; 
  submittedCount: number; 
  totalCount: number; 
}

interface StudentBacklogReport { 
  student: Student; 
  unsubmittedHomework: Homework[]; 
  unsubmittedCount: number; 
}

const Dashboard: React.FC<Props> = ({ grade, classId }) => {
  const [stats, setStats] = useState({ 
    totalStudents: 0, 
    todayHomeworkCount: 0,
    todaySubmissionRate: 0 
  });
  const [todayUnsubmittedReports, setTodayUnsubmittedReports] = useState<TodayUnsubmittedReport[]>([]);
  const [studentBacklogReports, setStudentBacklogReports] = useState<StudentBacklogReport[]>([]);

  useEffect(() => {
    const students = Storage.getStudents(grade, classId);
    const allHomework = Storage.getHomework(grade, classId);
    const submissions = Storage.getHomeworkSubmissions(grade, classId);
    const today = Storage.formatDate(new Date());
    const dayOfWeek = String(new Date().getDay());

    // 今日の宿題を取得
    const todayHw = allHomework.filter(h => {
      if (Array.isArray(h.dayOfWeek)) {
        return h.dayOfWeek.includes(dayOfWeek as any) || h.dayOfWeek.includes('everyday');
      }
      return h.dayOfWeek === dayOfWeek || h.dayOfWeek === 'everyday';
    });

    // 今日の提出率を計算
    let todayRate = 0;
    if (todayHw.length && students.length) {
      let submittedCount = 0;
      todayHw.forEach(hw => {
        submittedCount += submissions.filter(s => 
          s.homeworkId === hw.id && s.touchDate === today && s.touchRecorded
        ).length;
      });
      todayRate = Math.round((submittedCount / (todayHw.length * students.length)) * 100);
    }

    setStats({
      totalStudents: students.length,
      todayHomeworkCount: todayHw.length,
      todaySubmissionRate: todayRate
    });

    // 今日の宿題の未提出者レポート
    const todayReports: TodayUnsubmittedReport[] = todayHw.map(hw => {
      const submittedStudentIds = submissions
        .filter(s => s.homeworkId === hw.id && s.touchRecorded)
        .map(s => s.studentId);
      
      const unsubmitted = students
        .filter(st => !submittedStudentIds.includes(st.id))
        .sort((a, b) => a.number - b.number);
      
      return {
        homework: hw,
        unsubmittedStudents: unsubmitted,
        submittedCount: submittedStudentIds.length,
        totalCount: students.length
      };
    });

    setTodayUnsubmittedReports(todayReports);

    // 未提出溜まり児童レポート（全宿題対象）
    const backlogReports: StudentBacklogReport[] = students
      .map(student => {
        const unsubmittedHw = allHomework.filter(hw => {
          const sub = submissions.find(s => s.homeworkId === hw.id && s.studentId === student.id);
          return !sub?.touchRecorded;
        });
        return {
          student,
          unsubmittedHomework: unsubmittedHw,
          unsubmittedCount: unsubmittedHw.length
        };
      })
      .filter(r => r.unsubmittedCount > 0)
      .sort((a, b) => b.unsubmittedCount - a.unsubmittedCount);

    setStudentBacklogReports(backlogReports);
  }, [grade, classId]);

  const formatDate = (d?: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const formatDayOfWeek = (dw: string | string[]) => {
    const map: Record<string, string> = {
      '0': '日', '1': '月', '2': '火', '3': '水', 
      '4': '木', '5': '金', '6': '土', 'everyday': '毎日'
    };
    if (Array.isArray(dw)) {
      return dw.map(v => map[v] || v).join('・');
    }
    return map[dw] || dw;
  };

  const downloadCSV = (content: string, filename: string) => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // CSV1: 今日の未提出者
  const exportTodayUnsubmittedCSV = () => {
    const headers = ['宿題名', '日付', '出席番号', '氏名', 'NFC ID'];
    const rows: string[] = [headers.join(',')];
    
    todayUnsubmittedReports.forEach(report => {
      report.unsubmittedStudents.forEach(student => {
        rows.push([
          `"${report.homework.title}"`,
          formatDate(report.homework.date) || formatDayOfWeek(report.homework.dayOfWeek),
          student.number.toString(),
          `"${student.name}"`,
          student.nfcId || ''
        ].join(','));
      });
    });
    
    const today = Storage.formatDate(new Date());
    downloadCSV(rows.join('\n'), `今日の未提出者_${today}.csv`);
  };

  // CSV2: 未提出溜まり児童
  const exportStudentBacklogCSV = () => {
    const headers = ['出席番号', '氏名', 'NFC ID', '未提出件数', '未提出の宿題'];
    const rows: string[] = [headers.join(',')];
    
    studentBacklogReports.forEach(report => {
      const homeworkTitles = report.unsubmittedHomework.map(hw => hw.title).join('、');
      rows.push([
        report.student.number.toString(),
        `"${report.student.name}"`,
        report.student.nfcId || '',
        report.unsubmittedCount.toString(),
        `"${homeworkTitles}"`
      ].join(','));
    });
    
    const today = Storage.formatDate(new Date());
    downloadCSV(rows.join('\n'), `未提出溜まり児童_${today}.csv`);
  };

  // CSV3: 全体提出状況
  const exportAllUnsubmittedCSV = () => {
    const students = Storage.getStudents(grade, classId);
    const allHomework = Storage.getHomework(grade, classId);
    const submissions = Storage.getHomeworkSubmissions(grade, classId);
    
    const headers = ['出席番号', '氏名', 'NFC ID', ...allHomework.map(hw => hw.title)];
    const rows: string[] = [headers.join(',')];
    
    students.sort((a, b) => a.number - b.number).forEach(student => {
      const row = [
        student.number.toString(),
        `"${student.name}"`,
        student.nfcId || ''
      ];
      
      allHomework.forEach(hw => {
        const sub = submissions.find(s => s.homeworkId === hw.id && s.studentId === student.id);
        row.push(sub?.touchRecorded ? '○' : '×');
      });
      
      rows.push(row.join(','));
    });
    
    const today = Storage.formatDate(new Date());
    downloadCSV(rows.join('\n'), `全宿題提出状況_${today}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-bold mb-1">児童数</p>
              <p className="text-4xl font-black text-slate-800">{stats.totalStudents}</p>
              <p className="text-slate-400 text-xs font-bold mt-1">人</p>
            </div>
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-bold mb-1">今日の宿題</p>
              <p className="text-4xl font-black text-slate-800">{stats.todayHomeworkCount}</p>
              <p className="text-slate-400 text-xs font-bold mt-1">件</p>
            </div>
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-3xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-bold mb-1">今日の提出率</p>
              <p className="text-4xl font-black text-slate-800">{stats.todaySubmissionRate}%</p>
              <p className="text-slate-400 text-xs font-bold mt-1">今日分</p>
            </div>
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSVエクスポートボタン */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
          📥 CSVエクスポート
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={exportTodayUnsubmittedCSV}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-bold transition-colors flex flex-col items-center gap-2"
          >
            <span className="text-2xl">📅</span>
            <span>今日の未提出者</span>
          </button>
          <button
            onClick={exportStudentBacklogCSV}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-xl font-bold transition-colors flex flex-col items-center gap-2"
          >
            <span className="text-2xl">⚠️</span>
            <span>未提出溜まり児童</span>
          </button>
          <button
            onClick={exportAllUnsubmittedCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold transition-colors flex flex-col items-center gap-2"
          >
            <span className="text-2xl">📊</span>
            <span>全体提出状況</span>
          </button>
        </div>
      </div>

      {/* 今日の未提出者リスト */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-red-50 rounded-t-2xl">
          <h3 className="text-xl font-black text-red-800 flex items-center">
            📅 今日の未提出者リスト
          </h3>
        </div>
        <div className="p-6">
          {todayUnsubmittedReports.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🎉</span>
              <p className="text-slate-500 text-lg font-bold">今日の宿題がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayUnsubmittedReports.map(report => (
                <div key={report.homework.id} className="border border-slate-200 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-slate-800 mb-2">{report.homework.title}</h3>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                          {formatDayOfWeek(report.homework.dayOfWeek)}
                        </span>
                        {report.homework.date && (
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
                            📅 {formatDate(report.homework.date)}
                          </span>
                        )}
                      </div>
                      {report.homework.description && (
                        <p className="text-slate-500 text-sm font-medium mt-2">{report.homework.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-4xl font-black text-slate-800 mb-1">
                        {report.submittedCount}/{report.totalCount}
                      </div>
                      <div>
                        {report.unsubmittedStudents.length === 0 ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                            ✓ 全員提出
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            report.unsubmittedStudents.length <= 3 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {report.unsubmittedStudents.length}人未提出
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {report.unsubmittedStudents.length > 0 && (
                    <div>
                      <div className="text-sm font-black text-slate-600 mb-3 uppercase tracking-wider">
                        未提出の児童:
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {report.unsubmittedStudents.map(student => (
                          <div 
                            key={student.id} 
                            className="flex items-center bg-red-50 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors"
                          >
                            <span className="text-red-600 font-black text-lg mr-2">{student.number}</span>
                            <span className="text-slate-700 font-bold text-sm">{student.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
