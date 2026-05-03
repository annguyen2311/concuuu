import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';

const copyByLanguage = {
  vi: {
    eyebrow: 'Kết nối',
    title: 'Bạn bè',
    subtitle: 'Tìm bạn học, quản lý lời mời và mở nhanh cuộc trò chuyện riêng.',
    search: 'Tìm username, email, trường...',
    friends: 'Bạn bè',
    incoming: 'Lời mời đến',
    discover: 'Tìm bạn mới',
    noFriends: 'Bạn chưa có bạn bè nào.',
    noIncoming: 'Không có lời mời mới.',
    noPeople: 'Không tìm thấy tài khoản phù hợp.',
    chat: 'Chat',
    remove: 'Huỷ kết bạn',
    accept: 'Chấp nhận',
    add: 'Kết bạn',
    sent: 'Đã gửi lời mời',
    friendsStatus: 'Đã là bạn bè',
    incomingStatus: 'Đang chờ bạn xác nhận',
    member: 'Thành viên NTTU',
    requestSent: (name) => `Đã gửi lời mời kết bạn tới ${name}.`,
    accepted: (name) => `Bạn và ${name} đã là bạn bè.`,
    removed: (name) => `Đã huỷ kết bạn với ${name}.`,
    failed: 'Không thể cập nhật danh sách bạn bè.',
  },
  en: {
    eyebrow: 'Connections',
    title: 'Friends',
    subtitle: 'Find classmates, manage requests, and open direct conversations quickly.',
    search: 'Search username, email, school...',
    friends: 'Friends',
    incoming: 'Incoming requests',
    discover: 'Find new friends',
    noFriends: 'You do not have friends yet.',
    noIncoming: 'No new friend requests.',
    noPeople: 'No matching accounts found.',
    chat: 'Chat',
    remove: 'Remove',
    accept: 'Accept',
    add: 'Add friend',
    sent: 'Request sent',
    friendsStatus: 'Already friends',
    incomingStatus: 'Waiting for your approval',
    member: 'NTTU member',
    requestSent: (name) => `Friend request sent to ${name}.`,
    accepted: (name) => `You and ${name} are now friends.`,
    removed: (name) => `Removed ${name} from friends.`,
    failed: 'Could not update friends.',
  },
};

function Friends({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const currentUser = localStorage.getItem('username');
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const showNotice = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const loadFriendsData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [peopleRes, friendsRes, requestsRes] = await Promise.all([
        axios.get(`/api/users?viewer=${encodeURIComponent(currentUser)}`),
        axios.get(`/api/users/${currentUser}/friends`),
        axios.get(`/api/users/${currentUser}/friend-requests`),
      ]);
      setPeople(Array.isArray(peopleRes.data) ? peopleRes.data : []);
      setFriends(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      setRequests(requestsRes.data || { incoming: [], outgoing: [] });
    } catch (error) {
      showNotice(error.response?.data?.error || copy.failed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, []);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return people.filter((person) => (
      !normalizedQuery
      || String(person.username || '').toLowerCase().includes(normalizedQuery)
      || String(person.email || '').toLowerCase().includes(normalizedQuery)
      || String(person.school || '').toLowerCase().includes(normalizedQuery)
    ));
  }, [people, query]);

  const startPrivateChat = async (friendUsername) => {
    const res = await axios.post('/api/chat/rooms/private', { username: currentUser, friendUsername });
    localStorage.setItem('preferredRoom', res.data.id);
    navigate('/chat');
  };

  const sendFriendRequest = async (friendUsername) => {
    try {
      await axios.post(`/api/users/${currentUser}/friend-requests`, { friendUsername });
      await loadFriendsData();
      showNotice(copy.requestSent(friendUsername));
    } catch (error) {
      showNotice(error.response?.data?.error || copy.failed);
    }
  };

  const acceptRequest = async (requester) => {
    try {
      await axios.put(`/api/users/${currentUser}/friend-requests/${encodeURIComponent(requester)}/accept`);
      await loadFriendsData();
      showNotice(copy.accepted(requester));
    } catch (error) {
      showNotice(error.response?.data?.error || copy.failed);
    }
  };

  const removeFriend = async (friendUsername) => {
    try {
      await axios.delete(`/api/users/${currentUser}/friends/${encodeURIComponent(friendUsername)}`);
      await loadFriendsData();
      showNotice(copy.removed(friendUsername));
    } catch (error) {
      showNotice(error.response?.data?.error || copy.failed);
    }
  };

  const renderAction = (person) => {
    if (person.friendStatus === 'friends') {
      return <button type="button" onClick={() => startPrivateChat(person.username)} className="btn-primary px-4 py-2 text-sm">{copy.chat}</button>;
    }
    if (person.friendStatus === 'incoming') {
      return <button type="button" onClick={() => acceptRequest(person.username)} className="btn-success px-4 py-2 text-sm">{copy.accept}</button>;
    }
    if (person.friendStatus === 'outgoing') {
      return <span className="badge badge-primary">{copy.sent}</span>;
    }
    return <button type="button" onClick={() => sendFriendRequest(person.username)} className="btn-secondary px-4 py-2 text-sm">{copy.add}</button>;
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
              <strong className="block text-xl text-[var(--accent)]">{friends.length}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">{copy.friends}</span>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{requests.incoming?.length || 0}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">{copy.incoming}</span>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3">
              <strong className="block text-xl text-[var(--accent)]">{people.length}</strong>
              <span className="text-xs font-bold text-[var(--text-muted)]">{copy.discover}</span>
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mb-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">{copy.friends}</h2>
            <div className="grid gap-3">
              {friends.length === 0 ? (
                <p className="text-sm font-semibold text-[var(--text-muted)]">{copy.noFriends}</p>
              ) : friends.map((friend) => (
                <div key={friend.username} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-3">
                  <UserAvatar value={friend.avatar} name={friend.username} className="h-11 w-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-[var(--text-primary)]">{friend.username}</p>
                    <p className="truncate text-xs font-semibold text-[var(--text-muted)]">{friend.school || copy.member}</p>
                  </div>
                  <button type="button" onClick={() => startPrivateChat(friend.username)} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white">
                    {copy.chat}
                  </button>
                  <button type="button" onClick={() => removeFriend(friend.username)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {copy.remove}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">{copy.incoming}</h2>
            <div className="grid gap-3">
              {(requests.incoming || []).length === 0 ? (
                <p className="text-sm font-semibold text-[var(--text-muted)]">{copy.noIncoming}</p>
              ) : requests.incoming.map((person) => (
                <div key={person.username} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-3">
                  <UserAvatar value={person.avatar} name={person.username} className="h-11 w-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-[var(--text-primary)]">{person.username}</p>
                    <p className="truncate text-xs font-semibold text-[var(--text-muted)]">{copy.incomingStatus}</p>
                  </div>
                  <button type="button" onClick={() => acceptRequest(person.username)} className="btn-success px-4 py-2 text-sm">
                    {copy.accept}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-black text-[var(--text-primary)]">{copy.discover}</h2>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="input-field md:max-w-md" placeholder={copy.search} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {loading ? (
              <EmptyState text="Loading..." />
            ) : filteredPeople.length === 0 ? (
              <EmptyState text={copy.noPeople} />
            ) : filteredPeople.map((person) => (
              <article key={person.username} className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-muted)] p-4">
                <UserAvatar value={person.avatar} name={person.username} className="h-12 w-12 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-[var(--text-primary)]">{person.username}</p>
                  <p className="truncate text-sm font-semibold text-[var(--text-muted)]">
                    {person.friendStatus === 'friends'
                      ? copy.friendsStatus
                      : person.friendStatus === 'incoming'
                        ? copy.incomingStatus
                        : person.email || person.school || copy.member}
                  </p>
                </div>
                {renderAction(person)}
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
    <div className="rounded-[1.25rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-10 text-center font-bold text-[var(--text-muted)] md:col-span-2">
      {text}
    </div>
  );
}

export default Friends;
