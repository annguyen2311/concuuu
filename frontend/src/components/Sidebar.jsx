import React, { useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { getLevelInfo } from '../utils/level';

const copyByLanguage = {
  vi: {
    dashboard: 'Bảng điều khiển',
    adminPanel: 'Admin panel',
    share: 'Blog & chia sẻ',
    chat: 'Chat cộng đồng',
    friends: 'Bạn bè',
    jobs: 'Việc làm',
    bookmarks: 'Đã lưu',
    feedback: 'Feedback',
    profile: 'Hồ sơ',
    settings: 'Cài đặt',
    tagline: 'Không gian kết nối sinh viên NTTU',
    adminUser: 'Admin hệ thống',
    memberUser: 'Thành viên cộng đồng',
    reputation: 'Uy tín',
    level: 'Cấp',
    logout: 'Đăng xuất',
  },
  en: {
    dashboard: 'Dashboard',
    adminPanel: 'Admin panel',
    share: 'Blog & sharing',
    chat: 'Community chat',
    friends: 'Friends',
    jobs: 'Jobs',
    bookmarks: 'Saved',
    feedback: 'Feedback',
    profile: 'Profile',
    settings: 'Settings',
    tagline: 'A connection space for NTTU students',
    adminUser: 'System admin',
    memberUser: 'Community member',
    reputation: 'Reputation',
    level: 'Level',
    logout: 'Log out',
  },
};

function Sidebar({ user, brandName = 'Cộng đồng sinh viên NTTU', language = 'vi', onLogout, mobileOpen = false, onCloseMobile }) {
  const isAdmin = user?.role === 'admin';
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const levelInfo = getLevelInfo(user);
  const menuItems = useMemo(() => {
    const baseItems = [
      { icon: '📊', label: copy.dashboard, path: '/' },
      ...(isAdmin ? [{ icon: '🔐', label: copy.adminPanel, path: '/admin' }] : []),
      { icon: '📚', label: copy.share, path: '/share' },
      { icon: '💬', label: copy.chat, path: '/chat' },
      { icon: '🤝', label: copy.friends, path: '/friends' },
      { icon: '💼', label: copy.jobs, path: '/jobs' },
      { icon: '🔖', label: copy.bookmarks, path: '/bookmarks' },
      { icon: '🛠️', label: copy.feedback, path: '/feedback' },
      { icon: '👤', label: copy.profile, path: '/profile' },
      { icon: '⚙️', label: copy.settings, path: '/settings' },
    ];

    return baseItems;
  }, [copy, isAdmin]);

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar-aside ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="mb-4 shrink-0 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/5">
          <Link to="/" className="flex items-center gap-4 transition-opacity hover:opacity-90" onClick={handleNavClick}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-lg font-black text-white shadow-lg shadow-[var(--accent)]/20">
              N
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">{brandName}</h1>
              <p className="text-xs text-[var(--sidebar-text-muted)]">{copy.tagline}</p>
            </div>
          </Link>
        </div>

        <nav className="sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 space-y-4 border-t border-white/10 pt-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/5">
            <div className="mb-4 flex items-center gap-3">
              <UserAvatar
                value={user?.avatar}
                name={user?.username || 'User'}
                className="h-12 w-12 border border-white/15 bg-white/15 shadow-none"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.username || 'User'}</p>
                <p className="text-xs text-[var(--sidebar-text-muted)]">{isAdmin ? copy.adminUser : copy.memberUser}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--sidebar-text-muted)]">{copy.reputation}</p>
                <p className="mt-1 text-lg font-bold text-white">{user?.reputation || 0}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--sidebar-text-muted)]">{copy.level}</p>
                <p className="mt-1 text-lg font-bold text-white">{levelInfo.level}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { onLogout(); handleNavClick(); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-500 hover:text-white"
          >
            <span aria-hidden="true">🚪</span>
            <span>{copy.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
