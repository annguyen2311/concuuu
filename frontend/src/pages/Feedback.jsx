import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const copyByLanguage = {
  vi: {
    eyebrow: 'Cải thiện hệ thống',
    title: 'Gửi feedback cho server',
    subtitle: 'Báo lỗi, góp ý tính năng, vấn đề hiệu năng hoặc trải nghiệm để admin ưu tiên cải thiện hệ thống.',
    type: 'Loại feedback',
    rating: 'Mức độ hài lòng',
    titleInput: 'Tiêu đề ngắn',
    messageInput: 'Mô tả chi tiết vấn đề hoặc đề xuất...',
    submit: 'Gửi feedback',
    submitting: 'Đang gửi...',
    history: 'Feedback của bạn',
    empty: 'Bạn chưa gửi feedback nào.',
    sent: 'Đã gửi feedback. Cảm ơn bạn đã giúp hệ thống tốt hơn.',
    required: 'Nhập tiêu đề và nội dung feedback.',
    statuses: {
      new: 'Mới',
      reviewing: 'Đang xem',
      resolved: 'Đã xử lý',
      closed: 'Đã đóng',
    },
    types: {
      bug: 'Lỗi hệ thống',
      suggestion: 'Góp ý tính năng',
      performance: 'Hiệu năng/server',
      security: 'Bảo mật',
      content: 'Nội dung',
      other: 'Khác',
    },
  },
  en: {
    eyebrow: 'Improve system',
    title: 'Send server feedback',
    subtitle: 'Report bugs, suggest features, or flag performance and experience issues for admins to prioritize.',
    type: 'Feedback type',
    rating: 'Satisfaction',
    titleInput: 'Short title',
    messageInput: 'Describe the issue or suggestion...',
    submit: 'Send feedback',
    submitting: 'Sending...',
    history: 'Your feedback',
    empty: 'You have not sent feedback yet.',
    sent: 'Feedback sent. Thanks for helping improve the system.',
    required: 'Enter feedback title and message.',
    statuses: {
      new: 'New',
      reviewing: 'Reviewing',
      resolved: 'Resolved',
      closed: 'Closed',
    },
    types: {
      bug: 'Bug',
      suggestion: 'Feature suggestion',
      performance: 'Performance/server',
      security: 'Security',
      content: 'Content',
      other: 'Other',
    },
  },
};

const feedbackTypes = ['bug', 'suggestion', 'performance', 'security', 'content', 'other'];

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function Feedback({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [feedback, setFeedback] = useState([]);
  const [form, setForm] = useState({
    type: 'suggestion',
    title: '',
    message: '',
    rating: 5,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const averageRating = useMemo(() => {
    if (feedback.length === 0) return 0;
    return feedback.reduce((sum, item) => sum + (item.rating || 0), 0) / feedback.length;
  }, [feedback]);

  const showNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/feedback/mine');
      setFeedback(res.data || []);
    } catch (error) {
      showNotice(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showNotice(copy.required);
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post('/api/feedback', {
        ...form,
        title: form.title.trim(),
        message: form.message.trim(),
      });
      setFeedback((prev) => [res.data, ...prev]);
      setForm({ type: 'suggestion', title: '', message: '', rating: 5 });
      showNotice(copy.sent);
    } catch (error) {
      showNotice(error.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
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
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-muted)] p-2 text-center">
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{feedback.length}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">Total</span>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{averageRating ? averageRating.toFixed(1) : '-'}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">Rating</span>
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[25rem_minmax(0,1fr)]">
        <section className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <form onSubmit={submitFeedback} className="grid gap-4">
            <label className="form-group">
              <span className="form-label text-[var(--text-primary)]">{copy.type}</span>
              <select value={form.type} onChange={(event) => updateForm('type', event.target.value)} className="input-field">
                {feedbackTypes.map((type) => (
                  <option key={type} value={type}>{copy.types[type]}</option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label text-[var(--text-primary)]">{copy.rating}</span>
              <input
                type="range"
                min="1"
                max="5"
                value={form.rating}
                onChange={(event) => updateForm('rating', Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-sm font-black text-[var(--text-muted)]">
                {[1, 2, 3, 4, 5].map((value) => (
                  <span key={value} className={Number(form.rating) === value ? 'text-[var(--accent)]' : ''}>{value}</span>
                ))}
              </div>
            </label>

            <input
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              className="input-field"
              placeholder={copy.titleInput}
              maxLength="140"
            />
            <textarea
              value={form.message}
              onChange={(event) => updateForm('message', event.target.value)}
              className="input-field min-h-44 resize-none"
              placeholder={copy.messageInput}
              maxLength="3000"
            />
            <button type="submit" disabled={submitting} className="btn-success min-h-12">
              {submitting ? copy.submitting : copy.submit}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-xl font-black text-[var(--text-primary)]">{copy.history}</h2>
          <div className="grid gap-3">
            {loading ? (
              <EmptyState text="Loading..." />
            ) : feedback.length === 0 ? (
              <EmptyState text={copy.empty} />
            ) : feedback.map((item) => (
              <article key={item._id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent)]">{copy.types[item.type] || item.type}</p>
                    <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">{item.title}</h3>
                  </div>
                  <span className="badge badge-primary">{copy.statuses[item.status] || item.status}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.message}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-[var(--text-muted)]">
                  <span>{formatDate(item.createdAt, language)}</span>
                  <span>{'★'.repeat(item.rating || 0)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center font-bold text-[var(--text-muted)]">
      {text}
    </div>
  );
}

export default Feedback;
