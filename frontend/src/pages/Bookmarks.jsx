import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';

const copyByLanguage = {
  vi: {
    eyebrow: 'Đã lưu',
    title: 'Thư viện cá nhân',
    subtitle: 'Lưu lại bài viết, tài liệu và cơ hội việc làm để quay lại nhanh hơn.',
    all: 'Tất cả',
    posts: 'Bài viết',
    jobs: 'Công việc',
    search: 'Tìm trong mục đã lưu...',
    loading: 'Đang tải mục đã lưu...',
    empty: 'Chưa có mục nào được lưu.',
    remove: 'Bỏ lưu',
    apply: 'Nộp đơn',
    applied: 'Đã gửi ứng tuyển và tự nhắn tin cho người đăng tuyển.',
    loginRequired: 'Vui lòng đăng nhập để tiếp tục.',
    post: 'Bài viết',
    job: 'Công việc',
    salary: 'Lương',
    location: 'Vị trí',
    likes: 'lượt thích',
    comments: 'bình luận',
  },
  en: {
    eyebrow: 'Saved',
    title: 'Personal library',
    subtitle: 'Keep posts, references, and job opportunities in one place for quick access.',
    all: 'All',
    posts: 'Posts',
    jobs: 'Jobs',
    search: 'Search saved items...',
    loading: 'Loading saved items...',
    empty: 'No saved items yet.',
    remove: 'Remove',
    apply: 'Apply',
    applied: 'Application submitted and a direct message was sent to the poster.',
    loginRequired: 'Please sign in to continue.',
    post: 'Post',
    job: 'Job',
    salary: 'Salary',
    location: 'Location',
    likes: 'likes',
    comments: 'comments',
  },
};

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN');
};

function Bookmarks({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [bookmarks, setBookmarks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const currentUser = localStorage.getItem('username');

  const showNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const loadBookmarks = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`/api/bookmarks/user/${currentUser}`);
      setBookmarks(res.data || []);
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bookmarks
      .filter((item) => {
        const type = item.bookmarkType || (item.author ? 'post' : 'job');
        if (filter === 'posts') return type === 'post';
        if (filter === 'jobs') return type === 'job';
        return true;
      })
      .filter((item) => !normalizedQuery
        || String(item.title || '').toLowerCase().includes(normalizedQuery)
        || String(item.content || '').toLowerCase().includes(normalizedQuery)
        || String(item.company || '').toLowerCase().includes(normalizedQuery)
        || String(item.author || '').toLowerCase().includes(normalizedQuery));
  }, [bookmarks, filter, query]);

  const removeBookmark = async (postId, type) => {
    try {
      await axios.delete('/api/bookmarks', { params: { userId: currentUser, postId, type } });
      setBookmarks((prev) => prev.filter((item) => !(item._id === postId && (item.bookmarkType || (item.author ? 'post' : 'job')) === type)));
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    }
  };

  const applyJob = async (jobId) => {
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }

    try {
      const res = await axios.post(`/api/jobs/${jobId}/apply`, { username: currentUser });
      if (res.data?.room?.id) {
        localStorage.setItem('preferredRoom', res.data.room.id);
      }
      showNotice(copy.applied);
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    }
  };

  const counts = {
    all: bookmarks.length,
    posts: bookmarks.filter((item) => item.author).length,
    jobs: bookmarks.filter((item) => item.company).length,
  };

  return (
    <main className="main-container max-w-7xl">
      <section className="mb-6 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)] md:text-4xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{copy.subtitle}</p>
      </section>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {notice}
        </div>
      )}

      <section className="mb-5 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={`${copy.all} (${counts.all})`} />
            <FilterButton active={filter === 'posts'} onClick={() => setFilter('posts')} label={`${copy.posts} (${counts.posts})`} />
            <FilterButton active={filter === 'jobs'} onClick={() => setFilter('jobs')} label={`${copy.jobs} (${counts.jobs})`} />
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="input-field lg:max-w-md" placeholder={copy.search} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <EmptyState text={copy.loading} />
        ) : filteredBookmarks.length === 0 ? (
          <EmptyState text={copy.empty} />
        ) : filteredBookmarks.map((item) => {
          const type = item.bookmarkType || (item.author ? 'post' : 'job');
          return (
            <article key={`${type}-${item._id}`} className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
              <header className="mb-4 flex items-center gap-3">
                <UserAvatar value={item.author || item.company} name={item.author || item.company || 'Item'} className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-[var(--text-primary)]">{item.author || item.company}</p>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{formatDate(item.createdAt || item.postedAt, language)}</p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent-strong)]">{type === 'post' ? copy.post : copy.job}</span>
              </header>

              {type === 'post' ? (
                <>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">{item.title}</h2>
                  <p className="mt-3 line-clamp-4 leading-7 text-[var(--text-secondary)]">{item.content}</p>
                  <div className="mt-4 flex gap-3 text-sm font-bold text-[var(--text-muted)]">
                    <span>{item.likes?.length || 0} {copy.likes}</span>
                    <span>{item.comments?.length || 0} {copy.comments}</span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">{item.title}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Info label={copy.salary} value={item.salary || '-'} />
                    <Info label={copy.location} value={item.location || '-'} />
                  </div>
                </>
              )}

              <div className="mt-5 flex gap-2">
                {type === 'job' && (
                  <button type="button" onClick={() => applyJob(item._id)} className="btn-primary flex-1 px-4 py-3">
                    {copy.apply}
                  </button>
                )}
                <button type="button" onClick={() => removeBookmark(item._id, type)} className="flex-1 rounded-xl bg-[var(--surface-muted)] px-4 py-3 font-black text-[var(--text-secondary)] transition hover:bg-red-50 hover:text-red-700">
                  {copy.remove}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function FilterButton({ active, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]'}`}>
      {label}
    </button>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center font-bold text-[var(--text-muted)] lg:col-span-2">
      {text}
    </div>
  );
}

export default Bookmarks;
