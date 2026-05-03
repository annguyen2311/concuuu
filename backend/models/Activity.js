const mongoose = require('mongoose');

let activities = [];
let activityIdCounter = 1;

const ActivitySchema = new mongoose.Schema({
  username: String,
  action: String,
  target: String,
  time: { type: Date, default: Date.now },
  icon: String
});

const Activity = mongoose.model('Activity', ActivitySchema);

Activity.create = async function(data) {
  const activity = {
    _id: activityIdCounter++,
    ...data,
    time: new Date()
  };
  activities.unshift(activity);
  if (activities.length > 100) {
    activities.pop();
  }
  return activity;
};

Activity.find = async function(query = {}) {
  return activities;
};

module.exports = Activity;
