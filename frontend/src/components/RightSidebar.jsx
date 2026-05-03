import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getLevelInfo } from '../utils/level';

const copyByLanguage = {
  vi: {
    topUsers: 'Người dùng nổi bật',
    upcomingEvents: 'Sự kiện sắp tới',
    loading: 'Đang tải...',
    level: 'Cấp',
    noUsers: 'Chưa có người dùng',
    noEvents: 'Chưa có sự kiện',
    at: 'lúc',
    upcoming: 'Sắp diễn ra',
  },
  en: {
    topUsers: 'Top users',
    upcomingEvents: 'Upcoming events',
    loading: 'Loading...',
    level: 'Level',
    noUsers: 'No users yet',
    noEvents: 'No events yet',
    at: 'at',
    upcoming: 'Coming soon',
  },
};

function RightSidebar({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadSidebarData = async () => {
      try {
        setLoading(true);
        const [usersRes, eventsRes] = await Promise.all([
          axios.get('/api/auth/top-users'),
          axios.get('/api/auth/events'),
        ]);

        if (!isMounted) {
          return;
        }

        setTopUsers(usersRes.data);
        setEvents(eventsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSidebarData();
    const intervalId = window.setInterval(loadSidebarData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const formatEventMeta = (event) => {
    const pieces = [event.date, event.time].filter(Boolean);
    return pieces.length > 0 ? pieces.join(` ${copy.at} `) : copy.upcoming;
  };

  return (
    <div className="space-y-6 overflow-y-auto xl:sticky xl:top-28">
      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{copy.topUsers}</h3>
        </div>

        {loading ? (
          <div className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.loading}</div>
        ) : topUsers.length > 0 ? (
          <div className="space-y-3">
            {topUsers.slice(0, 5).map((user, idx) => (
              <div
                key={user.username}
                className="flex items-center justify-between rounded-2xl border border-transparent bg-[var(--surface-muted)] p-3 transition hover:border-[var(--border-color)] hover:bg-[var(--surface-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}️⃣`}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user.username}</p>
                    <p className="text-xs text-[var(--text-muted)]">{copy.level} {getLevelInfo(user).level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--accent)]">{user.reputation}</p>
                  <p className="text-xs text-amber-500">{'⭐'.repeat(Math.min(5, Math.floor(user.reputation / 50)))}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.noUsers}</p>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{copy.upcomingEvents}</h3>
        </div>

        <div className="space-y-3">
          {events.length > 0 ? events.slice(0, 3).map((event) => (
            <div
              key={event._id}
              className="rounded-2xl border border-transparent bg-[var(--surface-muted)] p-3 transition hover:border-[var(--border-color)] hover:bg-[var(--surface-soft)]"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{event.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatEventMeta(event)}</p>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.noEvents}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;
