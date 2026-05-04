import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const placeholders = {
  vi: 'Tìm bài viết, mọi người, công việc...',
  en: 'Search posts, people, jobs...',
};

const labels = {
  vi: {
    role: 'Thành viên',
    adminRole: 'Admin',
    notifications: 'Thông báo',
    notificationsHint: 'Xem thông báo hệ thống mới nhất',
    chat: 'Chat cộng đồng',
    chatHint: 'Mở nhanh phòng chat',
    profile: 'Hồ sơ',
    settings: 'Cài đặt',
    friends: 'Bạn bè',
    feedback: 'Feedback',
    adminPanel: 'Admin Panel',
    logout: 'Đăng xuất',
    menuHint: 'Mở menu tài khoản',
  },
  en: {
    role: 'Member',
    adminRole: 'Admin',
    notifications: 'Notifications',
    notificationsHint: 'See the latest system notice',
    chat: 'Community chat',
    chatHint: 'Open the chat room quickly',
    profile: 'Profile',
    settings: 'Settings',
    friends: 'Friends',
    feedback: 'Feedback',
    adminPanel: 'Admin Panel',
    logout: 'Log out',
    menuHint: 'Open account menu',
  },
};

const TopBar = React.forwardRef(function TopBar({ user, language = 'vi', onOpenNotifications, onOpenChat, onLogout, onOpenMenu, notificationCount = 0 }, ref) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [extraActions, setExtraActions] = useState([]);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  React.useImperativeHandle(ref, () => ({
    setExtraActions,
  }), []);
  const copy = useMemo(() => labels[language] || labels.vi, [language]);
  const placeholder = placeholders[language] || placeholders.vi;
  const roleLabel = user?.role === 'admin' ? copy.adminRole : copy.role;
  const accountActions = [
    { label: copy.profile, path: '/profile', icon: '👤' },
    { label: copy.friends, path: '/friends', icon: '🤝' },
    { label: copy.feedback, path: '/feedback', icon: '🛠️' },
    { label: copy.settings, path: '/settings', icon: '⚙️' },
    ...(user?.role === 'admin' ? [{ label: copy.adminPanel, path: '/admin', icon: '🔐', highlight: true }] : []),
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPath = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--surface-overlay)]/90 backdrop-blur-xl">
      <div className="topbar-inner flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="topbar-menu-btn hidden items-center justify-center rounded-xl bg-[var(--surface-muted)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="Open menu"
        >
          <span className="text-xl leading-none">☰</span>
        </button>

        <div className="topbar-search flex-1 max-w-2xl">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">🔍</span>
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field h-12 rounded-2xl border-0 bg-[var(--surface-muted)] pl-11 pr-4 text-sm shadow-none ring-1 ring-transparent focus:bg-[var(--surface-elevated)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {extraActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={action.className || 'flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90'}
            >
              {action.icon && <span>{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="topbar-notifications hidden min-w-[9rem] items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] md:flex"
            title={copy.notificationsHint}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg" aria-hidden="true">🔔</span>
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{copy.notifications}</span>
                <span className="block text-xs text-[var(--text-muted)]">{copy.notificationsHint}</span>
              </span>
            </span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent-strong)]">
              {notificationCount}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenChat}
            className="topbar-chat-btn hidden items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] md:flex"
            title={copy.chatHint}
          >
            <span className="text-lg" aria-hidden="true">💬</span>
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">{copy.chat}</span>
              <span className="block text-xs text-[var(--text-muted)]">{copy.chatHint}</span>
            </span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
              title={copy.menuHint}
              aria-expanded={menuOpen}
            >
              <div className="topbar-user-name hidden text-right sm:block">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.username || 'User'}</p>
                <p className={`text-xs ${user?.role === 'admin' ? 'font-bold text-amber-600' : 'text-[var(--text-muted)]'}`}>{roleLabel}</p>
              </div>
              <UserAvatar value={user?.avatar} name={user?.username || 'User'} className="topbar-avatar h-11 w-11 text-sm" />
              <span className={`hidden text-xs text-[var(--text-muted)] transition sm:inline ${menuOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-[var(--shadow-strong)]">
                <div className="mb-2 flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-3">
                  <UserAvatar value={user?.avatar} name={user?.username || 'User'} className="h-12 w-12 text-sm" />
                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--text-primary)]">{user?.username || 'User'}</p>
                    <p className={`text-sm font-bold ${user?.role === 'admin' ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>{roleLabel}</p>
                  </div>
                </div>

                <div className="grid gap-1">
                  {accountActions.map((action) => (
                    <button
                      key={action.path}
                      type="button"
                      onClick={() => openPath(action.path)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${
                        action.highlight
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--accent-strong)]'
                      }`}
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-red-50 px-3 py-3 text-left text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <span>🚪</span>
                  <span>{copy.logout}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

export default TopBar;
