import React, { useEffect, useState } from 'react';
import axios from 'axios';

const labels = {
  vi: {
    members: 'Thành viên',
    messages: 'Tin nhắn',
    posts: 'Bài viết',
    jobs: 'Việc làm',
  },
  en: {
    members: 'Members',
    messages: 'Messages',
    posts: 'Posts',
    jobs: 'Jobs',
  },
};

const defaultStats = [
  { id: 'members', value: '5K+', icon: '👥', color: 'from-blue-500 to-blue-600' },
  { id: 'messages', value: '50K+', icon: '💬', color: 'from-violet-500 to-violet-600' },
  { id: 'posts', value: '2K+', icon: '📝', color: 'from-emerald-500 to-emerald-600' },
  { id: 'jobs', value: '100+', icon: '💼', color: 'from-amber-500 to-orange-500' },
];

function StatisticsCard({ language = 'vi' }) {
  const copy = labels[language] || labels.vi;
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    axios.get('/api/auth/statistics')
      .then((res) => {
        setStats([
          { id: 'members', value: res.data.members.toLocaleString(locale), icon: '👥', color: 'from-blue-500 to-blue-600' },
          { id: 'messages', value: res.data.messages.toLocaleString(locale), icon: '💬', color: 'from-violet-500 to-violet-600' },
          { id: 'posts', value: res.data.posts.toLocaleString(locale), icon: '📝', color: 'from-emerald-500 to-emerald-600' },
          { id: 'jobs', value: res.data.jobs.toLocaleString(locale), icon: '💼', color: 'from-amber-500 to-orange-500' },
        ]);
      })
      .catch((err) => console.error('Error fetching statistics:', err));
  }, [locale]);

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.id} className="stat-card group cursor-pointer">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} text-2xl transition-transform group-hover:scale-110`}>
            {stat.icon}
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{copy[stat.id]}</p>
          <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default StatisticsCard;
