import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "./components/AuthForm";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RightSidebar from "./components/RightSidebar";
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";
import StatisticsCard from "./components/StatisticsCard";
import Share from "./pages/Share";
import Jobs from "./pages/Jobs";
import ChatRoomPage from "./pages/ChatRoom";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import Friends from "./pages/Friends";
import Feedback from "./pages/Feedback";
import MobileBottomNav from "./components/MobileBottomNav";
import { getLevelInfo } from "./utils/level";

const defaultSettings = {
  privateProfile: false,
  darkMode: false,
  language: 'vi',
};

const defaultTheme = {
  brandName: 'Cộng đồng sinh viên NTTU',
  accent: '#2563eb',
  accentStrong: '#0f766e',
  pageBg: '#f3f6fb',
  sidebarBg: 'rgba(15, 23, 42, 0.96)',
  customCss: '',
};

const copyByLanguage = {
  vi: {
    welcomeTitle: 'Chào mừng quay lại',
    welcomeDescription: 'Tiếp tục học tập, phát triển và kết nối với các sinh viên khác',
    reputation: 'Uy tín',
    level: 'Cấp',
    loading: 'Đang tải',
    notificationBadge: 'Thông báo mới',
    dismiss: 'Để sau',
    openChat: 'Mở chat',
    communityRoom: 'Vào cộng đồng',
    notificationFallbackTitle: 'Thông báo từ cộng đồng sinh viên NTTU',
    notificationFallbackBody: 'Bạn đã đăng nhập thành công. Hãy khám phá cập nhật mới nhất từ cộng đồng.',
    adminDeniedTitle: 'Bạn không có quyền mở panel',
    adminDeniedBody: 'Panel quản trị chỉ hiển thị với tài khoản có role admin.',
  },
  en: {
    welcomeTitle: 'Welcome back',
    welcomeDescription: 'Keep learning, growing, and connecting with other students',
    reputation: 'Reputation',
    level: 'Level',
    loading: 'Loading',
    notificationBadge: 'New notice',
    dismiss: 'Later',
    openChat: 'Open chat',
    communityRoom: 'Join community',
    notificationFallbackTitle: 'NTTU community notice',
    notificationFallbackBody: 'You have signed in successfully. Check out the latest community updates.',
    adminDeniedTitle: 'You do not have access to this panel',
    adminDeniedBody: 'The admin panel is only visible to accounts with the admin role.',
  },
};

const normalizeSettings = (settings) => ({ ...defaultSettings, ...(settings || {}) });

function DashboardOverview({ user, copy, brandName, language }) {
  const levelInfo = getLevelInfo(user);

  return (
    <main className="main-container max-w-7xl">
      <section className="mb-8 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{brandName}</p>
            <h1 className="text-3xl font-black leading-tight text-[var(--text-primary)] md:text-4xl">
              {copy.welcomeTitle}, {user?.username || 'User'}
            </h1>
            <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">{copy.welcomeDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:min-w-64">
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{copy.reputation}</p>
              <p className="mt-1 text-2xl font-black text-[var(--accent)]">{user?.reputation || 0}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{copy.level}</p>
              <p className="mt-1 text-2xl font-black text-[var(--accent-strong)]">
                {levelInfo.level}
              </p>
              <p className="mt-1 text-[11px] font-bold text-[var(--text-muted)]">{levelInfo.title}</p>
            </div>
          </div>
        </div>
      </section>

      <StatisticsCard language={language} />
      <QuickActions language={language} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <RecentActivity language={language} />
        <RightSidebar language={language} />
      </div>
    </main>
  );
}

function LoginAnnouncementModal({ open, announcement, language, brandName, onClose, onOpenChat }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;

  if (!open || !announcement) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-8 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-strong)]">
          <span>🔔</span>
          <span>{copy.notificationBadge}</span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{announcement.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{announcement.body}</p>
        <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">
          {announcement.createdBy ? `@${announcement.createdBy}` : brandName}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--border-color)] px-4 py-3 font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
          >
            {copy.dismiss}
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-5 py-3 font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition hover:opacity-95"
          >
            {copy.openChat}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(defaultSettings);
  const [theme, setTheme] = useState(defaultTheme);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [showLoginAnnouncement, setShowLoginAnnouncement] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const language = settings.language || 'vi';
  const copy = useMemo(() => copyByLanguage[language] || copyByLanguage.vi, [language]);
  const brandName = theme.brandName || defaultTheme.brandName;

  const handleUserChange = (nextUser) => {
    setUser(nextUser);
    if (nextUser?.username) {
      localStorage.setItem('username', nextUser.username);
      localStorage.setItem('user', JSON.stringify(nextUser));
      navigate('/');
    }
  };

  const handleUserUpdated = (nextUser) => {
    setUser((current) => {
      const merged = { ...(current || {}), ...(nextUser || {}) };
      if (merged.username) {
        localStorage.setItem('username', merged.username);
        localStorage.setItem('user', JSON.stringify(merged));
      }
      return merged;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    setUser(null);
    setSettings(defaultSettings);
    setLatestAnnouncement(null);
    setShowLoginAnnouncement(false);
    navigate('/');
  };

  const handleOpenChat = () => {
    setShowLoginAnnouncement(false);
    navigate('/chat');
  };

  const handleSettingsSaved = (nextSettings) => {
    setSettings(normalizeSettings(nextSettings));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Verify token is still valid with a lightweight call
        axios.get(`/api/users/${parsedUser.username}/settings`)
          .then(() => {
            setUser(parsedUser);
            localStorage.setItem('username', parsedUser.username);
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('username');
            delete axios.defaults.headers.common['Authorization'];
          })
          .finally(() => setLoading(false));
        return;
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('username');
      }
    }
    setLoading(false);
  }, []);

  // Global 401 interceptor — auto-logout on expired tokens
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && user) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('username');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setSettings(defaultSettings);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [user]);

  useEffect(() => {
    const handleStoredUserUpdate = (event) => {
      const nextUser = event.detail;
      if (!nextUser?.username) return;
      setUser((current) => current?.username === nextUser.username ? { ...current, ...nextUser } : current);
    };

    window.addEventListener('studentnet:user-updated', handleStoredUserUpdate);
    return () => window.removeEventListener('studentnet:user-updated', handleStoredUserUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      try {
        const res = await axios.get('/api/auth/theme');
        if (!cancelled) {
          setTheme({ ...defaultTheme, ...(res.data || {}) });
        }
      } catch (error) {
        if (!cancelled) {
          setTheme(defaultTheme);
        }
      }
    };

    loadTheme();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent || defaultTheme.accent);
    root.style.setProperty('--accent-strong', theme.accentStrong || defaultTheme.accentStrong);
    root.style.setProperty('--page-bg', settings.darkMode ? '#0f172a' : (theme.pageBg || defaultTheme.pageBg));
    root.style.setProperty('--sidebar-bg', settings.darkMode ? 'rgba(2, 6, 23, 0.98)' : (theme.sidebarBg || defaultTheme.sidebarBg));

    let styleTag = document.getElementById('server-theme-custom-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'server-theme-custom-css';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = theme.customCss || '';
  }, [settings.darkMode, theme]);

  useEffect(() => {
    if (!user?.username) {
      setSettings(defaultSettings);
      return;
    }

    let cancelled = false;

    const loadUserSettings = async () => {
      try {
        const [profileRes, settingsRes] = await Promise.all([
          axios.get(`/api/users/${user.username}`),
          axios.get(`/api/users/${user.username}/settings`),
        ]);
        if (!cancelled) {
          handleUserUpdated(profileRes.data);
          setSettings(normalizeSettings(settingsRes.data));
        }
      } catch (error) {
        if (!cancelled) {
          setSettings(defaultSettings);
        }
      }
    };

    loadUserSettings();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
  }, [settings.darkMode]);

  useEffect(() => {
    if (!user?.username) {
      setLatestAnnouncement(null);
      setShowLoginAnnouncement(false);
      return;
    }

    const dismissedKey = `announcement_dismissed_${user.username}`;
    if (sessionStorage.getItem(dismissedKey)) {
      return;
    }

    let cancelled = false;

    const loadLatestAnnouncement = async () => {
      try {
        const res = await axios.get('/api/auth/announcements');
        if (cancelled) {
          return;
        }

        const currentCopy = copyByLanguage[language] || copyByLanguage.vi;
        const latest = Array.isArray(res.data) && res.data.length > 0
          ? res.data[0]
          : {
              title: currentCopy.notificationFallbackTitle,
              body: currentCopy.notificationFallbackBody,
              createdBy: 'system',
            };

        setLatestAnnouncement(latest);
        setShowLoginAnnouncement(true);
      } catch (error) {
        if (!cancelled) {
          const currentCopy = copyByLanguage[language] || copyByLanguage.vi;
          setLatestAnnouncement({
            title: currentCopy.notificationFallbackTitle,
            body: currentCopy.notificationFallbackBody,
            createdBy: 'system',
          });
        }
      }
    };

    loadLatestAnnouncement();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-[var(--text-secondary)]">
        {copy.loading} {brandName}...
      </div>
    );
  }

  if (!user) {
    return <AuthForm setUser={handleUserChange} brandName={brandName} initialMode={location.pathname.includes('register') ? 'register' : 'login'} />;
  }

  return (
    <div className="app-shell min-h-screen flex">
      <Sidebar user={user} brandName={brandName} language={language} onLogout={handleLogout} mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="app-content flex-1">
        <TopBar
          user={user}
          language={language}
          onOpenNotifications={() => setShowLoginAnnouncement(Boolean(latestAnnouncement))}
          onOpenChat={handleOpenChat}
          onLogout={handleLogout}
          notificationCount={latestAnnouncement ? 1 : 0}
        />
        <Routes>
          <Route path="/" element={<DashboardOverview user={user} copy={copy} brandName={brandName} language={language} />} />
          <Route path="/share" element={<Share language={language} />} />
          <Route path="/jobs" element={<Jobs language={language} />} />
          <Route path="/chat" element={<ChatRoomPage language={language} />} />
          <Route path="/friends" element={<Friends language={language} />} />
          <Route path="/bookmarks" element={<Bookmarks language={language} />} />
          <Route path="/feedback" element={<Feedback language={language} />} />
          <Route path="/profile" element={<Profile language={language} />} />
          <Route
            path="/settings"
            element={<Settings currentSettings={settings} currentUserInfo={user} onSettingsSaved={handleSettingsSaved} onUserUpdated={handleUserUpdated} />}
          />
          <Route
            path="/admin"
            element={
              user?.role === 'admin'
              ? <AdminPanel currentUser={user} appTheme={theme} language={language} onThemeSaved={(nextTheme) => setTheme({ ...defaultTheme, ...(nextTheme || {}) })} />
                : <AdminAccessDenied copy={copy} />
            }
          />
          <Route path="*" element={<DashboardOverview user={user} copy={copy} brandName={brandName} language={language} />} />
        </Routes>
      </div>
      <MobileBottomNav language={language} />
      <LoginAnnouncementModal
        open={showLoginAnnouncement}
        announcement={latestAnnouncement}
        language={language}
        brandName={brandName}
        onClose={() => {
          setShowLoginAnnouncement(false);
          if (user?.username) {
            sessionStorage.setItem(`announcement_dismissed_${user.username}`, '1');
          }
        }}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
}

function AdminAccessDenied({ copy }) {
  return (
    <main className="main-container max-w-3xl">
      <section className="rounded-[1.25rem] border border-red-200 bg-[var(--surface-elevated)] p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-red-500">Admin only</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">{copy.adminDeniedTitle}</h1>
        <p className="mt-3 text-[var(--text-secondary)]">
          {copy.adminDeniedBody}
        </p>
      </section>
    </main>
  );
}

export default App;
