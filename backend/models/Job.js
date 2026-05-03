const mongoose = require('mongoose');

let jobs = [];
let jobIdCounter = 1;

const JobSchema = new mongoose.Schema({
  _id: Number,
  title: String,
  company: String,
  salary: String,
  type: String,
  level: String,
  location: String,
  skills: [String],
  description: String,
  postedAt: { type: Date, default: Date.now },
  postedBy: String
});

const Job = mongoose.model('Job', JobSchema);

Job.create = async function(data) {
  const job = {
    _id: jobIdCounter++,
    ...data,
    postedAt: new Date()
  };
  jobs.push(job);
  return job;
};

Job.find = async function(query = {}) {
  return jobs.filter(j => {
    if (query.type && j.type !== query.type) return false;
    if (query.level && j.level !== query.level) return false;
    return true;
  }).sort((a, b) => b.postedAt - a.postedAt);
};

Job.findOne = async function(query = {}) {
  return jobs.find(j => j._id === query._id);
};

Job.deleteOne = async function(query = {}) {
  const idx = jobs.findIndex(j => j._id === query._id);
  if (idx >= 0) {
    jobs.splice(idx, 1);
  }
  return { deletedCount: idx >= 0 ? 1 : 0 };
};

module.exports = Job;
