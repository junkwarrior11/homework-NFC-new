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
    homeworkCount: 0,
    totalSubmissionRate: 0,
    todaySubmissionRate: 0,
  });
  const [homeworkStats, setHomeworkStats] = useState<any[]>([]);
  const [todayUnsubmittedReports, setTodayUnsubmittedReports] = useState<TodayUnsubmittedReport[]>([]);
  const [studentBacklogReports, setStudentBacklogReports] = useState<StudentBacklogReport[]>([]);

  useEffect(() => {
    const students = Storage.getStudents(grade, classId);
    const homework = Storage.getHomework(grade, classId);
    const submissions = Storage.getHomeworkSubmissions(grade, classId);
    const today = Storage.formatDate(new Date());
    const dayOfWeek = String(new Date().getDay());

    let totalCheckRate = 0;
    if (homework.length > 0 && students.length > 0) {
      homework.forEach(hw => {
        const checkedCount = submissions.filter(s => s.homeworkId === hw.id && s.checked).length;
        totalCheckRate += (checkedCount / students.length) * 100;
      });
      totalCheckRate = Math.round(totalCheckRate / homework.length);
    }

    // Today's specific homework submissions
    const todayHw = homework.filter(h => 
        (Array.isArray(h.dayOfWeek) && (h.dayOfWeek.includes(dayOfWeek as any) || h.dayOfWeek.includes('everyday'))) ||
        (h.dayOfWeek as any === dayOfWeek || h.dayOfWeek as any === 'everyday')
    );
    
    let todayRate = 0;
    if (todayHw.length > 0 && students.length > 0) {
        let submissionCount = 0;
        todayHw.forEach(hw => {
            submissionCount += submissions.filter(s => s.homeworkId === hw.id && s.touchDate === today).length;
        });
        todayRate = Math.round((submissionCount / (todayHw.length * students.length)) * 100);
    }

    setStats({
      totalStudents: students.length,
      homeworkCount: homework.length,
      totalSubmissionRate: totalCheckRate,
      todaySubmissionRate: todayRate,
    });

    // Breakdown by homework
    const breakdown = homework.map(hw => {
        const submitted = submissions.filter(s => s.homeworkId === hw.id && s.touchRecorded).length;
        const checked = submissions.filter(s => s.homeworkId === hw.id && s.checked).length;
        return {
            title: hw.title,
            submitted: `${submitted}/${students.length}`,
            checked: `${checked}/${students.length}`,
            rate: Math.round((checked / (students.length || 1)) * 100)
        };
    });
    setHomeworkStats(breakdown);

    // 🔥 今日の未提出者レポート
    const todayReports: TodayUnsubmittedReport[] = todayHw.map(hw => {
      const submittedStudentIds = submissions
        .filter(sub => sub.homeworkId === hw.id && sub.touchRecorded)
        .map(sub => sub.studentId);
      
      const unsubmitted = students
        .filter(stu => !submittedStudentIds.includes(stu.id))
        .sort((a, b) => a.number - b.number);
      
      return {
        homework: hw,
        unsubmittedStudents: unsubmitted,
        submittedCount: submittedStudentIds.length,
        totalCount: students.length
      };
    });
    setTodayUnsubmittedReports(todayReports);

    // 🔥 児童別の未提出溜まり状況
    const backlogReports: StudentBacklogReport[] = students.map(student => {
      const submittedHomeworkIds = submissions
        .filter(sub => sub.studentId === student.id && sub.touchRecorded)
        .map(sub => sub.homeworkId);
      
      const unsubmittedHw = homework.filter(hw => !submittedHomeworkIds.includes(hw.id));
      
      return {
        student,
        unsubmittedHomework: unsubmittedHw,
        unsubmittedCount: unsubmittedHw.length
      };
    })
    .filter(report => report.unsubmittedCount > 0)
    .sort((a, b) => b.unsubmittedCount - a.unsubmittedCount);

    setStudentBacklogReports(backlogReports);
  }, [grade, classId]);

  // 🔥 今日の未提出者リストをCSVエクスポート
  const exportTodayUnsubmittedCSV = () => {
    if (todayUnsubmittedReports.length === 0) {
      alert('今日の宿題がありません');
      return;
    }

    const rows: string[] = [];
    rows.push('宿題名,日付,出席番号,氏名,NFC ID');

    todayUnsubmittedReports.forEach(report => {
      report.unsubmittedStudents.forEach(student => {
        rows.push([
          report.homework.title,
          formatDate(report.homework.date) || '―',
          student.number,
          student.name,
          student.nfcId || '―'
        ].join(','));
      });
    });

    downloadCSV(rows.join('\n'), `今日の未提出者_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 🔥 未提出が溜まっている児童リストをCSVエクスポート
  const exportStudentBacklogCSV = () => {
    if (studentBacklogReports.length === 0) {
      alert('未提出の児童がいません');
      return;
    }

    const rows: string[] = [];
    rows.push('出席番号,氏名,NFC ID,未提出件数,未提出の宿題');

    studentBacklogReports.forEach(report => {
      const homeworkTitles = report.unsubmittedHomework.map(hw => hw.title).join('・');
      rows.push([
        report.student.number,
        report.student.name,
        report.student.nfcId || '―',
        report.unsubmittedCount,
        `"${homeworkTitles}"`
      ].join(','));
    });

    downloadCSV(rows.join('\n'), `未提出溜まり児童_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // 🔥 全体の未提出者リストをCSVエクスポート（詳細版）
  const exportAllUnsubmittedCSV = () => {
    const students = Storage.getStudents(grade, classId);
    const homework = Storage.getHomework(grade, classId);
    const submissions = Storage.getHomeworkSubmissions(grade, classId);

    const rows: string[] = [];
    // ヘッダー行
    const header = ['出席番号', '氏名', 'NFC ID'];
    homework.forEach(hw => {
      header.push(hw.title);
    });
    rows.push(header.join(','));

    // データ行
    students.sort((a, b) => a.number - b.number).forEach(student => {
      const row = [student.number.toString(), student.name, student.nfcId || '―'];
      
      homework.forEach(hw => {
        const submitted = submissions.some(
          sub => sub.studentId === student.id && sub.homeworkId === hw.id && sub.touchRecorded
        );
        row.push(submitted ? '○' : '×');
      });
      
      rows.push(row.join(','));
    });

    downloadCSV(rows.join('\n'), `全宿題提出状況_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // CSVダウンロード関数
  const downloadCSV = (content: string, filename: string) => {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDayOfWeek = (dayOfWeek: string | string[]) => {
    const dayMap: { [key: string]: string } = {
      '0': '日', '1': '月', '2': '火', '3': '水', '4': '木', '5': '金', '6': '土',
      'everyday': '毎日'
    };
    
    if (Array.isArray(dayOfWeek)) {
      return dayOfWeek.map(d => dayMap[d] || d).join('・');
    }
    return dayMap[dayOfWeek] || dayOfWeek;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500 text-sm font-bold mb-2">登録児童数</span>
          <span className="text-5xl font-black text-slate-800">{stats.totalStudents}</span>
          <span className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Students</span>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500 text-sm font-bold mb-2">本日の提出率</span>
          <span className="text-5xl font-black text-blue-600">{stats.todaySubmissionRate}%</span>
          <span className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Today's Rate</span>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
          <span className="text-slate-500 text-sm font-bold mb-2">全体確認済み率</span>
          <span className="text-5xl font-black text-green-600">{stats.totalSubmissionRate}%</span>
          <span className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Checked Rate</span>
        </div>
      </div>

      {/* 🔥 CSVエクスポートボタン */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-800 flex items-center text-lg">
              <span className="mr-2">📥</span> データエクスポート
            </h3>
            <p className="text-slate-500 text-xs mt-1">未提出者リストをCSV形式でダウンロードできます</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={exportTodayUnsubmittedCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
          >
            <span className="mr-2">📅</span>
            今日の未提出者
          </button>
          <button
            onClick={exportStudentBacklogCSV}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
          >
            <span className="mr-2">⚠️</span>
            未提出溜まり児童
          </button>
          <button
            onClick={exportAllUnsubmittedCSV}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
          >
            <span className="mr-2">📊</span>
            全体提出状況
          </button>
        </div>
      </div>

      {/* 🔥 今日の未提出者リスト */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-blue-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <span className="mr-2">📅</span> 今日の提出状況
          </h3>
          <p className="text-slate-500 text-xs mt-1">本日の宿題の未提出者を表示しています</p>
        </div>
        <div className="p-6">
          {todayUnsubmittedReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎈</div>
              <p className="text-slate-400 font-bold">今日の宿題はありません</p>
            </div>
          ) : (
            <div className="space-y-6">
              {todayUnsubmittedReports.map(report => (
                <div key={report.homework.id} className="border-2 border-slate-100 rounded-xl p-5 hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-slate-800">{report.homework.title}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-full">
                          📅 今日
                        </span>
                        {report.homework.date && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            {formatDate(report.homework.date)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{report.homework.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-3xl font-black text-slate-800">
                        {report.submittedCount}/{report.totalCount}
                      </div>
                      <div className="text-xs text-slate-500 font-bold">提出済み</div>
                      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-black ${
                        report.unsubmittedStudents.length === 0 
                          ? 'bg-green-100 text-green-700' 
                          : report.unsubmittedStudents.length <= 3
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {report.unsubmittedStudents.length === 0 
                          ? '✓ 全員提出' 
                          : `${report.unsubmittedStudents.length}人未提出`}
                      </div>
                    </div>
                  </div>

                  {report.unsubmittedStudents.length > 0 ? (
                    <div>
                      <div className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">未提出の児童:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {report.unsubmittedStudents.map(student => (
                          <div
                            key={student.id}
                            className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors"
                          >
                            <span className="text-red-600 font-black text-sm">{student.number}</span>
                            <span className="text-slate-800 font-bold text-sm">{student.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4 bg-green-50 rounded-lg">
                      <span className="text-2xl mr-2">🎉</span>
                      <span className="text-green-700 font-black">全員提出済みです！</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔥 未提出が溜まっている児童リスト */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-orange-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <span className="mr-2">⚠️</span> 未提出が溜まっている児童
          </h3>
          <p className="text-slate-500 text-xs mt-1">全ての宿題の中で未提出が多い児童を表示しています</p>
        </div>
        <div className="p-6">
          {studentBacklogReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-slate-400 font-bold">全員の提出状況は良好です！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentBacklogReports.map(report => (
                <div 
                  key={report.student.id} 
                  className={`border-2 rounded-xl p-4 hover:shadow-md transition-all ${
                    report.unsubmittedCount >= 5 
                      ? 'border-red-300 bg-red-50' 
                      : report.unsubmittedCount >= 3
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl ${
                        report.unsubmittedCount >= 5 
                          ? 'bg-red-200 text-red-700' 
                          : report.unsubmittedCount >= 3
                          ? 'bg-orange-200 text-orange-700'
                          : 'bg-yellow-200 text-yellow-700'
                      }`}>
                        {report.unsubmittedCount}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-600 font-black text-sm">出席番号 {report.student.number}</span>
                          <span className="text-2xl font-black text-slate-800">{report.student.name}</span>
                        </div>
                        <div className="text-sm text-slate-600 font-bold">
                          {report.unsubmittedCount}件の宿題が未提出
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full font-black text-sm ${
                      report.unsubmittedCount >= 5 
                        ? 'bg-red-200 text-red-700' 
                        : report.unsubmittedCount >= 3
                        ? 'bg-orange-200 text-orange-700'
                        : 'bg-yellow-200 text-yellow-700'
                    }`}>
                      {report.unsubmittedCount >= 5 ? '🚨 要注意' : report.unsubmittedCount >= 3 ? '⚠️ 注意' : '💡 確認'}
                    </div>
                  </div>
                  
                  {/* 未提出の宿題リスト */}
                  <div className="mt-4 pt-4 border-t-2 border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">未提出の宿題:</div>
                    <div className="flex flex-wrap gap-2">
                      {report.unsubmittedHomework.map(hw => (
                        <span 
                          key={hw.id} 
                          className="px-3 py-1 bg-white border-2 border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-blue-300 transition-colors"
                        >
                          {hw.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <span className="mr-2">📝</span> 宿題別 提出・確認状況
          </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-slate-500 text-xs uppercase font-bold">
                    <tr>
                        <th className="px-6 py-4">宿題名</th>
                        <th className="px-6 py-4 text-center">提出（児童タッチ）</th>
                        <th className="px-6 py-4 text-center">確認（先生チェック）</th>
                        <th className="px-6 py-4">完了率</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {homeworkStats.map((hw, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-slate-800">{hw.title}</td>
                            <td className="px-6 py-4 text-center text-sm font-medium text-slate-600">{hw.submitted}</td>
                            <td className="px-6 py-4 text-center text-sm font-medium text-slate-600">{hw.checked}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden max-w-[100px]">
                                        <div className="bg-green-500 h-full" style={{ width: `${hw.rate}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">{hw.rate}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {homeworkStats.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">宿題が登録されていません</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 flex items-start space-x-4">
        <span className="text-3xl">💡</span>
        <div>
           <h4 className="font-bold text-indigo-800 mb-1">先生へのお知らせ</h4>
           <p className="text-indigo-700 text-sm leading-relaxed font-medium">
             児童がタブレットで「宿題を出す」をタッチすると、自動的に「提出」としてカウントされます。
             先生は「宿題管理」画面から、実際に提出された中身を確認してチェックを入れてください。
           </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
