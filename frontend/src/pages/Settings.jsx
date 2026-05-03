import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';

const defaultSettings = {
  privateProfile: false,
  darkMode: false,
  language: 'vi',
};

const languageLabels = {
  vi: 'Tiếng Việt',
  en: 'English',
};

const copyByLanguage = {
  vi: {
    settingsTitle: 'Cài đặt tài khoản',
    username: 'Tên đăng nhập',
    email: 'Email',
    role: 'Vai trò',
    admin: 'Admin',
    member: 'Thành viên',
    emailFallback: 'Chưa cập nhật',
    emailMissing: 'Chưa cập nhật email',
    accountInfo: 'Thông tin đăng nhập',
    adminHint: 'Tài khoản này có quyền mở Admin panel và chỉnh theme server.',
    password: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu mới',
    privacy: 'Quyền riêng tư',
    privateProfile: 'Hồ sơ riêng tư',
    privateProfileDescription: 'Ẩn bớt thông tin cá nhân với người chưa được phép xem.',
    display: 'Giao diện',
    darkMode: 'Chế độ tối',
    darkModeDescription: 'Áp dụng giao diện tối cho toàn bộ app.',
    language: 'Ngôn ngữ',
    save: 'Lưu cài đặt',
    saving: 'Đang lưu...',
    logout: 'Đăng xuất',
    logoutConfirm: 'Đăng xuất khỏi tài khoản này?',
    loadFailed: 'Không thể tải cài đặt tài khoản.',
    passwordRequired: 'Vui lòng nhập đủ các ô đổi mật khẩu.',
    passwordTooShort: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
    passwordMismatch: 'Xác nhận mật khẩu không khớp.',
    saved: 'Đã lưu cài đặt.',
    savedPassword: 'Đã lưu cài đặt và đổi mật khẩu.',
  },
  en: {
    settingsTitle: 'Account settings',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    admin: 'Admin',
    member: 'Member',
    emailFallback: 'Not updated',
    emailMissing: 'Email not updated',
    accountInfo: 'Login information',
    adminHint: 'This account can open the Admin panel and edit the server theme.',
    password: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    privacy: 'Privacy',
    privateProfile: 'Private profile',
    privateProfileDescription: 'Hide personal details from people who are not allowed to view them.',
    display: 'Appearance',
    darkMode: 'Dark mode',
    darkModeDescription: 'Apply the dark theme across the app.',
    language: 'Language',
    save: 'Save settings',
    saving: 'Saving...',
    logout: 'Log out',
    logoutConfirm: 'Log out of this account?',
    loadFailed: 'Unable to load account settings.',
    passwordRequired: 'Please fill in all password fields.',
    passwordTooShort: 'New password must be at least 6 characters.',
    passwordMismatch: 'Password confirmation does not match.',
    saved: 'Settings saved.',
    savedPassword: 'Settings and password saved.',
  },
};

function ToggleSwitch({ checked, label }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative inline-flex h-7 w-14 shrink-0 rounded-full transition ${
        checked ? 'bg-[var(--accent)]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-8' : 'translate-x-1'
        }`}
      />
    </span>
  );
}

function Settings({ currentSettings = defaultSettings, currentUserInfo, onSettingsSaved, onUserUpdated }) {
  const currentUser = currentUserInfo?.username || localStorage.getItem('username');
  const [settings, setSettings] = useState({ ...defaultSettings, ...currentSettings });
  const [profile, setProfile] = useState(currentUserInfo || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const copy = copyByLanguage[settings.language] || copyByLanguage.vi;
  const isAdmin = profile?.role === 'admin';
  const roleLabel = isAdmin ? copy.admin : copy.member;
  const hasPasswordInput = Boolean(passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword);

  const accountRows = useMemo(() => [
    { label: copy.username, value: profile?.username || currentUser || 'N/A' },
    { label: copy.email, value: profile?.email || copy.emailFallback },
    { label: copy.role, value: roleLabel },
  ], [copy.email, copy.emailFallback, copy.role, copy.username, currentUser, profile?.email, profile?.username, roleLabel]);

  useEffect(() => {
    setSettings({ ...defaultSettings, ...currentSettings });
  }, [currentSettings]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const [profileRes, settingsRes] = await Promise.all([
          axios.get(`/api/users/${currentUser}`),
          axios.get(`/api/users/${currentUser}/settings`),
        ]);

        if (cancelled) return;

        setProfile(profileRes.data);
        onUserUpdated?.(profileRes.data);
        setSettings({ ...defaultSettings, ...(settingsRes.data || {}) });
      } catch (error) {
        if (!cancelled) {
          setMessage({ type: 'error', text: copy.loadFailed });
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!message.text) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message.text]);

  const updatePasswordField = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'darkMode' || key === 'language') {
        onSettingsSaved?.(next);
      }
      return next;
    });
  };

  const saveSettings = async (event) => {
    event?.preventDefault?.();

    if (hasPasswordInput) {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setMessage({ type: 'error', text: copy.passwordRequired });
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        setMessage({ type: 'error', text: copy.passwordTooShort });
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setMessage({ type: 'error', text: copy.passwordMismatch });
        return;
      }
    }

    try {
      setSaving(true);
      const settingsRes = await axios.put(`/api/users/${currentUser}/settings`, settings);
      onSettingsSaved?.(settingsRes.data);

      if (hasPasswordInput) {
        await axios.put(`/api/users/${currentUser}/password`, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }

      const profileRes = await axios.get(`/api/users/${currentUser}`);
      setProfile(profileRes.data);
      onUserUpdated?.(profileRes.data);
      setMessage({ type: 'success', text: hasPasswordInput ? copy.savedPassword : copy.saved });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Không thể lưu cài đặt.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm(copy.logoutConfirm)) {
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <main className="main-container max-w-5xl">
      <div className="grid gap-6">
        <section className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar value={profile?.avatar} name={profile?.username || currentUser || 'User'} className="h-16 w-16 text-xl" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">{copy.settingsTitle}</p>
                <h1 className="mt-1 text-3xl font-black text-[var(--text-primary)]">{profile?.username || currentUser || 'User'}</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{profile?.email || copy.emailMissing}</p>
              </div>
            </div>
            <span className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-black ${isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'}`}>
              {roleLabel}
            </span>
          </div>
        </section>

        {message.text && (
          <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="grid gap-6">
            <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.accountInfo}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {accountRows.map((row) => (
                  <div key={row.label} className="rounded-xl bg-[var(--surface-muted)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{row.label}</p>
                    <p className="mt-2 break-words font-bold text-[var(--text-primary)]">{row.value}</p>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {copy.adminHint}
                </p>
              )}
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.password}</h2>
              <div className="mt-5 grid gap-4">
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                  className="input-field"
                  placeholder={copy.currentPassword}
                  autoComplete="current-password"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                    className="input-field"
                    placeholder={copy.newPassword}
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                    className="input-field"
                    placeholder={copy.confirmPassword}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-6">
            <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.privacy}</h2>
              <button
                type="button"
                onClick={() => updateSetting('privateProfile', !settings.privateProfile)}
                className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl bg-[var(--surface-muted)] p-4 text-left transition hover:ring-2 hover:ring-[var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{copy.privateProfile}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{copy.privateProfileDescription}</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(settings.privateProfile)}
                  label={copy.privateProfile}
                />
              </button>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.display}</h2>
              <div className="mt-5 grid gap-4">
                <button
                  type="button"
                  onClick={() => updateSetting('darkMode', !settings.darkMode)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl bg-[var(--surface-muted)] p-4 text-left transition hover:ring-2 hover:ring-[var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{copy.darkMode}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{copy.darkModeDescription}</p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(settings.darkMode)}
                    label={copy.darkMode}
                  />
                </button>
                <label className="grid gap-2 rounded-xl bg-[var(--surface-muted)] p-4">
                  <span className="font-bold text-[var(--text-primary)]">{copy.language}</span>
                  <select
                    value={settings.language}
                    onChange={(event) => updateSetting('language', event.target.value)}
                    className="input-field bg-[var(--surface-elevated)]"
                  >
                    {Object.entries(languageLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={saveSettings} disabled={saving} className="btn-success flex-1 py-3">
                {saving ? copy.saving : copy.save}
              </button>
              <button type="button" onClick={handleLogout} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700 transition hover:bg-red-100">
                {copy.logout}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Settings;
