import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const copyByLanguage = {
  vi: {
    eyebrow: 'Việc làm',
    title: 'Cơ hội việc làm & thực tập',
    subtitle: 'Một bảng tuyển dụng gọn, dễ quét cho sinh viên NTTU: thực tập, part-time, fresher và dự án cộng tác.',
    postJob: 'Đăng tuyển',
    close: 'Đóng',
    all: 'Tất cả',
    fullTime: 'Toàn thời gian',
    internship: 'Thực tập',
    partTime: 'Bán thời gian',
    search: 'Tìm vị trí, công ty, kỹ năng...',
    newJob: 'Tin tuyển dụng mới',
    titleInput: 'Vị trí công việc',
    companyInput: 'Tên công ty',
    salaryInput: 'Mức lương',
    locationInput: 'Địa điểm',
    skillsInput: 'Kỹ năng, phân tách bằng dấu phẩy',
    descriptionInput: 'Mô tả ngắn',
    submit: 'Đăng tin',
    loading: 'Đang tải công việc...',
    empty: 'Không có công việc phù hợp.',
    apply: 'Nộp đơn',
    save: 'Lưu',
    saved: 'Đã lưu công việc.',
    alreadySaved: 'Công việc đã có trong mục đã lưu.',
    applied: 'Đã gửi ứng tuyển và tự nhắn tin cho người đăng tuyển.',
    loginRequired: 'Vui lòng đăng nhập để tiếp tục.',
    salary: 'Lương',
    location: 'Vị trí',
    level: 'Level',
    posted: 'Đăng lúc',
    skills: 'Kỹ năng',
  },
  en: {
    eyebrow: 'Jobs',
    title: 'Jobs & internships',
    subtitle: 'A clean student job board for internships, part-time work, fresher roles, and collaboration projects.',
    postJob: 'Post job',
    close: 'Close',
    all: 'All',
    fullTime: 'Full-time',
    internship: 'Internship',
    partTime: 'Part-time',
    search: 'Search title, company, skills...',
    newJob: 'New job post',
    titleInput: 'Job title',
    companyInput: 'Company name',
    salaryInput: 'Salary',
    locationInput: 'Location',
    skillsInput: 'Skills, separated by commas',
    descriptionInput: 'Short description',
    submit: 'Publish job',
    loading: 'Loading jobs...',
    empty: 'No matching jobs.',
    apply: 'Apply',
    save: 'Save',
    saved: 'Job saved.',
    alreadySaved: 'This job is already saved.',
    applied: 'Application submitted and a direct message was sent to the poster.',
    loginRequired: 'Please sign in to continue.',
    salary: 'Salary',
    location: 'Location',
    level: 'Level',
    posted: 'Posted',
    skills: 'Skills',
  },
};

const typeOptions = [
  { value: 'Toàn thời gian', labelKey: 'fullTime' },
  { value: 'Thực tập', labelKey: 'internship' },
  { value: 'Bán thời gian', labelKey: 'partTime' },
];

const normalizeText = (value) => String(value || '').toLowerCase();

const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN');
};

function Jobs({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    salary: '',
    type: 'Toàn thời gian',
    level: 'Fresher',
    location: 'TP. Hồ Chí Minh',
    skills: '',
    description: '',
  });
  const currentUser = localStorage.getItem('username');

  const showNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/jobs');
      setJobs(res.data || []);
    } catch (err) {
      showNotice(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return jobs
      .filter((job) => filter === 'all' || job.type === filter)
      .filter((job) => !normalizedQuery
        || normalizeText(job.title).includes(normalizedQuery)
        || normalizeText(job.company).includes(normalizedQuery)
        || normalizeText(job.location).includes(normalizedQuery)
        || (job.skills || []).some((skill) => normalizeText(skill).includes(normalizedQuery)))
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }, [filter, jobs, query]);

  const updateForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }

    try {
      await axios.post('/api/jobs', {
        ...formData,
        skills: formData.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        postedBy: currentUser,
      });
      await loadJobs();
      setShowForm(false);
      setFormData({
        title: '',
        company: '',
        salary: '',
        type: 'Toàn thời gian',
        level: 'Fresher',
        location: 'TP. Hồ Chí Minh',
        skills: '',
        description: '',
      });
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

  const saveJob = async (jobId) => {
    if (!currentUser) {
      showNotice(copy.loginRequired);
      return;
    }

    try {
      await axios.post('/api/bookmarks', { userId: currentUser, postId: jobId, type: 'job' });
      showNotice(copy.saved);
    } catch (err) {
      showNotice(err.response?.data?.error === 'Already bookmarked' ? copy.alreadySaved : err.response?.data?.error || err.message);
    }
  };

  const displayType = (value) => copy[typeOptions.find((option) => option.value === value)?.labelKey] || value;

  return (
    <main className="main-container max-w-7xl">
      <section className="mb-6 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">{copy.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)] md:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{copy.subtitle}</p>
          </div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-success min-h-12 px-5">
            {showForm ? copy.close : copy.postJob}
          </button>
        </div>
      </section>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {notice}
        </div>
      )}

      {showForm && (
        <section className="mb-6 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-xl font-black text-[var(--text-primary)]">{copy.newJob}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={formData.title} onChange={(event) => updateForm('title', event.target.value)} className="input-field" placeholder={copy.titleInput} required />
              <input value={formData.company} onChange={(event) => updateForm('company', event.target.value)} className="input-field" placeholder={copy.companyInput} required />
              <input value={formData.salary} onChange={(event) => updateForm('salary', event.target.value)} className="input-field" placeholder={copy.salaryInput} />
              <input value={formData.location} onChange={(event) => updateForm('location', event.target.value)} className="input-field" placeholder={copy.locationInput} />
              <select value={formData.type} onChange={(event) => updateForm('type', event.target.value)} className="input-field">
                {typeOptions.map((option) => <option key={option.value} value={option.value}>{copy[option.labelKey]}</option>)}
              </select>
              <select value={formData.level} onChange={(event) => updateForm('level', event.target.value)} className="input-field">
                <option>Fresher</option>
                <option>Junior</option>
                <option>Senior</option>
              </select>
            </div>
            <input value={formData.skills} onChange={(event) => updateForm('skills', event.target.value)} className="input-field" placeholder={copy.skillsInput} />
            <textarea value={formData.description} onChange={(event) => updateForm('description', event.target.value)} className="input-field min-h-28 resize-none" placeholder={copy.descriptionInput} />
            <button type="submit" className="btn-success min-h-12">{copy.submit}</button>
          </form>
        </section>
      )}

      <section className="mb-5 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={`${copy.all} (${jobs.length})`} />
            {typeOptions.map((option) => (
              <FilterButton key={option.value} active={filter === option.value} onClick={() => setFilter(option.value)} label={copy[option.labelKey]} />
            ))}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="input-field lg:max-w-md" placeholder={copy.search} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <EmptyState text={copy.loading} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState text={copy.empty} />
        ) : filteredJobs.map((job) => (
          <article key={job._id} className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
            <header className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--accent)]">{job.company}</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{job.title}</h2>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent-strong)]">{displayType(job.type)}</span>
            </header>

            {job.description && <p className="mb-4 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{job.description}</p>}

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Info label={copy.salary} value={job.salary || 'Deal'} />
              <Info label={copy.location} value={job.location || '-'} />
              <Info label={copy.level} value={job.level || '-'} />
              <Info label={copy.posted} value={formatDate(job.postedAt, language)} />
            </div>

            {job.skills?.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">{copy.skills}</p>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-[var(--border-color)] pt-4">
              <button type="button" onClick={() => applyJob(job._id)} className="btn-primary flex-1">{copy.apply}</button>
              <button type="button" onClick={() => saveJob(job._id)} className="btn-secondary">{copy.save}</button>
            </div>
          </article>
        ))}
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

export default Jobs;
