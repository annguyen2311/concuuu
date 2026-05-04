import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AuthForm({ setUser, brandName = 'Cộng đồng sinh viên NTTU', initialMode = 'login', loginCoverImage, loginTitle, loginDescription, loginBadges }) {
  const displayTitle = loginTitle || brandName;
  const displayDescription = loginDescription || 'Không gian sinh viên NTTU kết nối, chia sẻ bài viết, tìm cơ hội việc làm và trò chuyện trong cộng đồng.';
  const displayBadges = loginBadges ? loginBadges.split(',').map(b => b.trim()).filter(Boolean) : ['Blog', 'Chat', 'Jobs'];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post('/api/auth/register', { username, email, password });
        setSuccess('Đăng ký thành công. Bạn có thể đăng nhập ngay.');
        setIsRegister(false);
        resetForm();
        return;
      }

      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('username', res.data.user.username);
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể kết nối server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--page-gradient), var(--page-bg)' }}>
      <section className="auth-section grid w-full max-w-5xl overflow-hidden rounded-[1.25rem] border border-white/40 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:grid-cols-[1fr_26rem]">
        <div
          className="auth-panel relative flex min-h-[34rem] flex-col justify-between bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] p-8 text-white"
          style={loginCoverImage ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${loginCoverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/25">
              N
            </div>
            <h1 className="mt-8 max-w-xl text-4xl font-black leading-tight md:text-5xl">{displayTitle}</h1>
            <p className="mt-4 max-w-lg text-base font-medium leading-7 text-white/82">
              {displayDescription}
            </p>
          </div>
          <div className="relative z-10 grid gap-3 text-center text-sm font-bold" style={{ gridTemplateColumns: `repeat(${Math.min(displayBadges.length, 4)}, minmax(0, 1fr))` }}>
            {displayBadges.map((badge) => (
              <div key={badge} className="rounded-xl bg-white/12 px-3 py-3 ring-1 ring-white/15">{badge}</div>
            ))}
          </div>
        </div>

        <div className="auth-form-side p-8">
          <div className="mb-8">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">
              {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">
              {isRegister ? 'Tham gia cộng đồng' : 'Chào mừng quay lại'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister ? 'Dùng email thật để hệ thống cấp quyền đúng vai trò.' : 'Có thể đăng nhập bằng username hoặc email.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="form-group">
              <span className="form-label">{isRegister ? 'Tên đăng nhập' : 'Tên đăng nhập hoặc email'}</span>
              <input
                className="input-field bg-slate-50 text-base"
                placeholder={isRegister ? 'vd: annguyen' : 'vd: annguyen hoặc email@nttu.edu.vn'}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </label>

            {isRegister && (
              <label className="form-group">
                <span className="form-label">Email</span>
                <input
                  className="input-field bg-slate-50 text-base"
                  type="email"
                  placeholder="vd: student@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </label>
            )}

            <label className="form-group">
              <span className="form-label">Mật khẩu</span>
              <input
                className="input-field bg-slate-50 text-base"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-2 min-h-12 w-full">
              {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">hoặc</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsRegister((value) => !value);
              setError('');
              setSuccess('');
              resetForm();
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-black text-[var(--accent)] transition hover:bg-slate-50"
          >
            {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default AuthForm;
