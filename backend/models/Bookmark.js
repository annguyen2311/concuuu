const mongoose = require('mongoose');

let bookmarks = [];
let bookmarkIdCounter = 1;

const BookmarkSchema = new mongoose.Schema({
  _id: Number,
  userId: String,
  postId: Number,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

const Bookmark = mongoose.model('Bookmark', BookmarkSchema);

Bookmark.create = async function(data) {
  const bookmark = {
    _id: bookmarkIdCounter++,
    ...data,
    createdAt: new Date()
  };
  bookmarks.push(bookmark);
  return bookmark;
};

Bookmark.find = async function(query = {}) {
  return bookmarks.filter(b => {
    if (query.userId && b.userId !== query.userId) return false;
    if (query.type && b.type !== query.type) return false;
    return true;
  });
};

Bookmark.findOne = async function(query = {}) {
  return bookmarks.find(b => {
    if (query.userId && b.userId !== query.userId) return false;
    if (query.postId && b.postId !== query.postId) return false;
    return true;
  });
};

Bookmark.deleteOne = async function(query = {}) {
  const idx = bookmarks.findIndex(b => {
    if (query.userId && b.userId !== query.userId) return false;
    if (query.postId && b.postId !== query.postId) return false;
    return true;
  });
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
  }
  return { deletedCount: idx >= 0 ? 1 : 0 };
};

module.exports = Bookmark;
