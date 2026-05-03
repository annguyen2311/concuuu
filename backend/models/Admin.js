const mongoose = require('mongoose');

let admins = [];

const AdminSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', AdminSchema);

Admin.create = async function(data) {
  const admin = {
    _id: admins.length + 1,
    ...data,
    createdAt: new Date()
  };
  admins.push(admin);
  return admin;
};

Admin.findOne = async function(query) {
  return admins.find(a => {
    if (query.username) return a.username === query.username;
    if (query.email) return a.email === query.email;
    if (query._id) return a._id === query._id;
    return false;
  });
};

Admin.find = async function(query = {}) {
  return admins;
};

Admin.findOneAndUpdate = async function(query, update) {
  const admin = await Admin.findOne(query);
  if (admin) {
    Object.assign(admin, update);
  }
  return admin;
};

module.exports = Admin;
