import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import UserAvatar, { getAvatarText, isImageSource } from '../components/UserAvatar';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏'];
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const roomTranslations = {
  announcements: { enName: 'announcements', enTopic: 'Important community announcements' },
  rules: { enName: 'rules', enTopic: 'Community rules and usage guidelines' },
  general: { enName: 'General', enTopic: 'General chat channel for NTTU students' },
  introductions: { enName: 'introductions', enTopic: 'Introduce yourself and meet everyone' },
  questions: { enName: 'questions', enTopic: 'Ask study questions and get support' },
  react: { enName: 'React', enTopic: 'React, frontend, and UI discussion' },
  nodejs: { enName: 'Node.js', enTopic: 'Node.js, backend, and API discussion' },
  python: { enName: 'Python', enTopic: 'Python, data, and automation' },
  assignments: { enName: 'assignments', enTopic: 'Assignments, documents, and deadlines' },
  webdesign: { enName: 'Web Design', enTopic: 'UI, UX, web design, and portfolios' },
  projects: { enName: 'projects', enTopic: 'Find teammates and share what you are building' },
  internships: { enName: 'internships', enTopic: 'Internship opportunities and application experience' },
  career: { enName: 'career-talk', enTopic: 'CVs, interviews, and career direction' },
  'events-community': { enName: 'events', enTopic: 'Events, workshops, and student activities' },
  random: { enName: 'casual-chat', enTopic: 'Light conversation outside class time' },
};

const copyByLanguage = {
  vi: {
    eyebrow: 'Messages',
    title: 'Tin nhắn',
    searchRooms: 'Tìm hội thoại',
    createGroup: 'Tạo nhóm',
    refresh: 'Làm mới',
    groupName: 'Tên nhóm',
    createGroupChat: 'Tạo nhóm chat',
    friends: 'Bạn bè',
    addFriend: 'Thêm bạn',
    searchPeople: 'Tìm username, email...',
    noPeople: 'Chưa tìm thấy tài khoản phù hợp.',
    noRooms: 'Không tìm thấy phòng chat',
    privateMessage: 'Tin nhắn riêng tư',
    groupMembers: 'thành viên trong nhóm',
    online: 'đang online',
    ready: 'Sẵn sàng trò chuyện',
    addMembers: 'Thêm bạn',
    searchMessages: 'Tìm trong cuộc trò chuyện',
    addFriendsToGroup: 'Thêm bạn bè vào nhóm',
    ownerOnly: 'Chỉ owner/admin mới thấy khu vực này.',
    close: 'Đóng',
    noFriendsToAdd: 'Không còn bạn bè nào để thêm vào nhóm này.',
    addSelected: 'Thêm thành viên',
    loadingMessages: 'Đang tải tin nhắn...',
    noMatchingMessages: 'Không có tin nhắn phù hợp',
    noMessages: 'Chưa có tin nhắn',
    startConversation: 'Bắt đầu cuộc trò chuyện bằng tin nhắn đầu tiên.',
    typing: 'đang nhập...',
    send: 'Gửi',
    locked: 'Kênh này chỉ cho phép admin gửi tin nhắn.',
    info: 'Thông tin',
    members: 'Thành viên',
    topic: 'Chủ đề',
    messagePlaceholder: 'Nhắn tin trong',
    justNow: 'Vừa xong',
    minuteShort: 'phút',
    hourShort: 'giờ',
    dayShort: 'ngày',
    noPreview: 'Chưa có tin nhắn',
    alreadyFriends: 'Đã là bạn bè',
    waitingForYou: 'Đang chờ bạn xác nhận',
    requestSent: 'Đã gửi lời mời',
    canAddFriend: 'Có thể kết bạn',
    viewActions: 'Tùy chọn người dùng',
    userActions: 'Tương tác',
    messageUser: 'Nhắn tin',
    sentRequest: 'Đã gửi lời mời',
    addFriendAction: 'Kết bạn',
    acceptFriendAction: 'Chấp nhận',
    you: 'Bạn',
    requestsShort: 'lời mời',
    accept: 'Nhận',
    reactionTitle: 'Thả cảm xúc',
    dmType: 'DM',
    groupType: 'Nhóm',
    channelType: 'Kênh',
  },
  en: {
    eyebrow: 'Messages',
    title: 'Messages',
    searchRooms: 'Search conversations',
    createGroup: 'New group',
    refresh: 'Refresh',
    groupName: 'Group name',
    createGroupChat: 'Create group chat',
    friends: 'Friends',
    addFriend: 'Add friend',
    searchPeople: 'Search username, email...',
    noPeople: 'No matching accounts found.',
    noRooms: 'No chat rooms found',
    privateMessage: 'Private message',
    groupMembers: 'members in group',
    online: 'online',
    ready: 'Ready to chat',
    addMembers: 'Add friends',
    searchMessages: 'Search this conversation',
    addFriendsToGroup: 'Add friends to group',
    ownerOnly: 'Only owners/admins can see this area.',
    close: 'Close',
    noFriendsToAdd: 'No more friends to add to this group.',
    addSelected: 'Add members',
    loadingMessages: 'Loading messages...',
    noMatchingMessages: 'No matching messages',
    noMessages: 'No messages yet',
    startConversation: 'Start the conversation with the first message.',
    typing: 'is typing...',
    send: 'Send',
    locked: 'Only admins can send messages in this channel.',
    info: 'Info',
    members: 'Members',
    topic: 'Topic',
    messagePlaceholder: 'Message',
    justNow: 'Just now',
    minuteShort: 'min',
    hourShort: 'hr',
    dayShort: 'd',
    noPreview: 'No messages yet',
    alreadyFriends: 'Already friends',
    waitingForYou: 'Waiting for your approval',
    requestSent: 'Request sent',
    canAddFriend: 'Can add friend',
    viewActions: 'User actions',
    userActions: 'Actions',
    messageUser: 'Message',
    sentRequest: 'Request sent',
    addFriendAction: 'Add friend',
    acceptFriendAction: 'Accept',
    you: 'You',
    requestsShort: 'requests',
    accept: 'Accept',
    reactionTitle: 'React',
    dmType: 'DM',
    groupType: 'Group',
    channelType: 'Channel',
  },
};

function RoomAvatar({ icon, label = 'C', className = 'h-12 w-12 text-lg' }) {
  if (isImageSource(icon)) {
    return <img src={icon} alt={label} className={`rounded-full object-cover shadow-md ${className}`} />;
  }
  return <div className={`avatar ${className}`}>{icon || getAvatarText(label)}</div>;
}

function ChatRoom({ language = 'vi' }) {
  const copy = copyByLanguage[language] || copyByLanguage.vi;
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(() => localStorage.getItem('preferredRoom') || 'general');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [roomSearch, setRoomSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [activeUserMenu, setActiveUserMenu] = useState(null);
  const [friends, setFriends] = useState([]);
  const [people, setPeople] = useState([]);
  const [showGroupComposer, setShowGroupComposer] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('👨‍👩‍👧‍👦');
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersToAdd, setMembersToAdd] = useState([]);

  const currentUser = localStorage.getItem('username') || 'Guest';
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const socketRef = useRef(null);
  const selectedRoomRef = useRef('general');
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const formatRoomIcon = (roomId) => {
    if (roomId === 'react') return '⚛️';
    if (roomId === 'nodejs') return '🟢';
    if (roomId === 'python') return '🐍';
    if (roomId === 'webdesign') return '🎨';
    return '💬';
  };

  const formatRoomName = (room) => {
    if (language === 'en' && roomTranslations[room?.id]?.enName) {
      return roomTranslations[room.id].enName;
    }
    return room?.name || room?.id || 'Chat';
  };

  const formatRoomTopic = (room) => {
    if (language === 'en' && roomTranslations[room?.id]?.enTopic) {
      return roomTranslations[room.id].enTopic;
    }
    return room?.topic || '';
  };

  const formatTime = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return copy.justNow;
    }
    return d.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return copy.justNow;
    if (diffMins < 60) return `${diffMins} ${copy.minuteShort}`;
    if (diffHours < 24) return `${diffHours} ${copy.hourShort}`;
    if (diffDays < 7) return `${diffDays} ${copy.dayShort}`;
    return d.toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN');
  };

  const truncate = (text, length = 42) => {
    if (!text) return copy.noPreview;
    return text.length > length ? `${text.slice(0, length).trim()}...` : text;
  };

  const getAvatarLabel = (item) => {
    const avatar = String(item?.avatar || '').trim();
    if (avatar && !isImageSource(avatar)) {
      return getAvatarText(avatar);
    }
    return getAvatarText(item?.username || item?.name || 'U');
  };

  const mergeRoomList = (baseRooms, apiRooms) => {
    const map = new Map(baseRooms.map((room, index) => [room.id, { ...room, order: index }]));

    for (const room of apiRooms || []) {
      const existing = map.get(room.id) || {};
      map.set(room.id, {
        ...existing,
        ...room,
        name: existing.name || room.name || room.id,
        icon: existing.icon || room.icon || formatRoomIcon(room.id),
        order: existing.order ?? map.size,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.type === 'public' && b.type === 'public') {
        return (a.position || 0) - (b.position || 0) || formatRoomName(a).localeCompare(formatRoomName(b));
      }
      if (a.lastTime && b.lastTime) {
        return new Date(b.lastTime) - new Date(a.lastTime);
      }
      if (a.lastTime) return -1;
      if (b.lastTime) return 1;
      return a.order - b.order;
    });
  };

  const updateRoomPreview = (roomList, msg) => {
    const existingRoom = roomList.find((room) => room.id === msg.room);
    const nextRoom = {
      ...(existingRoom || {
        id: msg.room,
        name: msg.room,
        icon: formatRoomIcon(msg.room),
        messageCount: 0,
        order: roomList.length,
      }),
      lastMessage: msg.message,
      lastUser: msg.username,
      lastTime: msg.createdAt,
      messageCount: (existingRoom?.messageCount || 0) + (existingRoom?.lastTime === msg.createdAt ? 0 : 1),
    };

    return mergeRoomList(
      roomList.filter((room) => room.id !== msg.room),
      [nextRoom],
    );
  };

  const addTypingUser = (room, username) => {
    if (!room || !username || username === currentUser) {
      return;
    }

    setTypingUsers((prev) => {
      const users = new Set(prev[room] || []);
      users.add(username);
      return { ...prev, [room]: Array.from(users) };
    });
  };

  const removeTypingUser = (room, username) => {
    if (!room) {
      return;
    }

    setTypingUsers((prev) => {
      if (!username) {
        return { ...prev, [room]: [] };
      }

      const users = new Set(prev[room] || []);
      users.delete(username);
      return { ...prev, [room]: Array.from(users) };
    });
  };

  const loadRooms = async () => {
    try {
      const res = await axios.get(`/api/chat/rooms/list/all?username=${encodeURIComponent(currentUser)}`);
      const nextRooms = mergeRoomList([], Array.isArray(res.data) ? res.data : []);
      setRooms(nextRooms);
      if (nextRooms.length > 0 && !nextRooms.some((room) => room.id === selectedRoomRef.current)) {
        setSelectedRoom(nextRooms[0].id);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await axios.get(`/api/users/${currentUser}/friends`);
      setFriends(res.data || []);
    } catch (err) {
      console.error('Error loading friends:', err);
    }
  };

  const loadPeople = async () => {
    try {
      const res = await axios.get(`/api/users?viewer=${encodeURIComponent(currentUser)}`);
      setPeople(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading people:', err);
    }
  };

  const loadMessages = async (room) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/chat/${room}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token: localStorage.getItem('token') },
    });
    socketRef.current = socket;

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on('chatError', (error) => {
      console.error('Chat error:', error);
    });

    socket.on('newMessage', (msg) => {
      setRooms((prev) => updateRoomPreview(prev, msg));
      removeTypingUser(msg.room, msg.username);

      if (msg.room === selectedRoomRef.current) {
        setMessages((prev) => {
          if (prev.some((item) => item._id === msg._id)) {
            return prev;
          }
          return [...prev, msg];
        });
        return;
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [msg.room]: (prev[msg.room] || 0) + 1,
      }));
    });

    socket.on('messageReactionUpdated', (updatedMessage) => {
      if (updatedMessage.room !== selectedRoomRef.current) {
        return;
      }

      setMessages((prev) => prev.map((msg) => (
        msg._id === updatedMessage._id ? updatedMessage : msg
      )));
    });

    socket.on('typing', ({ room, username }) => addTypingUser(room, username));
    socket.on('stopTyping', ({ room, username }) => removeTypingUser(room, username));
    socket.on('userCount', (count) => setOnlineUsers(count));

    return () => {
      window.clearTimeout(typingTimeoutRef.current);
      socket.off('connect_error');
      socket.off('chatError');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
    localStorage.removeItem('preferredRoom');
    socketRef.current?.emit('joinRoom', selectedRoom);
    setUnreadCounts((prev) => ({ ...prev, [selectedRoom]: 0 }));
    setActiveReactionMessage(null);
    setActiveUserMenu(null);
    setShowAddMembers(false);
    setMembersToAdd([]);
    setMessageSearch('');
    loadMessages(selectedRoom);

    return () => {
      socketRef.current?.emit('stopTyping', { room: selectedRoom, username: currentUser });
      socketRef.current?.emit('leaveRoom', selectedRoom);
    };
  }, [currentUser, selectedRoom]);

  useEffect(() => {
    loadRooms();
    loadFriends();
    loadPeople();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRoom]);

  const normalizedRooms = useMemo(() => rooms.map((room) => ({
    ...room,
    icon: room.icon || formatRoomIcon(room.id),
  })), [rooms]);

  const filteredRooms = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();
    if (!query) {
      return normalizedRooms;
    }

    return normalizedRooms.filter((room) => (
      formatRoomName(room).toLowerCase().includes(query)
      || formatRoomTopic(room).toLowerCase().includes(query)
      || String(room.lastMessage || '').toLowerCase().includes(query)
      || String(room.lastUser || '').toLowerCase().includes(query)
    ));
  }, [language, normalizedRooms, roomSearch]);

  const roomGroups = useMemo(() => {
    const categoryLabels = language === 'en'
      ? {
          'Bắt đầu': 'Start here',
          'Cộng đồng': 'Community',
          'Học tập': 'Study',
          'Thiết kế': 'Design',
          'Dự án': 'Projects',
          'Việc làm': 'Jobs',
          'Giải trí': 'Casual',
        }
      : {};
    const groupMap = new Map();
    const ensureGroup = (name, order) => {
      if (!groupMap.has(name)) {
        groupMap.set(name, { name, order, rooms: [] });
      }
      return groupMap.get(name);
    };

    for (const room of filteredRooms) {
      const groupName = room.type === 'private'
        ? (language === 'en' ? 'Direct messages' : 'Tin nhắn riêng')
        : room.type === 'group'
          ? (language === 'en' ? 'Private groups' : 'Nhóm riêng')
          : (categoryLabels[room.category] || room.category || (language === 'en' ? 'Community' : 'Cộng đồng'));
      const groupOrder = room.type === 'private' ? 10000 : room.type === 'group' ? 9000 : (room.position || 0);
      ensureGroup(groupName, groupOrder).rooms.push(room);
    }

    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        rooms: group.rooms.sort((a, b) => {
          if (a.type === 'public' && b.type === 'public') {
            return (a.position || 0) - (b.position || 0) || formatRoomName(a).localeCompare(formatRoomName(b));
          }
          if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime);
          if (a.lastTime) return -1;
          if (b.lastTime) return 1;
          return formatRoomName(a).localeCompare(formatRoomName(b));
        }),
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [filteredRooms, language]);

  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) {
      return messages;
    }

    return messages.filter((msg) => (
      String(msg.message || '').toLowerCase().includes(query)
      || String(msg.username || '').toLowerCase().includes(query)
    ));
  }, [messageSearch, messages]);

  const selectedRoomData = normalizedRooms.find((room) => room.id === selectedRoom) || {
    id: selectedRoom,
    name: selectedRoom,
    icon: formatRoomIcon(selectedRoom),
  };

  const selectedTypingUsers = typingUsers[selectedRoom] || [];
  const selectedMember = selectedRoomData.members?.find((member) => member.username === currentUser);
  const canManageSelectedGroup = selectedRoomData.type === 'group'
    && (storedUser?.role === 'admin' || selectedRoomData.createdBy === currentUser || selectedMember?.role === 'owner');
  const canSendInSelectedRoom = !selectedRoomData.isLocked || storedUser?.role === 'admin' || selectedRoomData.createdBy === currentUser;
  const availableFriendsForGroup = useMemo(() => {
    const existingMembers = new Set((selectedRoomData.members || []).map((member) => member.username));
    return friends.filter((friend) => !existingMembers.has(friend.username));
  }, [friends, selectedRoomData.members]);

  const peopleByUsername = useMemo(() => {
    const map = new Map();
    for (const person of people) {
      map.set(person.username, person);
    }
    for (const friend of friends) {
      map.set(friend.username, { ...map.get(friend.username), ...friend, friendStatus: 'friends' });
    }
    return map;
  }, [friends, people]);

  const getUserStatus = (username) => {
    if (!username || username === currentUser) return 'self';
    return peopleByUsername.get(username)?.friendStatus || 'none';
  };

  const getUserAvatar = (username, avatar) => peopleByUsername.get(username)?.avatar || avatar || username;

  const sendTyping = (value) => {
    setNewMessage(value);
    socketRef.current?.emit('typing', { room: selectedRoom, username: currentUser });

    window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit('stopTyping', { room: selectedRoom, username: currentUser });
    }, 900);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!canSendInSelectedRoom) return;
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    socketRef.current?.emit('sendMessage', {
      room: selectedRoom,
      username: currentUser,
      message: trimmedMessage,
    });
    socketRef.current?.emit('stopTyping', { room: selectedRoom, username: currentUser });
    window.clearTimeout(typingTimeoutRef.current);
    setNewMessage('');
  };

  const insertEmoji = (emoji) => {
    sendTyping(`${newMessage}${emoji}`);
  };

  const startPrivateChat = async (friendUsername) => {
    const res = await axios.post('/api/chat/rooms/private', { username: currentUser, friendUsername });
    setRooms((prev) => mergeRoomList(prev, [res.data]));
    setSelectedRoom(res.data.id);
    setActiveUserMenu(null);
  };

  const sendFriendRequest = async (friendUsername) => {
    await axios.post(`/api/users/${currentUser}/friend-requests`, { friendUsername });
    await Promise.all([loadFriends(), loadPeople()]);
    setActiveUserMenu(null);
  };

  const acceptFriendRequest = async (requester) => {
    await axios.put(`/api/users/${currentUser}/friend-requests/${encodeURIComponent(requester)}/accept`);
    await Promise.all([loadFriends(), loadPeople(), loadRooms()]);
    await startPrivateChat(requester);
  };

  const openUserMenu = (username, avatar) => {
    if (!username || username === currentUser) {
      return;
    }
    setActiveReactionMessage(null);
    setActiveUserMenu((current) => (
      current?.username === username ? null : { username, avatar: getUserAvatar(username, avatar) }
    ));
  };

  const toggleGroupMember = (username) => {
    setGroupMembers((prev) => (
      prev.includes(username)
        ? prev.filter((item) => item !== username)
        : [...prev, username]
    ));
  };

  const toggleMemberToAdd = (username) => {
    setMembersToAdd((prev) => (
      prev.includes(username)
        ? prev.filter((item) => item !== username)
        : [...prev, username]
    ));
  };

  const createGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) return;

    const res = await axios.post('/api/chat/rooms/groups', {
      name: groupName.trim(),
      icon: groupIcon,
      members: groupMembers,
      createdBy: currentUser,
    });

    setRooms((prev) => mergeRoomList(prev, [res.data]));
    setSelectedRoom(res.data.id);
    setGroupName('');
    setGroupMembers([]);
    setShowGroupComposer(false);
  };

  const addMembersToGroup = async (event) => {
    event.preventDefault();
    if (!canManageSelectedGroup || membersToAdd.length === 0) return;

    const res = await axios.put(`/api/chat/rooms/${encodeURIComponent(selectedRoom)}/members`, {
      username: currentUser,
      members: membersToAdd,
    });

    if (res.data?.room) {
      setRooms((prev) => mergeRoomList(prev, [res.data.room]));
    }
    setMembersToAdd([]);
    setShowAddMembers(false);
    await loadRooms();
  };

  const toggleReaction = async (messageId, reaction) => {
    socketRef.current?.emit('toggleReaction', { messageId, username: currentUser, reaction });
    setActiveReactionMessage(null);
  };

  const getReactionSummary = (reactions = []) => {
    const summary = new Map();
    for (const item of reactions) {
      summary.set(item.reaction, (summary.get(item.reaction) || 0) + 1);
    }
    return Array.from(summary.entries()).map(([reaction, count]) => ({ reaction, count }));
  };

  const getOwnReaction = (message) => message.reactions?.find((item) => item.username === currentUser)?.reaction;

  return (
    <div className="main-container max-w-7xl">
      <div className="grid h-[calc(100vh-7rem)] min-h-[38rem] grid-cols-1 overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)] xl:grid-cols-[23rem_minmax(0,1fr)_18rem] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[var(--border-color)] bg-[var(--surface-soft)] lg:border-b-0 lg:border-r">
          <div className="border-b border-[var(--border-color)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{copy.eyebrow}</p>
                <h1 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{copy.title}</h1>
              </div>
              <UserAvatar value={storedUser?.avatar} name={currentUser} className="h-11 w-11 text-sm" />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">🔍</span>
              <input
                value={roomSearch}
                onChange={(event) => setRoomSearch(event.target.value)}
                className="input-field h-11 rounded-2xl border-0 pl-11 text-sm"
                placeholder={copy.searchRooms}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowGroupComposer((value) => !value)}
                className="rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white"
              >
                {copy.createGroup}
              </button>
              <button
                type="button"
                onClick={loadRooms}
                className="rounded-2xl bg-[var(--surface-elevated)] px-3 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border-color)]"
              >
                {copy.refresh}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {showGroupComposer && (
              <form onSubmit={createGroup} className="mb-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-sm">
                <div className="mb-3 flex gap-2">
                  <input
                    value={groupIcon}
                    onChange={(event) => setGroupIcon(event.target.value.slice(0, 4))}
                    className="h-11 w-16 rounded-xl border border-[var(--border-color)] text-center text-xl"
                    placeholder="👥"
                  />
                  <input
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    className="input-field h-11 flex-1 rounded-xl border-0 text-sm"
                    placeholder={copy.groupName}
                  />
                </div>
                <div className="mb-3 max-h-32 space-y-2 overflow-y-auto">
                  {friends.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">{language === 'en' ? 'Add friends first to invite members.' : 'Kết bạn trước để thêm thành viên.'}</p>
                  ) : friends.map((friend) => (
                    <label key={friend.username} className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(friend.username)}
                        onChange={() => toggleGroupMember(friend.username)}
                      />
                      <span className="font-semibold">{friend.username}</span>
                    </label>
                  ))}
                </div>
                <button type="submit" className="btn-success w-full py-2 text-sm">{copy.createGroupChat}</button>
              </form>
            )}

            {friends.length > 0 && (
              <div className="mb-3 rounded-2xl bg-[var(--surface-elevated)] p-3 ring-1 ring-[var(--border-color)]">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">{copy.friends}</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {friends.map((friend) => (
                    <button
                      key={friend.username}
                      type="button"
                      onClick={() => startPrivateChat(friend.username)}
                      className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
                    >
                      <RoomAvatar icon={friend.avatar} label={friend.username} className="h-9 w-9 text-xs" />
                      <span className="max-w-16 truncate">{friend.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredRooms.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">{copy.noRooms}</div>
            ) : (
              roomGroups.map((group) => (
                <div key={group.name} className="mb-4">
                  <div className="mb-1 flex items-center justify-between px-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{group.name}</p>
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">{group.rooms.length}</span>
                  </div>
                  <div className="space-y-1">
                    {group.rooms.map((room) => {
                      const isActive = selectedRoom === room.id;
                      const unread = unreadCounts[room.id] || 0;
                      const previewUser = room.lastUser ? `${room.lastUser}: ` : '';
                      const channelIcon = room.type === 'public' ? '#' : room.type === 'group' ? '👥' : '●';

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoom(room.id)}
                          className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                            isActive ? 'bg-[var(--surface-elevated)] shadow-sm ring-1 ring-[var(--border-strong)]' : 'hover:bg-[var(--surface-elevated)]/75'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                            isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'
                          }`}>
                            {channelIcon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-black text-[var(--text-primary)]">{formatRoomName(room)}</p>
                              <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
                                {formatRelativeTime(room.lastTime)}
                              </span>
                            </div>
                            <p className={`mt-0.5 truncate text-xs ${unread ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                              {previewUser}{truncate(room.lastMessage || formatRoomTopic(room), 34)}
                            </p>
                          </div>
                          {unread > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <RoomAvatar icon={selectedRoomData.icon} label={formatRoomName(selectedRoomData)} />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-[var(--text-primary)]">{formatRoomName(selectedRoomData)}</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatRoomTopic(selectedRoomData)
                    ? formatRoomTopic(selectedRoomData)
                    : selectedRoomData.type === 'private'
                    ? copy.privateMessage
                    : selectedRoomData.type === 'group'
                      ? `${selectedRoomData.members?.length || 1} ${copy.groupMembers}`
                      : (onlineUsers > 0 ? `${onlineUsers} ${copy.online}` : copy.ready)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManageSelectedGroup && (
                <button
                  type="button"
                  onClick={() => setShowAddMembers((value) => !value)}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-black text-[var(--accent)] shadow-sm transition hover:bg-[var(--surface-muted)]"
                >
                  {copy.addMembers}
                </button>
              )}
              <div className="relative hidden min-w-64 md:block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">⌕</span>
                <input
                  value={messageSearch}
                  onChange={(event) => setMessageSearch(event.target.value)}
                  className="input-field h-11 rounded-2xl border-0 pl-10 text-sm"
                  placeholder={copy.searchMessages}
                />
              </div>
            </div>
          </header>

          {canManageSelectedGroup && showAddMembers && (
            <form onSubmit={addMembersToGroup} className="border-b border-[var(--border-color)] bg-[var(--surface-soft)] px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">{copy.addFriendsToGroup}</p>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{copy.ownerOnly}</p>
                </div>
                <button type="button" onClick={() => setShowAddMembers(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]">
                  {copy.close}
                </button>
              </div>
              {availableFriendsForGroup.length === 0 ? (
                <p className="rounded-xl bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border-color)]">
                  {copy.noFriendsToAdd}
                </p>
              ) : (
                <>
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {availableFriendsForGroup.map((friend) => (
                      <label key={friend.username} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ring-1 ring-[var(--border-color)] ${
                        membersToAdd.includes(friend.username) ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                      }`}>
                        <input
                          type="checkbox"
                          checked={membersToAdd.includes(friend.username)}
                          onChange={() => toggleMemberToAdd(friend.username)}
                        />
                        <RoomAvatar icon={friend.avatar} label={friend.username} className="h-7 w-7 text-[10px]" />
                        <span>{friend.username}</span>
                      </label>
                    ))}
                  </div>
                  <button type="submit" disabled={membersToAdd.length === 0} className="btn-success px-4 py-2 text-sm">
                    {copy.addSelected}{membersToAdd.length ? ` (${membersToAdd.length})` : ''}
                  </button>
                </>
              )}
            </form>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--surface-soft)] px-4 py-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">{copy.loadingMessages}</div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-[var(--text-muted)]">
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-3xl">💬</div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {messageSearch ? copy.noMatchingMessages : copy.noMessages}
                  </p>
                  <p className="mt-1 text-sm">{copy.startConversation}</p>
                </div>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isOwn = msg.username === currentUser;
                const reactionSummary = getReactionSummary(msg.reactions);
                const ownReaction = getOwnReaction(msg);

                return (
                  <div key={msg._id} className={`group mb-4 flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <button
                        type="button"
                        onClick={() => openUserMenu(msg.username, msg.avatar)}
                        className="h-9 w-9 shrink-0 rounded-full"
                        title={copy.viewActions}
                      >
                        <RoomAvatar icon={getUserAvatar(msg.username, msg.avatar)} label={getAvatarLabel(msg)} className="h-9 w-9 text-xs" />
                      </button>
                    )}
                    <div className={`relative max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className={`mb-1 flex items-center gap-2 text-xs text-[var(--text-muted)] ${isOwn ? 'justify-end' : ''}`}>
                        {!isOwn && (
                          <button
                            type="button"
                            onClick={() => openUserMenu(msg.username, msg.avatar)}
                            className="font-black text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          >
                            {msg.username}
                          </button>
                        )}
                        <span>{formatTime(msg.createdAt)}</span>
                      </div>
                      <div
                        className={`rounded-[1.25rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                          isOwn
                            ? 'rounded-br-md bg-[var(--accent)] text-white'
                            : 'rounded-bl-md bg-[var(--surface-elevated)] text-[var(--text-primary)] ring-1 ring-[var(--border-color)]'
                        }`}
                      >
                        {msg.message}
                      </div>

                      <div className={`mt-1 flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {reactionSummary.length > 0 && (
                          <div className="flex items-center gap-1 rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs shadow-sm ring-1 ring-[var(--border-color)]">
                            {reactionSummary.map((item) => (
                              <span key={item.reaction}>
                                {item.reaction}{item.count > 1 ? item.count : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveReactionMessage(activeReactionMessage === msg._id ? null : msg._id)}
                          className="rounded-full px-2 py-1 text-xs text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--surface-muted)] group-hover:opacity-100"
                          title={copy.reactionTitle}
                        >
                          {ownReaction || '😊'}
                        </button>
                      </div>

                      {activeReactionMessage === msg._id && (
                        <div className={`absolute z-20 mt-2 flex gap-1 rounded-full bg-[var(--surface-elevated)] p-1 shadow-xl ring-1 ring-[var(--border-color)] ${isOwn ? 'right-0' : 'left-0'}`}>
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction}
                              type="button"
                              onClick={() => toggleReaction(msg._id, reaction)}
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-[var(--surface-muted)] hover:scale-110 ${
                                ownReaction === reaction ? 'bg-[var(--accent-soft)]' : ''
                              }`}
                            >
                              {reaction}
                            </button>
                          ))}
                        </div>
                      )}

                      {!isOwn && activeUserMenu?.username === msg.username && (
                        <div className="absolute left-0 z-30 mt-2 w-64 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
                          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] p-3">
                            <RoomAvatar icon={activeUserMenu.avatar} label={activeUserMenu.username} className="h-11 w-11 text-sm" />
                            <div className="min-w-0">
                              <p className="truncate font-black">{activeUserMenu.username}</p>
                              <p className="text-xs font-bold text-[var(--text-muted)]">{copy.userActions}</p>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <button
                              type="button"
                              onClick={() => startPrivateChat(activeUserMenu.username)}
                              className="btn-primary min-h-10 px-3 py-2 text-sm"
                            >
                              {copy.messageUser}
                            </button>
                            {getUserStatus(activeUserMenu.username) === 'incoming' && (
                              <button
                                type="button"
                                onClick={() => acceptFriendRequest(activeUserMenu.username)}
                                className="btn-success min-h-10 px-3 py-2 text-sm"
                              >
                                {copy.acceptFriendAction}
                              </button>
                            )}
                            {getUserStatus(activeUserMenu.username) === 'outgoing' && (
                              <button type="button" disabled className="btn-secondary min-h-10 px-3 py-2 text-sm">
                                {copy.sentRequest}
                              </button>
                            )}
                            {getUserStatus(activeUserMenu.username) === 'none' && (
                              <button
                                type="button"
                                onClick={() => sendFriendRequest(activeUserMenu.username)}
                                className="btn-secondary min-h-10 px-3 py-2 text-sm"
                              >
                                {copy.addFriendAction}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {selectedTypingUsers.length > 0 && (
              <div className="mb-4 flex items-center gap-3 text-sm text-[var(--text-muted)]">
                <div className="rounded-full bg-[var(--surface-elevated)] px-4 py-2 shadow-sm ring-1 ring-[var(--border-color)]">
                  {selectedTypingUsers.join(', ')} {copy.typing}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {canSendInSelectedRoom ? (
            <form onSubmit={sendMessage} className="border-t border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-lg transition hover:bg-[var(--accent-soft)]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => sendTyping(event.target.value)}
                  placeholder={`${copy.messagePlaceholder} ${formatRoomName(selectedRoomData)}...`}
                  className="input-field min-h-12 flex-1 rounded-2xl border-0 px-5"
                />
                <button type="submit" className="btn-success h-12 rounded-2xl px-5">
                {copy.send}
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold text-[var(--text-muted)]">
                {copy.locked}
              </div>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 border-l border-[var(--border-color)] bg-[var(--surface-soft)] p-4 xl:block">
          <div className="rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-center shadow-sm">
            <RoomAvatar icon={selectedRoomData.icon} label={formatRoomName(selectedRoomData)} className="mx-auto h-16 w-16 text-xl" />
            <h2 className="mt-3 truncate text-lg font-black text-[var(--text-primary)]">{formatRoomName(selectedRoomData)}</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {selectedRoomData.type === 'private' ? copy.dmType : selectedRoomData.type === 'group' ? copy.groupType : copy.channelType}
            </p>
          </div>

          {activeUserMenu && (
            <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <RoomAvatar icon={activeUserMenu.avatar} label={activeUserMenu.username} className="h-10 w-10 text-sm" />
                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--text-primary)]">{activeUserMenu.username}</p>
                  <p className="text-xs font-bold text-[var(--text-muted)]">{copy.userActions}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <button type="button" onClick={() => startPrivateChat(activeUserMenu.username)} className="btn-primary min-h-10 px-3 py-2 text-sm">
                  {copy.messageUser}
                </button>
                {getUserStatus(activeUserMenu.username) === 'incoming' && (
                  <button type="button" onClick={() => acceptFriendRequest(activeUserMenu.username)} className="btn-success min-h-10 px-3 py-2 text-sm">
                    {copy.acceptFriendAction}
                  </button>
                )}
                {getUserStatus(activeUserMenu.username) === 'outgoing' && (
                  <button type="button" disabled className="btn-secondary min-h-10 px-3 py-2 text-sm">
                    {copy.sentRequest}
                  </button>
                )}
                {getUserStatus(activeUserMenu.username) === 'none' && (
                  <button type="button" onClick={() => sendFriendRequest(activeUserMenu.username)} className="btn-secondary min-h-10 px-3 py-2 text-sm">
                    {copy.addFriendAction}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">{copy.topic}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{formatRoomTopic(selectedRoomData) || formatRoomName(selectedRoomData)}</p>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">{copy.members}</p>
              <span className="text-xs font-bold text-[var(--text-muted)]">{selectedRoomData.members?.length || 0}</span>
            </div>
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {(selectedRoomData.members || []).length === 0 ? (
                <p className="text-sm font-semibold text-[var(--text-muted)]">{selectedRoomData.type === 'public' ? copy.ready : copy.noFriendsToAdd}</p>
              ) : selectedRoomData.members.map((member) => (
                <div key={member.username} className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                  {member.username === currentUser ? (
                    <RoomAvatar icon={member.avatar} label={member.username} className="h-8 w-8 text-xs" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openUserMenu(member.username, member.avatar)}
                      className="h-8 w-8 shrink-0 rounded-full"
                      title={copy.viewActions}
                    >
                      <RoomAvatar icon={member.avatar} label={member.username} className="h-8 w-8 text-xs" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">{member.username}</p>
                    <p className="text-[11px] font-semibold text-[var(--text-muted)]">{member.role || 'member'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ChatRoom;
