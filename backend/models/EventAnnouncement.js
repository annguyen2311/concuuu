const mongoose = require('mongoose');

let events = [
  { _id: 1, icon: '🎓', title: 'Trao Đổi Kỹ Thuật: AI & ML', date: '25 Tháng 4', time: '2:00 SA', createdAt: new Date() },
  { _id: 2, icon: '💼', title: 'Hội Tuyển Dụng', date: '28 Tháng 4', time: '10:00 SA', createdAt: new Date() },
  { _id: 3, icon: '🏆', title: 'Cuộc Thi Lập Trình', date: '2 Tháng 5', time: '6:00 CH', createdAt: new Date() }
];

let announcements = [
  { _id: 1, title: 'Tính Năng Mới: Nhắn Tin Trực Tiếp', date: '2 giờ trước', createdAt: new Date(Date.now() - 2*60*60*1000) },
  { _id: 2, title: 'Bảo Trì Nền Tảng Được Lên Lịch', date: '5 giờ trước', createdAt: new Date(Date.now() - 5*60*60*1000) },
  { _id: 3, title: 'Chào Mừng Thành Viên Mới!', date: '1 ngày trước', createdAt: new Date(Date.now() - 24*60*60*1000) }
];

let eventIdCounter = 4;
let announcementIdCounter = 4;

const EventSchema = new mongoose.Schema({
  icon: String,
  title: String,
  date: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});

const AnnouncementSchema = new mongoose.Schema({
  title: String,
  date: String,
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', EventSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

Event.create = async function(data) {
  const event = {
    _id: eventIdCounter++,
    ...data,
    createdAt: new Date()
  };
  events.push(event);
  return event;
};

Event.find = async function(query = {}) {
  return events;
};

Announcement.create = async function(data) {
  const announcement = {
    _id: announcementIdCounter++,
    ...data,
    createdAt: new Date()
  };
  announcements.unshift(announcement);
  if (announcements.length > 10) {
    announcements.pop();
  }
  return announcement;
};

Announcement.find = async function(query = {}) {
  return announcements;
};

module.exports = { Event, Announcement };
