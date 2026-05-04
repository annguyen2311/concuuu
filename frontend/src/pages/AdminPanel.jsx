import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';
import { getLevelInfo } from '../utils/level';

const emptyOverview = {
  totals: {},
  recentActivities: [],
  recentUsers: [],
  topRooms: [],
  storage: { status: 'offline', database: 'SQLite' },
};

const tabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'users', label: 'Users' },
  { id: 'content', label: 'Bài viết' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'chat', label: 'Chat' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'theme', label: 'Theme' },
  { id: 'ai', label: 'AI' },
  { id: 'system', label: 'Server' },
];

const defaultTheme = {
  brandName: 'Cộng đồng sinh viên NTTU',
  accent: '#2563eb',
  accentStrong: '#0f766e',
  pageBg: '#f3f6fb',
  sidebarBg: 'rgba(15, 23, 42, 0.96)',
  customCss: '',
  loginCoverImage: '',
  loginTitle: '',
  loginDescription: '',
  loginBadges: '',
};

const formatDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const normalize = (value) => String(value || '').toLowerCase();

function AdminPanel({ currentUser: signedInUser, appTheme, onThemeSaved }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(emptyOverview);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [adminSession, setAdminSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminSession') || 'null');
    } catch {
      return null;
    }
  });
  const [adminLogin, setAdminLogin] = useState({ username: 'admin', password: '' });
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userDraft, setUserDraft] = useState({ reputation: 0, role: 'member', bio: '', school: '', major: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [eventForm, setEventForm] = useState({ icon: '📅', title: '', date: '', time: '' });
  const [roomForm, setRoomForm] = useState({ name: '', icon: '#', category: 'Cộng đồng', topic: '', position: 500, isLocked: false });
  const [messageViewer, setMessageViewer] = useState({ open: false, loading: false, room: null, messages: [] });
  const [adminForm, setAdminForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const [themeForm, setThemeForm] = useState({ ...defaultTheme, ...(appTheme || {}) });
  const [aiConfig, setAiConfig] = useState({ apiKey: '', apiKeySet: false, model: 'MiMo-V2.5-Pro' });
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const noticeTimerRef = useRef(null);

  const userToken = localStorage.getItem('token');
  const activeAdminToken = adminSession?.token || userToken;
  const currentUser = adminSession?.admin?.username || signedInUser?.username || localStorage.getItem('username') || 'admin';
  const activeAdminIdentity = adminSession?.token ? adminSession.admin : signedInUser;
  const activeAdminEmail = normalize(activeAdminIdentity?.email);
  const canManageRoles = Boolean(activeAdminIdentity?.isOwner);
  const adminConfig = (token = activeAdminToken) => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const showNotice = (type, message) => {
    setNotice({ type, message });
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice({ type: '', message: '' }), 3500);
  };

  const loadAdminData = async ({ quiet = false, token } = {}) => {
    const activeToken = token || activeAdminToken;
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      if (!quiet) setLoading(true);
      setRefreshing(true);

      const [overviewRes, usersRes, postsRes, jobsRes, roomsRes, feedbackRes, announcementsRes, eventsRes, adminsRes, themeRes] = await Promise.all([
        axios.get('/api/admin/overview', adminConfig(activeToken)),
        axios.get('/api/admin/users', adminConfig(activeToken)),
        axios.get('/api/admin/posts', adminConfig(activeToken)),
        axios.get('/api/admin/jobs', adminConfig(activeToken)),
        axios.get('/api/admin/rooms', adminConfig(activeToken)),
        axios.get('/api/admin/feedback', adminConfig(activeToken)),
        axios.get('/api/admin/announcements', adminConfig(activeToken)),
        axios.get('/api/admin/events', adminConfig(activeToken)),
        axios.get('/api/admin/admins', adminConfig(activeToken)),
        axios.get('/api/admin/theme', adminConfig(activeToken)),
      ]);

      setOverview(overviewRes.data || emptyOverview);
      setUsers(usersRes.data || []);
      setPosts(postsRes.data || []);
      setJobs(jobsRes.data || []);
      setRooms(roomsRes.data || []);
      setFeedback(feedbackRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      setEvents(eventsRes.data || []);
      setAdmins(adminsRes.data || []);
      setThemeForm({ ...defaultTheme, ...(themeRes.data || {}) });
      if (!quiet) showNotice('success', 'Admin data đã được đồng bộ.');
    } catch (error) {
      console.error('Error loading admin data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminSession');
        setAdminSession(null);
      }
      showNotice('error', error.response?.data?.error || 'Không thể tải dữ liệu admin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeAdminToken) {
      loadAdminData({ token: activeAdminToken });
    } else {
      setLoading(false);
    }
    return () => window.clearTimeout(noticeTimerRef.current);
  }, [adminSession?.token, userToken]);

  useEffect(() => {
    setThemeForm({ ...defaultTheme, ...(appTheme || {}) });
  }, [appTheme]);

  const loginAdmin = async (event) => {
    event.preventDefault();
    try {
      setRefreshing(true);
      const res = await axios.post('/api/admin/login', adminLogin);
      localStorage.setItem('adminSession', JSON.stringify(res.data));
      setAdminSession(res.data);
      setAdminLogin({ username: res.data.admin.username, password: '' });
      showNotice('success', 'Đã đăng nhập admin.');
      loadAdminData({ token: res.data.token });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể đăng nhập admin.');
    } finally {
      setRefreshing(false);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminSession');
    setAdminSession(null);
    setOverview(emptyOverview);
    setUsers([]);
    setPosts([]);
    setJobs([]);
    setRooms([]);
    setFeedback([]);
    setAnnouncements([]);
    setEvents([]);
    setAdmins([]);
  };

  const metricCards = useMemo(() => {
    const totals = overview.totals || {};
    return [
      { label: 'Users', value: totals.users || 0, tone: 'blue', hint: `${totals.admins || 0} admins` },
      { label: 'Bài viết', value: totals.posts || 0, tone: 'green', hint: `${totals.postComments || 0} comments` },
      { label: 'Jobs', value: totals.jobs || 0, tone: 'purple', hint: `${totals.bookmarks || 0} bookmarks` },
      { label: 'Messages', value: totals.messages || 0, tone: 'orange', hint: `${totals.rooms || 0} rooms` },
      { label: 'Bạn bè', value: totals.friendships || 0, tone: 'cyan', hint: `${totals.pendingFriendships || 0} pending` },
      { label: 'Feedback', value: totals.feedback || 0, tone: 'red', hint: `${totals.openFeedback || 0} open` },
    ];
  }, [overview.totals]);

  const query = normalize(search);
  const filteredUsers = users.filter((user) => (
    normalize(user.username).includes(query) || normalize(user.email).includes(query) || normalize(user.school).includes(query)
  ));
  const filteredPosts = posts.filter((post) => (
    normalize(post.title).includes(query) || normalize(post.author).includes(query) || normalize(post.content).includes(query)
  ));
  const filteredJobs = jobs.filter((job) => (
    normalize(job.title).includes(query) || normalize(job.company).includes(query) || normalize(job.postedBy).includes(query)
  ));
  const filteredRooms = rooms.filter((room) => (
    normalize(room.name).includes(query) || normalize(room.id).includes(query) || normalize(room.type).includes(query)
  ));
  const filteredFeedback = feedback.filter((item) => (
    normalize(item.title).includes(query)
    || normalize(item.message).includes(query)
    || normalize(item.username).includes(query)
    || normalize(item.type).includes(query)
    || normalize(item.status).includes(query)
  ));
  const roomCategories = Array.from(new Set(rooms.map((room) => room.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const isEditingPrimaryAdmin = Boolean(editingUser?.isOwner);

  const beginEditUser = (user) => {
    setEditingUser(user);
    setUserDraft({
      reputation: user.reputation || 0,
      role: user.role || 'member',
      bio: user.bio || '',
      school: user.school || '',
      major: user.major || '',
    });
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;

    try {
      const res = await axios.patch(`/api/admin/users/${encodeURIComponent(editingUser.username)}`, userDraft, adminConfig());
      setUsers((prev) => prev.map((user) => (
        user.username === editingUser.username ? { ...user, ...res.data } : user
      )));
      setEditingUser(null);
      showNotice('success', `Đã cập nhật ${editingUser.username}.`);
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể cập nhật user.');
    }
  };

  const deleteUser = async (username) => {
    const targetUser = users.find((user) => user.username === username);
    if (targetUser?.isOwner) {
      showNotice('error', 'Primary admin account cannot be deleted.');
      return;
    }

    const suffix = cascadeDelete ? ' và toàn bộ nội dung liên quan' : '';
    if (!window.confirm(`Xóa user ${username}${suffix}?`)) return;

    try {
      await axios.delete(`/api/admin/users/${encodeURIComponent(username)}?cascadeContent=${cascadeDelete}`, adminConfig());
      setUsers((prev) => prev.filter((user) => user.username !== username));
      showNotice('success', `Đã xóa user ${username}.`);
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa user.');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    try {
      await axios.delete(`/api/admin/posts/${postId}`, adminConfig());
      setPosts((prev) => prev.filter((post) => post._id !== postId));
      showNotice('success', 'Đã xóa bài viết.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa bài viết.');
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm('Xóa job này?')) return;
    try {
      await axios.delete(`/api/admin/jobs/${jobId}`, adminConfig());
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      showNotice('success', 'Đã xóa job.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa job.');
    }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm(`Xóa phòng ${roomId} và toàn bộ tin nhắn trong phòng?`)) return;
    try {
      await axios.delete(`/api/admin/rooms/${encodeURIComponent(roomId)}`, adminConfig());
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      showNotice('success', 'Đã xóa phòng chat.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa phòng chat.');
    }
  };

  const updateFeedbackStatus = async (feedbackId, status) => {
    try {
      const res = await axios.patch(`/api/admin/feedback/${feedbackId}`, { status }, adminConfig());
      setFeedback((prev) => prev.map((item) => (item._id === feedbackId ? res.data : item)));
      showNotice('success', 'Đã cập nhật trạng thái feedback.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể cập nhật feedback.');
    }
  };

  const deleteFeedbackItem = async (feedbackId) => {
    if (!window.confirm('Xóa feedback này?')) return;
    try {
      await axios.delete(`/api/admin/feedback/${feedbackId}`, adminConfig());
      setFeedback((prev) => prev.filter((item) => item._id !== feedbackId));
      showNotice('success', 'Đã xóa feedback.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa feedback.');
    }
  };

  const createRoom = async (event) => {
    event.preventDefault();
    if (!roomForm.name.trim()) {
      showNotice('error', 'Nhập tên kênh chat.');
      return;
    }

    try {
      const res = await axios.post('/api/admin/rooms', {
        ...roomForm,
        name: roomForm.name.trim(),
        category: roomForm.category.trim() || 'Cộng đồng',
        topic: roomForm.topic.trim(),
      }, adminConfig());
      setRooms((prev) => [res.data, ...prev]);
      setRoomForm({ name: '', icon: '#', category: roomForm.category || 'Cộng đồng', topic: '', position: 500, isLocked: false });
      showNotice('success', 'Đã tạo tag/kênh chat.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể tạo kênh chat.');
    }
  };

  const openRoomMessages = async (roomId) => {
    try {
      setMessageViewer({ open: true, loading: true, room: null, messages: [] });
      const res = await axios.get(`/api/admin/rooms/${encodeURIComponent(roomId)}/messages`, adminConfig());
      setMessageViewer({
        open: true,
        loading: false,
        room: res.data.room,
        messages: res.data.messages || [],
      });
    } catch (error) {
      setMessageViewer({ open: false, loading: false, room: null, messages: [] });
      showNotice('error', error.response?.data?.error || 'Không thể xem tin nhắn phòng.');
    }
  };

  const createAnnouncement = async (event) => {
    event.preventDefault();
    if (!announcementForm.title.trim()) {
      showNotice('error', 'Nhập tiêu đề thông báo.');
      return;
    }

    try {
      const res = await axios.post('/api/admin/announcements', {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        createdBy: currentUser,
      }, adminConfig());
      setAnnouncements((prev) => [res.data, ...prev]);
      setAnnouncementForm({ title: '', body: '' });
      showNotice('success', 'Đã phát thông báo hệ thống.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể tạo thông báo.');
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Xóa thông báo này?')) return;
    try {
      await axios.delete(`/api/admin/announcements/${id}`, adminConfig());
      setAnnouncements((prev) => prev.filter((item) => item._id !== id));
      showNotice('success', 'Đã xóa thông báo.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa thông báo.');
    }
  };

  const createEvent = async (event) => {
    event.preventDefault();
    if (!eventForm.title.trim()) {
      showNotice('error', 'Nhập tiêu đề sự kiện.');
      return;
    }

    try {
      const res = await axios.post('/api/admin/events', eventForm, adminConfig());
      setEvents((prev) => [res.data, ...prev]);
      setEventForm({ icon: '📅', title: '', date: '', time: '' });
      showNotice('success', 'Đã tạo sự kiện.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể tạo sự kiện.');
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Xóa sự kiện này?')) return;
    try {
      await axios.delete(`/api/admin/events/${id}`, adminConfig());
      setEvents((prev) => prev.filter((item) => item._id !== id));
      showNotice('success', 'Đã xóa sự kiện.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể xóa sự kiện.');
    }
  };

  const createAdmin = async (event) => {
    event.preventDefault();
    try {
      const res = await axios.post('/api/admin/create-admin', adminForm, adminConfig());
      setAdmins((prev) => [res.data.admin, ...prev]);
      setAdminForm({ username: '', email: '', password: '', role: 'admin' });
      showNotice('success', 'Đã tạo admin mới.');
      loadAdminData({ quiet: true });
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể tạo admin.');
    }
  };

  const saveTheme = async (event) => {
    event.preventDefault();
    try {
      const res = await axios.put('/api/admin/theme', themeForm, adminConfig());
      const nextTheme = { ...defaultTheme, ...(res.data || {}) };
      setThemeForm(nextTheme);
      onThemeSaved?.(nextTheme);
      showNotice('success', 'Đã cập nhật theme server.');
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể cập nhật theme server.');
    }
  };

  const loadAiConfig = async () => {
    try {
      setAiConfigLoading(true);
      const res = await axios.get('/api/ai/config', adminConfig());
      setAiConfig({ apiKey: '', apiKeySet: res.data.apiKeySet, model: res.data.model || 'MiMo-V2.5-Pro' });
    } catch {
      setAiConfig({ apiKey: '', apiKeySet: false, model: 'MiMo-V2.5-Pro' });
    } finally {
      setAiConfigLoading(false);
    }
  };

  const saveAiConfig = async (event) => {
    event.preventDefault();
    try {
      setAiConfigLoading(true);
      const payload = {};
      if (aiConfig.apiKey) payload.apiKey = aiConfig.apiKey;
      if (aiConfig.model) payload.model = aiConfig.model;
      const res = await axios.put('/api/ai/config', payload, adminConfig());
      setAiConfig({ apiKey: '', apiKeySet: true, model: res.data.model || aiConfig.model });
      showNotice('success', 'Đã lưu cấu hình AI.');
    } catch (error) {
      showNotice('error', error.response?.data?.error || 'Không thể lưu cấu hình AI.');
    } finally {
      setAiConfigLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && activeAdminToken && aiConfig.apiKeySet === false && !aiConfig.apiKey) {
      loadAiConfig();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="main-container max-w-7xl">
        <div className="admin-loading">
          <div className="spinner text-3xl">⚙️</div>
          <p>Đang tải Admin Console...</p>
        </div>
      </div>
    );
  }

  if (!activeAdminToken) {
    return (
      <div className="admin-page main-container max-w-7xl">
        {notice.message && (
          <div className={`admin-toast ${notice.type === 'error' ? 'error' : 'success'}`}>
            {notice.message}
          </div>
        )}
        <section className="admin-login">
          <div>
            <p className="admin-kicker">Cộng đồng sinh viên NTTU</p>
            <h1>Admin Login</h1>
            <p>Đăng nhập bằng tài khoản admin để quản lý server.</p>
          </div>
          <form onSubmit={loginAdmin} className="admin-form">
            <input
              value={adminLogin.username}
              onChange={(event) => setAdminLogin((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Admin username"
              autoComplete="username"
              required
            />
            <input
              value={adminLogin.password}
              onChange={(event) => setAdminLogin((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Admin password"
              type="password"
              autoComplete="current-password"
              required
            />
            <button type="submit" className="admin-button primary" disabled={refreshing}>
              {refreshing ? 'Đang đăng nhập' : 'Đăng nhập admin'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page main-container max-w-7xl">
      {notice.message && (
        <div className={`admin-toast ${notice.type === 'error' ? 'error' : 'success'}`}>
          {notice.message}
        </div>
      )}

      <header className="admin-header">
        <div>
          <p className="admin-kicker">Cộng đồng sinh viên NTTU</p>
          <h1>Admin Console</h1>
          <p className="admin-subtitle">Quản lý users, nội dung, chat, broadcast và dữ liệu vận hành.</p>
        </div>
        <div className="admin-header-actions">
          <span className={`admin-health ${overview.storage?.status === 'online' ? 'online' : 'offline'}`}>
            {overview.storage?.status === 'online' ? 'Online' : 'Offline'}
          </span>
          <button type="button" onClick={() => loadAdminData()} className="admin-button primary" disabled={refreshing}>
            {refreshing ? 'Đang đồng bộ' : 'Đồng bộ'}
          </button>
          {adminSession?.token && (
            <button type="button" onClick={logoutAdmin} className="admin-button ghost">
              Đăng xuất admin
            </button>
          )}
        </div>
      </header>

      <div className="admin-toolbar">
        <nav className="admin-tabs" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'active' : ''}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="admin-search"
          placeholder="Tìm trong tab hiện tại..."
        />
      </div>

      {activeTab === 'overview' && (
        <section className="admin-section">
          <div className="admin-metrics">
            {metricCards.map((metric) => (
              <div key={metric.label} className={`admin-metric ${metric.tone}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </div>
            ))}
          </div>

          <div className="admin-grid two">
            <Panel title="Hoạt động gần đây">
              <ActivityList activities={overview.recentActivities || []} />
            </Panel>
            <Panel title="Phòng chat nhiều tin nhắn">
              <div className="admin-list">
                {(overview.topRooms || []).map((room) => (
                  <div key={room.id} className="admin-list-row">
                    <div>
                      <strong>{room.name}</strong>
                      <span>{room.type} · {room.id}</span>
                    </div>
                    <b>{room.messageCount}</b>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>Quản lý users</h2>
              <p>{filteredUsers.length} / {users.length} users</p>
            </div>
            <label className="admin-check">
              <input type="checkbox" checked={cascadeDelete} onChange={(event) => setCascadeDelete(event.target.checked)} />
              Xóa kèm nội dung khi delete user
            </label>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Uy tín</th>
                  <th>Nội dung</th>
                  <th>Bạn bè</th>
                  <th>Tham gia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.username}>
                    <td>
                      <div className="admin-user-cell">
                        <UserAvatar value={user.avatar} name={user.username} className="h-10 w-10 text-xs" />
                        <div>
                          <strong>{user.username}</strong>
                          <span>{user.email || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <span className={`admin-pill ${user.isOwner ? 'owner' : ''}`}>{user.isOwner ? 'owner' : (user.role || 'member')}</span>
                        {user.isOwner && <span className="admin-pill">primary</span>}
                      </div>
                    </td>
                    <td>{getLevelInfo(user).level}</td>
                    <td>{user.reputation || 0}</td>
                    <td>{user.postCount || 0} posts · {user.jobCount || 0} jobs · {user.messageCount || 0} msgs</td>
                    <td>{user.friendCount || 0}</td>
                    <td>{formatDate(user.joinDate || user.createdAt)}</td>
                    <td className="admin-actions">
                      <button type="button" className="admin-button ghost" onClick={() => beginEditUser(user)}>Sửa</button>
                      <button type="button" className="admin-button danger" onClick={() => deleteUser(user.username)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'content' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>Moderation bài viết</h2>
              <p>{filteredPosts.length} / {posts.length} bài viết</p>
            </div>
          </div>
          <div className="admin-records">
            {filteredPosts.map((post) => (
              <article key={post._id} className="admin-record">
                <div>
                  <span className="admin-meta">@{post.author} · {formatDate(post.createdAt)}</span>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                  <span className="admin-meta">{post.likes?.length || 0} likes · {post.comments?.length || 0} comments</span>
                </div>
                <button type="button" className="admin-button danger" onClick={() => deletePost(post._id)}>Xóa</button>
              </article>
            ))}
            {filteredPosts.length === 0 && <EmptyState text="Không có bài viết phù hợp." />}
          </div>
        </section>
      )}

      {activeTab === 'jobs' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>Quản lý jobs</h2>
              <p>{filteredJobs.length} / {jobs.length} jobs</p>
            </div>
          </div>
          <div className="admin-records">
            {filteredJobs.map((job) => (
              <article key={job._id} className="admin-record">
                <div>
                  <span className="admin-meta">@{job.postedBy} · {formatDate(job.postedAt)}</span>
                  <h3>{job.title}</h3>
                  <p>{job.company} · {job.location || '-'} · {job.salary || 'Thỏa thuận'}</p>
                  <span className="admin-meta">{job.type} · {job.level} · {(job.skills || []).join(', ') || 'Không có skills'}</span>
                </div>
                <button type="button" className="admin-button danger" onClick={() => deleteJob(job._id)}>Xóa</button>
              </article>
            ))}
            {filteredJobs.length === 0 && <EmptyState text="Không có job phù hợp." />}
          </div>
        </section>
      )}

      {activeTab === 'chat' && (
        <section className="admin-section">
          <div className="admin-grid two">
            <Panel title="Tạo tag và kênh cộng đồng">
              <form onSubmit={createRoom} className="admin-form">
                <div className="admin-form-row">
                  <input
                    value={roomForm.name}
                    onChange={(event) => setRoomForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Tên kênh, ví dụ: tài-liệu"
                    required
                  />
                  <input
                    value={roomForm.icon}
                    onChange={(event) => setRoomForm((prev) => ({ ...prev, icon: event.target.value.slice(0, 12) }))}
                    placeholder="#"
                  />
                  <input
                    list="admin-room-categories"
                    value={roomForm.category}
                    onChange={(event) => setRoomForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Tag/category"
                  />
                </div>
                <datalist id="admin-room-categories">
                  {roomCategories.map((category) => <option key={category} value={category} />)}
                </datalist>
                <div className="admin-form-row">
                  <input
                    type="number"
                    value={roomForm.position}
                    onChange={(event) => setRoomForm((prev) => ({ ...prev, position: event.target.value }))}
                    placeholder="Thứ tự"
                  />
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={roomForm.isLocked}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, isLocked: event.target.checked }))}
                    />
                    Admin-only channel
                  </label>
                </div>
                <textarea
                  value={roomForm.topic}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, topic: event.target.value }))}
                  placeholder="Chủ đề/mô tả kênh"
                  rows="3"
                />
                <button type="submit" className="admin-button primary">Tạo kênh</button>
              </form>
              <p className="admin-meta">
                Tag là category hiển thị trong sidebar chat. Nhập tag mới ở ô category để tạo nhóm kênh mới.
              </p>
            </Panel>

            <Panel title="Quyền admin với chat ẩn">
              <div className="admin-list">
                <div className="admin-list-row">
                  <div>
                    <strong>Xem private/group bằng REST</strong>
                    <span>Không join Socket.io, không tăng online, không thêm admin vào member list.</span>
                  </div>
                </div>
                <div className="admin-list-row">
                  <div>
                    <strong>Xoá mọi kênh</strong>
                    <span>Kể cả các kênh mặc định trước đây bị protected.</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div className="admin-section-head">
            <div>
              <h2>Quản lý chat rooms</h2>
              <p>{filteredRooms.length} / {rooms.length} rooms</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Tag</th>
                  <th>Type</th>
                  <th>Members</th>
                  <th>Messages</th>
                  <th>Last message</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <strong>{room.icon} {room.name}</strong>
                      <span className="admin-table-sub">{room.id}</span>
                    </td>
                    <td><span className="admin-pill">{room.category || '-'}</span></td>
                    <td><span className="admin-pill">{room.type}</span></td>
                    <td>{room.memberCount || 0}</td>
                    <td>{room.messageCount || 0}</td>
                    <td>{formatDate(room.lastMessageAt)}</td>
                    <td className="admin-actions">
                      <button type="button" className="admin-button ghost" onClick={() => openRoomMessages(room.id)}>
                        Xem tin
                      </button>
                      <button type="button" className="admin-button danger" onClick={() => deleteRoom(room.id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'feedback' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>Feedback cải thiện server</h2>
              <p>{filteredFeedback.length} / {feedback.length} feedback</p>
            </div>
          </div>
          <div className="admin-records">
            {filteredFeedback.map((item) => (
              <article key={item._id} className="admin-record">
                <div>
                  <span className="admin-meta">
                    @{item.username} · {item.type} · {formatDate(item.createdAt)}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  <span className="admin-meta">Rating {item.rating}/5 · Status {item.status}</span>
                </div>
                <div className="admin-actions">
                  <select
                    value={item.status}
                    onChange={(event) => updateFeedbackStatus(item._id, event.target.value)}
                    className="admin-inline-select"
                  >
                    <option value="new">new</option>
                    <option value="reviewing">reviewing</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                  <button type="button" className="admin-button danger" onClick={() => deleteFeedbackItem(item._id)}>Xóa</button>
                </div>
              </article>
            ))}
            {filteredFeedback.length === 0 && <EmptyState text="Chưa có feedback phù hợp." />}
          </div>
        </section>
      )}

      {activeTab === 'broadcast' && (
        <section className="admin-section">
          <div className="admin-grid two">
            <Panel title="Phát thông báo">
              <form onSubmit={createAnnouncement} className="admin-form">
                <input value={announcementForm.title} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tiêu đề thông báo" />
                <textarea value={announcementForm.body} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, body: event.target.value }))} placeholder="Nội dung" rows="4" />
                <button type="submit" className="admin-button primary">Gửi broadcast</button>
              </form>
            </Panel>
            <Panel title="Tạo sự kiện">
              <form onSubmit={createEvent} className="admin-form">
                <div className="admin-form-row">
                  <input value={eventForm.icon} onChange={(event) => setEventForm((prev) => ({ ...prev, icon: event.target.value }))} placeholder="Icon" />
                  <input value={eventForm.date} onChange={(event) => setEventForm((prev) => ({ ...prev, date: event.target.value }))} placeholder="Ngày" />
                  <input value={eventForm.time} onChange={(event) => setEventForm((prev) => ({ ...prev, time: event.target.value }))} placeholder="Giờ" />
                </div>
                <input value={eventForm.title} onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tên sự kiện" />
                <button type="submit" className="admin-button primary">Tạo event</button>
              </form>
            </Panel>
          </div>

          <div className="admin-grid two">
            <Panel title="Thông báo hiện có">
              <ManageList
                items={announcements}
                getKey={(item) => item._id}
                render={(item) => (
                  <>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.createdBy || item.created_by || 'admin'} · {formatDate(item.createdAt)}</span>
                    </div>
                    <button type="button" className="admin-button danger" onClick={() => deleteAnnouncement(item._id)}>Xóa</button>
                  </>
                )}
              />
            </Panel>
            <Panel title="Sự kiện">
              <ManageList
                items={events}
                getKey={(item) => item._id}
                render={(item) => (
                  <>
                    <div>
                      <strong>{item.icon} {item.title}</strong>
                      <span>{item.date || '-'} · {item.time || '-'}</span>
                    </div>
                    <button type="button" className="admin-button danger" onClick={() => deleteEvent(item._id)}>Xóa</button>
                  </>
                )}
              />
            </Panel>
          </div>
        </section>
      )}

      {activeTab === 'theme' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>Theme server</h2>
              <p>Admin có thể đổi tên hiển thị, màu chủ đạo và CSS custom cho toàn bộ hệ thống.</p>
            </div>
          </div>

          <div className="admin-grid two">
            <Panel title="Cấu hình giao diện">
              <form onSubmit={saveTheme} className="admin-form">
                <label>
                  Tên cộng đồng
                  <input
                    value={themeForm.brandName}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, brandName: event.target.value }))}
                    placeholder="Cộng đồng sinh viên NTTU"
                  />
                </label>
                <div className="admin-form-row">
                  <label>
                    Accent
                    <input
                      value={themeForm.accent}
                      onChange={(event) => setThemeForm((prev) => ({ ...prev, accent: event.target.value }))}
                      placeholder="#2563eb"
                    />
                  </label>
                  <label>
                    Accent strong
                    <input
                      value={themeForm.accentStrong}
                      onChange={(event) => setThemeForm((prev) => ({ ...prev, accentStrong: event.target.value }))}
                      placeholder="#0f766e"
                    />
                  </label>
                  <label>
                    Page background
                    <input
                      value={themeForm.pageBg}
                      onChange={(event) => setThemeForm((prev) => ({ ...prev, pageBg: event.target.value }))}
                      placeholder="#f3f6fb"
                    />
                  </label>
                </div>
                <label>
                  Sidebar background
                  <input
                    value={themeForm.sidebarBg}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, sidebarBg: event.target.value }))}
                    placeholder="rgba(15, 23, 42, 0.96)"
                  />
                </label>
                <label>
                  Custom CSS
                  <textarea
                    rows="12"
                    value={themeForm.customCss}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, customCss: event.target.value }))}
                    placeholder={'/* Ví dụ */\n.card { border-radius: 8px; }'}
                  />
                </label>

                <div className="admin-divider" />
                <p className="admin-meta" style={{ marginBottom: '0.5rem' }}>Tùy chỉnh trang đăng nhập</p>

                <label>
                  Ảnh bìa đăng nhập (URL)
                  <input
                    value={themeForm.loginCoverImage}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, loginCoverImage: event.target.value }))}
                    placeholder="https://example.com/cover.jpg"
                  />
                </label>
                <label>
                  Tiêu đề đăng nhập
                  <input
                    value={themeForm.loginTitle}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, loginTitle: event.target.value }))}
                    placeholder="Để trống = dùng tên cộng đồng"
                  />
                </label>
                <label>
                  Mô tả đăng nhập
                  <textarea
                    rows="3"
                    value={themeForm.loginDescription}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, loginDescription: event.target.value }))}
                    placeholder="Để trống = dùng mô tả mặc định"
                  />
                </label>
                <label>
                  Feature badges (phân cách bằng dấu phẩy)
                  <input
                    value={themeForm.loginBadges}
                    onChange={(event) => setThemeForm((prev) => ({ ...prev, loginBadges: event.target.value }))}
                    placeholder="Blog, Chat, Jobs"
                  />
                </label>

                <button type="submit" className="admin-button primary">Lưu theme server</button>
              </form>
            </Panel>

            <Panel title="Preview nhanh">
              <div className="grid gap-4">
                <div
                  className="rounded-lg p-5 text-white"
                  style={{ background: `linear-gradient(135deg, ${themeForm.accent}, ${themeForm.accentStrong})` }}
                >
                  <p className="text-sm font-black uppercase tracking-[0.14em] opacity-80">Brand</p>
                  <h3 className="mt-2 text-2xl font-black">{themeForm.brandName || defaultTheme.brandName}</h3>
                </div>
                <div className="admin-health-grid">
                  <div style={{ background: themeForm.pageBg }}>
                    <span>Page BG</span>
                    <strong>{themeForm.pageBg}</strong>
                  </div>
                  <div style={{ background: themeForm.sidebarBg, color: '#fff' }}>
                    <span style={{ color: 'rgba(255,255,255,0.72)' }}>Sidebar</span>
                    <strong style={{ color: '#fff' }}>Live</strong>
                  </div>
                </div>
                <p className="admin-meta">
                  CSS custom được lưu trong SQLite và áp dụng lại khi client tải app.
                </p>
              </div>
            </Panel>
          </div>
        </section>
      )}

      {activeTab === 'ai' && (
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>AI Server Assistant</h2>
              <p>Trợ lý AI quản lý server dựa trên MiMo API. Chỉ admin mới thấy và sử dụng.</p>
            </div>
          </div>

          <div className="admin-grid two">
            <Panel title="Cấu hình AI">
              <form onSubmit={saveAiConfig} className="admin-form">
                <label>
                  API Key (MiMo)
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(event) => setAiConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
                    placeholder={aiConfig.apiKeySet ? '•••••••••••• (đã đặt)' : 'Nhập MiMo API key'}
                  />
                </label>
                <label>
                  Model
                  <select
                    value={aiConfig.model}
                    onChange={(event) => setAiConfig((prev) => ({ ...prev, model: event.target.value }))}
                  >
                    <option value="MiMo-V2.5-Pro">MiMo-V2.5-Pro</option>
                    <option value="MiMo-V2-Flash">MiMo-V2-Flash</option>
                  </select>
                </label>
                <div className="admin-form-row">
                  <button type="submit" className="admin-button primary" disabled={aiConfigLoading}>
                    {aiConfigLoading ? 'Đang lưu...' : 'Lưu cấu hình AI'}
                  </button>
                  <button type="button" className="admin-button ghost" onClick={loadAiConfig} disabled={aiConfigLoading}>
                    Tải lại
                  </button>
                </div>
                {aiConfig.apiKeySet && (
                  <p className="admin-meta">API key đã được cấu hình. Nhập key mới để thay đổi.</p>
                )}
              </form>
            </Panel>

            <Panel title="Hướng dẫn">
              <div className="admin-list">
                <div className="admin-list-row">
                  <div>
                    <strong>1. Lấy API key</strong>
                    <span>Đăng ký tại MiMo Platform để nhận API key.</span>
                  </div>
                </div>
                <div className="admin-list-row">
                  <div>
                    <strong>2. Nhập key vào form bên trái</strong>
                    <span>Key được lưu trong database, không cần redeploy.</span>
                  </div>
                </div>
                <div className="admin-list-row">
                  <div>
                    <strong>3. Sử dụng trợ lý AI</strong>
                    <span>Nhấn nút 🤖 góc phải dưới để chat với AI về server.</span>
                  </div>
                </div>
                <div className="admin-list-row">
                  <div>
                    <strong>Chức năng</strong>
                    <span>Hỏi về user, bài viết, phòng chat, thống kê server, và các thao tác quản trị.</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </section>
      )}

      {activeTab === 'system' && (
        <section className="admin-section">
          <div className="admin-grid two">
            <Panel title="Tạo admin">
              <form onSubmit={createAdmin} className="admin-form">
                <input value={adminForm.username} onChange={(event) => setAdminForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="Username" required />
                <input value={adminForm.email} onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" type="email" required />
                <div className="admin-form-row">
                  <input value={adminForm.password} onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Password" type="password" required />
                  <input value={adminForm.role} onChange={(event) => setAdminForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role" />
                </div>
                <button type="submit" className="admin-button primary">Tạo admin</button>
              </form>
            </Panel>
            <Panel title="Admins">
              <ManageList
                items={admins}
                getKey={(item) => item.username}
                render={(item) => (
                  <div>
                    <strong>{item.username}</strong>
                    <span>{item.email} · {item.role}</span>
                  </div>
                )}
              />
            </Panel>
          </div>

          <Panel title="Server health">
            <div className="admin-health-grid">
              <div><span>Database</span><strong>{overview.storage?.database || 'SQLite'}</strong></div>
              <div><span>Status</span><strong>{overview.storage?.status || 'online'}</strong></div>
              <div><span>Last sync</span><strong>{formatDate(overview.generatedAt)}</strong></div>
              <div><span>Current admin</span><strong>{currentUser}</strong></div>
            </div>
          </Panel>
        </section>
      )}

      {messageViewer.open && (
        <div className="admin-modal-backdrop" onClick={() => setMessageViewer({ open: false, loading: false, room: null, messages: [] })}>
          <section className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>Tin nhắn phòng ẩn</h2>
                <p>
                  {messageViewer.room
                    ? `${messageViewer.room.name} · ${messageViewer.room.type} · ${messageViewer.room.id}`
                    : 'Đang tải tin nhắn'}
                </p>
              </div>
              <button
                type="button"
                className="admin-button ghost"
                onClick={() => setMessageViewer({ open: false, loading: false, room: null, messages: [] })}
              >
                Đóng
              </button>
            </div>
            <div className="admin-message-log">
              {messageViewer.loading ? (
                <div className="admin-empty">Đang tải tin nhắn...</div>
              ) : messageViewer.messages.length === 0 ? (
                <div className="admin-empty">Phòng này chưa có tin nhắn.</div>
              ) : messageViewer.messages.map((message) => (
                <article key={message._id} className="admin-message-item">
                  <div>
                    <strong>{message.username}</strong>
                    <span>{formatDate(message.createdAt)}</span>
                  </div>
                  <p>{message.message}</p>
                </article>
              ))}
            </div>
            <p className="admin-meta">
              Chế độ xem này không join room Socket.io và không ghi admin vào danh sách thành viên.
            </p>
          </section>
        </div>
      )}

      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <form className="admin-modal" onSubmit={saveUser} onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <h2>Sửa user</h2>
                <p>{editingUser.username}</p>
              </div>
              <button type="button" className="admin-button ghost" onClick={() => setEditingUser(null)}>Đóng</button>
            </div>
            <label>
              Uy tín
              <input type="number" min="0" value={userDraft.reputation} onChange={(event) => setUserDraft((prev) => ({ ...prev, reputation: event.target.value }))} />
            </label>
            <label>
              Vai trò
              <select
                value={isEditingPrimaryAdmin ? 'admin' : userDraft.role}
                disabled={!canManageRoles || isEditingPrimaryAdmin}
                onChange={(event) => setUserDraft((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label>
              Trường
              <input value={userDraft.school} onChange={(event) => setUserDraft((prev) => ({ ...prev, school: event.target.value }))} />
            </label>
            <label>
              Chuyên ngành
              <input value={userDraft.major} onChange={(event) => setUserDraft((prev) => ({ ...prev, major: event.target.value }))} />
            </label>
            <label>
              Bio
              <textarea rows="4" value={userDraft.bio} onChange={(event) => setUserDraft((prev) => ({ ...prev, bio: event.target.value }))} />
            </label>
            <button type="submit" className="admin-button primary">Lưu user</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="admin-empty">{text}</div>;
}

function ActivityList({ activities }) {
  if (!activities?.length) return <EmptyState text="Chưa có hoạt động." />;
  return (
    <div className="admin-list">
      {activities.map((activity) => (
        <div key={`${activity._id}-${activity.time}`} className="admin-list-row">
          <div>
            <strong>{activity.username}</strong>
            <span>{activity.action} {activity.target}</span>
          </div>
          <small>{formatDate(activity.time)}</small>
        </div>
      ))}
    </div>
  );
}

function ManageList({ items, getKey, render }) {
  if (!items?.length) return <EmptyState text="Chưa có dữ liệu." />;
  return (
    <div className="admin-list">
      {items.map((item) => (
        <div key={getKey(item)} className="admin-list-row">
          {render(item)}
        </div>
      ))}
    </div>
  );
}

export default AdminPanel;
