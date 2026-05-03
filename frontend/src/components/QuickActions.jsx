import React from 'react';
import { Link } from 'react-router-dom';

const copyByLanguage = {
  vi: {
    createPost: 'Tạo bài viết',
    openChat: 'Vào chat',
    findJobs: 'Tìm việc',
    viewProfile: 'Xem hồ sơ',
    shareBlog: 'Chia sẻ blog',
    settings: 'Cài đặt',
  },
  en: {
    createPost: 'Create post',
    openChat: 'Open chat',
    findJobs: 'Find jobs',
    viewProfile: 'View profile',
    shareBlog: 'Share blog',
    settings: 'Settings',
  },
};

function QuickActions({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const actions = [
    { icon: '📝', label: copy.createPost, color: 'from-blue-500 to-blue-600', path: '/share' },
    { icon: '💬', label: copy.openChat, color: 'from-violet-500 to-violet-600', path: '/chat' },
    { icon: '💼', label: copy.findJobs, color: 'from-emerald-500 to-emerald-600', path: '/jobs' },
    { icon: '👤', label: copy.viewProfile, color: 'from-amber-500 to-orange-500', path: '/profile' },
    { icon: '📚', label: copy.shareBlog, color: 'from-pink-500 to-rose-500', path: '/share' },
    { icon: '⚙️', label: copy.settings, color: 'from-slate-500 to-slate-700', path: '/settings' },
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.path}
          className={`quick-action-btn group bg-gradient-to-br ${action.color}`}
        >
          <div className="mb-3 text-3xl transition-transform group-hover:scale-125">{action.icon}</div>
          <p className="text-sm md:text-base">{action.label}</p>
        </Link>
      ))}
    </div>
  );
}

export default QuickActions;
