import React, { useState, useEffect } from 'react';
import { Storage } from '../store';
import { ClassId, Grade, Homework, Student, HomeworkSubmission } from '../types';

interface Props {
  grade: Grade;
  classId: ClassId;
}

interface UnsubmittedReport {
  homework: Homework;
  unsubmittedStudents: Student[];
  submittedCount: number;
  totalCount: number;
}

const Dashboard: React.FC<Props> = ({ grade, classId }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    homeworkCount: 0,
    totalSubmissionRate: 0,
    todaySubmissionRate: 0,
  });
  const [homeworkStats, setHomeworkStats] = useState<any[]>([]);
  const [unsubmittedReports, setUnsubmittedReports] = useState<UnsubmittedReport[]>([]);

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

    // 🔥 未提出者レポートを作成
    const reports: UnsubmittedReport[] = homework.map(hw => {
      const submittedStudentIds = submissions
        .filter(sub => sub.homeworkId === hw.id && sub.touchRecorded)
        .map(sub => sub.studentId);
      
      const unsubmitted = students
        .filter(stu => !submittedStudentIds.includes(stu.id))
        .sort((a, b) => a.number - b.number); // 出席番号順
      
      return {
        homework: hw,
        unsubmittedStudents: unsubmitted,
        submittedCount: submittedStudentIds.length,
        totalCount: students.length
      };
    });

    setUnsubmittedReports(reports);
  }, [grade, classId]);

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

      {/* 🔥 未提出者リスト */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-red-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <span className="mr-2">📋</span> 未提出者リスト（宿題別）
          </h3>
          <p className="text-slate-500 text-xs mt-1">宿題ごとに未提出の児童を表示しています</p>
        </div>
        <div className="p-6">
          {unsubmittedReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-slate-400 font-bold">宿題が登録されていません</p>
            </div>
          ) : (
            <div className="space-y-6">
              {unsubmittedReports.map(report => (
                <div key={report.homework.id} className="border-2 border-slate-100 rounded-xl p-5 hover:border-blue-200 transition-colors">
                  {/* 宿題情報ヘッダー */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-slate-800">{report.homework.title}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-full">
                          {formatDayOfWeek(report.homework.dayOfWeek)}
                        </span>
                        {report.homework.date && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            📅 {formatDate(report.homework.date)}
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

                  {/* 未提出者リスト */}
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
