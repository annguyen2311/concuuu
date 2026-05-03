const mongoose = require('mongoose');

let posts = [];
let postIdCounter = 1;

const PostSchema = new mongoose.Schema({
  _id: Number,
  author: String,
  content: String,
  title: String,
  likes: [String],
  comments: [{ user: String, text: String, createdAt: Date }],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', PostSchema);

Post.create = async function(data) {
  const post = {
    _id: postIdCounter++,
    ...data,
    likes: [],
    comments: [],
    createdAt: new Date()
  };
  posts.push(post);
  return post;
};

Post.find = async function(query = {}) {
  return posts.sort((a, b) => b.createdAt - a.createdAt);
};

Post.findOne = async function(query = {}) {
  return posts.find(p => p._id === query._id);
};

Post.findOneAndUpdate = async function(query = {}, update = {}) {
  const post = posts.find(p => p._id === query._id);
  if (post) {
    Object.assign(post, update);
  }
  return post;
};

Post.countDocuments = async function() {
  return posts.length;
};

Post.deleteOne = async function(query = {}) {
  const idx = posts.findIndex(p => p._id === query._id);
  if (idx >= 0) {
    posts.splice(idx, 1);
  }
  return { deletedCount: idx >= 0 ? 1 : 0 };
};

module.exports = Post;
