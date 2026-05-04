import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';

const copyByLanguage = {
  vi: {
    eyebrow: 'Blog & chia sẻ',
    title: 'Không gian chia sẻ kiến thức',
    subtitle: 'Đăng câu hỏi, ghi chú học tập, kinh nghiệm làm dự án và cùng nhau thảo luận.',
    newPost: 'Bài đăng mới',
    titleInput: 'Tiêu đề bài viết',
    bodyInput: 'Bạn muốn chia sẻ điều gì?',
    clear: 'Xóa',
    publish: 'Đăng bài',
    publishing: 'Đang đăng...',
    feed: 'Bảng tin cộng đồng',
    search: 'Tìm bài viết, tác giả, nội dung...',
    all: 'Tất cả',
    hot: 'Nhiều tương tác',
    recent: 'Mới nhất',
    loading: 'Đang tải bài viết...',
    empty: 'Chưa có bài viết nào.',
    loginRequired: 'Vui lòng đăng nhập để tiếp tục.',
    published: 'Đã đăng bài viết.',
    saved: 'Đã lưu bài viết.',
    alreadySaved: 'Bài viết đã có trong mục đã lưu.',
    like: 'Thích',
    comment: 'Bình luận',
    save: 'Lưu',
    send: 'Gửi',
    commentPlaceholder: 'Viết bình luận...',
  },
  en: {
    eyebrow: 'Blog & sharing',
    title: 'Knowledge sharing space',
    subtitle: 'Post questions, study notes, project lessons, and discuss with the community.',
    newPost: 'New post',
    titleInput: 'Post title',
    bodyInput: 'What would you like to share?',
    clear: 'Clear',
    publish: 'Publish',
    publishing: 'Publishing...',
    feed: 'Community feed',
    search: 'Search posts, authors, content...',
    all: 'All',
    hot: 'Most active',
    recent: 'Newest',
    loading: 'Loading posts...',
    empty: 'No posts yet.',
    loginRequired: 'Please sign in to continue.',
    published: 'Post published.',
    saved: 'Post saved.',
    alreadySaved: 'This post is already saved.',
    like: 'Like',
    comment: 'Comment',
    save: 'Save',
    send: 'Send',
    commentPlaceholder: 'Write a comment...',
  },
};

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function Share({ language = 'vi', topBarRef }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('recent');
  const [showForm, setShowForm] = useState(false);
  const currentUser = localStorage.getItem('username');

  const showNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await axios.get('/api/posts');
      setPosts(res.data || []);
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!topBarRef?.current) return;
    topBarRef.current.setExtraActions([
      {
        key: 'new-post',
        label: copy.newPost,
        icon: '✏️',
        onClick: () => setShowForm(true),
      },
    ]);
    return () => {
      if (topBarRef?.current) {
        topBarRef.current.setExtraActions([]);
      }
    };
  }, [topBarRef, copy.newPost]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = posts.filter((post) => !normalizedQuery
      || String(post.title || '').toLowerCase().includes(normalizedQuery)
      || String(post.content || '').toLowerCase().includes(normalizedQuery)
      || String(post.author || '').toLowerCase().includes(normalizedQuery));

    return [...filtered].sort((a, b) => {
      if (view === 'hot') {
        const scoreA = (a.likes?.length || 0) + (a.comments?.length || 0);
        const scoreB = (b.likes?.length || 0) + (b.comments?.length || 0);
        return scoreB - scoreA || new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [posts, query, view]);

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim() || !title.trim()) return;
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/posts', {
        author: currentUser,
        title: title.trim(),
        content: content.trim(),
      });
      setPosts((prev) => [res.data, ...prev]);
      setContent('');
      setTitle('');
      showNotice(copy.published);
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (postId) => {
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }
    await axios.put(`/api/posts/${postId}/like`, { username: currentUser });
    loadPosts();
  };

  const commentPost = async (postId) => {
    const commentText = commentInputs[postId]?.trim();
    if (!currentUser || !commentText) return;
    await axios.post(`/api/posts/${postId}/comment`, { user: currentUser, text: commentText });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    loadPosts();
  };

  const savePost = async (postId) => {
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }

    try {
      await axios.post('/api/bookmarks', { userId: currentUser, postId, type: 'post' });
      showNotice(copy.saved);
    } catch (err) {
      showNotice(err.response?.data?.error === 'Already bookmarked' ? copy.alreadySaved : err.response?.data?.error || err.message);
    }
  };

  return (
    <main className="main-container max-w-7xl">
      <section className="mb-6 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">{copy.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{copy.subtitle}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--surface-muted)] p-2 text-center">
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{posts.length}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">Posts</span>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0)}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">Likes</span>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0)}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">Replies</span>
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {notice}
        </div>
      )}

      {/* Mobile form overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm xl:hidden" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-t-[1.5rem] bg-[var(--surface-elevated)] p-5 pb-8 shadow-[var(--shadow-strong)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[var(--text-primary)]">{copy.newPost}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
            </div>
            <form onSubmit={(e) => { submit(e).then(() => setShowForm(false)); }} className="grid gap-3">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder={copy.titleInput} />
              <textarea value={content} onChange={(event) => setContent(event.target.value)} className="input-field min-h-32 resize-none" placeholder={copy.bodyInput} />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => { setContent(''); setTitle(''); }} disabled={loading}>
                  {copy.clear}
                </button>
                <button type="submit" className="btn-success flex-1" disabled={loading || !content.trim() || !title.trim()}>
                  {loading ? copy.publishing : copy.publish}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="hidden space-y-6 xl:block">
          <section className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">{copy.newPost}</h2>
            <form onSubmit={submit} className="grid gap-3">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" placeholder={copy.titleInput} />
              <textarea value={content} onChange={(event) => setContent(event.target.value)} className="input-field min-h-36 resize-none" placeholder={copy.bodyInput} />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => { setContent(''); setTitle(''); }} disabled={loading}>
                  {copy.clear}
                </button>
                <button type="submit" className="btn-success flex-1" disabled={loading || !content.trim() || !title.trim()}>
                  {loading ? copy.publishing : copy.publish}
                </button>
              </div>
            </form>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.feed}</h2>
              <div className="flex gap-2">
                {[['recent', copy.recent], ['hot', copy.hot], ['all', copy.all]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setView(id)} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${view === id ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="input-field mt-4" placeholder={copy.search} />
          </div>

          <div className="grid gap-4">
            {loadingPosts ? (
              <EmptyState text={copy.loading} />
            ) : visiblePosts.length === 0 ? (
              <EmptyState text={copy.empty} />
            ) : visiblePosts.map((post) => (
              <article key={post._id} className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
                <header className="mb-4 flex items-center gap-3">
                  <UserAvatar value={post.author} name={post.author || 'User'} className="h-11 w-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-[var(--text-primary)]">{post.author}</p>
                    <p className="text-xs font-semibold text-[var(--text-muted)]">{formatDate(post.createdAt, language)}</p>
                  </div>
                </header>
                <h3 className="text-xl font-black text-[var(--text-primary)]">{post.title}</h3>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{post.content}</p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
                  <ActionButton onClick={() => likePost(post._id)} label={`${copy.like} (${post.likes?.length || 0})`} />
                  <ActionButton label={`${copy.comment} (${post.comments?.length || 0})`} />
                  <ActionButton onClick={() => savePost(post._id)} label={copy.save} />
                </div>
                {post.comments?.length > 0 && (
                  <div className="mt-4 grid gap-2 rounded-2xl bg-[var(--surface-muted)] p-3">
                    {post.comments.map((comment) => (
                      <p key={comment._id} className="text-sm text-[var(--text-secondary)]">
                        <span className="font-black text-[var(--text-primary)]">{comment.user || 'User'}: </span>
                        {comment.text}
                      </p>
                    ))}
                  </div>
                )}
                <form onSubmit={(event) => { event.preventDefault(); commentPost(post._id); }} className="mt-3 flex gap-2">
                  <input value={commentInputs[post._id] || ''} onChange={(event) => setCommentInputs((prev) => ({ ...prev, [post._id]: event.target.value }))} className="input-field min-w-0 flex-1 py-3" placeholder={copy.commentPlaceholder} />
                  <button type="submit" disabled={!commentInputs[post._id]?.trim()} className="btn-primary px-4 py-3">{copy.send}</button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]">
      {label}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center font-bold text-[var(--text-muted)]">
      {text}
    </div>
  );
}

export default Share;
