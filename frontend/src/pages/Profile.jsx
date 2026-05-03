import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getLevelInfo } from '../utils/level';

const copyByLanguage = {
  vi: {
    loading: 'Đang tải...',
    notFound: 'Không tìm thấy hồ sơ',
    joined: 'Tham gia từ',
    unknownDate: 'Chưa rõ',
    noTags: 'Chưa có tag',
    cancelEdit: 'Huỷ chỉnh sửa',
    editProfile: 'Chỉnh sửa hồ sơ',
    posts: 'Bài viết',
    friends: 'Bạn bè',
    level: 'Cấp',
    updateProfile: 'Cập nhật hồ sơ',
    uploadAvatar: 'Upload avatar',
    uploadCover: 'Upload ảnh bìa',
    bioPlaceholder: 'Viết tiểu sử, trạng thái hoặc câu giới thiệu...',
    schoolPlaceholder: 'Trường',
    majorPlaceholder: 'Chuyên ngành',
    skillsTitle: 'Kỹ năng & sở thích',
    tagNamePlaceholder: 'Nhập kỹ năng hoặc sở thích...',
    tagColor: 'Màu',
    addTag: 'Thêm tag',
    removeTag: 'Xoá tag',
    duplicateTag: 'Tag này đã có trong hồ sơ.',
    emptyTag: 'Nhập tên tag trước khi thêm.',
    saveChanges: 'Lưu thay đổi',
    bio: 'Tiểu sử',
    school: 'Trường',
    major: 'Chuyên ngành',
    noBio: 'Chưa có tiểu sử. Hãy hoàn thành hồ sơ!',
    notUpdated: 'Chưa cập nhật',
    recentPosts: 'Bài viết gần đây',
    noPosts: 'Chưa có bài viết. Hãy tạo bài viết đầu tiên!',
    noFriends: 'Chưa có bạn bè. Hãy tìm bạn học bên dưới.',
    friendLabel: 'Bạn bè',
    chat: 'Chat',
    friendRequests: 'Lời mời kết bạn',
    accept: 'Nhận',
    findFriends: 'Tìm bạn học',
    searchUsername: 'Tìm username...',
    defaultMember: 'Thành viên NTTU',
    message: 'Nhắn tin',
    sent: 'Đã gửi',
    addFriend: 'Kết bạn',
    invalidImage: 'Vui lòng chọn file ảnh.',
    imageTooLarge: 'Ảnh nên nhỏ hơn 2MB để lưu nhanh hơn.',
    imageReadError: 'Không thể đọc ảnh.',
    profileSaved: 'Đã lưu hồ sơ và hình ảnh.',
    profileSaveFailed: 'Không thể lưu hồ sơ.',
    requestSent: (name) => `Đã gửi lời mời kết bạn tới ${name}.`,
    requestAccepted: (name) => `Bạn và ${name} đã là bạn bè.`,
    relationUpdated: (name) => `Đã cập nhật quan hệ với ${name}.`,
  },
  en: {
    loading: 'Loading...',
    notFound: 'Profile not found',
    joined: 'Joined',
    unknownDate: 'Unknown',
    noTags: 'No tags yet',
    cancelEdit: 'Cancel editing',
    editProfile: 'Edit profile',
    posts: 'Posts',
    friends: 'Friends',
    level: 'Level',
    updateProfile: 'Update profile',
    uploadAvatar: 'Upload avatar',
    uploadCover: 'Upload cover image',
    bioPlaceholder: 'Write a bio, status, or short introduction...',
    schoolPlaceholder: 'School',
    majorPlaceholder: 'Major',
    skillsTitle: 'Skills & interests',
    tagNamePlaceholder: 'Enter a skill or interest...',
    tagColor: 'Color',
    addTag: 'Add tag',
    removeTag: 'Remove tag',
    duplicateTag: 'This tag is already in your profile.',
    emptyTag: 'Enter a tag name first.',
    saveChanges: 'Save changes',
    bio: 'Bio',
    school: 'School',
    major: 'Major',
    noBio: 'No bio yet. Complete your profile to introduce yourself.',
    notUpdated: 'Not updated',
    recentPosts: 'Recent posts',
    noPosts: 'No posts yet. Create your first post!',
    noFriends: 'No friends yet. Find classmates below.',
    friendLabel: 'Friend',
    chat: 'Chat',
    friendRequests: 'Friend requests',
    accept: 'Accept',
    findFriends: 'Find classmates',
    searchUsername: 'Search username...',
    defaultMember: 'NTTU member',
    message: 'Message',
    sent: 'Sent',
    addFriend: 'Add friend',
    invalidImage: 'Please choose an image file.',
    imageTooLarge: 'Images should be smaller than 2MB.',
    imageReadError: 'Could not read the image.',
    profileSaved: 'Profile and images saved.',
    profileSaveFailed: 'Could not save profile.',
    requestSent: (name) => `Friend request sent to ${name}.`,
    requestAccepted: (name) => `You and ${name} are now friends.`,
    relationUpdated: (name) => `Relationship with ${name} updated.`,
  },
};

const fileToDataUrl = (file, copy) => new Promise((resolve, reject) => {
  if (!file) {
    resolve('');
    return;
  }
  if (!file.type.startsWith('image/')) {
    reject(new Error(copy.invalidImage));
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    reject(new Error(copy.imageTooLarge));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error(copy.imageReadError));
  reader.readAsDataURL(file);
});

function AvatarPreview({ value, username, className = 'h-24 w-24 text-2xl' }) {
  if (value && value.startsWith('data:image')) {
    return (
      <img
        src={value}
        alt={username}
        className={`rounded-full object-cover ring-4 ring-[var(--surface-elevated)] shadow-xl ${className}`}
      />
    );
  }

  return <div className={`avatar ${className}`}>{value || (username || 'U').charAt(0).toUpperCase()}</div>;
}

function Profile({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', school: '', major: '', avatar: '', coverImage: '', tags: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [peopleSearch, setPeopleSearch] = useState('');
  const [customTag, setCustomTag] = useState({ name: '', color: '#3B82F6' });
  const currentUser = localStorage.getItem('username');
  const navigate = useNavigate();

  const joinDate = profile?.joinDate ? new Date(profile.joinDate) : null;
  const joinDateLabel = joinDate && !Number.isNaN(joinDate.getTime())
    ? joinDate.toLocaleDateString(locale)
    : copy.unknownDate;
  const profileTags = profile?.tags || [];
  const profileLevel = getLevelInfo(profile);

  const filteredUsers = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase();
    return allUsers
      .filter((user) => !query || user.username.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allUsers, peopleSearch]);

  const addCustomTag = () => {
    const name = customTag.name.trim();
    if (!name) {
      showMessage(copy.emptyTag);
      return;
    }
    if (formData.tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
      showMessage(copy.duplicateTag);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, { name, color: customTag.color || '#3B82F6' }],
    }));
    setCustomTag((prev) => ({ ...prev, name: '' }));
  };

  const removeTag = (tagName) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.name !== tagName),
    }));
  };

  const syncStoredUser = (updates) => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;

    try {
      const parsedUser = JSON.parse(savedUser);
      const nextUser = { ...parsedUser, ...updates };
      localStorage.setItem('user', JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent('studentnet:user-updated', { detail: nextUser }));
    } catch (error) {
      console.error('Failed to sync stored user', error);
    }
  };

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/${currentUser}`);
      setProfile(res.data);
      setFormData({
        bio: res.data.bio || '',
        school: res.data.school || '',
        major: res.data.major || '',
        avatar: res.data.avatar || '',
        coverImage: res.data.coverImage || '',
        tags: res.data.tags || [],
      });
      setUserPosts(res.data.posts || []);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSocialData = async () => {
    if (!currentUser) return;
    try {
      const [usersRes, friendsRes, requestsRes] = await Promise.all([
        axios.get(`/api/users?viewer=${encodeURIComponent(currentUser)}`),
        axios.get(`/api/users/${currentUser}/friends`),
        axios.get(`/api/users/${currentUser}/friend-requests`),
      ]);
      setAllUsers(usersRes.data || []);
      setFriends(friendsRes.data || []);
      setRequests(requestsRes.data || { incoming: [], outgoing: [] });
    } catch (err) {
      console.error('Error loading social data:', err);
    }
  };

  useEffect(() => {
    loadProfile();
    loadSocialData();
  }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const [profileRes, tagsRes] = await Promise.all([
        axios.put(`/api/users/${currentUser}`, {
          bio: formData.bio,
          school: formData.school,
          major: formData.major,
          avatar: formData.avatar,
          coverImage: formData.coverImage,
        }),
        axios.put(`/api/users/${currentUser}/tags`, {
          tags: formData.tags,
        }),
      ]);

      const nextProfile = { ...profileRes.data, tags: tagsRes.data, posts: userPosts, postCount: userPosts.length };
      setProfile(nextProfile);
      syncStoredUser({
        bio: nextProfile.bio,
        school: nextProfile.school,
        major: nextProfile.major,
        avatar: nextProfile.avatar,
        coverImage: nextProfile.coverImage,
      });
      setIsEditing(false);
      showMessage(copy.profileSaved);
    } catch (err) {
      console.error('Error updating profile:', err);
      showMessage(err.response?.data?.error || copy.profileSaveFailed);
    }
  };

  const handleImageChange = async (field, file) => {
    try {
      const dataUrl = await fileToDataUrl(file, copy);
      setFormData((prev) => ({ ...prev, [field]: dataUrl }));
    } catch (err) {
      showMessage(err.message);
    }
  };

  const cancelEditing = () => {
    setFormData({
      bio: profile?.bio || '',
      school: profile?.school || '',
      major: profile?.major || '',
      avatar: profile?.avatar || '',
      coverImage: profile?.coverImage || '',
      tags: profile?.tags || [],
    });
    setIsEditing(false);
  };

  const sendFriendRequest = async (friendUsername) => {
    await axios.post(`/api/users/${currentUser}/friend-requests`, { friendUsername });
    await loadSocialData();
    showMessage(copy.requestSent(friendUsername));
  };

  const acceptRequest = async (requester) => {
    await axios.put(`/api/users/${currentUser}/friend-requests/${requester}/accept`);
    await loadSocialData();
    showMessage(copy.requestAccepted(requester));
  };

  const removeFriend = async (friendUsername) => {
    await axios.delete(`/api/users/${currentUser}/friends/${friendUsername}`);
    await loadSocialData();
    showMessage(copy.relationUpdated(friendUsername));
  };

  const startPrivateChat = async (friendUsername) => {
    const res = await axios.post('/api/chat/rooms/private', { username: currentUser, friendUsername });
    localStorage.setItem('preferredRoom', res.data.id);
    navigate('/chat');
  };

  const renderFriendButton = (user) => {
    if (user.friendStatus === 'friends') {
      return (
        <button type="button" onClick={() => startPrivateChat(user.username)} className="btn-primary px-3 py-2 text-xs">
          {copy.message}
        </button>
      );
    }
    if (user.friendStatus === 'outgoing') {
      return <span className="badge badge-primary">{copy.sent}</span>;
    }
    if (user.friendStatus === 'incoming') {
      return (
        <button type="button" onClick={() => acceptRequest(user.username)} className="btn-success px-3 py-2 text-xs">
          {copy.accept}
        </button>
      );
    }
    return (
      <button type="button" onClick={() => sendFriendRequest(user.username)} className="btn-secondary px-3 py-2 text-xs">
        {copy.addFriend}
      </button>
    );
  };

  if (loading) {
    return <div className="main-container py-12 text-center text-[var(--text-secondary)]">{copy.loading}</div>;
  }

  if (!profile) {
    return <div className="main-container py-12 text-center text-[var(--text-secondary)]">{copy.notFound}</div>;
  }

  return (
    <main className="main-container max-w-6xl">
      {message && (
        <div className="fixed right-6 top-24 z-50 rounded-2xl bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-[var(--surface-elevated)] shadow-xl">
          {message}
        </div>
      )}

      <section className="mb-6 overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)]">
        <div
          className="relative h-48 bg-gradient-to-r from-sky-200 via-violet-200 to-teal-200"
          style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        </div>

        <div className="relative px-6 pb-6 md:px-8">
          <div className="-mt-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <AvatarPreview value={profile.avatar} username={profile.username} className="h-32 w-32 text-4xl" />
              <div className="pb-2">
                <h1 className="text-4xl font-black text-[var(--text-primary)]">{profile.username}</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.joined} {joinDateLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileTags.length > 0 ? profileTags.map((tag) => (
                    <span key={tag.name} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  )) : <span className="badge badge-primary">{copy.noTags}</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (isEditing ? cancelEditing() : setIsEditing(true))}
              className={isEditing ? 'btn-secondary' : 'btn-primary'}
            >
              {isEditing ? copy.cancelEdit : copy.editProfile}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <ProfileMetric value={profile.postCount || 0} label={copy.posts} />
            <ProfileMetric value={friends.length} label={copy.friends} />
            <ProfileMetric value={profileLevel.level} label={copy.level} />
          </div>
        </div>
      </section>

      {isEditing && (
        <section className="card mb-6 shadow-lg">
          <h2 className="mb-4 text-xl font-black text-[var(--text-primary)]">{copy.updateProfile}</h2>
          <form onSubmit={updateProfile} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                <span className="block text-sm font-bold text-[var(--text-primary)]">{copy.uploadAvatar}</span>
                <input type="file" accept="image/*" className="mt-3 text-sm text-[var(--text-secondary)]" onChange={(e) => handleImageChange('avatar', e.target.files?.[0])} />
              </label>
              <label className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                <span className="block text-sm font-bold text-[var(--text-primary)]">{copy.uploadCover}</span>
                <input type="file" accept="image/*" className="mt-3 text-sm text-[var(--text-secondary)]" onChange={(e) => handleImageChange('coverImage', e.target.files?.[0])} />
              </label>
            </div>

            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="input-field min-h-28"
              placeholder={copy.bioPlaceholder}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} className="input-field" placeholder={copy.schoolPlaceholder} />
              <input value={formData.major} onChange={(e) => setFormData({ ...formData, major: e.target.value })} className="input-field" placeholder={copy.majorPlaceholder} />
            </div>

            <div>
              <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">{copy.skillsTitle}</p>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_auto]">
                  <input
                    value={customTag.name}
                    onChange={(event) => setCustomTag((prev) => ({ ...prev, name: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomTag();
                      }
                    }}
                    className="input-field bg-[var(--surface-elevated)]"
                    placeholder={copy.tagNamePlaceholder}
                  />
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    {copy.tagColor}
                    <input
                      type="color"
                      value={customTag.color}
                      onChange={(event) => setCustomTag((prev) => ({ ...prev, color: event.target.value }))}
                      className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1"
                    />
                  </label>
                  <button type="button" onClick={addCustomTag} className="btn-primary min-h-12 px-5">
                    {copy.addTag}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.tags.length === 0 ? (
                    <span className="badge badge-primary">{copy.noTags}</span>
                  ) : formData.tags.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => removeTag(tag.name)}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                      title={copy.removeTag}
                    >
                      <span>{tag.name}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-success w-full">{copy.saveChanges}</button>
          </form>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ProfileInfo title={`💭 ${copy.bio}`} value={profile.bio || copy.noBio} />
            <ProfileInfo title={`🏫 ${copy.school}`} value={profile.school || copy.notUpdated} />
            <ProfileInfo title={`📚 ${copy.major}`} value={profile.major || copy.notUpdated} />
          </div>

          <section className="card shadow-lg">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">📝 {copy.recentPosts}</h2>
            {userPosts.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-secondary)]">{copy.noPosts}</div>
            ) : (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <article key={post._id} className="rounded-2xl border-l-4 border-[var(--accent)] bg-[var(--surface-muted)] p-4">
                    {post.title && <h3 className="mb-1 font-bold text-[var(--text-primary)]">{post.title}</h3>}
                    <p className="text-sm text-[var(--text-secondary)]">{post.content}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">👥 {copy.friends}</h2>
            <div className="space-y-3">
              {friends.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{copy.noFriends}</p>
              ) : friends.slice(0, 6).map((friend) => (
                <div key={friend.username} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-3">
                  <AvatarPreview value={friend.avatar} username={friend.username} className="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--text-primary)]">{friend.username}</p>
                    <p className="text-xs text-[var(--text-muted)]">{copy.friendLabel}</p>
                  </div>
                  <button type="button" onClick={() => startPrivateChat(friend.username)} className="rounded-full bg-[var(--surface-elevated)] px-3 py-2 text-sm font-bold text-[var(--accent)]">
                    {copy.chat}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {requests.incoming.length > 0 && (
            <section className="card">
              <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">📨 {copy.friendRequests}</h2>
              <div className="space-y-3">
                {requests.incoming.map((requester) => (
                  <div key={requester.username} className="flex items-center gap-3">
                    <AvatarPreview value={requester.avatar} username={requester.username} className="h-10 w-10 text-sm" />
                    <p className="flex-1 font-bold text-[var(--text-primary)]">{requester.username}</p>
                    <button type="button" onClick={() => acceptRequest(requester.username)} className="btn-success px-3 py-2 text-xs">{copy.accept}</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">🔎 {copy.findFriends}</h2>
            <input value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} className="input-field mb-4" placeholder={copy.searchUsername} />
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.username} className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] p-3">
                  <AvatarPreview value={user.avatar} username={user.username} className="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--text-primary)]">{user.username}</p>
                    <p className="text-xs text-[var(--text-muted)]">{user.school || copy.defaultMember}</p>
                  </div>
                  {renderFriendButton(user)}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ProfileMetric({ value, label }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-2xl font-black text-[var(--accent)]">{value}</p>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

function ProfileInfo({ title, value }) {
  return (
    <article className="card">
      <h3 className="mb-2 font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)]">{value}</p>
    </article>
  );
}

export default Profile;
