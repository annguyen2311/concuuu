import React, { useEffect, useState } from 'react';
import axios from 'axios';

const copyByLanguage = {
  vi: {
    title: 'Hoạt động gần đây',
    loading: 'Đang tải...',
    empty: 'Chưa có hoạt động',
    viewAll: 'Xem tất cả hoạt động →',
    unknown: 'Không rõ',
    minute: 'phút trước',
    hour: 'giờ trước',
    day: 'ngày trước',
    justNow: 'vừa xong',
    actions: {
      'đã đăng': 'đã đăng',
      'đã đăng tuyển': 'đã đăng tuyển',
      'đã ứng tuyển': 'đã ứng tuyển',
    },
  },
  en: {
    title: 'Recent activity',
    loading: 'Loading...',
    empty: 'No activity yet',
    viewAll: 'View all activity →',
    unknown: 'Unknown',
    minute: 'minutes ago',
    hour: 'hours ago',
    day: 'days ago',
    justNow: 'just now',
    actions: {
      'đã đăng': 'posted',
      'đã đăng tuyển': 'posted a job',
      'đã ứng tuyển': 'applied to',
    },
  },
};

function RecentActivity({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/auth/activities')
      .then((res) => {
        setActivities(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching activities:', err);
        setLoading(false);
      });
  }, []);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return copy.justNow;
    if (diffMins < 60) return `${diffMins} ${copy.minute}`;
    if (diffHours < 24) return `${diffHours} ${copy.hour}`;
    return `${diffDays} ${copy.day}`;
  };

  const formatAction = (action) => copy.actions[action] || action;

  return (
    <div className="card">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <h3 className="text-lg font-bold text-[var(--text-primary)]">{copy.title}</h3>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.loading}</p>
        ) : activities.length > 0 ? (
          activities.slice(0, 5).map((activity, idx) => (
            <div
              key={`${activity.username}-${activity.time}-${idx}`}
              className="-mx-2 flex items-start gap-4 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
            >
              <div className="avatar h-11 w-11 flex-shrink-0 text-sm">
                {(activity?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activity.icon}</span>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{activity?.username || copy.unknown}</span>
                    <span>{` ${formatAction(activity.action)} `}</span>
                    <span className="font-semibold text-[var(--accent)]">{activity.target}</span>
                  </p>
                </div>
                <p className="ml-7 mt-1 text-xs text-[var(--text-muted)]">{formatTimeAgo(activity.time)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.empty}</p>
        )}
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-2xl border border-[var(--border-color)] px-4 py-3 font-semibold text-[var(--accent)] transition hover:bg-[var(--surface-muted)]"
      >
        {copy.viewAll}
      </button>
    </div>
  );
}

export default RecentActivity;
